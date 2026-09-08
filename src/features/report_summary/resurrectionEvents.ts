import { gql } from '@apollo/client';

import type { EsoLogsClient } from '../../esologsClient';
import type { FightFragment } from '../../graphql/gql/graphql';
import {
  EVENT_MAX_EVENTS_PER_STREAM,
  EVENT_MAX_PAGES_PER_STREAM,
} from '../../store/events_data/constants';
import {
  assertCompleteEventPage,
  deduplicateEventPages,
} from '../../store/events_data/utils/deduplicateEvents';
import { KnownAbilities } from '../../types/abilities';

/** A resurrection cast targeting a player — the moment they were revived. */
export interface ResurrectionEvent {
  /** Actor id of the player who was resurrected. */
  targetID: number;
  /** Fight-relative timestamp of the resurrect cast. */
  timestamp: number;
}

// Server-filters the cast stream to the Resurrect ability (abilityID), so only a
// handful of events come back instead of every player's full cast log.
//
// The operation is intentionally named `getCastEvents`: the roster-hub-api proxy
// only forwards requests whose operation is on its allowlist, and `getCastEvents`
// is already allowlisted. The proxy forwards the request body verbatim, so this
// ability-filtered variant reaches ESO Logs without needing a brand-new
// allowlisted operation (which would require a Worker redeploy).
const RESURRECTION_CASTS_QUERY = gql`
  query getCastEvents(
    $code: String!
    $startTime: Float
    $endTime: Float
    $fightIds: [Int]!
    $abilityID: Float!
    $limit: Int = 100000
  ) {
    reportData {
      report(code: $code) {
        events(
          startTime: $startTime
          endTime: $endTime
          fightIDs: $fightIds
          dataType: Casts
          abilityID: $abilityID
          hostilityType: Friendlies
          useActorIDs: true
          limit: $limit
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

interface RawCastEvent {
  type?: string;
  targetID?: number;
  timestamp?: number;
}

interface ResurrectionCastsResponse {
  reportData?: {
    report?: {
      events?: { data?: RawCastEvent[] | null; nextPageTimestamp?: number | null } | null;
    } | null;
  } | null;
}

/**
 * Fetch the resurrection casts for a single fight, server-filtered to the
 * Resurrect ability. Used to reconstruct a player's true time alive across
 * revives. Returns only completed `cast` events (not `begincast`).
 */
export async function fetchResurrectionEvents({
  reportCode,
  fight,
  client,
}: {
  reportCode: string;
  fight: FightFragment;
  client: EsoLogsClient;
}): Promise<ResurrectionEvent[]> {
  const eventPages: RawCastEvent[][] = [];
  let nextPageTimestamp: number | null = null;
  let pageCount = 0;
  let eventCount = 0;

  do {
    if (pageCount >= EVENT_MAX_PAGES_PER_STREAM) {
      throw new Error(`Resurrection event pagination exceeded ${EVENT_MAX_PAGES_PER_STREAM} pages`);
    }
    const requestedStartTime = nextPageTimestamp ?? fight.startTime;
    const response = (await client.query({
      query: RESURRECTION_CASTS_QUERY,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: requestedStartTime,
        endTime: fight.endTime ?? undefined,
        abilityID: KnownAbilities.RESURRECT,
      },
    })) as ResurrectionCastsResponse;

    const page = response?.reportData?.report?.events;
    assertCompleteEventPage(page, 'Resurrection');
    const pageEvents = page.data;
    eventPages.push(pageEvents);
    pageCount += 1;
    eventCount += pageEvents.length;
    if (eventCount > EVENT_MAX_EVENTS_PER_STREAM) {
      throw new Error(
        `Resurrection event pagination exceeded ${EVENT_MAX_EVENTS_PER_STREAM} events`,
      );
    }

    const followingTimestamp = page.nextPageTimestamp ?? null;
    if (
      followingTimestamp != null &&
      (!Number.isFinite(followingTimestamp) || followingTimestamp <= requestedStartTime)
    ) {
      throw new Error('Resurrection event pagination cursor did not advance');
    }
    nextPageTimestamp = followingTimestamp;
  } while (nextPageTimestamp != null);

  return deduplicateEventPages(eventPages).flatMap((event) =>
    event.type === 'cast' &&
    typeof event.targetID === 'number' &&
    Number.isFinite(event.targetID) &&
    typeof event.timestamp === 'number' &&
    Number.isFinite(event.timestamp)
      ? [{ targetID: event.targetID, timestamp: event.timestamp }]
      : [],
  );
}
