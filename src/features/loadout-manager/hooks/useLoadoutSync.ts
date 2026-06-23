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

import { useCallback, useContext, useEffect, useState } from 'react';
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
  purgeDeleted,
  rowToSavedLoadout,
  sameLibrary,
  savedLoadoutToPayload,
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

    setStatus('syncing');
    setError(null);
    try {
      // Pull the account: its library + tombstones (deleted ids + delete times).
      const pull = await loadoutsApi.list(token);
      const serverLoadouts = rowsToLoadouts(pull);

      // Account-switch guard: if this browser is now a DIFFERENT account than the
      // one this library belongs to, never push the prior user's local library
      // into the new account. Replace local with the new account's data and claim
      // it. (The clear-on-auth-change effect already wipes a switched-away library
      // before this runs; this is belt-and-braces for a same-mount switch.)
      const previousUserId = selectLoadoutsSyncedUserId(store.getState());
      if (currentUserId && previousUserId && previousUserId !== currentUserId) {
        const replaced = purgeDeleted(serverLoadouts, tombstoneMap(pull));
        dispatch(replaceAllLoadouts(replaced));
        dispatch(setSyncedUserId(currentUserId));
        dispatch(setLastSyncedAt(new Date().toISOString()));
        setStatus('idle');
        return replaced.length;
      }

      // Push→re-read until quiescent: each pass merges the freshest local state
      // (re-read from the store, so edits made mid-sync aren't dropped) with the
      // server, version-aware-purges tombstoned ids (a local edit newer than its
      // tombstone survives to revive the loadout), pushes, and stops once a pass
      // starts and ends with an unchanged local library. Bounded by MAX_SYNC_PASSES.
      let committed: SavedLoadout[] = serverLoadouts;
      let tombstones = tombstoneMap(pull);
      for (let pass = 0; pass < MAX_SYNC_PASSES; pass++) {
        const localBefore = selectSavedLoadouts(store.getState());
        const toPush = purgeDeleted(mergeLoadoutsByNewest(localBefore, committed), tombstones);

        if (toPush.length > MAX_ACCOUNT_LOADOUTS) {
          setError(
            `You have ${toPush.length} loadouts across your devices, over the ${MAX_ACCOUNT_LOADOUTS} limit. Delete some, then sync again.`,
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
        committed = rowsToLoadouts(authoritative);
        tombstones = tombstoneMap(authoritative);

        const localAfter = selectSavedLoadouts(store.getState());
        committed = purgeDeleted(mergeLoadoutsByNewest(localAfter, committed), tombstones);

        // Quiescent when no local edit happened during this pass.
        if (sameLibrary(localBefore, localAfter)) break;
      }

      dispatch(replaceAllLoadouts(committed));
      dispatch(setSyncedUserId(currentUserId));
      dispatch(setLastSyncedAt(new Date().toISOString()));
      setStatus('idle');
      return committed.length;
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

  // Privacy/ownership guard for the browser-persisted (not per-user) library:
  //  - A signed-in user CLAIMS the current library (stamps owner) even before any
  //    sync, so loadouts saved while signed in aren't later treated as unowned
  //    guest data and pushed into a different account.
  //  - When the browser is now a DIFFERENT owner than the library's — including
  //    logout (currentUserId undefined) — clear it so the previous user's private
  //    loadouts aren't shown/exported/pushed by whoever is here now.
  // A library built by a never-signed-in guest stays unowned and untouched.
  useEffect(() => {
    const owner = selectLoadoutsSyncedUserId(store.getState());
    if (owner === currentUserId) return;
    if (owner && owner !== currentUserId) {
      // Switched account or logged out → wipe the previous owner's library.
      dispatch(replaceAllLoadouts([]));
      dispatch(setLastSyncedAt(undefined));
      dispatch(setSyncedUserId(currentUserId));
    } else if (!owner && currentUserId) {
      // First signed-in user claims the current (unowned) library.
      dispatch(setSyncedUserId(currentUserId));
    }
  }, [currentUserId, dispatch, store]);

  return { isLoggedIn, status, error, lastSyncedAt, syncNow, saveOne, removeFromAccount };
}
