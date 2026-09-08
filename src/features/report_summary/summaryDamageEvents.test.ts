import type { EsoLogsClient } from '../../esologsClient';
import type { FightFragment } from '../../graphql/gql/graphql';

import { fetchSummaryFriendlyDamageEvents } from './summaryDamageEvents';

jest.mock('../../store/events_data/constants', () => ({
  ...jest.requireActual('../../store/events_data/constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 5,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

const fight = { id: 1, startTime: 1_000, endTime: 2_000 } as FightFragment;

const event = (timestamp: number, amount = 100) => ({
  type: 'damage',
  timestamp,
  sourceID: 1,
  targetID: 2,
  abilityGameID: 3,
  amount,
  fight: 1,
});

const page = (data: unknown[], nextPageTimestamp: number | null) => ({
  reportData: { report: { events: { data, nextPageTimestamp } } },
});

describe('fetchSummaryFriendlyDamageEvents', () => {
  it('deduplicates only an ordered adjacent-page boundary replay', async () => {
    const boundary = event(1_100, 200);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(page([event(1_000), boundary], 1_100))
        .mockResolvedValueOnce(page([boundary, event(1_200)], null)),
    } as unknown as EsoLogsClient;

    await expect(
      fetchSummaryFriendlyDamageEvents({ reportCode: 'CODE', fight, client }),
    ).resolves.toHaveLength(3);
  });

  it.each([1_000, 999, Number.NaN, Number.POSITIVE_INFINITY])(
    'fails closed for a non-advancing cursor %s',
    async (cursor) => {
      const client = {
        query: jest.fn().mockResolvedValue(page([], cursor)),
      } as unknown as EsoLogsClient;

      await expect(
        fetchSummaryFriendlyDamageEvents({ reportCode: 'CODE', fight, client }),
      ).rejects.toThrow('pagination cursor did not advance');
    },
  );

  it('fails closed instead of fulfilling a page- or event-truncated result', async () => {
    const pageLimitedClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(page([], 1_001))
        .mockResolvedValueOnce(page([], 1_002)),
    } as unknown as EsoLogsClient;
    await expect(
      fetchSummaryFriendlyDamageEvents({ reportCode: 'CODE', fight, client: pageLimitedClient }),
    ).rejects.toThrow('exceeded 2 pages');

    const eventLimitedClient = {
      query: jest.fn().mockResolvedValue(
        page(
          Array.from({ length: 6 }, () => event(1_000)),
          null,
        ),
      ),
    } as unknown as EsoLogsClient;
    await expect(
      fetchSummaryFriendlyDamageEvents({ reportCode: 'CODE', fight, client: eventLimitedClient }),
    ).rejects.toThrow('exceeded 5 events');
  });

  it('returns a successful fresh empty stream', async () => {
    const client = {
      query: jest.fn().mockResolvedValue(page([], null)),
    } as unknown as EsoLogsClient;

    await expect(
      fetchSummaryFriendlyDamageEvents({ reportCode: 'CODE', fight, client }),
    ).resolves.toEqual([]);
  });
});
