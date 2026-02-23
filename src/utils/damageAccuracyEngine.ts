/**
 * Damage Accuracy Engine
 *
 * Analyzes damage events by computing the expected damage modifiers active at each event's
 * timestamp and comparing against the actual damage reported by combat logs. This allows
 * us to identify missing modifier sources, validate our buff/debuff tracking, and quantify
 * prediction accuracy.
 *
 * ESO Damage Formula:
 *   final_damage = tooltip_damage
 *     × (1 + damageDone%)            -- Berserk, Slayer buffs on attacker
 *     × (1 + damageTaken%)           -- Vulnerability debuffs on target
 *     × (1 + empowerBonus%)          -- Empower (direct damage only)
 *     × (1 - damage_reduction%)      -- Resistance after penetration
 *     × crit_multiplier              -- Critical hit bonus
 *
 * Where:
 *   effective_resistance = max(0, target_resistance - min(penetration, 18200))
 *   damage_reduction = min(50%, effective_resistance / 660)
 *   crit_multiplier = (hitType === Critical) ? (1 + crit_damage_bonus%) : 1
 *
 * Since we don't know tooltip damage, we reverse-engineer it from actual hits and
 * check consistency across events of the same ability.
 */

import type { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import type { CombatantInfoEvent, DamageEvent } from '../types/combatlogEvents';
import { HitType } from '../types/combatlogEvents';

import type { BuffLookupData } from './BuffLookupUtils';
import {
  calculateCriticalDamageAtTimestamp,
} from './CritDamageUtils';
import {
  type DamageDoneBreakdown,
  calculateDamageDoneAtTimestamp,
} from './DamageDoneUtils';
import {
  MAX_RESISTANCE,
  RESISTANCE_TO_DAMAGE_REDUCTION_RATIO,
} from './damageReductionUtils';
import {
  calculatePenetrationAtTimestamp,
} from './PenetrationUtils';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DamageModifiers {
  /** Total penetration at this timestamp (static + dynamic), capped at 18200 */
  penetration: number;
  /** Critical damage bonus percentage (e.g. 0.75 = 75%) — only meaningful if crit */
  critDamageBonus: number;
  /** Whether the hit was a critical hit */
  isCritical: boolean;
  /** Effective damage reduction percentage after penetration (0–50) */
  damageReductionPercent: number;
  /** The multiplier applied by crits: (1 + critDamageBonus) for crits, 1.0 for normals */
  critMultiplier: number;
  /** Damage-done breakdown (Berserk, Slayer, Vulnerability, Empower) */
  damageDone: DamageDoneBreakdown;
  /** Combined modifier multiplier: damageDone × (1 - damageReduction) × critMultiplier */
  totalMultiplier: number;
  /** Buff validation: IDs from event.buffs that we also found via BuffLookup */
  buffValidation: BuffValidation | null;
}

export interface DamageEventAnalysis {
  /** The original damage event */
  event: DamageEvent;
  /** Computed modifiers active at the event's timestamp */
  modifiers: DamageModifiers;
  /** Reverse-engineered tooltip/base damage: actual / totalMultiplier */
  inferredTooltipDamage: number;
  /** Relative timestamp from fight start in seconds */
  relativeTimestamp: number;
}

export interface AbilityAccuracyStats {
  /** Ability game ID */
  abilityGameID: number;
  /** All analyzed events for this ability */
  events: DamageEventAnalysis[];
  /** Number of normal (non-crit) hits */
  normalHitCount: number;
  /** Number of critical hits */
  critHitCount: number;
  /** Total number of events */
  totalEvents: number;
  /** Mean inferred tooltip damage across normal hits (our best estimate of tooltip) */
  meanNormalTooltip: number;
  /** Standard deviation of inferred tooltip from normal hits */
  stdDevNormalTooltip: number;
  /** Coefficient of variation (stdDev / mean) — lower is more consistent */
  coefficientOfVariation: number;
  /** Mean inferred tooltip damage across ALL hits (normal + crit) */
  meanAllTooltip: number;
  /** Standard deviation across ALL hits */
  stdDevAllTooltip: number;
  /** For crits: predicted crit damage vs actual, using meanNormalTooltip as base */
  critPredictions: CritPrediction[];
  /** Overall accuracy score for this ability (0–100) */
  accuracyScore: number;
}

export interface CritPrediction {
  event: DamageEvent;
  modifiers: DamageModifiers;
  /** Predicted damage = meanNormalTooltip × totalMultiplier */
  predictedDamage: number;
  /** Actual damage from event */
  actualDamage: number;
  /** Accuracy: min(predicted, actual) / max(predicted, actual) × 100 */
  accuracy: number;
  /** Difference: actual - predicted */
  difference: number;
}

export interface PlayerAccuracyReport {
  /** Player actor ID */
  playerId: number;
  /** Player name */
  playerName: string;
  /** Per-ability accuracy statistics */
  abilityStats: AbilityAccuracyStats[];
  /** Overall accuracy across all abilities */
  overallAccuracy: number;
  /** Total damage events analyzed */
  totalEventsAnalyzed: number;
  /** Total damage events with predictions */
  totalPredictions: number;
  /** Mean prediction accuracy across all predictions */
  meanPredictionAccuracy: number;
  /** Summary of modifier ranges seen during the fight */
  modifierSummary: ModifierSummary;
}

export interface ModifierSummary {
  penetrationRange: { min: number; max: number; mean: number };
  critDamageBonusRange: { min: number; max: number; mean: number };
  damageReductionRange: { min: number; max: number; mean: number };
  damageDoneMultiplierRange: { min: number; max: number; mean: number };
}

/** Cross-validation between event.buffs snapshot and BuffLookup-derived active buffs */
export interface BuffValidation {
  /** Buff ability IDs from the event.buffs field */
  eventBuffIds: number[];
  /** How many of the known damage-modifier buffs appear in both event.buffs and BuffLookup */
  matchedCount: number;
  /** Buffs found in event.buffs but NOT detected by BuffLookup at this timestamp */
  missingFromLookup: number[];
  /** Buffs detected by BuffLookup but NOT present in event.buffs */
  extraInLookup: number[];
}

export interface FightAccuracyReport {
  /** Per-player accuracy reports */
  playerReports: PlayerAccuracyReport[];
  /** Fight-wide overall accuracy */
  overallAccuracy: number;
  /** Total damage events across all players */
  totalEvents: number;
  /** Total predictions made */
  totalPredictions: number;
  /** Computation time in ms */
  computationTimeMs: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const PENETRATION_CAP = 18200;

// Minimum events needed for an ability to produce meaningful stats
const MIN_EVENTS_FOR_STATS = 2;

/**
 * Known buff ability IDs that affect damage output.
 * Used to cross-validate event.buffs snapshots against BuffLookup data.
 * Includes both attacker buffs (Berserk, Slayer, Empower) checked on source
 * and effects like Vulnerability checked via debuffLookup on target.
 */
const KNOWN_DAMAGE_BUFF_IDS = new Set<number>([
  61744, // Minor Berserk
  61745, // Major Berserk
  147226, // Minor Slayer
  93109, // Major Slayer
  61737, // Empower
]);

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse the event.buffs dot-separated string into an array of buff ability IDs.
 * Returns an empty array if the field is missing or empty.
 */
function parseEventBuffs(event: DamageEvent): number[] {
  if (!event.buffs) return [];
  return event.buffs
    .split('.')
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));
}

