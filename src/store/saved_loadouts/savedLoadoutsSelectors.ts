import type { RootState } from '../storeWithHistory';

export const selectSavedLoadouts = (state: RootState): RootState['savedLoadouts']['loadouts'] =>
  state.savedLoadouts.loadouts;

export const selectSavedLoadoutById =
  (id: string) =>
  (state: RootState): RootState['savedLoadouts']['loadouts'][number] | undefined =>
    state.savedLoadouts.loadouts.find((l) => l.id === id);

export const selectLoadoutsLastSyncedAt = (state: RootState): string | undefined =>
  state.savedLoadouts.lastSyncedAt;

export const selectLoadoutsSyncedUserId = (state: RootState): string | undefined =>
  state.savedLoadouts.syncedUserId;

/**
 * Loadouts the given user may see: unowned (local/guest) ones plus those owned by
 * this user. Another account's synced loadouts are hidden — not deleted — so a
 * shared browser never shows or exports a previous user's private library, and no
 * unsynced data is ever lost.
 */
export const selectVisibleLoadouts =
  (currentUserId: string | undefined) =>
  (state: RootState): RootState['savedLoadouts']['loadouts'] =>
    state.savedLoadouts.loadouts.filter(
      (l) => l.ownerUserId === undefined || l.ownerUserId === currentUserId,
    );
