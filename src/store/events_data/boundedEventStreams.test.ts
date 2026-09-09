import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import deathEventsReducer, { fetchDeathEvents } from './deathEventsSlice';
import healingEventsReducer, { fetchHealingEvents } from './healingEventsSlice';
import hostileBuffEventsReducer, { fetchHostileBuffEvents } from './hostileBuffEventsSlice';
import resourceEventsReducer, { fetchResourceEvents } from './resourceEventsSlice';

jest.mock('../../esologsClient');
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 2,
  EVENT_MAX_PAGES_PER_STREAM: 4,
  EVENT_QUERY_MAX_CONCURRENCY: 2,
}));

const fight = {
  id: 1,
  name: 'Test Fight',
  startTime: 1000,
  endTime: 2000,
} as FightFragment;

const page = (data: unknown[], nextPageTimestamp: number | null = null) =>
  ({ reportData: { report: { events: { data, nextPageTimestamp } } } }) as never;

const rawEvent = (type: string, timestamp: number) => ({
  type,
  timestamp,
  sourceID: 1,
  targetID: 2,
});

const getEntry = (store: ReturnType<typeof configureStore>, stream: string) => {
  const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) });
  return (store.getState() as { events: Record<string, { entries: Record<string, unknown> }> })
    .events[stream]?.entries[key] as
    { status?: string; error?: string; events?: unknown[] } | undefined;
};

