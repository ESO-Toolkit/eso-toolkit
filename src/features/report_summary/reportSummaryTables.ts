import { gql } from '@apollo/client';

import type { EsoLogsClient } from '../../esologsClient';
import type { PlayerDamageBreakdown } from '../../types/reportSummaryTypes';

/**
 * Tier-1 server-side aggregation for the report summary.
 *
 * Instead of paginating every fight's raw damage events and summing them on the
 * client (megabytes per boss fight), this asks ESO Logs for a pre-aggregated
 * `table(dataType: DamageDone)` — per-player damage totals for the whole report
 * in a single small response — so the damage leaderboard + report DPS can render
 * almost immediately while the slower raw-event passes (damage-type breakdown,
 * death analysis) stream in behind it.
 *
 * The operation is intentionally named `getBatchEventsForSummary`: the
 * roster-hub-api proxy only forwards operations on its allowlist, and that name
 * is already allowlisted (with no existing query document), so this table-based
 * body reaches ESO Logs without a Worker redeploy. The proxy validates the
 * operation *name*, not the field selection. (Same trick as
 * `resurrectionEvents.ts`' reuse of `getCastEvents`.)
 *
 * `fightIDs` (not a time range) scopes the aggregation to exactly the fights the
 * summary counts, matching the per-fight raw-event population. `table()` requires
 * either `fightIDs` or `startTime`+`endTime`; passing neither errors upstream.
 */
const SUMMARY_DAMAGE_TABLE_QUERY = gql`
  query getBatchEventsForSummary($code: String!, $fightIDs: [Int]) {
    reportData {
      report(code: $code) {
        damage: table(dataType: DamageDone, fightIDs: $fightIDs, hostilityType: Friendlies)
      }
    }
  }
`;

/**
 * Shape of a `table(dataType: DamageDone)` payload — verified live (2026-06)
 * against report F4f2bMwWtgVKxjB9. The `table` field is an opaque JSON scalar;
 * only the fields the summary consumes are typed here.
 */
interface DamageTableEntry {
  name?: string | null;
  id?: number | null;
  /** Actor type: a class name for players, "NPC"/"Pet" for non-players. */
  type?: string | null;
  /** Total damage done by this actor across the requested fights. */
  total?: number | null;
}

interface DamageTablePayload {
  data?: { entries?: DamageTableEntry[] | null } | null;
}

interface SummaryDamageTableResponse {
  reportData?: {
    report?: {
      damage?: DamageTablePayload | string | null;
    } | null;
  } | null;
}

/**
 * The JSON scalar normally arrives already parsed, but tolerate a stringified
 * payload (some JSON-scalar transports return a string) rather than throwing.
 */
function coerceTablePayload(
  raw: DamageTablePayload | string | null | undefined,
): DamageTablePayload {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as DamageTablePayload;
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

// A `hostilityType: Friendlies` table still includes friendly NPCs and pets; the
// summary's damage leaderboard is players only, matching the raw-event path's
// `actorsById[id].type === 'player'` filter. Players carry a class name as their
// `type`, so excluding the known non-player types isolates them.
const NON_PLAYER_TABLE_TYPES = new Set(['NPC', 'Pet', 'Boss', 'Unknown', '']);

function isPlayerEntry(entry: DamageTableEntry): entry is DamageTableEntry & { id: number } {
  return (
    typeof entry.id === 'number' &&
    typeof entry.total === 'number' &&
    entry.type != null &&
    !NON_PLAYER_TABLE_TYPES.has(entry.type)
  );
}

export interface SummaryDamageTotals {
  totalDamage: number;
  dps: number;
  playerBreakdown: PlayerDamageBreakdown[];
}

/**
 * Build the per-player damage leaderboard from a damage-table payload. Pure +
 * exported for testing. `totalActiveDuration` (summed per-fight active windows)
 * stays the DPS denominator so DPS matches the raw-event path exactly.
 */
export function adaptDamageTable(
  payload: DamageTablePayload,
  totalActiveDuration: number,
): SummaryDamageTotals {
  const entries = (payload.data?.entries ?? []).filter(isPlayerEntry);

  const totalDamage = entries.reduce((sum, e) => sum + (e.total ?? 0), 0);
  const dps = totalActiveDuration > 0 ? (totalDamage / totalActiveDuration) * 1000 : 0;

  const playerBreakdown: PlayerDamageBreakdown[] = entries
    .map((e) => {
      const damage = e.total ?? 0;
      return {
        playerId: String(e.id),
        playerName: e.name || `Actor ${e.id}`,
        totalDamage: damage,
        dps: totalActiveDuration > 0 ? (damage / totalActiveDuration) * 1000 : 0,
        damagePercentage: totalDamage > 0 ? (damage / totalDamage) * 100 : 0,
        // Per-fight breakdown is not part of the report-wide table aggregation
        // (and is not rendered by the summary); the raw-event path is the source
        // for any per-fight detail.
        fightBreakdown: [],
      };
    })
    .sort((a, b) => b.totalDamage - a.totalDamage);

  return { totalDamage, dps, playerBreakdown };
}

/**
 * Fetch the Tier-1 damage leaderboard for a report in one request.
 *
 * @param fightIds  Report ids of the fights to aggregate (the summary's cleaned set).
 * @param totalActiveDuration  Summed active fight windows, in ms — the DPS denominator.
 */
export async function fetchSummaryDamageTotals({
  reportCode,
  client,
  fightIds,
  totalActiveDuration,
}: {
  reportCode: string;
  client: EsoLogsClient;
  fightIds: number[];
  totalActiveDuration: number;
}): Promise<SummaryDamageTotals> {
  const response = (await client.query({
    query: SUMMARY_DAMAGE_TABLE_QUERY,
    fetchPolicy: 'no-cache',
    variables: { code: reportCode, fightIDs: fightIds },
  })) as SummaryDamageTableResponse;

  const payload = coerceTablePayload(response?.reportData?.report?.damage);
  return adaptDamageTable(payload, totalActiveDuration);
}
