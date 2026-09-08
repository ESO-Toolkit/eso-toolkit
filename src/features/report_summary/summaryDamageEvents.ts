import type { EsoLogsClient } from '../../esologsClient';
import {
  type FightFragment,
  GetDamageEventsDocument,
  type GetDamageEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import {
  EVENT_MAX_EVENTS_PER_STREAM,
  EVENT_MAX_PAGES_PER_STREAM,
  EVENT_PAGE_LIMIT,
} from '../../store/events_data/constants';
import {
  assertCompleteEventPage,
  deduplicateEventPages,
} from '../../store/events_data/utils/deduplicateEvents';
import type { DamageEvent } from '../../types/combatlogEvents';

/**
 * Fetch a single fight's **Friendlies-only** damage events (player-outgoing
 * damage), paginated.
 *
 * The summary's per-event pass needs the Friendlies stream for the damage-type
 * breakdown (the only place per-event `tick`/flags matter — `table()` can't
 * express the direct/DoT/AoE delivery split). It deliberately does NOT fetch the
 * Enemies hostility: the only thing that incoming-damage stream fed was the A8
 * killing-blow hit size, which now comes from the aggregated Deaths table recap.
 * Dropping it roughly halves the report's event bandwidth.
 *
 * This bypasses the shared `fetchDamageEvents` Redux thunk (which fetches BOTH
 * hostilities and would poison its report_details cache if taught to fetch only
 * one) and reuses the already-allowlisted `getDamageEvents` operation, so no
 * Worker redeploy is needed. The summary aggregates straight from the returned
 * array, so it never relied on the slice's (6-entry-trimmed) cache anyway.
 */
export async function fetchSummaryFriendlyDamageEvents({
  reportCode,
  fight,
  client,
}: {
  reportCode: string;
  fight: FightFragment;
  client: EsoLogsClient;
}): Promise<DamageEvent[]> {
  const eventPages: DamageEvent[][] = [];
  let nextPageTimestamp: number | null = null;
  let pageCount = 0;
  let eventCount = 0;

  do {
    if (pageCount >= EVENT_MAX_PAGES_PER_STREAM) {
      throw new Error(
        `Summary damage event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} pages`,
      );
    }
    const requestedStartTime = nextPageTimestamp ?? fight.startTime;
    const response: GetDamageEventsQuery = await client.query({
      query: GetDamageEventsDocument,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: requestedStartTime,
        endTime: fight.endTime ?? undefined,
        hostilityType: HostilityType.Friendlies,
        limit: EVENT_PAGE_LIMIT,
      },
    });
    pageCount += 1;

    const page = response.reportData?.report?.events;
    assertCompleteEventPage(page, 'Summary damage');
    if (page.data.length) {
      eventCount += page.data.length;
      if (eventCount > EVENT_MAX_EVENTS_PER_STREAM) {
        throw new Error(
          `Summary damage event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
        );
      }
      eventPages.push(page.data as DamageEvent[]);
    }
    const followingTimestamp = page.nextPageTimestamp ?? null;
    if (
      followingTimestamp != null &&
      (!Number.isFinite(followingTimestamp) || followingTimestamp <= requestedStartTime)
    ) {
      throw new Error('Summary damage event pagination cursor did not advance');
    }
    nextPageTimestamp = followingTimestamp;
  } while (nextPageTimestamp != null);

  return deduplicateEventPages(eventPages);
}
