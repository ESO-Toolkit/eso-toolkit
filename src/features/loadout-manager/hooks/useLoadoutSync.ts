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
import { useDispatch, useSelector } from 'react-redux';

import { AuthContext } from '@/features/auth/AuthContext';
import {
  replaceAllLoadouts,
  selectSavedLoadouts,
  selectLoadoutsLastSyncedAt,
  setLastSyncedAt,
  type SavedLoadout,
} from '@/store/saved_loadouts';

import { loadoutsApi } from '../api/loadouts-api';
import {
  mergeLoadoutsByNewest,
  rowToSavedLoadout,
  savedLoadoutToPayload,
} from '../utils/loadoutSyncMappers';

/** Worker caps a single /loadouts/sync call at 200 entries. */
const SYNC_BATCH_SIZE = 200;

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
  // Read auth defensively: the library panel can render in isolation (tests,
  // storybook) without an AuthProvider — there we simply behave as logged-out.
  const auth = useContext(AuthContext);
  const isLoggedIn = auth?.isLoggedIn ?? false;
  const accessToken = auth?.accessToken ?? '';
  const loadouts = useSelector(selectSavedLoadouts);
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
      // 1. Pull the server library and merge it into the local one (newest wins).
      const { loadouts: remoteRows } = await loadoutsApi.list(token);
      const remote = remoteRows.map(rowToSavedLoadout).filter((l): l is SavedLoadout => l !== null);
      const merged = mergeLoadoutsByNewest(loadouts, remote);

      // 2. Reflect the merged set locally so pulled-in loadouts appear immediately.
      dispatch(replaceAllLoadouts(merged));

      // 3. Push the merged set up so the server converges (chunked to the cap).
      for (const batch of chunk(merged.map(savedLoadoutToPayload), SYNC_BATCH_SIZE)) {
        await loadoutsApi.sync(batch, token);
      }

      dispatch(setLastSyncedAt(new Date().toISOString()));
      setStatus('idle');
      return merged.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
      setStatus('error');
      return undefined;
    }
  }, [requireAuth, loadouts, dispatch]);

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
        await loadoutsApi.remove(id, token);
        return true;
      } catch (e) {
        // A 404 means it was never on the account — treat as already-removed.
        if ((e as { status?: number }).status === 404) return true;
        setError(e instanceof Error ? e.message : 'Remove failed');
        setStatus('error');
        return false;
      }
    },
    [requireAuth],
  );

  return { isLoggedIn, status, error, lastSyncedAt, syncNow, saveOne, removeFromAccount };
}
