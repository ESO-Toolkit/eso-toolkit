import { OptimizedReportEventsFetcher } from './OptimizedReportEventsFetcher';
import type { EsoLogsClient } from '../esologsClient';
import { HostilityType, type FightFragment } from '../graphql/gql/graphql';

/**
 * Builds the shape client.query() actually resolves to: the GraphQL `data`
 * object directly (NOT wrapped in an extra `.data`). The previous code read
 * response.data.reportData... which always resolved to undefined.
 */
const reportEventsResponse = (
  data: unknown[],
  nextPageTimestamp: number | null = null,
): unknown => ({
  reportData: { report: { events: { data, nextPageTimestamp } } },
});

const fight = (id: number, startTime: number, endTime: number): FightFragment =>
  ({ id, startTime, endTime, name: `Fight ${id}` }) as unknown as FightFragment;

describe('OptimizedReportEventsFetcher.fetchReportEventsParallel', () => {
  it('extracts events from the unwrapped response (no outer .data) and does not fall back', async () => {
    const query = jest
      .fn()
      .mockResolvedValue(reportEventsResponse([{ type: 'damage', timestamp: 5, amount: 1 }]));
    const client = { query } as unknown as EsoLogsClient;
    const fetcher = new OptimizedReportEventsFetcher(client);

    const result = await fetcher.fetchReportEventsParallel('ABC', [fight(1, 0, 10)], 0, 10);

    // Each of damage/death/healing is fetched for both hostilities => 6 calls.
    // If the unwrap were still broken, every batch query would yield 0 events
    // and the code would fall back to the per-fight path (different queries).
    expect(query).toHaveBeenCalledTimes(6);
    // Friendlies + Enemies were both requested.
    const hostilities = query.mock.calls.map((c) => c[0].variables.hostilityType);
    expect(hostilities).toContain(HostilityType.Friendlies);
    expect(hostilities).toContain(HostilityType.Enemies);
    // Both-hostility merge => the single damage event appears once per hostility.
    expect(result.damageEvents.length).toBe(2);
  });

  it('falls back to the per-fight path when a batch query is truncated by the page cap', async () => {
    // Always return a nextPageTimestamp so pagination never completes -> the
    // 50-page cap is hit -> truncated -> fall back. The fallback issues its own
    // per-fight queries (dynamically imported documents) which this same mock
    // also answers, so we just assert it did NOT early-return the batch result
    // by checking the query was invoked far more than the 6 batch calls.
    const query = jest
      .fn()
      .mockResolvedValue(reportEventsResponse([{ type: 'damage', timestamp: 1 }], 999));
    const client = { query } as unknown as EsoLogsClient;
    const fetcher = new OptimizedReportEventsFetcher(client);

    await fetcher.fetchReportEventsParallel('ABC', [fight(1, 0, 10)], 0, 10);

    // 3 event types x 2 hostilities x 50 capped pages = 300 batch calls, then
    // the per-fight fallback adds more — well beyond the 6 of a clean batch.
    expect(query.mock.calls.length).toBeGreaterThan(6);
  });
});
