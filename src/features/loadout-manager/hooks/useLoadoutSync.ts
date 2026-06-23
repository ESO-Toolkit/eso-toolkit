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
  /** Pull + merge + push the whole library. Resolves with the merged count. */
  syncNow: () => Promise<number | undefined>;
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
  const lastSyncedAt = useSelector(selectLoadoutsLastSyncedAt);
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

  const syncNow = useCallback(async (): Promise<number | undefined> => {
    const token = requireAuth();
    if (!token) return undefined;

    // currentUserId is guaranteed defined here (requireAuth passed → logged in).
    const owner = currentUserId as string;
    setStatus('syncing');
    setError(null);
    try {
      // Pull the account: its library (stamped as owned by this user) + tombstones.
      const pull = await loadoutsApi.list(token);
      let committedMine = stampOwner(rowsToLoadouts(pull), owner);
      let tombstones = tombstoneMap(pull);

      // Push→re-read until quiescent. Each pass operates ONLY on the current user's
      // slice (their own + still-unowned loadouts); other accounts' synced
      // loadouts are never read, pushed, or deleted — just preserved untouched.
      // Re-reading from the store each pass means edits made mid-sync aren't
      // dropped; version-aware purge keeps a local edit newer than its tombstone so
      // it survives to revive the loadout. Bounded by MAX_SYNC_PASSES.
      for (let pass = 0; pass < MAX_SYNC_PASSES; pass++) {
        const { mine } = partitionByOwner(selectSavedLoadouts(store.getState()), owner);
        const toPush = purgeDeleted(mergeLoadoutsByNewest(mine, committedMine), tombstones);

        if (toPush.length > MAX_ACCOUNT_LOADOUTS) {
          setError(
            `You have ${toPush.length} loadouts on this account, over the ${MAX_ACCOUNT_LOADOUTS} limit. Delete some, then sync again.`,
          );
          setStatus('error');
          return undefined;
        }

        // Push (chunked). Each /sync returns the full server library + tombstones;
        // the LAST response is authoritative for this pass.
        let authoritative: LoadoutListResponse = pull;
        const batches = chunk(toPush.map(savedLoadoutToPayload), SYNC_BATCH_SIZE);
        if (batches.length === 0) {
          authoritative = await loadoutsApi.sync([], token);
        } else {
          for (const batch of batches) authoritative = await loadoutsApi.sync(batch, token);
        }
        committedMine = stampOwner(rowsToLoadouts(authoritative), owner);
        tombstones = tombstoneMap(authoritative);

        const { mine: mineAfter } = partitionByOwner(selectSavedLoadouts(store.getState()), owner);
        committedMine = stampOwner(
          purgeDeleted(mergeLoadoutsByNewest(mineAfter, committedMine), tombstones),
          owner,
        );

        // Quiescent when this user's slice didn't change during the pass.
        if (sameLibrary(mine, mineAfter)) break;
      }

      // Commit against the LIVE store (re-read here, with no await before the
      // dispatch) so a save/rename/delete that landed during the final push isn't
      // lost: merge the live current-user slice into the server-authoritative set,
      // and preserve every OTHER account's loadouts exactly — nothing is deleted.
      const { mine: liveMine, others } = partitionByOwner(
        selectSavedLoadouts(store.getState()),
        owner,
      );
      const finalMine = stampOwner(
        purgeDeleted(mergeLoadoutsByNewest(liveMine, committedMine), tombstones),
        owner,
      );
      dispatch(replaceAllLoadouts([...others, ...finalMine]));
      dispatch(setSyncedUserId(owner));
      dispatch(setLastSyncedAt(new Date().toISOString()));
      setStatus('idle');
      return finalMine.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
      setStatus('error');
      return undefined;
    }
  }, [requireAuth, currentUserId, dispatch, store]);

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

  return {
    isLoggedIn,
    currentUserId,
    status,
    error,
    lastSyncedAt,
    syncNow,
    saveOne,
    removeFromAccount,
  };
}
