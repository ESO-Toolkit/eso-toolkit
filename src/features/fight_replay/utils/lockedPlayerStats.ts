/**
 * Live up-to-playhead stat engine for the locked-player panel.
 *
 * The replay panel needs combat stats that advance with the playhead (scrub to 30s → see the
 * player's DPS/HPS/damage-taken AS OF 30s, not the whole-fight total). The replay's perf contract
 * forbids per-tick React reconciliation, so the panel runs its own rAF loop and reads these values
 * imperatively. To keep that loop allocation-free and cheap, the heavy work is done ONCE on lock:
 * we filter + sort the player's relevant events and build PREFIX-SUM arrays. A per-frame query is
 * then an O(log n) binary search for the cutoff index plus a couple of array reads — and because we
 * recompute from the cutoff every frame (never accumulate a forward-only pointer), backward scrubs
 * and A–B loops are correct for free.
 *
 * All times here are ABSOLUTE combat-log timestamps (event.timestamp). The caller converts the
 * fight-relative playhead via `fight.startTime + playheadMs` before querying.
 *
 * Damage/crit semantics mirror usePlayerCardData.damageStats and DamageBreakdownPanel exactly
 * (sourceIsFriendly && !targetIsFriendly && sourceID === playerId; crit = hitType === 2) so the
 * numbers match the fight-insights views the user already trusts.
 */

import { DamageEvent, DeathEvent, HealEvent, HitType } from '../../../types/combatlogEvents';

/** Minimum elapsed seconds used as the rate denominator, so early-fight DPS/HPS doesn't explode. */
export const MIN_RATE_WINDOW_SECONDS = 1;

/** Prefix-sum index over a player's contribution to one event stream, sorted by timestamp. */
interface PrefixIndex {
  /** Sorted absolute timestamps of the kept events. */
  times: number[];
  /** cumAmount[i] = sum of `amount` for events[0..i-1] (so cumAmount[len] = grand total). */
  cumAmount: Float64Array;
  /** cumSecondary[i] = sum of a secondary field (overheal, or crit amount) over events[0..i-1]. */
  cumSecondary: Float64Array;
  /** cumCount[i] = count of events[0..i-1] (for hit-based rates like crit chance). */
  cumCount: Int32Array;
  /** cumSecondaryCount[i] = count of "flagged" events (crit hits) over events[0..i-1]. */
  cumSecondaryCount: Int32Array;
}

/** What a query returns for one stream up to the cutoff. */
interface PrefixQuery {
  amount: number;
  secondary: number;
  count: number;
  secondaryCount: number;
}

const EMPTY_INDEX: PrefixIndex = {
  times: [],
  cumAmount: new Float64Array(1),
  cumSecondary: new Float64Array(1),
  cumCount: new Int32Array(1),
  cumSecondaryCount: new Int32Array(1),
};

/**
 * Build a prefix index from a pre-filtered, time-sorted list of {timestamp, amount, secondary,
 * isFlagged} rows. Done once on lock.
 */
function buildPrefixIndex(
  rows: Array<{ timestamp: number; amount: number; secondary: number; isFlagged: boolean }>,
): PrefixIndex {
  rows.sort((a, b) => a.timestamp - b.timestamp);
  const n = rows.length;
  const times = new Array<number>(n);
  const cumAmount = new Float64Array(n + 1);
  const cumSecondary = new Float64Array(n + 1);
  const cumCount = new Int32Array(n + 1);
  const cumSecondaryCount = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    times[i] = row.timestamp;
    cumAmount[i + 1] = cumAmount[i] + row.amount;
    cumSecondary[i + 1] = cumSecondary[i] + row.secondary;
    cumCount[i + 1] = cumCount[i] + 1;
    cumSecondaryCount[i + 1] = cumSecondaryCount[i] + (row.isFlagged ? 1 : 0);
  }
  return { times, cumAmount, cumSecondary, cumCount, cumSecondaryCount };
}

/** Largest index `i` such that times[0..i-1] are all <= cutoff (i.e. count of events at/before cutoff). */
function upperBoundCount(times: number[], cutoff: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] <= cutoff) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function queryPrefix(index: PrefixIndex, cutoff: number): PrefixQuery {
  const i = upperBoundCount(index.times, cutoff);
  return {
    amount: index.cumAmount[i],
    secondary: index.cumSecondary[i],
    count: index.cumCount[i],
    secondaryCount: index.cumSecondaryCount[i],
  };
}

/** Sorted death timestamps where the player was the victim. */
type DeathIndex = number[];

