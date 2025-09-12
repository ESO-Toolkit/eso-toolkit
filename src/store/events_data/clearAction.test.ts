import { configureStore } from '@reduxjs/toolkit';

import { clearAllEvents } from './clearAction';
import { eventsReducer } from './index';

// Import individual slice actions to set up test data
import { clearCastEvents } from './castEventsSlice';
import damageEventsReducer from './damageEventsSlice';
import castEventsReducer from './castEventsSlice';

// Define store type
const createTestStore = () =>
  configureStore({
    reducer: {
      events: eventsReducer,
    },
  });

type TestStore = ReturnType<typeof createTestStore>;
type TestRootState = ReturnType<TestStore['getState']>;

describe('clearAction', () => {
  let store: TestStore;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('clearAllEvents action', () => {
    it('should be created correctly', () => {
      const action = clearAllEvents();
      expect(action).toEqual({
        type: 'events/clearAll',
        payload: undefined,
      });
    });

    it('should have the correct type', () => {
      expect(clearAllEvents.type).toBe('events/clearAll');
    });
  });

  describe('eventsReducer with clearAllEvents', () => {
    it('should reset all event slices to initial state when clearAllEvents is dispatched', () => {
      // First, set up some data in different event slices
      store.dispatch({
        type: 'castEvents/fetchCastEvents/fulfilled',
        payload: [
          {
            type: 'cast',
            timestamp: 1000,
            sourceID: 1,
            targetID: 2,
            abilityGameID: 123,
            fight: 1,
            sourceIsFriendly: true,
            targetIsFriendly: false,
            fake: false,
          },
        ],
        meta: {
          arg: {
            reportCode: 'test123',
            fight: { id: 1 },
            client: {},
          },
        },
      });

      store.dispatch({
        type: 'damageEvents/fetchDamageEvents/fulfilled',
        payload: [
          {
            type: 'damage',
            timestamp: 1500,
            sourceID: 1,
            targetID: 2,
            abilityGameID: 456,
            fight: 1,
            sourceIsFriendly: true,
            targetIsFriendly: false,
            hitType: 1,
            amount: 100,
            castTrackID: 1,
            sourceResources: {
              hitPoints: 100,
              maxHitPoints: 100,
              magicka: 100,
              maxMagicka: 100,
              stamina: 100,
              maxStamina: 100,
              ultimate: 0,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 100,
              absorb: 0,
              championPoints: 0,
              x: 0,
              y: 0,
              facing: 0,
            },
            targetResources: {
              hitPoints: 50,
              maxHitPoints: 100,
              magicka: 80,
              maxMagicka: 100,
              stamina: 90,
              maxStamina: 100,
              ultimate: 10,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 100,
              absorb: 0,
              championPoints: 0,
              x: 10,
              y: 20,
              facing: 90,
            },
          },
        ],
        meta: {
          arg: {
            reportCode: 'test123',
            fight: { id: 1 },
            client: {},
          },
        },
      });

      // Verify that data exists
      let state = store.getState() as TestRootState;
      expect(state.events.casts.events.length).toBeGreaterThan(0);
      expect(state.events.damage.events.length).toBeGreaterThan(0);

      // Dispatch clearAllEvents
      store.dispatch(clearAllEvents());

      // Verify that all event slices are reset to initial state
      state = store.getState() as TestRootState;

      // Check cast events slice
      expect(state.events.casts).toEqual({
        events: [],
        loading: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedFightId: null,
          lastFetchedTimestamp: null,
        },
      });

      // Check damage events slice
      expect(state.events.damage).toEqual({
        events: [],
        loading: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedFightId: null,
          lastFetchedTimestamp: null,
        },
      });

      // Check other slices have initial state structure
      expect(state.events.combatantInfo.events).toEqual([]);
      expect(state.events.deaths.events).toEqual([]);
      expect(state.events.debuffs.events).toEqual([]);
      expect(state.events.friendlyBuffs.events).toEqual([]);
      expect(state.events.healing.events).toEqual([]);
      expect(state.events.hostileBuffs.events).toEqual([]);
      expect(state.events.resources.events).toEqual([]);
    });

    it('should reset loading states in all slices', () => {
      // Set loading states in various slices
      store.dispatch({
        type: 'castEvents/fetchCastEvents/pending',
      });

      store.dispatch({
        type: 'damageEvents/fetchDamageEvents/pending',
      });

      // Verify loading states are set
      let state = store.getState() as TestRootState;
      expect(state.events.casts.loading).toBe(true);
      expect(state.events.damage.loading).toBe(true);

      // Dispatch clearAllEvents
      store.dispatch(clearAllEvents());

      // Verify loading states are reset
      state = store.getState() as TestRootState;
      expect(state.events.casts.loading).toBe(false);
      expect(state.events.damage.loading).toBe(false);
    });

    it('should reset error states in all slices', () => {
      // Set error states in various slices
      store.dispatch({
        type: 'castEvents/fetchCastEvents/rejected',
        error: { message: 'Cast events error' },
      });

      store.dispatch({
        type: 'damageEvents/fetchDamageEvents/rejected',
        error: { message: 'Damage events error' },
      });

      // Verify error states are set
      let state = store.getState() as TestRootState;
      expect(state.events.casts.error).toBe('Cast events error');
      expect(state.events.damage.error).toBe('Damage events error');

      // Dispatch clearAllEvents
      store.dispatch(clearAllEvents());

      // Verify error states are reset
      state = store.getState() as TestRootState;
      expect(state.events.casts.error).toBeNull();
      expect(state.events.damage.error).toBeNull();
    });

    it('should reset cache metadata in all slices', () => {
      // Set up cache metadata
      store.dispatch({
        type: 'castEvents/fetchCastEvents/fulfilled',
        payload: [],
        meta: {
          arg: {
            reportCode: 'cached-report',
            fight: { id: 123 },
            client: {},
          },
        },
      });

      // Verify cache metadata is set
      let state = store.getState() as TestRootState;
      expect(state.events.casts.cacheMetadata.lastFetchedReportId).toBe('cached-report');
      expect(state.events.casts.cacheMetadata.lastFetchedFightId).toBe(123);
      expect(state.events.casts.cacheMetadata.lastFetchedTimestamp).not.toBeNull();

      // Dispatch clearAllEvents
      store.dispatch(clearAllEvents());

      // Verify cache metadata is reset
      state = store.getState() as TestRootState;
      expect(state.events.casts.cacheMetadata).toEqual({
        lastFetchedReportId: null,
        lastFetchedFightId: null,
        lastFetchedTimestamp: null,
      });
    });

    it('should not affect individual slice clear actions', () => {
      // Set up data in cast events
      store.dispatch({
        type: 'castEvents/fetchCastEvents/fulfilled',
        payload: [
          {
            type: 'cast',
            timestamp: 1000,
            sourceID: 1,
            targetID: 2,
            abilityGameID: 123,
            fight: 1,
            sourceIsFriendly: true,
            targetIsFriendly: false,
            fake: false,
          },
        ],
        meta: {
          arg: {
            reportCode: 'test123',
            fight: { id: 1 },
            client: {},
          },
        },
      });

      // Set up data in damage events
      store.dispatch({
        type: 'damageEvents/fetchDamageEvents/fulfilled',
        payload: [
          {
            type: 'damage',
            timestamp: 1500,
            sourceID: 1,
            targetID: 2,
            abilityGameID: 456,
            fight: 1,
            sourceIsFriendly: true,
            targetIsFriendly: false,
            hitType: 1,
            amount: 100,
            castTrackID: 1,
            sourceResources: {
              hitPoints: 100,
              maxHitPoints: 100,
              magicka: 100,
              maxMagicka: 100,
              stamina: 100,
              maxStamina: 100,
              ultimate: 0,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 100,
              absorb: 0,
              championPoints: 0,
              x: 0,
              y: 0,
              facing: 0,
            },
            targetResources: {
              hitPoints: 50,
              maxHitPoints: 100,
              magicka: 80,
              maxMagicka: 100,
              stamina: 90,
              maxStamina: 100,
              ultimate: 10,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 100,
              absorb: 0,
              championPoints: 0,
              x: 10,
              y: 20,
              facing: 90,
            },
          },
        ],
        meta: {
          arg: {
            reportCode: 'test123',
            fight: { id: 1 },
            client: {},
          },
        },
      });

      // Clear only cast events using individual slice action
      store.dispatch(clearCastEvents());

      const state = store.getState() as TestRootState;

      // Cast events should be cleared
      expect(state.events.casts.events).toEqual([]);
      expect(state.events.casts.cacheMetadata.lastFetchedReportId).toBeNull();

      // Damage events should still have data
      expect(state.events.damage.events.length).toBeGreaterThan(0);
      expect(state.events.damage.cacheMetadata.lastFetchedReportId).toBe('test123');
    });
  });

  describe('eventsReducer behavior', () => {
    it('should delegate to combinedEventsReducer for non-clearAllEvents actions', () => {
      // Any regular action should be processed normally
      store.dispatch({
        type: 'castEvents/fetchCastEvents/pending',
      });

      const state = store.getState() as TestRootState;
      expect(state.events.casts.loading).toBe(true);
    });

    it('should handle undefined state correctly', () => {
      // Create a fresh store without dispatching any actions
      const freshStore = createTestStore();

      const state = freshStore.getState() as TestRootState;

      // Should have all the expected slice properties with initial states
      expect(state.events).toHaveProperty('casts');
      expect(state.events).toHaveProperty('damage');
      expect(state.events).toHaveProperty('combatantInfo');
      expect(state.events).toHaveProperty('deaths');
      expect(state.events).toHaveProperty('debuffs');
      expect(state.events).toHaveProperty('friendlyBuffs');
      expect(state.events).toHaveProperty('healing');
      expect(state.events).toHaveProperty('hostileBuffs');
      expect(state.events).toHaveProperty('resources');

      // Each slice should have its initial state
      expect(state.events.casts.events).toEqual([]);
      expect(state.events.damage.events).toEqual([]);
    });
  });
});
