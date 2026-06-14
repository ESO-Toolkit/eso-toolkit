/**
 * Calibration: derive empirical per-source ultimate generation from real ESO
 * Logs `Resources` events. Measured log data is the SOURCE OF TRUTH — the
 * simulator's presets are validated against (and can be overridden by) whatever
 * this analyzer reports for a real fight.
 *
 * This module is a pure analyzer over already-fetched events (no network), so it
 * is unit-testable. The existing `fetchResourceEvents` thunk
 * (store/events_data/resourceEventsSlice.ts) supplies the events; a thin hook can
 * wire the two together in the presentation layer.
 */

import type { ResourceChangeEvent } from '../../../types/combatlogEvents';

/**
 * ESO Logs `resourceChangeType` enum values. These are the LEGACY sequential
 * ESO `POWERTYPE` enum (POWERTYPE_MAGICKA=0, POWERTYPE_STAMINA=6,
 * POWERTYPE_ULTIMATE=10) — verified against the archived ESO API constants,
 * where all three appear in the same table and 0/6 match this codebase's
 * confirmed anchors (RotationAnalysisPanel.tsx, potionDetectionUtils.ts).
 *
 * TRAP — do NOT "correct" ultimate to 8. ESO also has a MODERN
 * `CombatMechanicFlags` bitflag enum (magicka=1, stamina=4, ultimate=8). ESO
 * Logs does not use it (it froze on the legacy sequential values), so following
 * the live-API alias chain and changing 10→8 would be wrong — magicka would then
 * be 1, contradicting the confirmed anchor of 0.
 */
export const RESOURCE_CHANGE_TYPE = {
  magicka: 0,
  stamina: 6,
  ultimate: 10,
} as const;

/** Empirical generation attributed to one ability (game) ID over a fight. */
export interface AbilityUltimateStat {
  readonly abilityGameID: number;
  /** Resolved display name if masterData was provided, else the numeric ID. */
  readonly label: string;
  /** Net ultimate granted (sum of positive resourceChange), excluding waste. */
  readonly netUltimate: number;
  /** Ultimate that was wasted (overcapped). */
  readonly wastedUltimate: number;
  /** Number of contributing events (≈ instances). */
  readonly events: number;
  /** netUltimate / fightDurationSeconds. */
  readonly ultimatePerSecond: number;
}

export interface CalibrationResult {
  readonly fightDurationSeconds: number;
  /** Total net ultimate generated for the target actor over the fight. */
  readonly totalNetUltimate: number;
  readonly totalWastedUltimate: number;
  readonly perSecond: number;
  /** Per-ability breakdown, sorted by netUltimate descending. */
  readonly bySource: readonly AbilityUltimateStat[];
}

export interface CalibrationInput {
  readonly events: readonly ResourceChangeEvent[];
  readonly fightDurationSeconds: number;
  /** Restrict to this actor's gains (the modeled Arcanist). Omit = all actors. */
  readonly targetActorID?: number;
  /** Optional abilityGameID → display name map (from report masterData). */
  readonly abilityNames?: ReadonlyMap<number, string>;
}

/** Is this event an ultimate-resource gain for the target actor? */
function isUltimateGain(event: ResourceChangeEvent, targetActorID?: number): boolean {
  if (event.resourceChangeType !== RESOURCE_CHANGE_TYPE.ultimate) return false;
  if (event.resourceChange <= 0) return false;
  // Ultimate accrues to the actor as the TARGET of the resourcechange event.
  if (targetActorID !== undefined && event.targetID !== targetActorID) return false;
  return true;
}

/**
 * Bucket ultimate-gain events by ability into empirical per-source rates.
 *
 * Note on Decisive: ESO Logs typically folds the Decisive +1 into the host
 * ability's resourceChange rather than emitting a separate event, so Decisive
 * usually has no bucket of its own here — its contribution shows up as slightly
 * larger per-instance amounts on the sources it rolls against. That is expected;
 * the simulator models Decisive explicitly, and calibration measures the totals.
 */
export function calibrateFromEvents(input: CalibrationInput): CalibrationResult {
  const { events, fightDurationSeconds, targetActorID, abilityNames } = input;

  const buckets = new Map<number, { net: number; wasted: number; count: number }>();
  let totalNet = 0;
  let totalWasted = 0;

  for (const event of events) {
    if (!isUltimateGain(event, targetActorID)) continue;
    const id = event.abilityGameID;
    const bucket = buckets.get(id) ?? { net: 0, wasted: 0, count: 0 };
    bucket.net += event.resourceChange;
    bucket.wasted += event.waste ?? 0;
    bucket.count += 1;
    buckets.set(id, bucket);

    totalNet += event.resourceChange;
    totalWasted += event.waste ?? 0;
  }

  const safeDuration = fightDurationSeconds > 0 ? fightDurationSeconds : 1;

  const bySource: AbilityUltimateStat[] = Array.from(buckets.entries())
    .map(([abilityGameID, b]) => ({
      abilityGameID,
      label: abilityNames?.get(abilityGameID) ?? `Ability ${abilityGameID}`,
      netUltimate: b.net,
      wastedUltimate: b.wasted,
      events: b.count,
      ultimatePerSecond: b.net / safeDuration,
    }))
    .sort((a, b) => b.netUltimate - a.netUltimate);

  return {
    fightDurationSeconds,
    totalNetUltimate: totalNet,
    totalWastedUltimate: totalWasted,
    perSecond: totalNet / safeDuration,
    bySource,
  };
}
