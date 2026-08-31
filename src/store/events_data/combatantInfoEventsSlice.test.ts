import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { EsoLogsClient } from '../../esologsClient';
import { FightFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import combatantInfoEventsReducer, {
  CombatantInfoEventsState,
  fetchCombatantInfoEvents,
} from './combatantInfoEventsSlice';

jest.mock('../../esologsClient');
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 2,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

describe('combatantInfoEventsSlice pagination hardening', () => {
  let store: ReturnType<typeof configureStore>;
  let client: jest.Mocked<EsoLogsClient>;
  let fight: FightFragment;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        events: combineReducers({ combatantInfo: combatantInfoEventsReducer }),
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
    const state = store.getState() as { events: { combatantInfo: CombatantInfoEventsState } };
    const { key } = resolveCacheKey({ reportCode: 'ABC123', fightId: Number(fight.id) });
    return state.events.combatantInfo.entries[key];
  };

  it('fails closed when pagination exceeds the page cap', async () => {
    client.query.mockResolvedValueOnce(page([], 1001)).mockResolvedValueOnce(page([], 1002));

    await store.dispatch(
      fetchCombatantInfoEvents({ reportCode: 'ABC123', fight, client }) as never,
    );

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Combatant info event pagination exceeded 2 pages');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('fails closed when pagination exceeds the per-stream event cap', async () => {
    client.query.mockResolvedValueOnce(
      page([combatantInfoEvent(1000), combatantInfoEvent(1001), combatantInfoEvent(1002)], null),
    );

    await store.dispatch(
      fetchCombatantInfoEvents({ reportCode: 'ABC123', fight, client }) as never,
    );

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Combatant info event pagination exceeded 2 events');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects a pagination cursor that does not advance', async () => {
    client.query.mockResolvedValueOnce(page([combatantInfoEvent(1000)], fight.startTime));

    await store.dispatch(
      fetchCombatantInfoEvents({ reportCode: 'ABC123', fight, client }) as never,
    );

    expect(entry()?.status).toBe('failed');
    expect(entry()?.error).toBe('Combatant info event pagination cursor did not advance');
    expect(client.query).toHaveBeenCalledTimes(1);
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
      fetchCombatantInfoEvents({ reportCode: 'ABC123', fight, client }) as never,
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

const combatantInfoEvent = (timestamp: number) => ({
  type: 'combatantinfo',
  timestamp,
  sourceID: 1,
  fight: 1,
});
