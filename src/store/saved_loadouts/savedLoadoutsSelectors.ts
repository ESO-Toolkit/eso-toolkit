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
 * Loadouts the given user may see: those they own, plus unowned (local/guest) ones —
 * but unowned rows are shown ONLY while the browser isn't bound to a DIFFERENT
 * account (`syncedUserId`). Another account's owned loadouts are always hidden — not
 * deleted — so a shared browser never shows or exports a previous user's private
 * library, and no unsynced data is lost.
 *
 * Scoping unowned rows to `syncedUserId` closes a shared-browser gap: legacy data
 * (pre-account, so `ownerUserId === undefined`) would otherwise be visible to — and
 * claimable by — any later account. Once an account has synced here, only that
 * account (or a fresh, unbound browser) sees the unowned rows.
 */
export const selectVisibleLoadouts =
  (currentUserId: string | undefined, syncedUserId?: string | undefined) =>
  (state: RootState): RootState['savedLoadouts']['loadouts'] =>
    state.savedLoadouts.loadouts.filter((l) => {
      if (l.ownerUserId !== undefined) return l.ownerUserId === currentUserId;
      // Unowned (guest/legacy): hidden ONLY from a DIFFERENT SIGNED-IN account on a
      // browser already bound to another account. Visible to a signed-OUT guest — a
      // signed-out viewer isn't "another account", and their own just-saved local rows
      // must not vanish — as well as to the bound account and on an unbound browser.
      return (
        currentUserId === undefined || syncedUserId === undefined || syncedUserId === currentUserId
      );
    });
