import { configureStore } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { GetPlayersForReportDocument } from '../../graphql/gql/graphql';

import playerDataReducer, {
  PlayerDataEntry,
  PlayerDataState,
  clearPlayerData,
  clearPlayerDataForContext,
  fetchPlayerData,
  resetPlayerDataLoading,
  trimPlayerDataCache,
} from './playerDataSlice';
import { resolveCacheKey } from '../utils/keyedCacheState';

// Mock the esologsClient
jest.mock('../../esologsClient');

interface RootState {
  playerData: PlayerDataState;
}

/*
describe('playerDataSlice', () => {
  let store: ReturnType<typeof configureStore<RootState>>;
  let mockClient: jest.Mocked<EsoLogsClient>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        playerData: playerDataReducer,
      },
    });
    mockClient = {
      query: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const state = store.getState();
      expect(state.playerData).toEqual({
        playersById: {},
        loading: false,
        loaded: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedFightId: null,
          lastFetchedTimestamp: null,
          playerCount: 0,
        },
      });
    });
  });

  describe('clearPlayerData', () => {
    it('should reset state to initial values', () => {
      // Set up state with some data
      store.dispatch({
        type: 'playerData/fetchPlayerData/fulfilled',
        payload: {
          playersById: { 1: mockPlayerWithRole('tank') },
          reportCode: 'test123',
          fightId: 1,
        },
      });

      // Clear the data
      store.dispatch(clearPlayerData());

      const state = store.getState();
      expect(state.playerData).toEqual({
        playersById: {},
        loading: false,
        loaded: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedFightId: null,
          lastFetchedTimestamp: null,
          playerCount: 0,
        },
      });
    });
  });

  describe('resetPlayerDataLoading', () => {
    it('should reset loading and error states', () => {
      // Set up state with loading and error
      store.dispatch({
        type: 'playerData/fetchPlayerData/pending',
      });
      store.dispatch({
        type: 'playerData/fetchPlayerData/rejected',
        payload: 'Test error',
      });

      // Reset loading state
      store.dispatch(resetPlayerDataLoading());

      const state = store.getState();
      expect(state.playerData.loading).toBe(false);
      expect(state.playerData.error).toBeNull();
    });
  });

  describe('fetchPlayerData async thunk', () => {
    const mockPlayerDetails: PlayerDetails = {
      dps: [
        {
          name: 'DPS Player',
          id: 1,
          guid: 1001,
          type: 'Nightblade',
          server: 'PC-EU',
          displayName: '@dpsplayer',
          anonymous: false,
          icon: 'nightblade.png',
          specs: [{ spec: 'Magicka DPS', count: 1 }],
          potionUse: 5,
          healthstoneUse: 0,
          combatantInfo: {
            stats: [100, 200, 300],
            talents: [],
            gear: [],
          },
        },
      ],
      healers: [
        {
          name: 'Healer Player',
          id: 2,
          guid: 1002,
          type: 'Templar',
          server: 'PC-EU',
          displayName: '@healerplayer',
          anonymous: false,
          icon: 'templar.png',
          specs: [{ spec: 'Magicka Healer', count: 1 }],
          potionUse: 3,
          healthstoneUse: 0,
          combatantInfo: {
            stats: [80, 250, 200],
            talents: [],
            gear: [],
          },
        },
      ],
      tanks: [
        {
          name: 'Tank Player',
          id: 3,
          guid: 1003,
          type: 'Dragonknight',
          server: 'PC-EU',
          displayName: '@tankplayer',
          anonymous: false,
          icon: 'dragonknight.png',
          specs: [{ spec: 'Tank', count: 1 }],
          potionUse: 2,
          healthstoneUse: 0,
          combatantInfo: {
            stats: [120, 150, 400],
            talents: [],
            gear: [],
          },
        },
      ],
    };

    describe('pending', () => {
      it('should set loading to true and clear error', () => {
        store.dispatch({
          type: 'playerData/fetchPlayerData/pending',
        });

        const state = store.getState();
        expect(state.playerData.loading).toBe(true);
        expect(state.playerData.error).toBeNull();
        expect(state.playerData.loaded).toBe(false);
      });
    });

    describe('fulfilled', () => {
      it('should store player data with roles and update cache metadata', async () => {
        const mockResponse = {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: mockPlayerDetails,
                },
              },
            },
          },
        };

        mockClient.query.mockResolvedValueOnce(mockResponse);

        const reportCode = 'ABC123';
        const fightId = 1;
        const mockTimestamp = 1234567890;

        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        await store.dispatch(fetchPlayerData({ reportCode, fightId, client: mockClient }));

        const state = store.getState();

        expect(state.playerData.loading).toBe(false);
        expect(state.playerData.loaded).toBe(true);
        expect(state.playerData.error).toBeNull();

        // Check that players are mapped with correct roles
        const playersById = state.playerData.playersById;
        expect(playersById[1]).toEqual({
          ...mockPlayerDetails.dps[0],
          role: 'dps',
        });
        expect(playersById[2]).toEqual({
          ...mockPlayerDetails.healers[0],
          role: 'healer',
        });
        expect(playersById[3]).toEqual({
          ...mockPlayerDetails.tanks[0],
          role: 'tank',
        });

        // Check cache metadata
        expect(state.playerData.cacheMetadata).toEqual({
          lastFetchedReportId: reportCode,
          lastFetchedFightId: fightId,
          lastFetchedTimestamp: mockTimestamp,
          playerCount: 0, // This doesn't seem to be updated in the reducer
        });

        expect(mockClient.query).toHaveBeenCalledWith({
          query: GetPlayersForReportDocument,
          variables: { code: reportCode, fightIDs: [fightId] },
        });
      });

      it('should handle damage role mapping to dps', async () => {
        const mockPlayerDetailsWithDamage: PlayerDetails = {
          damage: [mockPlayerDetails.dps[0]], // Use 'damage' key instead of 'dps'
          healers: [],
          tanks: [],
        };

        const mockResponse = {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: mockPlayerDetailsWithDamage,
                },
              },
            },
          },
        };

        mockClient.query.mockResolvedValueOnce(mockResponse);

        await store.dispatch(
          fetchPlayerData({ reportCode: 'ABC123', fightId: 1, client: mockClient }),
        );

        const state = store.getState();
        expect(state.playerData.playersById[1]?.role).toBe('dps');
      });

      it('should default unknown roles to dps', async () => {
        const mockPlayerDetailsWithUnknownRole = {
          unknownRole: [mockPlayerDetails.dps[0]], // Unknown role
          healers: [],
          tanks: [],
        };

        const mockResponse = {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: mockPlayerDetailsWithUnknownRole,
                },
              },
            },
          },
        };

        mockClient.query.mockResolvedValueOnce(mockResponse);

        await store.dispatch(
          fetchPlayerData({ reportCode: 'ABC123', fightId: 1, client: mockClient }),
        );

        const state = store.getState();
        expect(state.playerData.playersById[1]?.role).toBe('dps');
      });
    });

    describe('rejected', () => {
      it('should set error message and stop loading', async () => {
        const errorMessage = 'Network error';
        mockClient.query.mockRejectedValueOnce(new Error(errorMessage));

        await store.dispatch(
          fetchPlayerData({ reportCode: 'ABC123', fightId: 1, client: mockClient }),
        );

        const state = store.getState();
        expect(state.playerData.loading).toBe(false);
        expect(state.playerData.error).toBe(errorMessage);
        expect(state.playerData.loaded).toBe(false);
      });

      it('should handle non-error rejections with default message', async () => {
        mockClient.query.mockRejectedValueOnce('string error');

        await store.dispatch(
          fetchPlayerData({ reportCode: 'ABC123', fightId: 1, client: mockClient }),
        );

        const state = store.getState();
        expect(state.playerData.error).toBe('Failed to fetch player data');
      });
    });

    describe('cache condition', () => {
      it('should not fetch if data is already cached for same report and fight', async () => {
        const reportCode = 'ABC123';
        const fightId = 1;

        // Set up cached state
        store.dispatch({
          type: 'playerData/fetchPlayerData/fulfilled',
          payload: {
            playersById: { 1: mockPlayerWithRole('dps') },
            reportCode,
            fightId,
          },
        });

        // Try to fetch the same data again
        await store.dispatch(fetchPlayerData({ reportCode, fightId, client: mockClient }));

        // Should not call the client because data is cached
        expect(mockClient.query).not.toHaveBeenCalled();
      });

      it('should not fetch if already loading', async () => {
        // Set loading state
        store.dispatch({
          type: 'playerData/fetchPlayerData/pending',
        });

        await store.dispatch(
          fetchPlayerData({ reportCode: 'ABC123', fightId: 1, client: mockClient }),
        );

        // Should not call the client because already loading
        expect(mockClient.query).not.toHaveBeenCalled();
      });

      it('should fetch if different report code', async () => {
        const reportCode1 = 'ABC123';
        const reportCode2 = 'DEF456';
        const fightId = 1;

        // Set up cached state
        store.dispatch({
          type: 'playerData/fetchPlayerData/fulfilled',
          payload: {
            playersById: { 1: mockPlayerWithRole('dps') },
            reportCode: reportCode1,
            fightId,
          },
        });

        const mockResponse = {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: mockPlayerDetails,
                },
              },
            },
          },
        };

        mockClient.query.mockResolvedValueOnce(mockResponse);

        // Try to fetch different report
        await store.dispatch(
          fetchPlayerData({ reportCode: reportCode2, fightId, client: mockClient }),
        );

        // Should call the client because it's a different report
        expect(mockClient.query).toHaveBeenCalled();
      });

      it('should fetch if different fight ID', async () => {
        const reportCode = 'ABC123';
        const fightId1 = 1;
        const fightId2 = 2;

        // Set up cached state
        store.dispatch({
          type: 'playerData/fetchPlayerData/fulfilled',
          payload: {
            playersById: { 1: mockPlayerWithRole('dps') },
            reportCode,
            fightId: fightId1,
          },
        });

        const mockResponse = {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: mockPlayerDetails,
                },
              },
            },
          },
        };

        mockClient.query.mockResolvedValueOnce(mockResponse);

        // Try to fetch different fight
        await store.dispatch(
          fetchPlayerData({ reportCode, fightId: fightId2, client: mockClient }),
        );

        // Should call the client because it's a different fight
        expect(mockClient.query).toHaveBeenCalled();
      });
    });
  });

  // Helper function to create mock player with role
  function mockPlayerWithRole(role: 'dps' | 'tank' | 'healer'): PlayerDetailsWithRole {
    return {
      name: `${role} Player`,
      id: 1,
      guid: 1001,
      type: 'TestClass',
      server: 'PC-EU',
      displayName: `@${role}player`,
      anonymous: false,
      icon: 'test.png',
      specs: [{ spec: `${role} spec`, count: 1 }],
      potionUse: 0,
      healthstoneUse: 0,
      combatantInfo: {
        stats: [100, 200, 300],
        talents: [],
        gear: [],
      },
      role,
    };
  }
});
*/