/** Per-role indexes, built once when a player is locked. */
export interface LockedStatsIndex {
  /** Damage DONE by the player to hostiles (amount, crit amount as secondary, crit hits flagged). */
  damageDone: PrefixIndex;
  /** Damage TAKEN by the player (targetID === playerId). */
  damageTaken: PrefixIndex;
  /** Healing DONE by the player (amount = effective, overheal as secondary). */
  healingDone: PrefixIndex;
  /** Absolute timestamps the player died at, sorted. */
  deaths: DeathIndex;
}

/**
 * Build all per-role indexes for one player in a single pass over each event stream. Cheap to keep
 * all four indexes regardless of role — the arrays are small (one player's events) and it keeps the
 * panel free of role branches at build time.
 */
export function buildLockedStatsIndex(
  playerId: number,
  damageEvents: readonly DamageEvent[],
  healingEvents: readonly HealEvent[],
  deathEvents: readonly DeathEvent[],
): LockedStatsIndex {
  const doneRows: Array<{
    timestamp: number;
    amount: number;
    secondary: number;
    isFlagged: boolean;
  }> = [];
  const takenRows: Array<{
    timestamp: number;
    amount: number;
    secondary: number;
    isFlagged: boolean;
  }> = [];
  for (const ev of damageEvents) {
    if (ev.sourceIsFriendly && !ev.targetIsFriendly && ev.sourceID === playerId) {
      const amount = ev.amount ?? 0;
      const isCrit = ev.hitType === HitType.Critical;
      doneRows.push({
        timestamp: ev.timestamp,
        amount,
        secondary: isCrit ? amount : 0,
        isFlagged: isCrit,
      });
    }
    if (ev.targetID === playerId) {
      takenRows.push({
        timestamp: ev.timestamp,
        amount: ev.amount ?? 0,
        secondary: 0,
        isFlagged: false,
      });
    }
  }

  const healRows: Array<{
    timestamp: number;
    amount: number;
    secondary: number;
    isFlagged: boolean;
  }> = [];
  for (const ev of healingEvents) {
    if (ev.sourceIsFriendly && ev.sourceID === playerId) {
      healRows.push({
        timestamp: ev.timestamp,
        amount: ev.amount ?? 0,
        secondary: ev.overheal ?? 0,
        isFlagged: false,
      });
    }
  }

  const deaths: number[] = [];
  for (const ev of deathEvents) {
    if (ev.targetID === playerId) deaths.push(ev.timestamp);
  }
  deaths.sort((a, b) => a - b);

  return {
    damageDone: doneRows.length ? buildPrefixIndex(doneRows) : EMPTY_INDEX,
    damageTaken: takenRows.length ? buildPrefixIndex(takenRows) : EMPTY_INDEX,
    healingDone: healRows.length ? buildPrefixIndex(healRows) : EMPTY_INDEX,
    deaths,
  };
}

/** Resolved live stats at a cutoff timestamp. Fields are role-agnostic; the panel reads what it needs. */
export interface LiveLockedStats {
  /** DPS = damage done / elapsed (elapsed floored at MIN_RATE_WINDOW_SECONDS). */
  dps: number;
  /** Total damage done so far. */
  totalDamage: number;
  /** Crit chance % over hits so far. */
  critChance: number;
  /** HPS = effective healing / elapsed. */
  hps: number;
  /** Effective healing so far. */
  effectiveHealing: number;
  /** Overheal % = overheal / (effective + overheal) so far. */
  overhealPct: number;
  /** Total damage taken so far. */
  damageTaken: number;
  /** Death count so far. */
  deaths: number;
}

/**
 * Query live stats at a cutoff (absolute timestamp). `elapsedSeconds` is the playhead seconds into
 * the fight; the caller passes it so the rate denominator matches the visible playhead exactly.
 */
export function queryLiveLockedStats(
  index: LockedStatsIndex,
  cutoffTimestamp: number,
  elapsedSeconds: number,
): LiveLockedStats {
  const window = Math.max(MIN_RATE_WINDOW_SECONDS, elapsedSeconds);

  const done = queryPrefix(index.damageDone, cutoffTimestamp);
  const taken = queryPrefix(index.damageTaken, cutoffTimestamp);
  const healed = queryPrefix(index.healingDone, cutoffTimestamp);
  const deaths = upperBoundCount(index.deaths, cutoffTimestamp);

  const healTotal = healed.amount + healed.secondary;

  return {
    dps: done.amount / window,
    totalDamage: done.amount,
    critChance: done.count > 0 ? (done.secondaryCount / done.count) * 100 : 0,
    hps: healed.amount / window,
    effectiveHealing: healed.amount,
    overhealPct: healTotal > 0 ? (healed.secondary / healTotal) * 100 : 0,
    damageTaken: taken.amount,
    deaths,
  };
}

