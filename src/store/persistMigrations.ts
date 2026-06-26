import type { MigrationManifest, PersistedState } from 'redux-persist';

/**
 * redux-persist store version. Bump alongside a new entry in {@link persistMigrations}.
 */
export const PERSIST_VERSION = 1;

/** The subset of the persisted `savedLoadouts` slice the migrations touch. */
interface MigratableSavedLoadouts {
  syncedUserId?: string;
  unownedOwnerUserId?: string;
}

type PersistedRoot = (PersistedState & { savedLoadouts?: MigratableSavedLoadouts }) | undefined;

/**
 * Persisted-state migrations, keyed by target version (see redux-persist `createMigrate`).
 *
 * v1 — Backfill the WRITE-ONCE unowned-loadout binding (`unownedOwnerUserId`) from the
 * legacy MUTABLE `syncedUserId` for browsers persisted before the binding field existed.
 * Earlier on this branch, unowned (guest/legacy) loadout visibility was scoped to the
 * persisted `syncedUserId`. The privacy fix moved that scope to the new immutable
 * `unownedOwnerUserId`, but an upgraded browser rehydrates with that field unset — so
 * without this backfill an already-bound shared browser would read as "unbound", letting
 * a second account momentarily see (and claim) the first account's unowned loadouts and
 * then PERMANENTLY re-bind the namespace to itself on its next sync. Seeding the binding
 * from the already-persisted `syncedUserId` at load preserves the protection across the
 * upgrade, before any second account can act.
 */
export const persistMigrations: MigrationManifest = {
  1: (state) => {
    const root = state as PersistedRoot;
    const sl = root?.savedLoadouts;
    // Only seed when bound under the old field but not yet under the new one. An already
    // migrated browser (unownedOwnerUserId set) and a never-synced one (no syncedUserId)
    // are both left untouched.
    if (!sl || sl.unownedOwnerUserId !== undefined || sl.syncedUserId === undefined) {
      return state;
    }
    return {
      ...root,
      savedLoadouts: { ...sl, unownedOwnerUserId: sl.syncedUserId },
    } as PersistedState;
  },
};
