import type { EsoLogsClient } from '../../esologsClient';
import type { FightFragment } from '../../graphql/gql/graphql';

import { fetchResurrectionEvents } from './resurrectionEvents';

jest.mock('../../store/events_data/constants', () => ({
  ...jest.requireActual('../../store/events_data/constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 5,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

const fight = { id: 1, startTime: 1_000, endTime: 2_000 } as FightFragment;
const event = (timestamp: number, targetID = 2) => ({ type: 'cast', timestamp, targetID });
const page = (data: unknown[], nextPageTimestamp: number | null) => ({
  reportData: { report: { events: { data, nextPageTimestamp } } },
});

describe('fetchResurrectionEvents', () => {
  it('deduplicates an exact ordered page-boundary replay and preserves timestamp zero', async () => {
    const boundary = event(1_100, 3);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(page([event(0), boundary], 1_100))
        .mockResolvedValueOnce(page([boundary, event(1_200, 4)], null)),
    } as unknown as EsoLogsClient;

    await expect(fetchResurrectionEvents({ reportCode: 'CODE', fight, client })).resolves.toEqual([
      { targetID: 2, timestamp: 0 },
      { targetID: 3, timestamp: 1_100 },
      { targetID: 4, timestamp: 1_200 },
    ]);
  });

  it.each([1_000, 999, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a non-advancing cursor %s',
    async (cursor) => {
      const client = {
        query: jest.fn().mockResolvedValue(page([], cursor)),
      } as unknown as EsoLogsClient;
      await expect(fetchResurrectionEvents({ reportCode: 'CODE', fight, client })).rejects.toThrow(
        'pagination cursor did not advance',
      );
    },
  );

  it('rejects page and event caps instead of returning a partial result', async () => {
    const pageLimitedClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(page([], 1_001))
        .mockResolvedValueOnce(page([], 1_002)),
    } as unknown as EsoLogsClient;
    await expect(
      fetchResurrectionEvents({ reportCode: 'CODE', fight, client: pageLimitedClient }),
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
      fetchResurrectionEvents({ reportCode: 'CODE', fight, client: eventLimitedClient }),
    ).rejects.toThrow('exceeded 5 events');
  });

  it('accepts a successful empty stream', async () => {
    const client = {
      query: jest.fn().mockResolvedValue(page([], null)),
    } as unknown as EsoLogsClient;
    await expect(fetchResurrectionEvents({ reportCode: 'CODE', fight, client })).resolves.toEqual(
      [],
    );
  });
});
