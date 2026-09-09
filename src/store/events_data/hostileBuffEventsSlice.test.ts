import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import hostileBuffEventsReducer, {
  fetchHostileBuffEvents,
  HostileBuffEventsState,
} from './hostileBuffEventsSlice';

jest.mock('../../esologsClient');
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_INTERVALS_PER_STREAM: 2,
}));

describe('hostileBuffEventsSlice', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        events: combineReducers({
          hostileBuffs: hostileBuffEventsReducer,
        }),
      },
    });

  const fight = {
    id: 7,
    name: 'Target Dummy',
    startTime: 0,
    endTime: 2000,
  } as FightFragment;

  const emptyResponse = {
    reportData: {
      report: {
        events: { data: [], nextPageTimestamp: null },
      },
    },
  };

  const getEntry = (store: ReturnType<typeof createStore>) => {
    const state = store.getState() as { events: { hostileBuffs: HostileBuffEventsState } };
    const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) });
    return state.events.hostileBuffs.entries[key];
  };

  const buffEvent = (timestamp: number) =>
    ({
      type: 'applybuff',
      timestamp,
      sourceID: 1,
      sourceIsFriendly: false,
      targetID: 2,
      targetIsFriendly: true,
      abilityGameID: 123,
      fight: 1,
    }) as never;

  const dispatchFetch = (
    store: ReturnType<typeof createStore>,
    client: EsoLogsClient,
    options: { fight?: FightFragment; intervalSize?: number } = {},
  ) =>
    store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: options.fight ?? fight,
        client,
        intervalSize: options.intervalSize,
      }) as never,
    );

  it('deduplicates records across pages while preserving same-page identical events', async () => {
    const store = createStore();
    const duplicate = buffEvent(10);
    const otherEvent = buffEvent(20);
    const client = {
      query: jest.fn(({ variables }: { variables: { startTime: number } }) =>
        Promise.resolve(
          variables.startTime === 0
            ? {
                reportData: {
                  report: {
                    events: { data: [duplicate, duplicate], nextPageTimestamp: 1000 },
                  },
                },
              }
            : {
                reportData: {
                  report: {
                    events: { data: [duplicate, otherEvent], nextPageTimestamp: null },
                  },
                },
              },
        ),
      ),
    } as unknown as EsoLogsClient;

    await dispatchFetch(store, client, { intervalSize: 2000 });

    expect(getEntry(store)?.status).toBe('succeeded');
    expect(getEntry(store)?.events).toEqual([duplicate, duplicate, otherEvent]);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('deduplicates records repeated across adjacent intervals', async () => {
    const store = createStore();
    const duplicate = buffEvent(1000);
    const client = {
      query: jest.fn().mockResolvedValue({
        reportData: {
          report: {
            events: { data: [duplicate], nextPageTimestamp: null },
          },
        },
      }),
    } as unknown as EsoLogsClient;

    await dispatchFetch(store, client, { intervalSize: 1000 });

    expect(getEntry(store)?.status).toBe('succeeded');
    expect(getEntry(store)?.events).toEqual([duplicate]);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-advancing pagination cursor without partial fulfillment', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue({
        reportData: {
          report: {
            events: { data: [buffEvent(10)], nextPageTimestamp: 0 },
          },
        },
      }),
    } as unknown as EsoLogsClient;

    await dispatchFetch(store, client, { fight: { ...fight, endTime: 1000 }, intervalSize: 1000 });

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe('Hostile buff event pagination cursor did not advance');
    expect(getEntry(store)?.events).toEqual([]);
  });

  it('rejects an interval failure without fulfilling events from other intervals', async () => {
    const store = createStore();
    const client = {
      query: jest.fn(({ variables }: { variables: { startTime: number } }) =>
        variables.startTime === 0
          ? Promise.resolve({
              reportData: {
                report: {
                  events: { data: [buffEvent(10)], nextPageTimestamp: null },
                },
              },
            })
          : Promise.reject(new Error('interval unavailable')),
      ),
    } as unknown as EsoLogsClient;

    await dispatchFetch(store, client, { intervalSize: 1000 });

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe('interval unavailable');
    expect(getEntry(store)?.events).toEqual([]);
    expect(getEntry(store)?.cacheMetadata.lastFetchedTimestamp).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0])(
    'rejects invalid interval size %p deterministically',
    async (intervalSize) => {
      const store = createStore();
      const client = { query: jest.fn() } as unknown as EsoLogsClient;

      await dispatchFetch(store, client, { intervalSize });

      expect(getEntry(store)?.status).toBe('failed');
      expect(getEntry(store)?.error).toBe('Invalid hostile buff event interval');
      expect(client.query).not.toHaveBeenCalled();
    },
  );

  it('rejects excessive interval counts before querying', async () => {
    const store = createStore();
    const client = { query: jest.fn() } as unknown as EsoLogsClient;

    await dispatchFetch(store, client, {
      fight: { ...fight, endTime: 3 },
      intervalSize: 1,
    });

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe('Hostile buff event interval count exceeded 2');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('caches a successful empty response', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue(emptyResponse),
    } as unknown as EsoLogsClient;
    const shortFight = { ...fight, endTime: 1000 };

    await dispatchFetch(store, client, { fight: shortFight });
    await dispatchFetch(store, client, { fight: shortFight });

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(getEntry(store)?.status).toBe('succeeded');
    expect(getEntry(store)?.events).toEqual([]);
    expect(getEntry(store)?.cacheMetadata.intervalCount).toBe(1);
    expect(getEntry(store)?.cacheMetadata.failedIntervals).toBe(0);
  });

  it('suppresses a duplicate request while the first request is in flight', async () => {
    const store = createStore();
    let resolveQuery: (() => void) | undefined;
    const client = {
      query: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveQuery = () => resolve(emptyResponse);
          }),
      ),
    } as unknown as EsoLogsClient;

    const firstRequest = dispatchFetch(store, client, { fight: { ...fight, endTime: 1000 } });
    await Promise.resolve();
    const secondRequest = dispatchFetch(store, client, { fight: { ...fight, endTime: 1000 } });

    expect(client.query).toHaveBeenCalledTimes(1);
    resolveQuery?.();
    await Promise.all([firstRequest, secondRequest]);
    expect(getEntry(store)?.status).toBe('succeeded');
  });
});