const mockPlayersResponse = () => ({
  reportData: {
    report: {
      playerDetails: {
        data: {
          playerDetails: {
            dps: [
              {
                name: 'DPS Player',
                id: 1,
                guid: 1001,
                type: 'Nightblade',
                server: 'PC-EU',
                displayName: '@dpsplayer',
                anonymous: false,
                icon: 'nightblade.png',
                specs: [{ spec: 'Magicka DPS', count: 1 }],
                potionUse: 5,
                healthstoneUse: 0,
                combatantInfo: {
                  stats: [100, 200, 300],
                  talents: [],
                  gear: [],
                },
              },
            ],
            healers: [],
            tanks: [],
          },
        },
      },
    },
  },
});

const getEntry = (
  state: RootState,
  reportCode: string,
  fightId: number,
): PlayerDataEntry | null => {
  const { key } = resolveCacheKey({ reportCode, fightId });
  return state.playerData.entries[key] ?? null;
};

describe('playerDataSlice keyed cache', () => {
  let store: ReturnType<typeof configureStore<RootState>>;
  let mockClient: jest.Mocked<EsoLogsClient>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        playerData: playerDataReducer,
      },
    });

    mockClient = {
      query: jest.fn(),
    } as unknown as jest.Mocked<EsoLogsClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('initializes with empty keyed cache', () => {
    expect(store.getState().playerData).toEqual({ entries: {}, accessOrder: [] });
  });

  it('clears entire cache', () => {
    store.dispatch({
      type: fetchPlayerData.fulfilled.type,
      payload: {
        playersById: {
          1: mockPlayersResponse().reportData.report.playerDetails.data.playerDetails.dps[0] as any,
        },
        reportCode: 'A',
        fightId: 1,
      },
      meta: { requestId: 'fulfilled' },
    });

    store.dispatch(clearPlayerData());

    expect(store.getState().playerData).toEqual({ entries: {}, accessOrder: [] });
  });

  it('clears a specific context', () => {
    store.dispatch({
      type: fetchPlayerData.fulfilled.type,
      payload: {
        playersById: {
          1: mockPlayersResponse().reportData.report.playerDetails.data.playerDetails.dps[0] as any,
        },
        reportCode: 'A',
        fightId: 1,
      },
      meta: { requestId: 'fulfilled' },
    });

    store.dispatch(clearPlayerDataForContext({ reportCode: 'A', fightId: 1 }));

    expect(store.getState().playerData).toEqual({ entries: {}, accessOrder: [] });
  });

  it('resets loading state across entries', () => {
    store.dispatch({
      type: fetchPlayerData.pending.type,
      meta: { arg: { reportCode: 'A', fightId: 1 }, requestId: 'pending' },
    });
    store.dispatch({
      type: fetchPlayerData.rejected.type,
      meta: { arg: { reportCode: 'A', fightId: 1 }, requestId: 'pending' },
      payload: 'error',
    });

    store.dispatch(resetPlayerDataLoading());

    const entry = getEntry(store.getState(), 'A', 1);
    // resetPlayerDataLoading sets status to idle if loading, and clears error
    expect(entry?.status).toBe('failed'); // Status remains failed, not loading
    expect(entry?.error).toBeNull(); // Error is cleared
  });

  it('trims cache according to provided limit', () => {
    for (let i = 0; i < 5; i++) {
      // Dispatch pending action first to set up currentRequest
      store.dispatch({
        type: fetchPlayerData.pending.type,
        meta: {
          arg: { reportCode: 'A', fightId: i, client: {} },
          requestId: String(i),
        },
      });
      // Then dispatch fulfilled action
      store.dispatch({
        type: fetchPlayerData.fulfilled.type,
        payload: { playersById: {}, reportCode: 'A', fightId: i },
        meta: {
          arg: { reportCode: 'A', fightId: i, client: {} },
          requestId: String(i),
        },
      });
    }

    // Initial state should have 5 entries
    expect(Object.keys(store.getState().playerData.entries)).toHaveLength(5);
    expect(store.getState().playerData.accessOrder).toHaveLength(5);

    store.dispatch(trimPlayerDataCache({ maxEntries: 2 }));

    // After trimming, should only have 2 entries (most recent)
    const state = store.getState().playerData;
    expect(Object.keys(state.entries)).toHaveLength(2);
    expect(state.accessOrder).toHaveLength(2);
    // Verify the most recent entries are kept (A::3 and A::4)
    expect(state.accessOrder).toEqual(['A::3', 'A::4']);
  });

  describe('fetchPlayerData thunk', () => {
    it('populates cache entry on success', async () => {
      mockClient.query.mockResolvedValue(mockPlayersResponse());
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      const entry = getEntry(store.getState(), 'A', 1);
      expect(entry?.status).toBe('succeeded');
      expect(entry?.cacheMetadata.lastFetchedTimestamp).toBe(123456789);
      expect(entry?.playersById[1]?.role).toBe('dps');

      expect(mockClient.query).toHaveBeenCalledWith({
        query: GetPlayersForReportDocument,
        variables: { code: 'A', fightIDs: [1] },
      });

      nowSpy.mockRestore();
    });

    it('stores error state on failure', async () => {
      mockClient.query.mockRejectedValue(new Error('network'));

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      const entry = getEntry(store.getState(), 'A', 1);
      expect(entry?.status).toBe('failed');
      expect(entry?.error).toBe('network');
    });

    it('reuses fresh cache entries', async () => {
      mockClient.query.mockResolvedValue(mockPlayersResponse());
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1000);

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      nowSpy.mockReturnValue(1000 + DATA_FETCH_CACHE_TIMEOUT / 2);

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      nowSpy.mockRestore();
    });

    it('allows refetch when cache is stale', async () => {
      mockClient.query.mockResolvedValue(mockPlayersResponse());
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1000);

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      nowSpy.mockReturnValue(1000 + DATA_FETCH_CACHE_TIMEOUT + 1);

      await store.dispatch(fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }));

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      nowSpy.mockRestore();
    });

    it('ignores stale fulfilled responses', async () => {
      mockClient.query.mockResolvedValue(mockPlayersResponse());

      const pendingPromise = store.dispatch(
        fetchPlayerData({ reportCode: 'A', fightId: 1, client: mockClient }),
      );

      store.dispatch({
        type: fetchPlayerData.fulfilled.type,
        payload: { playersById: {}, reportCode: 'A', fightId: 1 },
        meta: { requestId: 'stale' },
      });

      await pendingPromise;

      const entry = getEntry(store.getState(), 'A', 1);
      expect(entry?.status).toBe('succeeded');
    });
  });
});