/**
 * Cross-validate event.buffs snapshot against BuffLookup-derived active buffs.
 * Only checks the known damage-modifier buffs (not every possible buff).
 */
function validateBuffSnapshot(
  event: DamageEvent,
  buffLookup: BuffLookupData,
): BuffValidation | null {
  if (!event.buffs) return null;

  const eventBuffIds = parseEventBuffs(event);
  const eventBuffSet = new Set(eventBuffIds);

  const missingFromLookup: number[] = [];
  const extraInLookup: number[] = [];
  let matchedCount = 0;

  for (const knownId of KNOWN_DAMAGE_BUFF_IDS) {
    const inEventBuffs = eventBuffSet.has(knownId);
    const inLookup = buffLookup.buffIntervals[knownId.toString()]?.some(
      (interval) =>
        event.timestamp >= interval.start &&
        event.timestamp <= interval.end &&
        interval.targetID === event.sourceID,
    ) ?? false;

    if (inEventBuffs && inLookup) {
      matchedCount++;
    } else if (inEventBuffs && !inLookup) {
      missingFromLookup.push(knownId);
    } else if (!inEventBuffs && inLookup) {
      extraInLookup.push(knownId);
    }
  }

  return { eventBuffIds, matchedCount, missingFromLookup, extraInLookup };
}

