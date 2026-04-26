import { configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { ReportAbilityFragment, ReportActorFragment } from '../../graphql/gql/graphql';

import masterDataReducer, {
  MasterDataEntry,
  MasterDataPayload,
  MasterDataState,
  clearMasterData,
  clearMasterDataForContext,
  fetchReportMasterData,
  forceMasterDataRefresh,
  resetLoadingState,
  trimMasterDataCache,
} from './masterDataSlice';
import { resolveCacheKey } from '../utils/keyedCacheState';

jest.mock('../../esologsClient');

interface RootState {
  masterData: MasterDataState;
}

const createStore = () =>
  configureStore({
    reducer: {
      masterData: masterDataReducer,
    },
  });

const createAbility = (id: number): ReportAbilityFragment => ({
  gameID: id,
  name: `Ability ${id}`,
  icon: `icon-${id}.png`,
});

const createActor = (id: number, type: 'Player' | 'NPC' = 'Player'): ReportActorFragment => ({
  id,
  name: `Actor ${id}`,
  type,
});

const buildPayload = (
  reportCode: string,
  abilityIds: number[],
  actorIds: number[],
): MasterDataPayload => {
  const abilities = abilityIds.map(createAbility);
  const abilitiesById = abilities.reduce<Record<string | number, ReportAbilityFragment>>(
    (acc, ability) => {
      if (typeof ability.gameID === 'number' || typeof ability.gameID === 'string') {
        acc[ability.gameID] = ability;
      }
      return acc;
    },
    {},
  );

  const actors = actorIds.map((id) => createActor(id));
  const actorsById = actors.reduce<Record<string | number, ReportActorFragment>>((acc, actor) => {
    if (typeof actor.id === 'number' || typeof actor.id === 'string') {
      acc[actor.id] = actor;
    }
    return acc;
  }, {});

  return {
    reportCode,
    abilities,
    abilitiesById,
    actors,
    actorsById,
  };
};

const getEntry = (state: RootState, reportCode: string): MasterDataEntry | null => {
  const { key } = resolveCacheKey({ reportCode });
  return state.masterData.entries[key] ?? null;
};

const getStoreEntry = (store: ReturnType<typeof createStore>, reportCode: string) =>
  getEntry(store.getState(), reportCode);

const getKey = (reportCode: string) => resolveCacheKey({ reportCode }).key;

describe('masterDataSlice', () => {
  let store: ReturnType<typeof createStore>;
  let mockClient: jest.Mocked<EsoLogsClient>;

  beforeEach(() => {
    store = createStore();
    mockClient = {
      query: jest.fn(),
    } as unknown as jest.Mocked<EsoLogsClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with empty keyed cache', () => {
      expect(store.getState().masterData).toEqual({ entries: {}, accessOrder: [] });
    });
  });

  describe('reducers', () => {
    it('clearMasterData should reset the entire cache', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('alpha', [1], [1]), 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );
      store.dispatch(clearMasterData());

      expect(store.getState().masterData).toEqual({ entries: {}, accessOrder: [] });
    });

    it('resetLoadingState should clear errors and loading flags without removing data', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-2', { reportCode: 'beta', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('boom'),
          'req-2',
          { reportCode: 'beta', client: mockClient },
          'boom',
        ),
      );

      const before = store.getState();
      expect(getEntry(before, 'alpha')?.status).toBe('loading');
      expect(getEntry(before, 'beta')?.status).toBe('failed');
      expect(getEntry(before, 'beta')?.error).toBe('boom');

      store.dispatch(resetLoadingState());

      const after = store.getState();
      expect(getEntry(after, 'alpha')?.status).toBe('idle');
      expect(getEntry(after, 'alpha')?.error).toBeNull();
      expect(getEntry(after, 'beta')?.status).toBe('failed');
      expect(getEntry(after, 'beta')?.error).toBeNull();
      expect(getEntry(after, 'beta')?.currentRequest).toBeNull();
    });

    it('forceMasterDataRefresh should mark entries as stale while preserving data', () => {
      const payload = buildPayload('alpha', [1, 2], [1, 2]);
      const now = 1_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(payload, 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );

      const before = getStoreEntry(store, 'alpha');
      expect(before?.status).toBe('succeeded');
      expect(before?.cacheMetadata.lastFetchedTimestamp).toBe(now);

      store.dispatch(forceMasterDataRefresh());

      const after = getStoreEntry(store, 'alpha');
      expect(after?.status).toBe('idle');
      expect(after?.cacheMetadata.lastFetchedTimestamp).toBeNull();
      expect(Object.keys(after?.abilitiesById ?? {})).toHaveLength(2);
      expect(Object.keys(after?.actorsById ?? {})).toHaveLength(2);

      nowSpy.mockRestore();
    });

    it('clearMasterDataForContext should remove a single entry and keep others', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('alpha', [1], [1]), 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-2', { reportCode: 'beta', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('beta', [2], [2]), 'req-2', {
          reportCode: 'beta',
          client: mockClient,
        }),
      );

      store.dispatch(clearMasterDataForContext({ reportCode: 'alpha' }));

      expect(getStoreEntry(store, 'alpha')).toBeNull();
      expect(getStoreEntry(store, 'beta')).not.toBeNull();
    });

    it('clearMasterDataForContext should reset cache when report code is missing', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('alpha', [1], [1]), 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );

      store.dispatch(clearMasterDataForContext({ reportCode: undefined }));

      expect(store.getState().masterData).toEqual({ entries: {}, accessOrder: [] });
    });

    it('trimMasterDataCache should respect the provided max entry limit', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('alpha', [1], [1]), 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-2', { reportCode: 'beta', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('beta', [2], [2]), 'req-2', {
          reportCode: 'beta',
          client: mockClient,
        }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-3', { reportCode: 'gamma', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.fulfilled(buildPayload('gamma', [3], [3]), 'req-3', {
          reportCode: 'gamma',
          client: mockClient,
        }),
      );

      store.dispatch(trimMasterDataCache({ maxEntries: 2 }));

      const state = store.getState();
      expect(Object.keys(state.masterData.entries)).toHaveLength(2);
      expect(state.masterData.entries[getKey('beta')]).toBeDefined();
      expect(state.masterData.entries[getKey('gamma')]).toBeDefined();
      expect(state.masterData.entries[getKey('alpha')]).toBeUndefined();
    });
  });

  describe('extra reducers', () => {
    it('pending should create or update an entry with loading status', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );

      const entry = getStoreEntry(store, 'alpha');
      expect(entry?.status).toBe('loading');
      expect(entry?.error).toBeNull();
      expect(entry?.currentRequest).toEqual({ reportId: 'alpha', requestId: 'req-1' });
      expect(store.getState().masterData.accessOrder.includes(getKey('alpha'))).toBe(true);
    });

    it('fulfilled should update entry data, metadata, and LRU state', () => {
      const now = 2_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );

      const payload = buildPayload('alpha', [1, 2], [1, 2, 3]);
      store.dispatch(
        fetchReportMasterData.fulfilled(payload, 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );

      const entry = getStoreEntry(store, 'alpha');
      expect(entry?.status).toBe('succeeded');
      expect(entry?.error).toBeNull();
      expect(Object.keys(entry?.abilitiesById ?? {})).toHaveLength(2);
      expect(Object.keys(entry?.actorsById ?? {})).toHaveLength(3);
      expect(entry?.cacheMetadata.lastFetchedTimestamp).toBe(now);
      expect(entry?.cacheMetadata.abilityCount).toBe(2);
      expect(entry?.cacheMetadata.actorCount).toBe(3);
      expect(entry?.currentRequest).toBeNull();
      expect(store.getState().masterData.accessOrder.slice(-1)[0]).toBe(getKey('alpha'));

      nowSpy.mockRestore();
    });

    it('fulfilled should ignore stale responses', () => {
      const freshPayload = buildPayload('alpha', [1], [1]);
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-2', { reportCode: 'alpha', client: mockClient }),
      );

      store.dispatch(
        fetchReportMasterData.fulfilled(freshPayload, 'req-1', {
          reportCode: 'alpha',
          client: mockClient,
        }),
      );

      const entry = getStoreEntry(store, 'alpha');
      expect(entry?.status).toBe('loading');
      expect(entry?.currentRequest).toEqual({ reportId: 'alpha', requestId: 'req-2' });
      expect(Object.keys(entry?.abilitiesById ?? {})).toHaveLength(0);
    });

    it('rejected should capture the error and clear currentRequest', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );

      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('boom'),
          'req-1',
          { reportCode: 'alpha', client: mockClient },
          'boom',
        ),
      );

      const entry = getStoreEntry(store, 'alpha');
      expect(entry?.status).toBe('failed');
      expect(entry?.error).toBe('boom');
      expect(entry?.currentRequest).toBeNull();
    });

    it('rejected should ignore stale errors', () => {
      store.dispatch(
        fetchReportMasterData.pending('req-1', { reportCode: 'alpha', client: mockClient }),
      );
      store.dispatch(
        fetchReportMasterData.pending('req-2', { reportCode: 'alpha', client: mockClient }),
      );

      store.dispatch(
        fetchReportMasterData.rejected(
          new Error('stale'),
          'req-1',
          { reportCode: 'alpha', client: mockClient },
          'stale',
        ),
      );

      const entry = getStoreEntry(store, 'alpha');
      expect(entry?.status).toBe('loading');
      expect(entry?.error).toBeNull();
      expect(entry?.currentRequest).toEqual({ reportId: 'alpha', requestId: 'req-2' });
    });
  });
});