describe('bounded raw event streams', () => {
  const client = () => ({ query: jest.fn() }) as unknown as jest.Mocked<EsoLogsClient>;

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents, 'death'],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents, 'heal'],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents, 'resourcechange'],
  ] as const)(
    'fails closed before retaining more than the cap for %s events',
    async (name, stream, reducer, fetchEvents, eventType) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      mockClient.query.mockResolvedValueOnce(
        page([rawEvent(eventType, 1000), rawEvent(eventType, 1001), rawEvent(eventType, 1002)]),
      );

      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({
        status: 'failed',
        error: `${name[0]?.toUpperCase()}${name.slice(1)} event pagination exceeded 2 events`,
        events: [],
      });
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite pagination cursor (%s) for every non-interval stream',
    async (cursor) => {
      const streams = [
        ['deaths', deathEventsReducer, fetchDeathEvents],
        ['healing', healingEventsReducer, fetchHealingEvents],
        ['resources', resourceEventsReducer, fetchResourceEvents],
      ] as const;

      for (const [stream, reducer, fetchEvents] of streams) {
        const store = configureStore({
          reducer: { events: combineReducers({ [stream]: reducer }) },
        });
        const mockClient = client();
        mockClient.query.mockResolvedValueOnce(page([], cursor));

        await store.dispatch(
          fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
        );

        expect(getEntry(store, stream)).toMatchObject({ status: 'failed', events: [] });
        expect(mockClient.query).toHaveBeenCalledTimes(1);
      }
    },
  );

  it.each([
    ['deaths', deathEventsReducer, fetchDeathEvents, 'death'],
    ['healing', healingEventsReducer, fetchHealingEvents, 'heal'],
    ['resources', resourceEventsReducer, fetchResourceEvents, 'resourcechange'],
  ] as const)(
    'accepts exactly the configured event cap for %s',
    async (stream, reducer, fetchEvents, eventType) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      const expectedEvents = [rawEvent(eventType, 1000), rawEvent(eventType, 1001)];
      mockClient.query.mockResolvedValueOnce(page(expectedEvents)).mockResolvedValueOnce(page([]));

      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({
        status: 'succeeded',
        events: expectedEvents,
      });
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents],
  ] as const)(
    'suppresses a duplicate in-flight %s request',
    async (_name, stream, reducer, fetchEvents) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      let releaseFirstQuery: (() => void) | undefined;
      mockClient.query
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              releaseFirstQuery = () => resolve(page([]));
            }) as never,
        )
        .mockResolvedValue(page([]));
      const request = { reportCode: 'ABC123', fight, client: mockClient };

      const first = store.dispatch(fetchEvents(request) as never);
      await Promise.resolve();
      const duplicate = store.dispatch(fetchEvents(request) as never);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      releaseFirstQuery?.();
      await first;
      await duplicate;

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(getEntry(store, stream)).toMatchObject({ status: 'succeeded', events: [] });
    },
  );

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents],
  ] as const)(
    'applies one page limit across both target scopes for %s events',
    async (name, stream, reducer, fetchEvents) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      mockClient.query
        .mockResolvedValueOnce(page([], 1001))
        .mockResolvedValueOnce(page([], 1002))
        .mockResolvedValueOnce(page([]))
        .mockResolvedValueOnce(page([], 1001));

      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({
        status: 'failed',
        error: `${name[0]?.toUpperCase()}${name.slice(1)} event pagination exceeded 4 pages`,
        events: [],
      });
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    },
  );

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents, 'death'],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents, 'heal'],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents, 'resourcechange'],
  ] as const)(
    'applies one event cap across both target scopes for %s events',
    async (name, stream, reducer, fetchEvents, eventType) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      mockClient.query
        .mockResolvedValueOnce(page([rawEvent(eventType, 1000), rawEvent(eventType, 1001)]))
        .mockResolvedValueOnce(page([rawEvent(eventType, 1002)]));

      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({
        status: 'failed',
        error: `${name[0]?.toUpperCase()}${name.slice(1)} event pagination exceeded 2 events`,
        events: [],
      });
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['equal', { startTime: 1000, endTime: 1000 }],
    ['non-finite', { startTime: Number.NaN, endTime: 2000 }],
    ['negative', { startTime: -1, endTime: 2000 }],
    ['negative zero', { startTime: -0, endTime: 2000 }],
  ] as const)(
    'rejects %s time bounds before fetching every non-interval stream',
    async (_caseName, timing) => {
      const streams = [
        ['deaths', deathEventsReducer, fetchDeathEvents],
        ['healing', healingEventsReducer, fetchHealingEvents],
        ['resources', resourceEventsReducer, fetchResourceEvents],
      ] as const;

      for (const [stream, reducer, fetchEvents] of streams) {
        const store = configureStore({
          reducer: { events: combineReducers({ [stream]: reducer }) },
        });
        const mockClient = client();

        await store.dispatch(
          fetchEvents({
            reportCode: 'ABC123',
            fight: { ...fight, ...timing },
            client: mockClient,
          }) as never,
        );

        expect(getEntry(store, stream)).toMatchObject({ status: 'failed', events: [] });
        expect(mockClient.query).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents],
  ] as const)(
    'rejects a zero %s cursor instead of looping',
    async (_name, stream, reducer, fetchEvents) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      mockClient.query.mockResolvedValueOnce(page([], 0));

      await store.dispatch(
        fetchEvents({
          reportCode: 'ABC123',
          fight: { ...fight, startTime: 0, endTime: 10 },
          client: mockClient,
        }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({ status: 'failed', events: [] });
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['death', 'deaths', deathEventsReducer, fetchDeathEvents],
    ['healing', 'healing', healingEventsReducer, fetchHealingEvents],
    ['resource', 'resources', resourceEventsReducer, fetchResourceEvents],
  ] as const)(
    'reuses a fresh successful empty %s cache entry',
    async (_name, stream, reducer, fetchEvents) => {
      const store = configureStore({ reducer: { events: combineReducers({ [stream]: reducer }) } });
      const mockClient = client();
      mockClient.query.mockResolvedValue(page([]));

      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );
      await store.dispatch(
        fetchEvents({ reportCode: 'ABC123', fight, client: mockClient }) as never,
      );

      expect(getEntry(store, stream)).toMatchObject({ status: 'succeeded', events: [] });
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    },
  );

  it('counts hostile buff events across intervals toward one stream cap', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query
      .mockResolvedValueOnce(page([rawEvent('applybuff', 1000), rawEvent('applybuff', 1001)]))
      .mockResolvedValueOnce(page([rawEvent('applybuff', 1030)]));

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 1060 },
        client: mockClient,
        intervalSize: 30,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'Hostile buff event pagination exceeded 2 events',
      events: [],
    });
  });

  it('accepts exactly the configured hostile-buff event cap across intervals', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query
      .mockResolvedValueOnce(page([rawEvent('applybuff', 1000)]))
      .mockResolvedValueOnce(page([rawEvent('applybuff', 1010)]));

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 1020 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'succeeded',
      events: [rawEvent('applybuff', 1000), rawEvent('applybuff', 1010)],
    });
  });

  it('counts hostile buff pages across intervals toward one stream page budget', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query.mockResolvedValue(page([]));

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 1050 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'Hostile buff event pagination exceeded 4 pages',
      events: [],
    });
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['equal', { startTime: 1000, endTime: 1000 }, 10],
    ['non-finite', { startTime: Number.NaN, endTime: 2000 }, 10],
    ['negative', { startTime: -1, endTime: 2000 }, 10],
    ['negative zero', { startTime: -0, endTime: 2000 }, 10],
    ['non-finite interval size', {}, Number.POSITIVE_INFINITY],
  ] as const)(
    'rejects hostile buff %s bounds before fetching',
    async (_caseName, timing, intervalSize) => {
      const store = configureStore({
        reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
      });
      const mockClient = client();

      await store.dispatch(
        fetchHostileBuffEvents({
          reportCode: 'ABC123',
          fight: { ...fight, ...timing },
          client: mockClient,
          intervalSize,
        }) as never,
      );

      expect(getEntry(store, 'hostileBuffs')).toMatchObject({ status: 'failed', events: [] });
      expect(mockClient.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['one interval beyond the cap', 2410],
    ['an enormous duration', Number.MAX_SAFE_INTEGER],
  ] as const)('rejects hostile buff %s without issuing a request', async (_caseName, endTime) => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, startTime: 0, endTime },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'Hostile buff event interval count exceeded 240',
      events: [],
    });
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('fails closed when a hostile buff interval has a transport failure', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query
      .mockResolvedValueOnce(page([rawEvent('applybuff', 1000)]))
      .mockRejectedValueOnce(new Error('offline'));

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 1020 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'offline',
      events: [],
    });
  });

  it('fails closed when an in-flight hostile-buff request is aborted', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query.mockImplementation(
      ({ context }) =>
        new Promise((_, reject) => {
          const signal = (context as { fetchOptions: { signal: AbortSignal } }).fetchOptions.signal;
          signal.addEventListener('abort', () => reject(new Error('request aborted')), {
            once: true,
          });
        }) as never,
    );

    const request = store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, endTime: 1010 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    ) as unknown as { abort: () => void; then: (onfulfilled: () => void) => Promise<void> };
    await Promise.resolve();
    request.abort();
    await request;

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({ status: 'failed', events: [] });
  });

  it('rejects a zero hostile-buff cursor instead of treating it as no cursor', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query.mockResolvedValueOnce(page([], 0));

    await store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, startTime: 0, endTime: 10 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'Hostile buff event pagination cursor did not advance',
      events: [],
    });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite hostile-buff pagination cursor (%s)',
    async (cursor) => {
      const store = configureStore({
        reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
      });
      const mockClient = client();
      mockClient.query.mockResolvedValueOnce(page([], cursor));

      await store.dispatch(
        fetchHostileBuffEvents({
          reportCode: 'ABC123',
          fight: { ...fight, startTime: 0, endTime: 10 },
          client: mockClient,
          intervalSize: 10,
        }) as never,
      );

      expect(getEntry(store, 'hostileBuffs')).toMatchObject({ status: 'failed', events: [] });
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    },
  );

  it('stops sibling hostile-buff pagination after another interval fails', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    let siblingSignal: AbortSignal | undefined;
    let siblingAbortObserved = false;
    mockClient.query.mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(
      ({ context }) =>
        new Promise((_resolve, reject) => {
          siblingSignal = context?.fetchOptions?.signal as AbortSignal | undefined;
          siblingSignal?.addEventListener(
            'abort',
            () => {
              siblingAbortObserved = true;
              reject(siblingSignal?.reason ?? new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        }) as never,
    );

    const request = store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, startTime: 0, endTime: 20 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );
    await request;

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({
      status: 'failed',
      error: 'offline',
      events: [],
    });
    expect(siblingSignal?.aborted).toBe(true);
    expect(siblingAbortObserved).toBe(true);
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });

  it('limits hostile buff interval queries to the configured concurrency', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    const pending: Array<() => void> = [];
    let activeQueries = 0;
    let maxActiveQueries = 0;
    mockClient.query.mockImplementation(
      () =>
        new Promise((resolve) => {
          activeQueries += 1;
          maxActiveQueries = Math.max(maxActiveQueries, activeQueries);
          pending.push(() => {
            activeQueries -= 1;
            resolve(page([]));
          });
        }) as never,
    );

    const request = store.dispatch(
      fetchHostileBuffEvents({
        reportCode: 'ABC123',
        fight: { ...fight, startTime: 0, endTime: 40 },
        client: mockClient,
        intervalSize: 10,
      }) as never,
    );

    await Promise.resolve();
    expect(mockClient.query).toHaveBeenCalledTimes(2);
    pending.splice(0).forEach((resolve) => resolve());
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    pending.splice(0).forEach((resolve) => resolve());
    await request;

    expect(maxActiveQueries).toBeLessThanOrEqual(2);
    expect(getEntry(store, 'hostileBuffs')).toMatchObject({ status: 'succeeded', events: [] });
  });

  it('reuses a fresh successful empty hostile-buff cache entry', async () => {
    const store = configureStore({
      reducer: { events: combineReducers({ hostileBuffs: hostileBuffEventsReducer }) },
    });
    const mockClient = client();
    mockClient.query.mockResolvedValue(page([]));
    const request = {
      reportCode: 'ABC123',
      fight: { ...fight, endTime: 1010 },
      client: mockClient,
      intervalSize: 10,
    };

    await store.dispatch(fetchHostileBuffEvents(request) as never);
    await store.dispatch(fetchHostileBuffEvents(request) as never);

    expect(getEntry(store, 'hostileBuffs')).toMatchObject({ status: 'succeeded', events: [] });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });
});