// ─── Core Computation ───────────────────────────────────────────────────────────

/**
 * Compute all damage modifiers active at a specific damage event's timestamp.
 */
export function computeModifiersForEvent(
  event: DamageEvent,
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  targetResistance: number,
): DamageModifiers {
  // 1. Penetration (static + dynamic), capped
  const rawPenetration = calculatePenetrationAtTimestamp(
    buffLookup,
    debuffLookup,
    combatantInfo,
    playerData,
    event.timestamp,
    event.sourceID,
    event.targetID,
  );
  const penetration = Math.min(rawPenetration, PENETRATION_CAP);

  // 2. Effective resistance after penetration
  const effectiveResistance = Math.max(0, targetResistance - penetration);

  // 3. Damage reduction from resistance
  const cappedResistance = Math.min(MAX_RESISTANCE, effectiveResistance);
  const damageReductionPercent = Math.min(
    50,
    cappedResistance / RESISTANCE_TO_DAMAGE_REDUCTION_RATIO,
  );

  // 4. Critical damage bonus
  const isCritical = event.hitType === HitType.Critical;
  let critDamageBonus = 0;
  if (isCritical && combatantInfo && playerData) {
    // This returns the total crit damage percentage (e.g. 75 for 75%)
    critDamageBonus =
      calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        combatantInfo,
        playerData,
        event.timestamp,
      ) / 100;
  }

  // 5. Damage-done multiplier (Berserk, Slayer, Vulnerability, Empower)
  const isDirectDamage = !event.tick;
  const damageDone = calculateDamageDoneAtTimestamp(
    buffLookup,
    debuffLookup,
    event.timestamp,
    event.sourceID,
    event.targetID,
    isDirectDamage,
  );

  // 6. Buff validation (cross-check event.buffs against BuffLookup)
  const buffValidation = validateBuffSnapshot(event, buffLookup);

  // 7. Multipliers
  const critMultiplier = isCritical ? 1 + critDamageBonus : 1.0;
  const resistanceMultiplier = 1 - damageReductionPercent / 100;
  const totalMultiplier = damageDone.totalMultiplier * resistanceMultiplier * critMultiplier;

  return {
    penetration,
    critDamageBonus,
    isCritical,
    damageReductionPercent,
    critMultiplier,
    damageDone,
    totalMultiplier,
    buffValidation,
  };
}

/**
 * Analyze a single damage event, computing its modifiers and inferred tooltip.
 */
export function analyzeDamageEvent(
  event: DamageEvent,
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  targetResistance: number,
  fightStartTime: number,
): DamageEventAnalysis {
  const modifiers = computeModifiersForEvent(
    event,
    buffLookup,
    debuffLookup,
    combatantInfo,
    playerData,
    targetResistance,
  );

  // Reverse-engineer tooltip: actual_damage = tooltip × totalMultiplier
  // So tooltip = actual_damage / totalMultiplier
  const inferredTooltipDamage =
    modifiers.totalMultiplier > 0 ? event.amount / modifiers.totalMultiplier : event.amount;

  return {
    event,
    modifiers,
    inferredTooltipDamage,
    relativeTimestamp: (event.timestamp - fightStartTime) / 1000,
  };
}

// ─── Statistical Helpers ────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function accuracyBetween(predicted: number, actual: number): number {
  if (predicted === 0 && actual === 0) return 100;
  if (predicted === 0 || actual === 0) return 0;
  return (Math.min(predicted, actual) / Math.max(predicted, actual)) * 100;
}

// ─── Per-Ability Stats ──────────────────────────────────────────────────────────

/**
 * Build accuracy statistics for events of a single ability from a single player.
 */
