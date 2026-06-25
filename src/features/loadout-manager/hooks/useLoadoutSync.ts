/**
 * Two-way account sync for the saved-loadout library.
 *
 * Auth lives in React context (not Redux), so sync is a hook rather than a thunk:
 * it reads the token from {@link useAuth}, the library from the store, and writes
 * merged results back via dispatch.
 *
 * `syncNow` does a pull → last-write-wins merge → push so a stale local copy can
 * never clobber a newer edit made on another device. It is non-destructive:
 * deletions are explicit (removeFromAccount) and are not propagated by sync.
 */

import { useCallback, useContext, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';

import { AuthContext } from '@/features/auth/AuthContext';
import {
  replaceAllLoadouts,
  selectSavedLoadouts,
  selectLoadoutsLastSyncedAt,
  selectLoadoutsSyncedUserId,
  setLastSyncedAt,
  setSyncedUserId,
  type SavedLoadout,
} from '@/store/saved_loadouts';
import type { RootState } from '@/store/storeWithHistory';

import { loadoutsApi, type LoadoutListResponse } from '../api/loadouts-api';
import {
  mergeLoadoutsByNewest,
  partitionByOwner,
  purgeDeleted,
  rowToSavedLoadout,
  sameLibrary,
  savedLoadoutToPayload,
  selectOutgoing,
  stampOwner,
} from '../utils/loadoutSyncMappers';

/** Worker caps a single /loadouts/sync call at 200 entries. */
const SYNC_BATCH_SIZE = 200;
/** Mirror of the worker's per-account ceiling — preflighted before any write. */
const MAX_ACCOUNT_LOADOUTS = 500;
/** Max push→re-read passes before declaring the sync quiescent (bounds the loop). */
const MAX_SYNC_PASSES = 3;

const rowsToLoadouts = (resp: LoadoutListResponse): SavedLoadout[] =>
  resp.loadouts.map(rowToSavedLoadout).filter((l): l is SavedLoadout => l !== null);

/** Build an id → delete-time map from a response's tombstones (for version-aware purge). */
const tombstoneMap = (resp: LoadoutListResponse): Map<string, string> =>
  new Map(resp.deletions.map((t) => [t.id, t.deleted_at]));

export type LoadoutSyncStatus = 'idle' | 'syncing' | 'error';

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface UseLoadoutSyncResult {
  isLoggedIn: boolean;
  /** The signed-in account id (for scoping which loadouts are visible). */
  currentUserId: string | undefined;
  status: LoadoutSyncStatus;
  error: string | null;
  lastSyncedAt: string | undefined;
  /** Pull + merge + push this account's own loadouts. Resolves with the merged count. */
  syncNow: () => Promise<number | undefined>;
  /** Explicitly claim unowned local loadouts for this account, then sync. */
  claimLocalLoadouts: () => Promise<number | undefined>;
  /** Push a single loadout to the account (does not merge the rest). */
  saveOne: (loadout: SavedLoadout) => Promise<boolean>;
  /** Delete a single loadout from the account only (keeps the local copy). */
  removeFromAccount: (id: string) => Promise<boolean>;
}

export function useLoadoutSync(): UseLoadoutSyncResult {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  // Read auth defensively: the library panel can render in isolation (tests,
  // storybook) without an AuthProvider — there we simply behave as logged-out.
  const auth = useContext(AuthContext);
  const isLoggedIn = auth?.isLoggedIn ?? false;
  const accessToken = auth?.accessToken ?? '';
  const currentUserId = auth?.currentUser?.id ? String(auth.currentUser.id) : undefined;
  // True while the account identity is mid-resolve. On an account switch the new
  // token goes live immediately but currentUser keeps the PREVIOUS account until the
  // refetch finishes — syncing in that window would call the API with the new token
  // yet stamp the returned rows with the old account's id (a cross-account leak on a
  // shared browser), so we block sync until this clears.
  const userLoading = auth?.userLoading ?? false;
  const persistedLastSyncedAt = useSelector(selectLoadoutsLastSyncedAt);
  const syncedUserId = useSelector(selectLoadoutsSyncedUserId);
  // Surface "Last synced" only when it belongs to the signed-in account — on a
  // shared browser the persisted timestamp may be from a previously signed-in user,
  // and showing it to the new user would be misleading.
  const lastSyncedAt =
    syncedUserId !== undefined && syncedUserId === currentUserId
      ? persistedLastSyncedAt
      : undefined;
  const [status, setStatus] = useState<LoadoutSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const requireAuth = useCallback((): string | null => {
    if (!isLoggedIn || !accessToken) {
      setError('Sign in to sync loadouts to your account.');
      setStatus('error');
      return null;
    }
    return accessToken;
  }, [isLoggedIn, accessToken]);

  // `claimUnowned` is false for a normal sync (only this account's already-owned
  // loadouts), true only for the explicit "Add to account" action. Ownership is
  // applied solely from the SERVER-CONFIRMED result at commit, so a failed sync
  // never leaves loadouts mis-stamped (rollback-safe — nothing is dispatched).
  const runSync = useCallback(
    async (claimUnowned: boolean): Promise<number | undefined> => {
      const token = requireAuth();
      if (!token) return undefined;

      // Block while the signed-in identity is still resolving (e.g. just after an
      // account switch: the new token is live but currentUser is mid-refetch). The
      // token and the owner id must belong to the SAME account, or we'd hit the API
      // as the new user yet stamp the returned rows with the old user's id.
      if (userLoading) {
        setError('Your account is still loading — try syncing again in a moment.');
        setStatus('error');
        return undefined;
      }

      // Fail CLOSED if the account identity hasn't resolved yet (logged in but the
      // user query is still loading/failed). Without a concrete id we'd stamp pulled
      // account rows as `unowned`, declassifying private data — never do that.
      const owner = currentUserId;
      if (!owner) {
        setError('Your account is still loading — try syncing again in a moment.');
        setStatus('error');
        return undefined;
      }

      const initialMineIds = new Set(
        partitionByOwner(selectSavedLoadouts(store.getState()), owner, claimUnowned).mine.map(
          (l) => l.id,
        ),
      );

      setStatus('syncing');
      setError(null);
      try {
        // Pull the account: its library (stamped as owned by this user) + tombstones.
        const pull = await loadoutsApi.list(token);
        // `serverMine` is the PURE server slice — never merged with local — and is
        // the diff base for what to push. `committedMine` is the running merged view
        // (server ∪ local, newest-wins) used for the final commit.
        let serverMine = stampOwner(rowsToLoadouts(pull), owner);
        let committedMine = serverMine;
        let tombstones = tombstoneMap(pull);
        // Ids the account-cap race left unsaved on a partial /sync (server returns 200
        // + skipped). We still reconcile the authoritative library below; these are
        // surfaced afterwards as a non-fatal warning so the user knows to free space.
        const skippedIds = new Set<string>();

        // Push→re-read until quiescent. Each pass operates ONLY on the current user's
        // slice; other accounts' loadouts are never read, pushed, or deleted. Re-reading
        // from the store each pass means edits made mid-sync aren't dropped; version-aware
        // purge keeps a local edit newer than its tombstone. Bounded by MAX_SYNC_PASSES.
        for (let pass = 0; pass < MAX_SYNC_PASSES; pass++) {
          const { mine } = partitionByOwner(
            selectSavedLoadouts(store.getState()),
            owner,
            claimUnowned,
          );
          const merged = purgeDeleted(mergeLoadoutsByNewest(mine, committedMine), tombstones);

          if (merged.length > MAX_ACCOUNT_LOADOUTS) {
            setError(
              `You have ${merged.length} loadouts on this account, over the ${MAX_ACCOUNT_LOADOUTS} limit. Delete some, then sync again.`,
            );
            setStatus('error');
            return undefined;
          }

          // Push ONLY rows new-or-newer than the server's copy (diff vs the pure
          // server slice). A pull-only sync thus never re-POSTs the rows it just
          // fetched — which would spend a write-rate-limit slot every refresh and,
          // once throttled, 429 the sync and drop the freshly pulled library. Nothing
          // outgoing ⇒ no POST at all, so the pulled state still commits below.
          const toPush = selectOutgoing(merged, serverMine);
          let authoritative: LoadoutListResponse = pull;
          const batches = chunk(toPush.map(savedLoadoutToPayload), SYNC_BATCH_SIZE);
          for (const batch of batches) {
            authoritative = await loadoutsApi.sync(batch, token);
            authoritative.skipped?.forEach((id) => skippedIds.add(id));
          }
          serverMine = stampOwner(rowsToLoadouts(authoritative), owner);
          committedMine = serverMine;
          tombstones = tombstoneMap(authoritative);

          const { mine: mineAfter } = partitionByOwner(
            selectSavedLoadouts(store.getState()),
            owner,
            claimUnowned,
          );
          committedMine = stampOwner(
            purgeDeleted(mergeLoadoutsByNewest(mineAfter, committedMine), tombstones),
            owner,
          );

          if (sameLibrary(mine, mineAfter)) break;
        }

        // Commit against the LIVE store (re-read here, no await before dispatch).
        // Drop from the server-authoritative set anything the user DELETED locally
        // during the sync (was mine at start, gone now) so a confirmed delete isn't
        // resurrected; keep genuine server-pulled loadouts. Other accounts' loadouts
        // are preserved exactly — nothing is deleted.
        const { mine: liveMine, others } = partitionByOwner(
          selectSavedLoadouts(store.getState()),
          owner,
          claimUnowned,
        );
        const liveMineIds = new Set(liveMine.map((l) => l.id));
        const serverKeep = committedMine.filter(
          (l) => liveMineIds.has(l.id) || !initialMineIds.has(l.id),
        );
        const finalMine = stampOwner(
          purgeDeleted(mergeLoadoutsByNewest(liveMine, serverKeep), tombstones),
          owner,
        );
        dispatch(replaceAllLoadouts([...others, ...finalMine]));
        dispatch(setSyncedUserId(owner));
        dispatch(setLastSyncedAt(new Date().toISOString()));
        // Partial sync: the saved rows ARE reconciled above (so nothing is duplicated),
        // but the account cap left some unsaved. Surface that as an error the user can
        // act on while keeping the committed state; otherwise report a clean success.
        if (skippedIds.size > 0) {
          setError(
            `Synced, but ${skippedIds.size} loadout${skippedIds.size === 1 ? '' : 's'} couldn't be saved — your account is at the ${MAX_ACCOUNT_LOADOUTS}-loadout limit. Delete some, then sync again.`,
          );
          setStatus('error');
          return undefined;
        }
        setStatus('idle');
        return finalMine.length;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sync failed');
        setStatus('error');
        return undefined;
      }
    },
    [requireAuth, currentUserId, userLoading, dispatch, store],
  );

  /** Normal sync: only this account's already-owned loadouts. */
  const syncNow = useCallback(() => runSync(false), [runSync]);

  const saveOne = useCallback(
    async (loadout: SavedLoadout): Promise<boolean> => {
      const token = requireAuth();
      if (!token) return false;
      setStatus('syncing');
      setError(null);
      try {
        await loadoutsApi.create(savedLoadoutToPayload(loadout), token);
        setStatus('idle');
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
        setStatus('error');
        return false;
      }
    },
    [requireAuth],
  );

  const removeFromAccount = useCallback(
    async (id: string): Promise<boolean> => {
      const token = requireAuth();
      if (!token) return false;
      try {
        await loadoutsApi.remove(id, token, new Date().toISOString());
        return true;
      } catch (e) {
        const status = (e as { status?: number }).status;
        // 404 — never on the account; treat as already-removed.
        if (status === 404) return true;
        // 409 — a newer edit exists on another device; the delete loses (LWW).
        // Keep the local copy and tell the user to sync to pick up the new version.
        if (status === 409) {
          setError('This loadout was changed more recently on another device. Sync to update it.');
          setStatus('error');
          return false;
        }
        setError(e instanceof Error ? e.message : 'Remove failed');
        setStatus('error');
        return false;
      }
    },
    [requireAuth],
  );

  // Explicit "Add to account": sync WITH unowned (guest/legacy) loadouts included.
  // Ownership is stamped only from the server-confirmed result at commit, so if
  // the sync fails nothing is mis-stamped (rollback-safe — no eager local mutation).
  const claimLocalLoadouts = useCallback(() => runSync(true), [runSync]);

  return {
    isLoggedIn,
    currentUserId,
    status,
    error,
    lastSyncedAt,
    syncNow,
    claimLocalLoadouts,
    saveOne,
    removeFromAccount,
  };
}
