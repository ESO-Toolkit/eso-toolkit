import { configureStore } from '@reduxjs/toolkit';

import type { LoadoutSetup } from '../../features/loadout-manager/types/loadout.types';

import savedLoadoutsReducer, {
  saveLoadout,
  updateSavedLoadout,
  renameSavedLoadout,
  deleteSavedLoadout,
} from './savedLoadoutsSlice';
import type { SavedLoadout } from './savedLoadoutsSlice';

const makeSetup = (name = 'My Setup'): LoadoutSetup => ({
  name,
  disabled: false,
  condition: { boss: 'Lokkestiiz' },
  skills: { 0: { 3: 12345 }, 1: {} },
  cp: { 1: 67890 },
  food: { id: 111 },
  gear: { 0: { id: '222', trait: 'divines' } },
  code: '',
});

const createTestStore = (loadouts: SavedLoadout[] = []) =>
  configureStore({
    reducer: { savedLoadouts: savedLoadoutsReducer },
    preloadedState: loadouts.length ? { savedLoadouts: { loadouts } } : undefined,
  });

describe('savedLoadoutsSlice', () => {
  it('starts with an empty library', () => {
    const store = createTestStore();
    expect(store.getState().savedLoadouts.loadouts).toEqual([]);
  });

  describe('saveLoadout', () => {
    it('prepends a new loadout with generated id and timestamps', () => {
      const store = createTestStore();
      const setup = makeSetup();

      store.dispatch(saveLoadout({ name: 'Tank DD', setup, meta: { trialId: 'SS' } }));

      const { loadouts } = store.getState().savedLoadouts;
      expect(loadouts).toHaveLength(1);
      const [entry] = loadouts;
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBe('Tank DD');
      expect(entry.setup).toEqual(setup);
      expect(entry.meta).toEqual({ trialId: 'SS' });
      expect(entry.createdAt).toBe(entry.updatedAt);
      expect(() => new Date(entry.createdAt).toISOString()).not.toThrow();
    });

    it('puts the most recently saved loadout first', () => {
      const store = createTestStore();
      store.dispatch(saveLoadout({ name: 'First', setup: makeSetup('First') }));
      store.dispatch(saveLoadout({ name: 'Second', setup: makeSetup('Second') }));

      const names = store.getState().savedLoadouts.loadouts.map((l) => l.name);
      expect(names).toEqual(['Second', 'First']);
    });

    it('gives each saved loadout a distinct id', () => {
      const store = createTestStore();
      store.dispatch(saveLoadout({ name: 'A', setup: makeSetup('A') }));
      store.dispatch(saveLoadout({ name: 'B', setup: makeSetup('B') }));

      const [a, b] = store.getState().savedLoadouts.loadouts;
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('updateSavedLoadout', () => {
    it('replaces the setup and bumps updatedAt without changing id/createdAt', () => {
      const existing: SavedLoadout = {
        id: 'fixed-id',
        name: 'Original',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup('Original'),
      };
      const store = createTestStore([existing]);

      const newSetup = makeSetup('Edited');
      store.dispatch(updateSavedLoadout({ id: 'fixed-id', setup: newSetup }));

      const [entry] = store.getState().savedLoadouts.loadouts;
      expect(entry.id).toBe('fixed-id');
      expect(entry.createdAt).toBe('2020-01-01T00:00:00.000Z');
      expect(entry.setup).toEqual(newSetup);
      expect(entry.name).toBe('Original');
      expect(entry.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('can update name and description alongside the setup', () => {
      const existing: SavedLoadout = {
        id: 'id-1',
        name: 'Old',
        description: 'old desc',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup(),
      };
      const store = createTestStore([existing]);

      store.dispatch(
        updateSavedLoadout({
          id: 'id-1',
          setup: makeSetup(),
          name: 'New',
          description: 'new desc',
        }),
      );

      const [entry] = store.getState().savedLoadouts.loadouts;
      expect(entry.name).toBe('New');
      expect(entry.description).toBe('new desc');
    });

    it('is a no-op when the id does not exist', () => {
      const existing: SavedLoadout = {
        id: 'id-1',
        name: 'Old',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup(),
      };
      const store = createTestStore([existing]);

      store.dispatch(updateSavedLoadout({ id: 'missing', setup: makeSetup('X') }));

      expect(store.getState().savedLoadouts.loadouts).toEqual([existing]);
    });
  });

  describe('renameSavedLoadout', () => {
    it('updates name (and optional description) and bumps updatedAt', () => {
      const existing: SavedLoadout = {
        id: 'id-1',
        name: 'Before',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup(),
      };
      const store = createTestStore([existing]);

      store.dispatch(renameSavedLoadout({ id: 'id-1', name: 'After', description: 'desc' }));

      const [entry] = store.getState().savedLoadouts.loadouts;
      expect(entry.name).toBe('After');
      expect(entry.description).toBe('desc');
      expect(entry.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
      // setup is untouched by rename
      expect(entry.setup).toEqual(existing.setup);
    });

    it('is a no-op when the id does not exist', () => {
      const store = createTestStore();
      store.dispatch(renameSavedLoadout({ id: 'nope', name: 'X' }));
      expect(store.getState().savedLoadouts.loadouts).toEqual([]);
    });
  });

  describe('deleteSavedLoadout', () => {
    it('removes only the matching loadout', () => {
      const a: SavedLoadout = {
        id: 'a',
        name: 'A',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup('A'),
      };
      const b: SavedLoadout = { ...a, id: 'b', name: 'B', setup: makeSetup('B') };
      const store = createTestStore([a, b]);

      store.dispatch(deleteSavedLoadout({ id: 'a' }));

      const { loadouts } = store.getState().savedLoadouts;
      expect(loadouts).toHaveLength(1);
      expect(loadouts[0].id).toBe('b');
    });

    it('only removes the matching owner when an id exists under two accounts', () => {
      const mine: SavedLoadout = {
        id: 'dup',
        name: 'Mine',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        setup: makeSetup('Mine'),
        ownerUserId: 'u1',
      };
      const other: SavedLoadout = { ...mine, name: 'Other', ownerUserId: 'u2' };
      const store = createTestStore([mine, other]);

      store.dispatch(deleteSavedLoadout({ id: 'dup', ownerUserId: 'u1' }));

      const { loadouts } = store.getState().savedLoadouts;
      expect(loadouts).toHaveLength(1);
      expect(loadouts[0].ownerUserId).toBe('u2'); // the other account's row is untouched
    });
  });
});
