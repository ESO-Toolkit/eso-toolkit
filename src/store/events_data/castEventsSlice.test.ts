import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { FightFragment, HostilityType } from '../../graphql/gql/graphql';
import { CastEvent } from '../../types/combatlogEvents';

import castEventsReducer, {
  CastEventsState,
  clearCastEvents,
  fetchCastEvents,
} from './castEventsSlice';

// Mock the esologsClient
jest.mock('../../esologsClient');

describe('castEventsSlice', () => {
  let store: ReturnType<typeof configureStore>;
  let mockClient: jest.Mocked<EsoLogsClient>;
  let mockFight: FightFragment;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        events: combineReducers({
          casts: castEventsReducer,
        }),
      },
    });
    mockClient = {
      query: jest.fn(),
    } as any;

    mockFight = {
      __typename: 'ReportFight',
      id: 1,
      startTime: 1000,
      endTime: 2000,
      name: 'Test Fight',
      difficulty: 1,
      friendlyPlayers: [1, 2, 3],
      enemyPlayers: [4, 5, 6],
      bossPercentage: 0,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const state = store.getState() as { events: { casts: CastEventsState } };
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
    });
  });

  describe('clearCastEvents', () => {
    it('should reset state to initial values', () => {
      // Set up state with some data
      store.dispatch({
        type: 'castEvents/fetchCastEvents/fulfilled',
        payload: [mockCastEvent()],
        meta: {
          arg: {
            reportCode: 'test123',
            fight: mockFight,
            client: mockClient,
          },
        },
      });

      // Clear the data
      store.dispatch(clearCastEvents());

      const state = store.getState() as { events: { casts: CastEventsState } };
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
    });
  });

  describe('fetchCastEvents async thunk', () => {
    const mockCastEvents: CastEvent[] = [
      {
        type: 'cast',
        timestamp: 1500,
        sourceID: 1,
        sourceIsFriendly: true,
        targetID: 2,
        targetIsFriendly: true,
        abilityGameID: 123,
        fight: 1,
        fake: false,
      },
    ];

    describe('pending', () => {
      it('should set loading to true and clear error', () => {
        store.dispatch({
          type: 'castEvents/fetchCastEvents/pending',
        });

        const state = store.getState() as { events: { casts: CastEventsState } };
        expect(state.events.casts.loading).toBe(true);
        expect(state.events.casts.error).toBeNull();
      });
    });

    describe('fulfilled', () => {
      it('should store cast events and update cache metadata', async () => {
        const mockFriendlyResponse = {
          reportData: {
            report: {
              events: {
                data: [
                  ...mockCastEvents,
                  // Add some non-cast events that should be filtered out
                  { type: 'damage', fake: false },
                  { type: 'cast', fake: true }, // Fake event should be filtered
                ],
                nextPageTimestamp: null,
              },
            },
          },
        };

        const mockEnemyResponse = {
          reportData: {
            report: {
              events: {
                data: [
                  // No events for enemies in this test case
                ],
                nextPageTimestamp: null,
              },
            },
          },
        };

        // First call (friendlies) returns events, second call (enemies) returns empty
        mockClient.query
          .mockResolvedValueOnce(mockFriendlyResponse)
          .mockResolvedValueOnce(mockEnemyResponse);

        const reportCode = 'ABC123';
        const mockTimestamp = 1234567890;

        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        await store.dispatch(
          fetchCastEvents({ reportCode, fight: mockFight, client: mockClient }) as any,
        );

        const state = store.getState() as { events: { casts: CastEventsState } };

        expect(state.events.casts.loading).toBe(false);
        expect(state.events.casts.error).toBeNull();
        expect(state.events.casts.events).toEqual(mockCastEvents);

        // Check cache metadata
        expect(state.events.casts.cacheMetadata).toEqual({
          lastFetchedReportId: reportCode,
          lastFetchedFightId: Number(mockFight.id),
          lastFetchedTimestamp: mockTimestamp,
        });

        // Should call query twice (for friendlies and enemies)
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              code: reportCode,
              fightIds: [Number(mockFight.id)],
              startTime: mockFight.startTime,
              endTime: mockFight.endTime,
              hostilityType: HostilityType.Friendlies,
            }),
          }),
        );
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              hostilityType: HostilityType.Enemies,
            }),
          }),
        );
      });
    });

    describe('rejected', () => {
      it('should set error message and stop loading', async () => {
        const errorMessage = 'Network error';
        mockClient.query.mockRejectedValueOnce(new Error(errorMessage));

        await store.dispatch(
          fetchCastEvents({ reportCode: 'ABC123', fight: mockFight, client: mockClient }) as any,
        );

        const state = store.getState() as { events: { casts: CastEventsState } };
        expect(state.events.casts.loading).toBe(false);
        expect(state.events.casts.error).toBe(errorMessage);
      });

      it('should handle undefined error with default message', async () => {
        mockClient.query.mockRejectedValueOnce({ message: undefined });

        await store.dispatch(
          fetchCastEvents({ reportCode: 'ABC123', fight: mockFight, client: mockClient }) as any,
        );

        const state = store.getState() as { events: { casts: CastEventsState } };
        expect(state.events.casts.error).toBe('Failed to fetch cast events');
      });
    });

    describe('cache condition behavior', () => {
      it('should not fetch if data is cached and fresh', async () => {
        const reportCode = 'ABC123';
        const recentTimestamp = Date.now() - 1000; // 1 second ago

        // Set up initial state manually by creating a custom action
        store.dispatch({
          type: 'castEvents/fetchCastEvents/fulfilled',
          payload: [mockCastEvent()],
          meta: {
            arg: { reportCode, fight: mockFight, client: mockClient },
          },
        });

        // Update timestamp by dispatching another action that updates the cache
        store.dispatch({
          type: 'TEST_UPDATE_CACHE_TIMESTAMP',
          payload: { timestamp: recentTimestamp },
        });

        await store.dispatch(
          fetchCastEvents({ reportCode, fight: mockFight, client: mockClient }) as any,
        );

        // Should not call the client because data is cached and fresh
        expect(mockClient.query).not.toHaveBeenCalled();
      });

      it('should fetch if data is cached but stale', async () => {
        const reportCode = 'ABC123';
        const staleTimestamp = Date.now() - DATA_FETCH_CACHE_TIMEOUT - 1000;

        // Mock Date.now to return stale timestamp for cache metadata setup
        const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(staleTimestamp);

        // Set up initial state with stale timestamp
        store.dispatch({
          type: 'castEvents/fetchCastEvents/fulfilled',
          payload: [mockCastEvent()],
          meta: {
            arg: { reportCode, fight: mockFight, client: mockClient },
          },
        });

        // Restore Date.now for the actual test
        dateNowSpy.mockRestore();

        const mockFriendlyResponse = {
          reportData: {
            report: {
              events: {
                data: mockCastEvents,
                nextPageTimestamp: null,
              },
            },
          },
        };

        const mockEnemyResponse = {
          reportData: {
            report: {
              events: {
                data: [],
                nextPageTimestamp: null,
              },
            },
          },
        };

        mockClient.query
          .mockResolvedValueOnce(mockFriendlyResponse)
          .mockResolvedValueOnce(mockEnemyResponse);

        await store.dispatch(
          fetchCastEvents({ reportCode, fight: mockFight, client: mockClient }) as any,
        );

        // Should call the client because data would be stale
        expect(mockClient.query).toHaveBeenCalled();
      });
    });
  });

  // Helper function to create mock cast event
  function mockCastEvent(): CastEvent {
    return {
      type: 'cast',
      timestamp: 1500,
      sourceID: 1,
      sourceIsFriendly: true,
      targetID: 2,
      targetIsFriendly: true,
      abilityGameID: 123,
      fight: 1,
      fake: false,
    };
  }
});
