import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { FightFragment, HostilityType } from '../../graphql/gql/graphql';
import { ResourceChangeEvent } from '../../types/combatlogEvents';
import { createMockResourceChangeEvent } from '../../test/utils/combatLogMockFactories';

import resourceEventsReducer, {
  ResourceEventsState,
  fetchResourceEvents,
  clearResourceEvents,
  clearResourceEventsForContext,
  trimResourceEventsCache,
} from './resourceEventsSlice';
import { resolveCacheKey } from '../utils/keyedCacheState';

jest.mock('../../esologsClient');

describe('resourceEventsSlice', () => {
  let store: ReturnType<typeof configureStore>;
  let mockClient: jest.Mocked<EsoLogsClient>;
  let mockFight: FightFragment;

  const createStore = () =>
    configureStore({
      reducer: {
        events: combineReducers({
          resources: resourceEventsReducer,
        }),
      },
    });

  beforeEach(() => {
    store = createStore();
    mockClient = {
      query: jest.fn(),
    } as unknown as jest.Mocked<EsoLogsClient>;

    mockFight = {
      __typename: 'ReportFight',
      id: 11,
      startTime: 1000,
      endTime: 6000,
      name: 'Mock Fight',
      difficulty: 1,
    } as unknown as FightFragment;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const getSliceState = (): ResourceEventsState =>
    (store.getState() as { events: { resources: ResourceEventsState } }).events.resources;

  const seedEntry = (
    fightId: number,
    requestId: string,
    events: ResourceChangeEvent[],
  ): void => {
    const fight = { ...mockFight, id: fightId } as FightFragment;
    store.dispatch({
      type: 'resourceEvents/fetchResourceEvents/pending',
      meta: {
        arg: { reportCode: 'ABC123', fight, client: mockClient },
        requestId,
      },
    });

    store.dispatch({
      type: 'resourceEvents/fetchResourceEvents/fulfilled',
      payload: events,
      meta: {
        arg: { reportCode: 'ABC123', fight, client: mockClient },
        requestId,
      },
    });
  };

  describe('initial state', () => {
    it('starts with an empty keyed cache', () => {
      expect(getSliceState()).toEqual({ entries: {}, accessOrder: [] });
    });
  });

  describe('reducers', () => {
    it('clearResourceEvents resets the slice', () => {
      store.dispatch({
        type: 'resourceEvents/fetchResourceEvents/fulfilled',
        payload: [createMockResourceChangeEvent()],
        meta: {
          arg: { reportCode: 'ABC123', fight: mockFight, client: mockClient },
          requestId: 'req-1',
        },
      });

      store.dispatch(clearResourceEvents());

      expect(getSliceState()).toEqual({ entries: {}, accessOrder: [] });
    });

    it('clearResourceEventsForContext removes only the targeted entry', () => {
      seedEntry(11, 'req-1', [createMockResourceChangeEvent({ fight: 11 })]);
      seedEntry(12, 'req-2', [createMockResourceChangeEvent({ fight: 12 })]);

      const firstKey = resolveCacheKey({ reportCode: 'ABC123', fightId: 11 }).key;
      const secondKey = resolveCacheKey({ reportCode: 'ABC123', fightId: 12 }).key;

      store.dispatch(clearResourceEventsForContext({ reportCode: 'ABC123', fightId: 11 }));

      const state = getSliceState();
      expect(state.entries[firstKey]).toBeUndefined();
      expect(state.entries[secondKey]?.events).toHaveLength(1);
    });

    it('trimResourceEventsCache evicts least-recently-used entries', () => {
      const fights = [11, 12, 13];

      fights.forEach((fightId, index) => {
        seedEntry(fightId, `req-${index}`, [createMockResourceChangeEvent({ fight: fightId })]);
      });

      store.dispatch(trimResourceEventsCache({ maxEntries: 2 }));

      const state = getSliceState();
      const keys = fights.map((fightId) => resolveCacheKey({ reportCode: 'ABC123', fightId }).key);

  expect(state.entries[keys[0]]).toBeUndefined();
      expect(state.accessOrder).toEqual([keys[1], keys[2]]);
    });
  });

  describe('fetchResourceEvents', () => {
    it('stores events per report and fight and merges hostility pages', async () => {
      const friendlyEvents: ResourceChangeEvent[] = [
        createMockResourceChangeEvent({
          fight: Number(mockFight.id),
          abilityGameID: 12345,
        }),
      ];

      const enemyEvents: ResourceChangeEvent[] = [
        createMockResourceChangeEvent({
          fight: Number(mockFight.id),
          abilityGameID: 67890,
          sourceIsFriendly: false,
          targetIsFriendly: false,
        }),
      ];

      const createResponse = (events: ResourceChangeEvent[]) => ({
        reportData: {
          report: {
            events: {
              data: events,
              nextPageTimestamp: null,
            },
          },
        },
      });

      mockClient.query
        .mockResolvedValueOnce(createResponse(friendlyEvents))
        .mockResolvedValueOnce(createResponse(enemyEvents));

      const mockTimestamp = 1730000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      await store.dispatch(
        fetchResourceEvents({ reportCode: 'ABC123', fight: mockFight, client: mockClient }) as any,
      );

      const state = getSliceState();
      const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(mockFight.id) });
      const entry = state.entries[key];

      expect(entry?.status).toBe('succeeded');
      expect(entry?.events).toEqual([...friendlyEvents, ...enemyEvents]);
      expect(entry?.cacheMetadata.lastFetchedTimestamp).toBe(mockTimestamp);
      expect(entry?.currentRequest).toBeNull();
      expect(state.accessOrder).toEqual([key]);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          variables: expect.objectContaining({ hostilityType: HostilityType.Friendlies }),
        }),
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          variables: expect.objectContaining({ hostilityType: HostilityType.Enemies }),
        }),
      );
    });

    it('skips re-fetching when cached data is still fresh', async () => {
      const response = {
        reportData: {
          report: {
            events: {
              data: [createMockResourceChangeEvent({ fight: Number(mockFight.id) })],
              nextPageTimestamp: null,
            },
          },
        },
      };

      mockClient.query.mockResolvedValue(response);

  const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

      await store.dispatch(
        fetchResourceEvents({ reportCode: 'ABC123', fight: mockFight, client: mockClient }) as any,
      );

      expect(mockClient.query).toHaveBeenCalledTimes(2);

  dateSpy.mockReturnValue(1_000_000 + DATA_FETCH_CACHE_TIMEOUT / 2);

      await store.dispatch(
        fetchResourceEvents({ reportCode: 'ABC123', fight: mockFight, client: mockClient }) as any,
      );

      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });
});
