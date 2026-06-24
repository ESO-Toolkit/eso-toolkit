import type { EsoLogsClient } from '../../esologsClient';
import {
  type FightFragment,
  GetDamageEventsDocument,
  type GetDamageEventsQuery,
  HostilityType,
} from '../../graphql/gql/graphql';
import { EVENT_PAGE_LIMIT } from '../../store/events_data/constants';
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
  let allEvents: DamageEvent[] = [];
  let nextPageTimestamp: number | null = null;

  do {
    const response: GetDamageEventsQuery = await client.query({
      query: GetDamageEventsDocument,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: nextPageTimestamp ?? fight.startTime,
        endTime: fight.endTime ?? undefined,
        hostilityType: HostilityType.Friendlies,
        limit: EVENT_PAGE_LIMIT,
      },
    });

    const page = response.reportData?.report?.events;
    if (page?.data) {
      allEvents = allEvents.concat(page.data as DamageEvent[]);
    }
    nextPageTimestamp = page?.nextPageTimestamp ?? null;
  } while (nextPageTimestamp);

  return allEvents;
}
