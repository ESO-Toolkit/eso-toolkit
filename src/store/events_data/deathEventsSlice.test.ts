import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';
import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import deathEventsReducer, { DeathEventsState, fetchDeathEvents } from './deathEventsSlice';

jest.mock('../../esologsClient');

describe('deathEventsSlice', () => {
  let store: ReturnType<typeof configureStore>;
  let mockClient: jest.Mocked<EsoLogsClient>;
  let mockFight: FightFragment;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        events: combineReducers({ deaths: deathEventsReducer }),
      },
    });
    mockClient = { query: jest.fn() } as unknown as jest.Mocked<EsoLogsClient>;
    mockFight = {
      __typename: 'ReportFight',
      id: 11,
      startTime: 1000,
      endTime: 6000,
      name: 'Empty death fight',
      difficulty: 1,
    } as unknown as FightFragment;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('keeps a fresh successful empty result cached across a remount', async () => {
    mockClient.query.mockResolvedValue({
      reportData: {
        report: {
          events: { data: [], nextPageTimestamp: null },
        },
      },
    } as never);
    const timestamp = 1_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    const args = { reportCode: 'ABC123', fight: mockFight, client: mockClient };

    await store.dispatch(fetchDeathEvents(args) as any);

    const key = resolveCacheKey({ reportCode: 'ABC123', fightId: 11 }).key;
    const firstState = (store.getState() as { events: { deaths: DeathEventsState } }).events.deaths;
    expect(firstState.entries[key]?.status).toBe('succeeded');
    expect(firstState.entries[key]?.events).toEqual([]);
    expect(firstState.entries[key]?.cacheMetadata.lastFetchedTimestamp).toBe(timestamp);
    expect(mockClient.query).toHaveBeenCalledTimes(2);

    dateSpy.mockReturnValue(timestamp + DATA_FETCH_CACHE_TIMEOUT / 2);
    await store.dispatch(fetchDeathEvents(args) as any);

    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });
});
