import { configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { ReportAbilityFragment, ReportActorFragment } from '../../graphql/gql/graphql';

import masterDataReducer, {
  MasterDataState,
  clearMasterData,
  resetLoadingState,
  forceMasterDataRefresh,
  fetchReportMasterData,
  MasterDataPayload,
  setMasterDataContext,
} from './masterDataSlice';

// Mock the esologsClient
jest.mock('../../esologsClient');

interface RootState {
  masterData: MasterDataState;
}

describe('masterDataSlice', () => {
  const createTestStore = () =>
    configureStore<RootState>({
      reducer: {
        masterData: masterDataReducer,
      },
    });
  let store!: ReturnType<typeof createTestStore>;
  let mockClient: jest.Mocked<EsoLogsClient>;
  const setContext = (reportCode: string | null) => {
    store.dispatch(setMasterDataContext(reportCode));
  };

  beforeEach(() => {
    store = createTestStore();
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
      expect(state.masterData).toEqual({
        abilitiesById: {},
        actorsById: {},
        loading: false,
        loaded: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedTimestamp: null,
          actorCount: 0,
          abilityCount: 0,
        },
        activeContext: { reportId: null },
        entriesByReportId: {},
      });
    });
  });

  describe('clearMasterData', () => {
    it('should reset all state to initial values', () => {
      // First, set up some state
      const mockAbility: ReportAbilityFragment = {
        gameID: 1,
        name: 'Test Ability',
        icon: 'icon.png',
      };
      const mockActor: ReportActorFragment = { id: 1, name: 'Test Actor', type: 'Player' };

      const mockData: MasterDataPayload = {
        reportCode: 'test-report',
        abilities: [],
        abilitiesById: { 1: mockAbility },
        actors: [],
        actorsById: { 1: mockActor },
      };

      setContext('test-report');
      store.dispatch(
        fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
          reportCode: 'test-report',
          client: mockClient,
        }),
      );

      // Verify state has data
      let state = store.getState();
      expect(state.masterData.loaded).toBe(true);
      expect(Object.keys(state.masterData.abilitiesById)).toHaveLength(1);
      expect(Object.keys(state.masterData.actorsById)).toHaveLength(1);
      expect(state.masterData.entriesByReportId['test-report']).toBeDefined();

      // Clear the data
      store.dispatch(clearMasterData());

      // Verify state is reset
      state = store.getState();
      expect(state.masterData).toEqual({
        abilitiesById: {},
        actorsById: {},
        loading: false,
        loaded: false,
        error: null,
        cacheMetadata: {
          lastFetchedReportId: null,
          lastFetchedTimestamp: null,
          actorCount: 0,
          abilityCount: 0,
        },
        activeContext: { reportId: null },
        entriesByReportId: {},
      });
    });

    it('should clear error state', () => {
      // First set an error state
      setContext('test-report');
      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('Test error'),
          'test-request-id',
          { reportCode: 'test-report', client: mockClient },
          'Test error',
        ),
      );

      let state = store.getState();
      expect(state.masterData.error).toBe('Test error');

      // Clear the data
      store.dispatch(clearMasterData());

      state = store.getState();
      expect(state.masterData.error).toBeNull();
      expect(state.masterData.entriesByReportId).toEqual({});
      expect(state.masterData.activeContext).toEqual({ reportId: null });
    });
  });

  describe('setMasterDataContext', () => {
    it('should synchronize active state with the targeted entry', () => {
      const reportOne = 'report-one';
      const reportTwo = 'report-two';

      const reportOneData: MasterDataPayload = {
        reportCode: reportOne,
        abilities: [{ gameID: 1, name: 'Ability 1', icon: 'icon1.png' }],
        abilitiesById: { 1: { gameID: 1, name: 'Ability 1', icon: 'icon1.png' } },
        actors: [{ id: 1, name: 'Actor 1', type: 'Player' }],
        actorsById: { 1: { id: 1, name: 'Actor 1', type: 'Player' } },
      };

      const reportTwoData: MasterDataPayload = {
        reportCode: reportTwo,
        abilities: [{ gameID: 2, name: 'Ability 2', icon: 'icon2.png' }],
        abilitiesById: { 2: { gameID: 2, name: 'Ability 2', icon: 'icon2.png' } },
        actors: [{ id: 2, name: 'Actor 2', type: 'NPC' }],
        actorsById: { 2: { id: 2, name: 'Actor 2', type: 'NPC' } },
      };

      setContext(reportOne);
      store.dispatch(
        fetchReportMasterData.fulfilled(reportOneData, 'request-one', {
          reportCode: reportOne,
          client: mockClient,
        }),
      );

      setContext(reportTwo);
      store.dispatch(
        fetchReportMasterData.fulfilled(reportTwoData, 'request-two', {
          reportCode: reportTwo,
          client: mockClient,
        }),
      );

      // Switch back to the first report and verify active state mirrors entry data
      setContext(reportOne);
      let state = store.getState();
      expect(state.masterData.activeContext.reportId).toBe(reportOne);
      expect(state.masterData.abilitiesById).toEqual(reportOneData.abilitiesById);
      expect(state.masterData.actorsById).toEqual(reportOneData.actorsById);

      // Switch to second report and ensure the active state mirrors its entry
      setContext(reportTwo);
      state = store.getState();
      expect(state.masterData.activeContext.reportId).toBe(reportTwo);
      expect(state.masterData.abilitiesById).toEqual(reportTwoData.abilitiesById);
      expect(state.masterData.actorsById).toEqual(reportTwoData.actorsById);
    });

    it('should clear active data when context is cleared', () => {
      const reportId = 'report-clear';
      const payload: MasterDataPayload = {
        reportCode: reportId,
        abilities: [{ gameID: 10, name: 'Ability', icon: 'icon.png' }],
        abilitiesById: { 10: { gameID: 10, name: 'Ability', icon: 'icon.png' } },
        actors: [{ id: 10, name: 'Actor', type: 'Player' }],
        actorsById: { 10: { id: 10, name: 'Actor', type: 'Player' } },
      };

      setContext(reportId);
      store.dispatch(
        fetchReportMasterData.fulfilled(payload, 'request-clear', {
          reportCode: reportId,
          client: mockClient,
        }),
      );

      setContext(null);

      const state = store.getState();
      expect(state.masterData.activeContext.reportId).toBeNull();
      expect(state.masterData.abilitiesById).toEqual({});
      expect(state.masterData.actorsById).toEqual({});
      expect(state.masterData.loading).toBe(false);
      expect(state.masterData.loaded).toBe(false);
      expect(state.masterData.error).toBeNull();
    });
  });

  describe('resetLoadingState', () => {
    it('should reset loading and error states without affecting data', () => {
      // Set up a loading state with error
      setContext('test-report');
      store.dispatch(
        fetchReportMasterData.pending('test-request-id', {
          reportCode: 'test-report',
          client: mockClient,
        }),
      );

      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('Test error'),
          'test-request-id',
          { reportCode: 'test-report', client: mockClient },
          'Test error',
        ),
      );

      let state = store.getState();
      expect(state.masterData.loading).toBe(false);
      expect(state.masterData.error).toBe('Test error');

      // Reset loading state
      store.dispatch(resetLoadingState());

      state = store.getState();
      expect(state.masterData.loading).toBe(false);
      expect(state.masterData.error).toBeNull();
      expect(state.masterData.entriesByReportId['test-report']?.loading).toBe(false);
      expect(state.masterData.entriesByReportId['test-report']?.error).toBeNull();
    });

    it('should not affect other state properties', () => {
      const mockData: MasterDataPayload = {
        reportCode: 'test-report',
        abilities: [{ gameID: 1, name: 'Test Ability', icon: 'icon.png' }],
        abilitiesById: { 1: { gameID: 1, name: 'Test Ability', icon: 'icon.png' } },
        actors: [{ id: 1, name: 'Test Actor', type: 'Player' }],
        actorsById: { 1: { id: 1, name: 'Test Actor', type: 'Player' } },
      };

      setContext('test-report');
      store.dispatch(
        fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
          reportCode: 'test-report',
          client: mockClient,
        }),
      );

      const beforeReset = store.getState();

      store.dispatch(resetLoadingState());

      const afterReset = store.getState();

      // Data should remain unchanged
      expect(afterReset.masterData.abilitiesById).toEqual(beforeReset.masterData.abilitiesById);
      expect(afterReset.masterData.actorsById).toEqual(beforeReset.masterData.actorsById);
      expect(afterReset.masterData.loaded).toBe(beforeReset.masterData.loaded);
      expect(afterReset.masterData.cacheMetadata).toEqual(beforeReset.masterData.cacheMetadata);
      expect(afterReset.masterData.entriesByReportId['test-report']).toEqual(
        beforeReset.masterData.entriesByReportId['test-report'],
      );
    });
  });

  describe('forceMasterDataRefresh', () => {
    it('should clear cache timestamp and set loaded to false', () => {
      // First set up some data and cache metadata
      const mockData: MasterDataPayload = {
        reportCode: 'test-report',
        abilities: [{ gameID: 1, name: 'Test Ability', icon: 'icon.png' }],
        abilitiesById: { 1: { gameID: 1, name: 'Test Ability', icon: 'icon.png' } },
        actors: [{ id: 1, name: 'Test Actor', type: 'Player' }],
        actorsById: { 1: { id: 1, name: 'Test Actor', type: 'Player' } },
      };

      setContext('test-report');
      store.dispatch(
        fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
          reportCode: 'test-report',
          client: mockClient,
        }),
      );

      const beforeRefresh = store.getState();
      expect(beforeRefresh.masterData.loaded).toBe(true);
      expect(beforeRefresh.masterData.cacheMetadata.lastFetchedTimestamp).not.toBeNull();

      // Force refresh
      store.dispatch(forceMasterDataRefresh());

      const afterRefresh = store.getState();
      expect(afterRefresh.masterData.loaded).toBe(false);
      expect(afterRefresh.masterData.cacheMetadata.lastFetchedTimestamp).toBeNull();
      expect(
        afterRefresh.masterData.entriesByReportId['test-report']?.cacheMetadata.lastFetchedTimestamp,
      ).toBeNull();
      expect(afterRefresh.masterData.entriesByReportId['test-report']?.loaded).toBe(false);

      // Data should remain unchanged
      expect(afterRefresh.masterData.abilitiesById).toEqual(beforeRefresh.masterData.abilitiesById);
      expect(afterRefresh.masterData.actorsById).toEqual(beforeRefresh.masterData.actorsById);
      expect(afterRefresh.masterData.cacheMetadata.lastFetchedReportId).toEqual(
        beforeRefresh.masterData.cacheMetadata.lastFetchedReportId,
      );
    });
  });

  describe('fetchReportMasterData async thunk', () => {
    describe('pending state', () => {
      it('should set loading to true and clear error', () => {
        setContext('test-report');
        store.dispatch(
          fetchReportMasterData.pending('test-request-id', {
            reportCode: 'test-report',
            client: mockClient,
          }),
        );

        const state = store.getState();
        expect(state.masterData.loading).toBe(true);
        expect(state.masterData.error).toBeNull();
        expect(state.masterData.loaded).toBe(false);
        expect(state.masterData.entriesByReportId['test-report']?.loading).toBe(true);
      });
    });

    describe('fulfilled state', () => {
      it('should update state with fetched data', () => {
        const mockAbility: ReportAbilityFragment = {
          gameID: 12345,
          name: 'Weapon Enchantment - Poison',
          icon: 'ability_weapon_003.png',
        };

        const mockActor: ReportActorFragment = {
          id: 1,
          name: 'Test Player',
          type: 'Player',
        };

        const abilitiesById: Record<string | number, ReportAbilityFragment> = {};
        if (mockAbility.gameID !== null && mockAbility.gameID !== undefined) {
          abilitiesById[mockAbility.gameID] = mockAbility;
        }

        const actorsById: Record<string | number, ReportActorFragment> = {};
        if (mockActor.id !== null && mockActor.id !== undefined) {
          actorsById[mockActor.id] = mockActor;
        }

        const mockData: MasterDataPayload = {
          reportCode: 'test-report-123',
          abilities: [mockAbility],
          abilitiesById,
          actors: [mockActor],
          actorsById,
        };

        const beforeTime = Date.now();

        setContext('test-report-123');
        store.dispatch(
          fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
            reportCode: 'test-report-123',
            client: mockClient,
          }),
        );

        const afterTime = Date.now();
        const state = store.getState();
        const entry = state.masterData.entriesByReportId['test-report-123'];

        expect(state.masterData.loading).toBe(false);
        expect(state.masterData.loaded).toBe(true);
        expect(state.masterData.error).toBeNull();
        expect(state.masterData.abilitiesById).toEqual(abilitiesById);
        expect(state.masterData.actorsById).toEqual(actorsById);
        expect(entry?.abilitiesById).toEqual(abilitiesById);
        expect(entry?.actorsById).toEqual(actorsById);
        expect(entry?.loaded).toBe(true);
        expect(entry?.loading).toBe(false);

        // Check cache metadata
        expect(state.masterData.cacheMetadata.lastFetchedReportId).toBe('test-report-123');
        expect(state.masterData.cacheMetadata.lastFetchedTimestamp).toBeGreaterThanOrEqual(
          beforeTime,
        );
        expect(state.masterData.cacheMetadata.lastFetchedTimestamp).toBeLessThanOrEqual(afterTime);
        expect(state.masterData.cacheMetadata.actorCount).toBe(1);
        expect(state.masterData.cacheMetadata.abilityCount).toBe(1);
        expect(entry?.cacheMetadata.lastFetchedReportId).toBe('test-report-123');
      });

      it('should handle empty data arrays', () => {
        const mockData: MasterDataPayload = {
          reportCode: 'empty-report',
          abilities: [],
          abilitiesById: {},
          actors: [],
          actorsById: {},
        };

        setContext('empty-report');
        store.dispatch(
          fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
            reportCode: 'empty-report',
            client: mockClient,
          }),
        );

        const state = store.getState();
        const entry = state.masterData.entriesByReportId['empty-report'];
        expect(state.masterData.abilitiesById).toEqual({});
        expect(state.masterData.actorsById).toEqual({});
        expect(state.masterData.cacheMetadata.actorCount).toBe(0);
        expect(state.masterData.cacheMetadata.abilityCount).toBe(0);
        expect(state.masterData.loaded).toBe(true);
        expect(entry?.abilitiesById).toEqual({});
        expect(entry?.actorsById).toEqual({});
        expect(entry?.loaded).toBe(true);
      });

      it('should handle multiple abilities and actors', () => {
        const abilities = [
          { gameID: 1, name: 'Ability 1', icon: 'icon1.png' },
          { gameID: 2, name: 'Ability 2', icon: 'icon2.png' },
          { gameID: 3, name: 'Ability 3', icon: 'icon3.png' },
        ];

        const actors = [
          { id: 1, name: 'Player 1', type: 'Player' },
          { id: 2, name: 'Player 2', type: 'Player' },
          { id: 3, name: 'Boss', type: 'NPC' },
        ];

        const mockData: MasterDataPayload = {
          reportCode: 'multi-data-report',
          abilities,
          abilitiesById: abilities.reduce(
            (acc, ability) => ({ ...acc, [ability.gameID]: ability }),
            {},
          ),
          actors,
          actorsById: actors.reduce((acc, actor) => ({ ...acc, [actor.id]: actor }), {}),
        };

        setContext('multi-data-report');
        store.dispatch(
          fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
            reportCode: 'multi-data-report',
            client: mockClient,
          }),
        );

        const state = store.getState();
        const entry = state.masterData.entriesByReportId['multi-data-report'];
        expect(Object.keys(state.masterData.abilitiesById)).toHaveLength(3);
        expect(Object.keys(state.masterData.actorsById)).toHaveLength(3);
        expect(state.masterData.cacheMetadata.actorCount).toBe(3);
        expect(state.masterData.cacheMetadata.abilityCount).toBe(3);
        expect(Object.keys(entry?.abilitiesById ?? {})).toHaveLength(3);
        expect(Object.keys(entry?.actorsById ?? {})).toHaveLength(3);
      });
    });

    describe('rejected state', () => {
      it('should set error message and stop loading', () => {
        const errorMessage = 'Network error occurred';

        setContext('test-report');
        store.dispatch(
          fetchReportMasterData.rejected(
            new Error(errorMessage),
            'test-request-id',
            { reportCode: 'test-report', client: mockClient },
            errorMessage,
          ),
        );

        const state = store.getState();
        const entry = state.masterData.entriesByReportId['test-report'];
        expect(state.masterData.loading).toBe(false);
        expect(state.masterData.error).toBe(errorMessage);
        expect(state.masterData.loaded).toBe(false);
        expect(entry?.error).toBe(errorMessage);
        expect(entry?.loading).toBe(false);
      });

      it('should use default error message when payload is not provided', () => {
        setContext('test-report');
        store.dispatch(
          fetchReportMasterData.rejected(new Error('Some error'), 'test-request-id', {
            reportCode: 'test-report',
            client: mockClient,
          }),
        );

        const state = store.getState();
        expect(state.masterData.error).toBe('Failed to fetch master data');
        expect(state.masterData.entriesByReportId['test-report']?.error).toBe(
          'Failed to fetch master data',
        );
      });

      it('should not modify existing data on error', () => {
        // First set some data
        const mockData: MasterDataPayload = {
          reportCode: 'test-report',
          abilities: [{ gameID: 1, name: 'Test Ability', icon: 'icon.png' }],
          abilitiesById: { 1: { gameID: 1, name: 'Test Ability', icon: 'icon.png' } },
          actors: [{ id: 1, name: 'Test Actor', type: 'Player' }],
          actorsById: { 1: { id: 1, name: 'Test Actor', type: 'Player' } },
        };

        setContext('test-report');
        store.dispatch(
          fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
            reportCode: 'test-report',
            client: mockClient,
          }),
        );

        const stateBeforeError = store.getState();

        // Then trigger an error
        store.dispatch(
          fetchReportMasterData.rejected(
            new Error('Network error'),
            'test-request-id-2',
            { reportCode: 'different-report', client: mockClient },
            'Network error',
          ),
        );

        const stateAfterError = store.getState();

        // Data should remain unchanged
        expect(stateAfterError.masterData.abilitiesById).toEqual(
          stateBeforeError.masterData.abilitiesById,
        );
        expect(stateAfterError.masterData.actorsById).toEqual(
          stateBeforeError.masterData.actorsById,
        );
        expect(stateAfterError.masterData.cacheMetadata).toEqual(
          stateBeforeError.masterData.cacheMetadata,
        );

        // Error should be stored on the targeted entry while active data remains untouched
        expect(stateAfterError.masterData.loading).toBe(false);
        expect(stateAfterError.masterData.error).toBe(stateBeforeError.masterData.error);
        expect(stateAfterError.masterData.entriesByReportId['different-report']?.error).toBe(
          'Network error',
        );
        expect(stateAfterError.masterData.entriesByReportId['different-report']?.loaded).toBe(
          false,
        );
      });
    });
  });

  describe('caching behavior', () => {
    it('should track cache metadata correctly', () => {
      const mockData: MasterDataPayload = {
        reportCode: 'cache-test-report',
        abilities: [
          { gameID: 1, name: 'Ability 1', icon: 'icon1.png' },
          { gameID: 2, name: 'Ability 2', icon: 'icon2.png' },
        ],
        abilitiesById: {
          1: { gameID: 1, name: 'Ability 1', icon: 'icon1.png' },
          2: { gameID: 2, name: 'Ability 2', icon: 'icon2.png' },
        },
        actors: [
          { id: 1, name: 'Actor 1', type: 'Player' },
          { id: 2, name: 'Actor 2', type: 'Player' },
          { id: 3, name: 'Actor 3', type: 'NPC' },
        ],
        actorsById: {
          1: { id: 1, name: 'Actor 1', type: 'Player' },
          2: { id: 2, name: 'Actor 2', type: 'Player' },
          3: { id: 3, name: 'Actor 3', type: 'NPC' },
        },
      };

      const beforeTime = Date.now();

      setContext('cache-test-report');
      store.dispatch(
        fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
          reportCode: 'cache-test-report',
          client: mockClient,
        }),
      );

      const state = store.getState();
      const cacheMetadata = state.masterData.cacheMetadata;
      const entryMetadata = state.masterData.entriesByReportId['cache-test-report']?.cacheMetadata;

      expect(cacheMetadata.lastFetchedReportId).toBe('cache-test-report');
      expect(cacheMetadata.lastFetchedTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(cacheMetadata.actorCount).toBe(3);
      expect(cacheMetadata.abilityCount).toBe(2);
      expect(entryMetadata?.actorCount).toBe(3);
      expect(entryMetadata?.abilityCount).toBe(2);
    });

    it('should preserve cache metadata through error states', () => {
      // First successful fetch
      const mockData: MasterDataPayload = {
        reportCode: 'initial-report',
        abilities: [{ gameID: 1, name: 'Test Ability', icon: 'icon.png' }],
        abilitiesById: { 1: { gameID: 1, name: 'Test Ability', icon: 'icon.png' } },
        actors: [{ id: 1, name: 'Test Actor', type: 'Player' }],
        actorsById: { 1: { id: 1, name: 'Test Actor', type: 'Player' } },
      };

      setContext('initial-report');
      store.dispatch(
        fetchReportMasterData.fulfilled(mockData, 'test-request-id', {
          reportCode: 'initial-report',
          client: mockClient,
        }),
      );

      const stateAfterSuccess = store.getState();
      const originalCacheMetadata = stateAfterSuccess.masterData.cacheMetadata;

      // Then error for different report
      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('Network error'),
          'test-request-id-2',
          { reportCode: 'different-report', client: mockClient },
          'Network error',
        ),
      );

      const stateAfterError = store.getState();

      // Cache metadata should remain unchanged
      expect(stateAfterError.masterData.cacheMetadata).toEqual(originalCacheMetadata);
      expect(stateAfterError.masterData.entriesByReportId['different-report']?.error).toBe(
        'Network error',
      );
    });
  });
});
