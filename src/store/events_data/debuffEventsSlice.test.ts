import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import debuffEventsReducer, { DebuffEventsState, fetchDebuffEvents } from './debuffEventsSlice';

jest.mock('../../esologsClient');
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 2,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

describe('debuffEventsSlice pagination hardening', () => {
  let store: ReturnType<typeof configureStore>;
  let client: jest.Mocked<EsoLogsClient>;
  let fight: FightFragment;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        events: combineReducers({ debuffs: debuffEventsReducer }),
      },
    });
    client = { query: jest.fn() } as unknown as jest.Mocked<EsoLogsClient>;
    fight = {
      id: 1,
      name: 'Test Fight',
      startTime: 1000,
      endTime: 2000,
    } as FightFragment;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const entry = () => {
    const state = store.getState() as { events: { debuffs: DebuffEventsState } };
    const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) });
    return state.events.debuffs.entries[key];
  };

  it('fails closed when pagination exceeds the page cap', async () => {
    client.query.mockResolvedValueOnce(page([], 1001)).mockResolvedValueOnce(page([], 1002));

    await store.dispatch(fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never);

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Debuff event pagination exceeded 2 pages');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('fails closed when pagination exceeds the per-stream event cap', async () => {
    client.query.mockResolvedValueOnce(
      page([debuffEvent(1000), debuffEvent(1001), debuffEvent(1002)], null),
    );

    await store.dispatch(fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never);

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Debuff event pagination exceeded 2 events');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects a pagination cursor that does not advance', async () => {
    client.query.mockResolvedValueOnce(page([debuffEvent(1000)], fight.startTime));

    await store.dispatch(fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never);

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Debuff event pagination cursor did not advance');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('caches a successful empty response', async () => {
    client.query.mockResolvedValue(page([], null));

    await store.dispatch(fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never);
    await store.dispatch(fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never);

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(entry()?.status).toBe('succeeded');
    expect(entry()?.events).toEqual([]);
    expect(entry()?.cacheMetadata).toEqual({
      lastFetchedTimestamp: expect.any(Number),
      restrictToFightWindow: true,
    });
  });

  it('preserves the last successful cache mode when a different-mode request fails', async () => {
    client.query
      .mockResolvedValueOnce(page([debuffEvent(1000)], null))
      .mockResolvedValueOnce(page([], null));
    await store.dispatch(
      fetchDebuffEvents({
        reportCode: 'ABC123',
        fight,
        client,
        restrictToFightWindow: true,
      }) as never,
    );
    const successfulTimestamp = entry()?.cacheMetadata.lastFetchedTimestamp;

    client.query.mockRejectedValueOnce(new Error('upstream unavailable'));
    await store.dispatch(
      fetchDebuffEvents({
        reportCode: 'ABC123',
        fight,
        client,
        restrictToFightWindow: false,
      }) as never,
    );

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toContain('upstream unavailable');
    expect(entry()?.events).toEqual([debuffEvent(1000)]);
    expect(entry()?.cacheMetadata).toEqual({
      lastFetchedTimestamp: successfulTimestamp,
      restrictToFightWindow: true,
    });

    const callsAfterFailure = client.query.mock.calls.length;
    await store.dispatch(
      fetchDebuffEvents({
        reportCode: 'ABC123',
        fight,
        client,
        restrictToFightWindow: true,
      }) as never,
    );
    expect(client.query).toHaveBeenCalledTimes(callsAfterFailure);
  });

  it('forwards thunk cancellation to the in-flight request', async () => {
    let requestSignal: AbortSignal | undefined;
    client.query.mockImplementation(
      ({ context }) =>
        new Promise(() => {
          requestSignal = context?.fetchOptions?.signal as AbortSignal;
        }),
    );

    const request = store.dispatch(
      fetchDebuffEvents({ reportCode: 'ABC123', fight, client }) as never,
    ) as unknown as Promise<{ meta: { aborted: boolean } }> & { abort: () => void };
    request.abort();
    const result = await request;

    expect(result.meta.aborted).toBe(true);
    expect(requestSignal?.aborted).toBe(true);
  });
});

const page = (data: unknown[], nextPageTimestamp: number | null) =>
  ({
    reportData: { report: { events: { data, nextPageTimestamp } } },
  }) as never;

const debuffEvent = (timestamp: number) => ({
  type: 'applydebuff',
  timestamp,
  sourceID: 1,
  targetID: 2,
  abilityGameID: 123,
  fight: 1,
});
