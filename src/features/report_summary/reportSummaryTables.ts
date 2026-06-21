import { gql } from '@apollo/client';

import type { EsoLogsClient } from '../../esologsClient';
import type { ReportActorFragment, ReportAbilityFragment } from '../../graphql/gql/graphql';
import type { DamageEvent, DeathEvent } from '../../types/combatlogEvents';
import type { PlayerDamageBreakdown } from '../../types/reportSummaryTypes';

/**
 * Tier-1 server-side aggregation for the report summary.
 *
 * Instead of paginating every fight's raw damage/death events and summing them on
 * the client (megabytes per boss fight), this asks ESO Logs for pre-aggregated
 * `table(...)` payloads — per-player damage totals AND per-death recaps for the
 * whole report in a single small response — so the damage leaderboard, report DPS
 * and the entire death analysis can render almost immediately while the slower
 * raw-event pass (the per-event damage-type breakdown) streams in behind it.
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
 * `hostilityType: Friendlies` restricts the deaths table to friendly (player)
 * deaths — the same population the raw path keeps via `targetIsFriendly`.
 */
const SUMMARY_TABLES_QUERY = gql`
  query getBatchEventsForSummary($code: String!, $fightIDs: [Int]) {
    reportData {
      report(code: $code) {
        damage: table(dataType: DamageDone, fightIDs: $fightIDs, hostilityType: Friendlies)
        deaths: table(dataType: Deaths, fightIDs: $fightIDs, hostilityType: Friendlies)
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

/**
 * Shape of a `table(dataType: Deaths)` payload — verified live (2026-06) against
 * report F4f2bMwWtgVKxjB9. Opaque JSON scalar; only consumed fields are typed.
 * One entry per friendly death. `events[]` is the death recap — the damage events
 * targeting the victim within the death window, proven identical to the raw
 * `DamageDone` stream subset to that victim (reflect events included), so the
 * A8 killing-blow join reproduces the raw-event result exactly.
 */
interface DeathRecapAbility {
  guid?: number | null;
  name?: string | null;
  /** Damage-type bitmask (DamageTypeFlags) — the SAME value master data carries. */
  type?: number | string | null;
  abilityIcon?: string | null;
}

interface DeathRecapEvent {
  timestamp?: number | null;
  type?: string | null;
  sourceID?: number | null;
  sourceIsFriendly?: boolean | null;
  targetID?: number | null;
  amount?: number | null;
}

interface DeathTableEntry {
  name?: string | null;
  /** Victim actor id (= the raw death event's targetID). */
  id?: number | null;
  /** Class name for players; "NPC"/"Pet"/… for non-players. */
  type?: string | null;
  /** Death timestamp (= the raw death event's timestamp). */
  timestamp?: number | null;
  fight?: number | null;
  /** How far the lethal blow exceeded remaining health. */
  overkill?: number | null;
  /** The death recap — incoming damage events that led to this death. */
  events?: DeathRecapEvent[] | null;
  /** The lethal ability. */
  killingBlow?: DeathRecapAbility | null;
}

interface DeathTablePayload {
  data?: { entries?: DeathTableEntry[] | null } | null;
}

interface SummaryTablesResponse {
  reportData?: {
    report?: {
      damage?: DamageTablePayload | string | null;
      deaths?: DeathTablePayload | string | null;
    } | null;
  } | null;
}

/**
 * The JSON scalar normally arrives already parsed, but tolerate a stringified
 * payload (some JSON-scalar transports return a string) rather than throwing.
 */
function coerceJsonScalar<T>(raw: T | string | null | undefined): T | Record<string, never> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
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
 * Per-fight death-analysis inputs synthesized from the aggregated Deaths table,
 * ready to feed straight into `DeathAnalysisService` (whose analysis logic is the
 * unchanged source of truth). The maps are keyed by fight id, in chronological
 * (table) order so tie-breaking (e.g. a player's top cause of death) matches the
 * raw-event path.
 */
export interface SummaryDeathsData {
  /** Synthesized death events per fight (one per table entry). */
  deathEventsByFight: Map<number, DeathEvent[]>;
  /**
   * Synthesized incoming-damage events per fight, from each death's recap. The
   * ONLY input `computeKillingBlowHitSize` (A8 "Avg Hit Size") joins against — it
   * reads timestamp/targetID/amount and reproduces the raw stream's result.
   */
  recapDamageByFight: Map<number, DamageEvent[]>;
  /**
   * Minimal actor records for the death victims (name + 'Player'/non-player type),
   * overlaid by real master data in the hook when it is warm.
   */
  tableActors: Record<number, ReportActorFragment>;
  /** Minimal ability records for the killing abilities (name + damage-type bitmask). */
  tableAbilities: Record<number, ReportAbilityFragment>;
  /** Number of death entries parsed — lets the hook tell "0 deaths" from "table failed". */
  deathCount: number;
}

// The raw `dataType: Deaths` event stream carries NO `amount` field (verified
// live), so the current "overkill" sub-text (averageKillingBlowDamage) is always
// 0. Synthesized deaths use 0 to preserve EXACT parity. (entry.overkill IS
// available here if that column is ever intentionally lit up — a deliberate
// change, not this migration's.)
const SYNTHESIZED_DEATH_AMOUNT = 0;

/**
 * The lethal recap event = the latest (max-timestamp) damage/reflect event. Only
 * `sourceIsFriendly` is read from it (it drives the friendly-source-death skip),
 * so the type gate matches the recap-damage loop below: a non-damage recap entry
 * (e.g. a trailing heal/shield) must never become the "killing blow" and flip the
 * death to friendly-source.
 */
function findKillingBlowEvent(events: DeathRecapEvent[]): DeathRecapEvent | undefined {
  let kb: DeathRecapEvent | undefined;
  for (const ev of events) {
    if (ev?.type !== 'damage' && ev?.type !== 'reflect') continue;
    if (typeof ev.timestamp !== 'number') continue;
    if (!kb || (ev.timestamp ?? 0) >= (kb.timestamp ?? 0)) kb = ev;
  }
  return kb;
}

/**
 * Adapt a `table(dataType: Deaths)` payload into per-fight death-analysis inputs.
 * Pure + exported for testing. Each entry becomes one synthesized `DeathEvent`
 * plus its recap `DamageEvent[]` (for the A8 join); malformed entries are dropped
 * individually rather than failing the whole report.
 */
export function adaptDeathsTable(payload: DeathTablePayload): SummaryDeathsData {
  const deathEventsByFight = new Map<number, DeathEvent[]>();
  const recapDamageByFight = new Map<number, DamageEvent[]>();
  const tableActors: Record<number, ReportActorFragment> = {};
  const tableAbilities: Record<number, ReportAbilityFragment> = {};
  let deathCount = 0;

  const pushTo = <T>(map: Map<number, T[]>, fight: number, value: T): void => {
    const bucket = map.get(fight);
    if (bucket) bucket.push(value);
    else map.set(fight, [value]);
  };

  for (const entry of payload.data?.entries ?? []) {
    try {
      const victimId = entry?.id;
      const fight = entry?.fight;
      if (typeof victimId !== 'number' || typeof fight !== 'number') continue;
      if (typeof entry?.timestamp !== 'number') continue;

      const events = Array.isArray(entry.events) ? entry.events : [];
      const kb = entry.killingBlow ?? null;
      const abilityGameID = typeof kb?.guid === 'number' ? kb.guid : 0;

      // Source of the lethal blow — drives the friendly-source-death skip in the
      // analysis. Read off the actual killing-blow recap event when present.
      const kbEvent = findKillingBlowEvent(events);
      const sourceIsFriendly = kbEvent?.sourceIsFriendly === true;
      const sourceID = typeof kbEvent?.sourceID === 'number' ? kbEvent.sourceID : 0;

      // Only the fields DeathAnalysisService reads are populated; cast to the full
      // event type (it never touches the rest).
      const deathEvent = {
        type: 'death',
        targetID: victimId,
        targetIsFriendly: true,
        sourceID,
        sourceIsFriendly,
        abilityGameID,
        fight,
        timestamp: entry.timestamp,
        amount: SYNTHESIZED_DEATH_AMOUNT,
      } as unknown as DeathEvent;
      pushTo(deathEventsByFight, fight, deathEvent);

      // Recap incoming damage (damage + reflect, both present in the raw stream).
      // targetID is hard-set to the victim so one victim's recap can never leak
      // into another's killing-blow join.
      for (const ev of events) {
        if (ev?.type !== 'damage' && ev?.type !== 'reflect') continue;
        const amount = typeof ev.amount === 'number' ? ev.amount : 0;
        if (amount <= 0 || typeof ev.timestamp !== 'number') continue;
        const recapDamage = {
          type: 'damage',
          timestamp: ev.timestamp,
          targetID: victimId,
          targetIsFriendly: false,
          sourceID: typeof ev.sourceID === 'number' ? ev.sourceID : 0,
          sourceIsFriendly: ev.sourceIsFriendly === true,
          abilityGameID,
          fight,
          amount,
        } as unknown as DamageEvent;
        pushTo(recapDamageByFight, fight, recapDamage);
      }

      // Minimal actor/ability records (overlaid by real master data when warm).
      const actorType =
        typeof entry.type === 'string' && !NON_PLAYER_TABLE_TYPES.has(entry.type)
          ? 'Player'
          : (entry.type ?? 'Unknown');
      tableActors[victimId] = {
        id: victimId,
        name: entry.name || `Actor ${victimId}`,
        type: actorType,
      } as unknown as ReportActorFragment;

      // `killingBlow.type` is the damage-type bitmask — verified equal to the
      // master-data `ReportAbility.type` (not `flags`) — so the category chip is
      // correct even before master data loads.
      tableAbilities[abilityGameID] = {
        gameID: abilityGameID,
        name: kb?.name || `Unknown Ability (${abilityGameID})`,
        type: kb?.type ?? undefined,
        icon: kb?.abilityIcon ?? undefined,
      } as unknown as ReportAbilityFragment;

      deathCount += 1;
    } catch {
      // Drop only the malformed entry; never fail the whole death section.
      continue;
    }
  }

  return { deathEventsByFight, recapDamageByFight, tableActors, tableAbilities, deathCount };
}

export interface SummaryTables {
  damage: SummaryDamageTotals;
  /** Null when the deaths alias is absent/unparseable — the hook falls back to raw death events. */
  deaths: SummaryDeathsData | null;
}

/**
 * Fetch the Tier-1 damage leaderboard AND per-death recaps for a report in one
 * request.
 *
 * @param fightIds  Report ids of the fights to aggregate (the summary's cleaned set).
 * @param totalActiveDuration  Summed active fight windows, in ms — the DPS denominator.
 */
export async function fetchSummaryTables({
  reportCode,
  client,
  fightIds,
  totalActiveDuration,
}: {
  reportCode: string;
  client: EsoLogsClient;
  fightIds: number[];
  totalActiveDuration: number;
}): Promise<SummaryTables> {
  const response = (await client.query({
    query: SUMMARY_TABLES_QUERY,
    fetchPolicy: 'no-cache',
    variables: { code: reportCode, fightIDs: fightIds },
  })) as SummaryTablesResponse;

  const damagePayload = coerceJsonScalar<DamageTablePayload>(response?.reportData?.report?.damage);
  const damage = adaptDamageTable(damagePayload as DamageTablePayload, totalActiveDuration);

  // A present-but-unparseable deaths scalar (empty string, truncated/malformed
  // JSON, or an object missing `data.entries`) coerces to `{}` → a non-null
  // result with deathCount 0, which would suppress the raw-death fallback AND
  // render a false "Flawless Performance!". Treat anything without an `entries`
  // ARRAY as absent (null) so the hook falls back to the raw death fetch. A
  // genuine zero-death report sends `{data:{entries:[]}}` (an array) and stays
  // non-null, so it still correctly shows the flawless state.
  const rawDeaths = response?.reportData?.report?.deaths;
  const deathsPayload =
    rawDeaths == null
      ? null
      : (coerceJsonScalar<DeathTablePayload>(rawDeaths) as DeathTablePayload);
  const deaths =
    deathsPayload && Array.isArray(deathsPayload.data?.entries)
      ? adaptDeathsTable(deathsPayload)
      : null;

  return { damage, deaths };
}
