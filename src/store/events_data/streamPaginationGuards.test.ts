import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import deathEventsReducer, { fetchDeathEvents } from './deathEventsSlice';
import healingEventsReducer, { fetchHealingEvents } from './healingEventsSlice';
import resourceEventsReducer, { fetchResourceEvents } from './resourceEventsSlice';

jest.mock('../../esologsClient');
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 5,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

type StreamName = 'death' | 'healing' | 'resource';

const streams: Array<{
  name: StreamName;
  fetch: typeof fetchDeathEvents | typeof fetchHealingEvents | typeof fetchResourceEvents;
  eventType: 'death' | 'heal' | 'resourcechange';
}> = [
  { name: 'death', fetch: fetchDeathEvents, eventType: 'death' },
  { name: 'healing', fetch: fetchHealingEvents, eventType: 'heal' },
  { name: 'resource', fetch: fetchResourceEvents, eventType: 'resourcechange' },
];

describe.each(streams)('$name event pagination guards', ({ name, fetch, eventType }) => {
  let store: ReturnType<typeof configureStore>;
  let client: jest.Mocked<EsoLogsClient>;
  let fight: FightFragment;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        events: combineReducers({
          deaths: deathEventsReducer,
          healing: healingEventsReducer,
          resources: resourceEventsReducer,
        }),
      },
    });
    client = { query: jest.fn() } as unknown as jest.Mocked<EsoLogsClient>;
    fight = { id: 1, name: 'Test Fight', startTime: 1000, endTime: 2000 } as FightFragment;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const entry = () => {
    const state = store.getState() as {
      events: Record<'deaths' | 'healing' | 'resources', { entries: Record<string, unknown> }>;
    };
    const key = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) }).key;
    const stateKey = name === 'death' ? 'deaths' : name === 'healing' ? 'healing' : 'resources';
    return state.events[stateKey].entries[key] as
      { status: string; error: string | null; events: unknown[] } | undefined;
  };

  const dispatch = () =>
    store.dispatch(fetch({ reportCode: 'ABC123', fight, client }) as never) as unknown as Promise<{
      meta: { aborted: boolean; condition?: boolean };
    }> & { abort: () => void };

  const event = (timestamp: number, sourceID = 1) => ({
    type: eventType,
    timestamp,
    sourceID,
    targetID: 2,
    amount: 100,
    fight: 1,
  });

  it('fails closed when the cursor does not advance', async () => {
    client.query.mockResolvedValueOnce(page([event(1000)], fight.startTime));

    await dispatch();

    expect(entry()).toMatchObject({
      status: 'failed',
      error: `${name[0].toUpperCase()}${name.slice(1)} event pagination cursor did not advance`,
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the cursor is not finite', async () => {
    client.query.mockResolvedValueOnce(page([event(1000)], Number.NaN));

    await dispatch();

    expect(entry()).toMatchObject({
      status: 'failed',
      error: `${name[0].toUpperCase()}${name.slice(1)} event pagination cursor did not advance`,
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a continuation response omits the event page', async () => {
    client.query
      .mockResolvedValueOnce(page([event(1000)], 1001))
      .mockResolvedValueOnce({ reportData: { report: null } } as never);

    await dispatch();

    expect(entry()).toMatchObject({
      status: 'failed',
      error: `${name[0].toUpperCase()}${name.slice(1)} event response was incomplete`,
    });
    expect(entry()?.events).toEqual([]);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('fails closed at page and event caps', async () => {
    client.query.mockResolvedValueOnce(page([], 1001)).mockResolvedValueOnce(page([], 1002));

    await dispatch();

    expect(entry()).toMatchObject({
      status: 'failed',
      error: `${name[0].toUpperCase()}${name.slice(1)} event pagination exceeded 2 pages`,
    });

    store = configureStore({
      reducer: {
        events: combineReducers({
          deaths: deathEventsReducer,
          healing: healingEventsReducer,
          resources: resourceEventsReducer,
        }),
      },
    });
    client.query.mockReset();
    client.query.mockResolvedValueOnce(
      page([event(1000), event(1001), event(1002), event(1003), event(1004), event(1005)], null),
    );

    await dispatch();

    expect(entry()).toMatchObject({
      status: 'failed',
      error: `${name[0].toUpperCase()}${name.slice(1)} event pagination exceeded 5 events`,
    });
  });

  it('rejects transport failures and forwards cancellation to the request', async () => {
    client.query.mockRejectedValueOnce(new Error('upstream unavailable'));
    await dispatch();
    expect(entry()).toMatchObject({ status: 'failed', error: 'upstream unavailable' });

    let requestSignal: AbortSignal | undefined;
    client.query.mockImplementation(
      (({ context }: { context?: { fetchOptions?: { signal?: AbortSignal } } }) =>
        new Promise(() => {
          requestSignal = context?.fetchOptions?.signal;
        })) as never,
    );
    const request = dispatch();
    request.abort();
    const result = await request;

    expect(result.meta.aborted).toBe(true);
    expect(requestSignal?.aborted).toBe(true);
    expect(entry()).toMatchObject({ status: 'failed', error: 'Aborted' });
  });

  it('deduplicates only overlap between adjacent pages and caches a successful empty result', async () => {
    const repeatedAcrossPages = event(1001);
    const samePageDuplicate = event(1000);
    client.query
      .mockResolvedValueOnce(
        page([samePageDuplicate, samePageDuplicate, repeatedAcrossPages], 1001),
      )
      .mockResolvedValueOnce(page([repeatedAcrossPages, event(1002)], null))
      .mockResolvedValueOnce(page([], null));

    await dispatch();

    expect(entry()).toMatchObject({ status: 'succeeded' });
    expect(entry()?.events).toEqual([
      samePageDuplicate,
      samePageDuplicate,
      repeatedAcrossPages,
      event(1002),
    ]);

    store = configureStore({
      reducer: {
        events: combineReducers({
          deaths: deathEventsReducer,
          healing: healingEventsReducer,
          resources: resourceEventsReducer,
        }),
      },
    });
    client.query.mockReset();
    client.query.mockResolvedValue(page([], null));
    await dispatch();
    const cachedDispatch = await dispatch();

    expect(entry()).toMatchObject({ status: 'succeeded', events: [] });
    expect(cachedDispatch.meta.condition).toBe(true);
    // The initial fetch queries friendly and enemy streams once each. The cached
    // dispatch must not issue another pair of requests.
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});

const page = (data: unknown[], nextPageTimestamp: number | null) =>
  ({ reportData: { report: { events: { data, nextPageTimestamp } } } }) as never;
