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

export const selectUnownedOwnerUserId = (state: RootState): string | undefined =>
  state.savedLoadouts.unownedOwnerUserId;

/**
 * Loadouts the given user may see: those they own, plus unowned (local/guest) ones —
 * but unowned rows are shown ONLY while the browser isn't bound to a DIFFERENT
 * account (`unownedOwnerUserId`). Another account's owned loadouts are always hidden —
 * not deleted — so a shared browser never shows or exports a previous user's private
 * library, and no unsynced data is lost.
 *
 * Scoping unowned rows to `unownedOwnerUserId` closes a shared-browser gap: legacy
 * data (pre-account, so `ownerUserId === undefined`) would otherwise be visible to —
 * and claimable by — any later account. The binding is WRITE-ONCE (the first account
 * to sync wins; see `bindUnownedOwnerUserId`), so a second account that syncs here
 * can't re-point it at itself and re-expose the first account's pre-account rows.
 * Only that first account (or a fresh, unbound browser) sees the unowned rows.
 *
 * Residual edge (accepted — unowned rows carry no per-row owner, so they can't be
 * attributed to a specific account): once the browser is bound to account A, a second
 * account B's OWN pre-sign-in guest saves are hidden from B while B is signed in
 * (privacy wins over convenience — we fail closed rather than risk leaking A's data).
 * B still sees them signed out, and an explicit "Add to account" claims unowned rows
 * into the owned namespace (where they're keyed to the owner and no longer gated by
 * this binding). The binding only resets by clearing the persisted loadout data.
 */
export const selectVisibleLoadouts =
  (currentUserId: string | undefined, unownedOwnerUserId?: string | undefined) =>
  (state: RootState): RootState['savedLoadouts']['loadouts'] =>
    state.savedLoadouts.loadouts.filter((l) => {
      if (l.ownerUserId !== undefined) return l.ownerUserId === currentUserId;
      // Unowned (guest/legacy): hidden ONLY from a DIFFERENT SIGNED-IN account on a
      // browser already bound to another account. Visible to a signed-OUT guest — a
      // signed-out viewer isn't "another account", and their own just-saved local rows
      // must not vanish — as well as to the bound account and on an unbound browser.
      return (
        currentUserId === undefined ||
        unownedOwnerUserId === undefined ||
        unownedOwnerUserId === currentUserId
      );
    });
