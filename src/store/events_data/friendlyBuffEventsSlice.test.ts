import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import friendlyBuffEventsReducer, {
  createTimeIntervals,
  fetchFriendlyBuffEvents,
  FriendlyBuffEventsState,
} from './friendlyBuffEventsSlice';

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 2,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

describe('friendlyBuffEventsSlice', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        events: combineReducers({
          friendlyBuffs: friendlyBuffEventsReducer,
        }),
      },
    });

  const fight = {
    id: 7,
    name: 'Target Dummy',
    startTime: 0,
    endTime: 150000,
  } as FightFragment;

  const emptyResponse = {
    reportData: {
      report: {
        events: { data: [], nextPageTimestamp: null },
      },
    },
  };

  const getEntry = (store: ReturnType<typeof createStore>) => {
    const state = store.getState() as { events: { friendlyBuffs: FriendlyBuffEventsState } };
    const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) });
    return state.events.friendlyBuffs.entries[key];
  };

  it('rejects invalid interval inputs instead of looping forever', () => {
    expect(() => createTimeIntervals(0, 1000, 0)).toThrow('Invalid friendly buff event interval');
    expect(() => createTimeIntervals(1000, 0, 100)).toThrow('Invalid friendly buff event interval');
  });

  it('fails closed when interval creation exceeds the interval-count cap', async () => {
    const store = createStore();
    const client = { query: jest.fn() } as unknown as EsoLogsClient;

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 241 },
        client,
        intervalSize: 1,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe('Friendly buff event interval count exceeded 240');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('does not count each interval request as a pagination page', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue(emptyResponse),
    } as unknown as EsoLogsClient;

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 101 },
        client,
        intervalSize: 1,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('succeeded');
    expect(client.query).toHaveBeenCalledTimes(101);
  });

  it('shares the continuation-page budget across all intervals', async () => {
    const store = createStore();
    const responseWithNextPage = (nextPageTimestamp: number) => ({
      reportData: {
        report: {
          events: { data: [], nextPageTimestamp },
        },
      },
    });
    const client = {
      query: jest.fn(({ variables }: { variables: { startTime?: number } }) => {
        const requestedStartTime = variables.startTime ?? 0;
        return Promise.resolve(responseWithNextPage(requestedStartTime + 0.25));
      }),
    } as unknown as EsoLogsClient;

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 2 },
        client,
        intervalSize: 1,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe(
      'Friendly buff event pagination exceeded 2 continuation pages',
    );
    expect(client.query).toHaveBeenCalledTimes(4);
  });

  it('shares the event budget across all intervals', async () => {
    const store = createStore();
    const responseWithTwoEvents = {
      reportData: {
        report: {
          events: {
            data: [
              { type: 'applybuff', timestamp: 1 },
              { type: 'removebuff', timestamp: 2 },
            ],
            nextPageTimestamp: null,
          },
        },
      },
    };
    const client = {
      query: jest.fn().mockResolvedValue(responseWithTwoEvents),
    } as unknown as EsoLogsClient;

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 2 },
        client,
        intervalSize: 1,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toBe('Friendly buff event pagination exceeded 2 events');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('limits concurrent interval queries', async () => {
    const store = createStore();
    const resolvers: Array<() => void> = [];
    const client = {
      query: jest.fn(
        () =>
          new Promise((resolve) => {
            resolvers.push(() => resolve(emptyResponse));
          }),
      ),
    } as unknown as EsoLogsClient;

    const request = store.dispatch(
      fetchFriendlyBuffEvents({ reportCode: 'ABC123', fight, client }) as never,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(client.query).toHaveBeenCalledTimes(4);

    resolvers[0]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(client.query).toHaveBeenCalledTimes(5);

    resolvers.slice(1).forEach((resolve) => resolve());
    await request;

    expect(getEntry(store)?.status).toBe('succeeded');
  });

  it('fails closed when any interval request fails', async () => {
    const store = createStore();
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(emptyResponse)
        .mockRejectedValueOnce(new Error('upstream unavailable')),
    } as unknown as EsoLogsClient;

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 60000 },
        client,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toContain('upstream unavailable');
    expect(getEntry(store)?.events).toEqual([]);
  });

  it('caches a successful empty response', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue(emptyResponse),
    } as unknown as EsoLogsClient;
    const shortFight = { ...fight, endTime: 1000 };

    await store.dispatch(
      fetchFriendlyBuffEvents({ reportCode: 'ABC123', fight: shortFight, client }) as never,
    );
    await store.dispatch(
      fetchFriendlyBuffEvents({ reportCode: 'ABC123', fight: shortFight, client }) as never,
    );

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(getEntry(store)?.status).toBe('succeeded');
    expect(getEntry(store)?.events).toEqual([]);
    expect(getEntry(store)?.cacheMetadata).toEqual({
      lastFetchedTimestamp: expect.any(Number),
      restrictToFightWindow: true,
      intervalCount: 1,
    });
  });

  it('preserves the last successful cache mode when a different-mode request fails', async () => {
    const store = createStore();
    const client = {
      query: jest.fn().mockResolvedValue(emptyResponse),
    } as unknown as EsoLogsClient;
    const shortFight = { ...fight, endTime: 1000 };

    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: shortFight,
        client,
        restrictToFightWindow: true,
      }) as never,
    );
    const successfulTimestamp = getEntry(store)?.cacheMetadata.lastFetchedTimestamp;

    (client.query as jest.Mock).mockRejectedValue(new Error('upstream unavailable'));
    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: shortFight,
        client,
        restrictToFightWindow: false,
      }) as never,
    );

    expect(getEntry(store)?.status).toBe('failed');
    expect(getEntry(store)?.error).toContain('upstream unavailable');
    expect(getEntry(store)?.events).toEqual([]);
    expect(getEntry(store)?.cacheMetadata).toEqual({
      lastFetchedTimestamp: successfulTimestamp,
      restrictToFightWindow: true,
      intervalCount: 1,
    });

    const callsAfterFailure = (client.query as jest.Mock).mock.calls.length;
    await store.dispatch(
      fetchFriendlyBuffEvents({
        reportCode: 'ABC123',
        fight: shortFight,
        client,
        restrictToFightWindow: true,
      }) as never,
    );
    expect(client.query).toHaveBeenCalledTimes(callsAfterFailure);
  });
});
