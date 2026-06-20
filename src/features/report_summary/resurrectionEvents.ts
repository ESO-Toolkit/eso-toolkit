import { gql } from '@apollo/client';

import type { EsoLogsClient } from '../../esologsClient';
import type { FightFragment } from '../../graphql/gql/graphql';
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
const RESURRECTION_CASTS_QUERY = gql`
  query getResurrectionCasts(
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
  const out: ResurrectionEvent[] = [];
  let nextPageTimestamp: number | null = null;
  let pages = 0;

  do {
    const response = (await client.query({
      query: RESURRECTION_CASTS_QUERY,
      fetchPolicy: 'no-cache',
      variables: {
        code: reportCode,
        fightIds: [Number(fight.id)],
        startTime: nextPageTimestamp ?? fight.startTime,
        endTime: fight.endTime ?? undefined,
        abilityID: KnownAbilities.RESURRECT,
      },
    })) as ResurrectionCastsResponse;

    const page = response?.reportData?.report?.events;
    for (const ev of page?.data ?? []) {
      if (
        ev?.type === 'cast' &&
        typeof ev.targetID === 'number' &&
        typeof ev.timestamp === 'number'
      ) {
        out.push({ targetID: ev.targetID, timestamp: ev.timestamp });
      }
    }
    nextPageTimestamp = page?.nextPageTimestamp ?? null;
  } while (nextPageTimestamp && ++pages < 20);

  return out;
}