export function buildAbilityAccuracyStats(
  abilityGameID: number,
  events: DamageEventAnalysis[],
): AbilityAccuracyStats {
  const normalEvents = events.filter((e) => !e.modifiers.isCritical);
  const critEvents = events.filter((e) => e.modifiers.isCritical);

  const allTooltips = events.map((e) => e.inferredTooltipDamage);
  const normalTooltips = normalEvents.map((e) => e.inferredTooltipDamage);

  const meanNormal = mean(normalTooltips);
  const stdDevNormal = standardDeviation(normalTooltips, meanNormal);
  const cv = meanNormal > 0 ? stdDevNormal / meanNormal : 0;

  const meanAll = mean(allTooltips);
  const stdDevAll = standardDeviation(allTooltips, meanAll);

  // For critical hits, predict damage using the mean normal tooltip
  const baseTooltip = meanNormal > 0 ? meanNormal : meanAll;
  const critPredictions: CritPrediction[] = critEvents.map((e) => {
    const predictedDamage = Math.round(baseTooltip * e.modifiers.totalMultiplier);
    const actualDamage = e.event.amount;
    return {
      event: e.event,
      modifiers: e.modifiers,
      predictedDamage,
      actualDamage,
      accuracy: accuracyBetween(predictedDamage, actualDamage),
      difference: actualDamage - predictedDamage,
    };
  });

  // Also create predictions for normal hits for consistency checking
  const normalPredictions: CritPrediction[] = normalEvents.map((e) => {
    const predictedDamage = Math.round(baseTooltip * e.modifiers.totalMultiplier);
    const actualDamage = e.event.amount;
    return {
      event: e.event,
      modifiers: e.modifiers,
      predictedDamage,
      actualDamage,
      accuracy: accuracyBetween(predictedDamage, actualDamage),
      difference: actualDamage - predictedDamage,
    };
  });

  const allPredictions = [...normalPredictions, ...critPredictions];
  const accuracyScore =
    allPredictions.length > 0 ? mean(allPredictions.map((p) => p.accuracy)) : 100;

  return {
    abilityGameID,
    events,
    normalHitCount: normalEvents.length,
    critHitCount: critEvents.length,
    totalEvents: events.length,
    meanNormalTooltip: meanNormal,
    stdDevNormalTooltip: stdDevNormal,
    coefficientOfVariation: cv,
    meanAllTooltip: meanAll,
    stdDevAllTooltip: stdDevAll,
    critPredictions,
    accuracyScore,
  };
}

// ─── Player-Level Report ────────────────────────────────────────────────────────

/**
 * Generate an accuracy report for a single player.
 */
export function generatePlayerAccuracyReport(
  playerId: number,
  playerName: string,
  damageEvents: DamageEvent[],
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined,
  targetResistance: number,
  fightStartTime: number,
): PlayerAccuracyReport {
  // Filter to this player's damage events
  const playerEvents = damageEvents.filter((e) => e.sourceID === playerId);

  // Analyze each event
  const analyzedEvents = playerEvents.map((event) =>
    analyzeDamageEvent(
      event,
      buffLookup,
      debuffLookup,
      combatantInfo,
      playerData,
      targetResistance,
      fightStartTime,
    ),
  );

  // Group by ability
  const eventsByAbility = new Map<number, DamageEventAnalysis[]>();
  for (const analyzed of analyzedEvents) {
    const key = analyzed.event.abilityGameID;
    const existing = eventsByAbility.get(key) ?? [];
    existing.push(analyzed);
    eventsByAbility.set(key, existing);
  }

  // Build per-ability stats (only for abilities with enough events)
  const abilityStats: AbilityAccuracyStats[] = [];
  for (const [abilityId, events] of eventsByAbility) {
    if (events.length >= MIN_EVENTS_FOR_STATS) {
      abilityStats.push(buildAbilityAccuracyStats(abilityId, events));
    }
  }

  // Sort by total events descending
  abilityStats.sort((a, b) => b.totalEvents - a.totalEvents);

  // Aggregate predictions
  const allPredictions = abilityStats.flatMap((s) => s.critPredictions);
  const totalPredictions = allPredictions.length;
  const meanPredictionAccuracy =
    totalPredictions > 0 ? mean(allPredictions.map((p) => p.accuracy)) : 100;

  // Overall accuracy is weighted by event count
  const totalWeightedAccuracy = abilityStats.reduce(
    (sum, s) => sum + s.accuracyScore * s.totalEvents,
    0,
  );
  const totalAnalyzedEvents = abilityStats.reduce((sum, s) => sum + s.totalEvents, 0);
  const overallAccuracy = totalAnalyzedEvents > 0 ? totalWeightedAccuracy / totalAnalyzedEvents : 0;

  // Modifier summary
  const allModifiers = analyzedEvents.map((e) => e.modifiers);
  const modifierSummary: ModifierSummary = {
    penetrationRange: {
      min: allModifiers.length > 0 ? Math.min(...allModifiers.map((m) => m.penetration)) : 0,
      max: allModifiers.length > 0 ? Math.max(...allModifiers.map((m) => m.penetration)) : 0,
      mean: mean(allModifiers.map((m) => m.penetration)),
    },
    critDamageBonusRange: {
      min: allModifiers.length > 0 ? Math.min(...allModifiers.map((m) => m.critDamageBonus)) : 0,
      max: allModifiers.length > 0 ? Math.max(...allModifiers.map((m) => m.critDamageBonus)) : 0,
      mean: mean(allModifiers.map((m) => m.critDamageBonus)),
    },
    damageReductionRange: {
      min:
        allModifiers.length > 0
          ? Math.min(...allModifiers.map((m) => m.damageReductionPercent))
          : 0,
      max:
        allModifiers.length > 0
          ? Math.max(...allModifiers.map((m) => m.damageReductionPercent))
          : 0,
      mean: mean(allModifiers.map((m) => m.damageReductionPercent)),
    },
    damageDoneMultiplierRange: {
      min:
        allModifiers.length > 0
          ? Math.min(...allModifiers.map((m) => m.damageDone.totalMultiplier))
          : 1,
      max:
        allModifiers.length > 0
          ? Math.max(...allModifiers.map((m) => m.damageDone.totalMultiplier))
          : 1,
      mean: mean(allModifiers.map((m) => m.damageDone.totalMultiplier)),
    },
  };

  return {
    playerId,
    playerName,
    abilityStats,
    overallAccuracy,
    totalEventsAnalyzed: analyzedEvents.length,
    totalPredictions,
    meanPredictionAccuracy,
    modifierSummary,
  };
}

