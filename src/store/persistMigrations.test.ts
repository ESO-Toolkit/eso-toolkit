import type { PersistedState } from 'redux-persist';

import { persistMigrations } from './persistMigrations';

// Shape of the persisted root the v1 migration inspects (only the fields it touches).
interface PersistedRoot {
  _persist: { version: number; rehydrated: boolean };
  savedLoadouts?: {
    loadouts?: unknown[];
    syncedUserId?: string;
    unownedOwnerUserId?: string;
  };
}

const migrateV1 = persistMigrations[1];

const root = (savedLoadouts?: PersistedRoot['savedLoadouts']): PersistedState =>
  ({ _persist: { version: -1, rehydrated: false }, savedLoadouts }) as unknown as PersistedState;

const out = (state: PersistedState): PersistedRoot => state as unknown as PersistedRoot;

describe('persistMigrations v1 — unowned-binding backfill', () => {
  it('seeds unownedOwnerUserId from a legacy syncedUserId on an already-bound browser', () => {
    const migrated = out(migrateV1(root({ loadouts: [], syncedUserId: 'A' })));
    expect(migrated.savedLoadouts?.unownedOwnerUserId).toBe('A');
    // Other persisted fields survive the migration untouched.
    expect(migrated.savedLoadouts?.loadouts).toEqual([]);
    expect(migrated.savedLoadouts?.syncedUserId).toBe('A');
  });

  it('does NOT overwrite an existing binding (write-once across the upgrade too)', () => {
    // syncedUserId already moved on to B (a later sync), but the namespace was first
    // bound to A — the migration must preserve A.
    const migrated = out(
      migrateV1(root({ loadouts: [], syncedUserId: 'B', unownedOwnerUserId: 'A' })),
    );
    expect(migrated.savedLoadouts?.unownedOwnerUserId).toBe('A');
  });

  it('leaves a never-synced browser unbound (no syncedUserId to seed from)', () => {
    const migrated = out(migrateV1(root({ loadouts: [] })));
    expect(migrated.savedLoadouts?.unownedOwnerUserId).toBeUndefined();
  });

  it('is a no-op when the savedLoadouts slice was never persisted', () => {
    const input = root(undefined);
    expect(migrateV1(input)).toBe(input);
  });
});