// ── Per-ability damage breakdown ──────────────────────────────────────────────────────────────
//
// Extracted from DamageBreakdownPanel.tsx (the /report .../damage insights view) so the locked-
// player panel reports per-ability damage with the SAME filter + crit rule. Made up-to-playhead by
// keeping a per-ability prefix index (sorted timestamps + cumulative damage / hits / crits), so a
// query at the playhead is a binary search per ability — cheap enough for the throttled (≈3Hz)
// breakdown refresh, never run on the per-frame scalar tick.

/** Minimal ability lookup shape (matches reportMasterData.abilitiesById entries we read). */
export interface AbilityNameIcon {
  name?: string | null;
  icon?: string | number | null;
}

interface AbilityPrefix {
  abilityGameID: string;
  name: string;
  icon?: string;
  times: number[];
  cumDamage: Float64Array;
  cumHits: Int32Array;
  cumCrits: Int32Array;
}

/** Built once on lock: per-ability prefix indexes for the player's outgoing damage. */
export interface AbilityBreakdownIndex {
  abilities: AbilityPrefix[];
}

/** One row of the resolved breakdown at a cutoff. */
export interface AbilityBreakdownRow {
  abilityGameID: string;
  name: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  critRate: number;
}

/**
 * Build per-ability prefix indexes for the player's outgoing damage (friendly source → hostile
 * target, matching DamageBreakdownPanel). Done once on lock.
 */
export function buildAbilityBreakdownIndex(
  playerId: number,
  damageEvents: readonly DamageEvent[],
  abilitiesById: Record<string | number, AbilityNameIcon>,
): AbilityBreakdownIndex {
  // Group the player's outgoing damage events by ability, preserving timestamp order within each.
  const rowsByAbility = new Map<
    string,
    Array<{ timestamp: number; amount: number; crit: boolean }>
  >();
  for (const ev of damageEvents) {
    if (!ev.sourceIsFriendly || ev.targetIsFriendly || ev.sourceID !== playerId) continue;
    const key = String(ev.abilityGameID);
    let rows = rowsByAbility.get(key);
    if (!rows) {
      rows = [];
      rowsByAbility.set(key, rows);
    }
    rows.push({
      timestamp: ev.timestamp,
      amount: ev.amount ?? 0,
      crit: ev.hitType === HitType.Critical,
    });
  }

  const abilities: AbilityPrefix[] = [];
  for (const [key, rows] of rowsByAbility) {
    rows.sort((a, b) => a.timestamp - b.timestamp);
    const n = rows.length;
    const times = new Array<number>(n);
    const cumDamage = new Float64Array(n + 1);
    const cumHits = new Int32Array(n + 1);
    const cumCrits = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) {
      times[i] = rows[i].timestamp;
      cumDamage[i + 1] = cumDamage[i] + rows[i].amount;
      cumHits[i + 1] = cumHits[i] + 1;
      cumCrits[i + 1] = cumCrits[i] + (rows[i].crit ? 1 : 0);
    }
    const ability = abilitiesById[key];
    abilities.push({
      abilityGameID: key,
      name: ability?.name || `Ability ${key}`,
      icon: ability?.icon != null ? String(ability.icon) : undefined,
      times,
      cumDamage,
      cumHits,
      cumCrits,
    });
  }
  return { abilities };
}

/**
 * Resolve the top-N abilities by damage as of a cutoff timestamp. Returns rows sorted by damage
 * descending, dropping abilities that haven't fired yet at the cutoff.
 */
export function queryAbilityBreakdown(
  index: AbilityBreakdownIndex,
  cutoffTimestamp: number,
  topN: number,
): AbilityBreakdownRow[] {
  const rows: AbilityBreakdownRow[] = [];
  for (const ability of index.abilities) {
    const i = upperBoundCount(ability.times, cutoffTimestamp);
    if (i === 0) continue;
    const totalDamage = ability.cumDamage[i];
    if (totalDamage <= 0) continue;
    const hitCount = ability.cumHits[i];
    const crits = ability.cumCrits[i];
    rows.push({
      abilityGameID: ability.abilityGameID,
      name: ability.name,
      icon: ability.icon,
      totalDamage,
      hitCount,
      critRate: hitCount > 0 ? (crits / hitCount) * 100 : 0,
    });
  }
  rows.sort((a, b) => b.totalDamage - a.totalDamage);
  return rows.slice(0, topN);
}