// ─── Fight-Level Report ─────────────────────────────────────────────────────────

export interface GenerateFightAccuracyReportInput {
  damageEvents: DamageEvent[];
  playersById: Record<string | number, PlayerDetailsWithRole>;
  combatantInfoRecord: Record<number, CombatantInfoEvent>;
  buffLookup: BuffLookupData;
  debuffLookup: BuffLookupData;
  fightStartTime: number;
  fightEndTime: number;
  /** Default target resistance to assume if we can't determine it. 18200 is common for trial bosses. */
  defaultTargetResistance?: number;
}

/**
 * Generate an accuracy report for an entire fight covering all friendly players.
 */
export function generateFightAccuracyReport(
  input: GenerateFightAccuracyReportInput,
): FightAccuracyReport {
  const startMs = performance.now();

  const {
    damageEvents,
    playersById,
    combatantInfoRecord,
    buffLookup,
    debuffLookup,
    fightStartTime,
    defaultTargetResistance = 18200,
  } = input;

  // Only analyze friendly → enemy damage
  const friendlyDamageEvents = damageEvents.filter(
    (e) => e.sourceIsFriendly && !e.targetIsFriendly,
  );

  // Build reports for each player who dealt damage
  const playerIds = new Set(friendlyDamageEvents.map((e) => e.sourceID));

  const playerReports: PlayerAccuracyReport[] = [];
  for (const playerId of playerIds) {
    const playerData = playersById[playerId];
    if (!playerData) continue; // Skip if we don't have player info

    const combatantInfo = combatantInfoRecord[playerId] ?? null;

    const report = generatePlayerAccuracyReport(
      playerId,
      playerData.name,
      friendlyDamageEvents,
      buffLookup,
      debuffLookup,
      combatantInfo,
      playerData,
      defaultTargetResistance,
      fightStartTime,
    );

    if (report.totalEventsAnalyzed > 0) {
      playerReports.push(report);
    }
  }

  // Sort by total events desc
  playerReports.sort((a, b) => b.totalEventsAnalyzed - a.totalEventsAnalyzed);

  // Fight-level aggregation
  const totalEvents = playerReports.reduce((sum, r) => sum + r.totalEventsAnalyzed, 0);
  const totalPredictions = playerReports.reduce((sum, r) => sum + r.totalPredictions, 0);
  const weightedAccuracy = playerReports.reduce(
    (sum, r) => sum + r.overallAccuracy * r.totalEventsAnalyzed,
    0,
  );
  const overallAccuracy = totalEvents > 0 ? weightedAccuracy / totalEvents : 0;

  const computationTimeMs = performance.now() - startMs;

  return {
    playerReports,
    overallAccuracy,
    totalEvents,
    totalPredictions,
    computationTimeMs,
  };
}
