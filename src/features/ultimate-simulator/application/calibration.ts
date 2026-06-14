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
 * ESO Logs `resourcechange` event `resourceChangeType` values — EMPIRICALLY
 * VERIFIED against a real trial log (Lucent Citadel report kZAvqFwYcRTLB97W,
 * fight 2), NOT the ESO `POWERTYPE` enum.
 *
 * IMPORTANT: an earlier version of this file assumed ESO Logs used the ESO
 * `POWERTYPE` enum (magicka=0, stamina=6, ultimate=10). That is WRONG for the
 * combat-log `resourcechange` stream. The discriminator: every event carries
 * `maxResourceAmount`; matching it to the snapshot's `maxUltimate`/`maxMagicka`/
 * `maxStamina` reveals the real scheme. In live data:
 *   - type 0 → magicka  (maxResourceAmount === maxMagicka)
 *   - type 1 → stamina  (maxResourceAmount === maxStamina)
 *   - type 2 → ULTIMATE (maxResourceAmount === maxUltimate, i.e. 500)
 * The "POWERTYPE=10" research was about the in-game API constant, which ESO Logs
 * does not use for this field. The codebase's magicka/stamina handling reads the
 * resource SNAPSHOT fields (targetResources.magicka, etc.), never this type code,
 * which is why the mismatch went unnoticed.
 *
 * The robust way to attribute ultimate is to verify a candidate event's
 * `maxResourceAmount === targetResources.maxUltimate` rather than trusting a bare
 * type number — see `isUltimateGain`, which uses that check as the source of truth
 * and treats the type number as a fast-path hint only.
 */
export const RESOURCE_CHANGE_TYPE = {
  magicka: 0,
  stamina: 1,
  ultimate: 2,
} as const;

export interface CalibrationResult {
  readonly fightDurationSeconds: number;
  /**
   * Total ultimate GENERATED over the fight (sum of positive deltas in the
   * actor's ultimate snapshot). This is the conservation-closed gross
   * generation: gen = spent + (final − initial), exact except for overcap waste.
   */
  readonly totalGenerated: number;
  /** Ultimate spent (sum of negative deltas) — sanity / casts. */
  readonly totalSpent: number;
  /** Approximate ultimate casts (negative-delta segments). */
  readonly approxCasts: number;
  /** totalGenerated / fightDurationSeconds. */
  readonly perSecond: number;
  /** Snapshot samples seen for the actor (0 ⇒ actor not snapshotted in stream). */
  readonly samples: number;
  /**
   * Whether the actor's ultimate hit the 500 cap during the fight. If true,
   * `totalGenerated` UNDERCOUNTS by the overcapped amount (waste isn't visible in
   * snapshots), so treat it as a lower bound.
   */
  readonly hitCap: boolean;
}

export interface CalibrationInput {
  readonly events: readonly ResourceChangeEvent[];
  readonly fightDurationSeconds: number;
  /** Which actor's ultimate to measure (required — measure one actor at a time). */
  readonly targetActorID: number;
}

/** Hard ultimate pool cap — used to flag overcap (waste invisible in snapshots). */
const ULTIMATE_POOL_CAP = 500;

/**
 * Identify whether a resourcechange event targets the ULTIMATE pool. Source of
 * truth = the event's `maxResourceAmount` equals the actor's `maxUltimate`
 * snapshot — robust across reports/patches even if the bare `resourceChangeType`
 * numbering shifts. Falls back to the empirically-verified type code (2) when no
 * snapshot is present. Exported for callers that want to filter ult events
 * directly; note `calibrateFromEvents` measures generation via snapshots, not
 * these events' `resourceChange` (which undercounts — see its doc comment).
 */
export function isUltimateResourceEvent(event: ResourceChangeEvent): boolean {
  const maxUlt = event.targetResources?.maxUltimate ?? event.sourceResources?.maxUltimate;
  if (typeof maxUlt === 'number' && maxUlt > 0) {
    return event.maxResourceAmount === maxUlt;
  }
  return event.resourceChangeType === RESOURCE_CHANGE_TYPE.ultimate;
}

/** The actor's ultimate value in this event's snapshot, or null if absent. */
function ultimateSnapshot(event: ResourceChangeEvent, actorID: number): number | null {
  if (event.targetID === actorID && event.targetResources) return event.targetResources.ultimate;
  if (event.sourceID === actorID && event.sourceResources) return event.sourceResources.ultimate;
  return null;
}

/**
 * Measure an actor's real ultimate generation from a fight's Resources events.
 *
 * WHY SNAPSHOTS, NOT resourceChange SUMS: ESO Logs does NOT emit a per-ability
 * resourcechange event for most ultimate gains — the bulk of ultimate accrues
 * implicitly (light-attack income, Heroism ticks) and only surfaces in the
 * `ultimate` field of resource SNAPSHOTS carried on other events. Summing the
 * `resourceChange` of ult-typed events therefore drastically undercounts (it
 * misses casts too). So PER-SOURCE attribution is NOT derivable from logs.
 *
 * What IS exact: total generation, by conservation. Ultimate rises monotonically
 * between casts, so summing the positive deltas of the ultimate-snapshot series
 * captures every rising segment regardless of sample spacing. The only leak is
 * overcap waste (invisible in snapshots) — flagged via `hitCap`. Equivalently,
 * gen = spent + (final − initial).
 *
 * PRECONDITION: `events` must be in timestamp order (the ESO Logs `events` query
 * returns them sorted, so callers using `fetchResourceEvents` get this for free).
 * Validated against a real trial log (Lucent Citadel kZAvqFwYcRTLB97W, fight 2):
 * this exact algorithm yields 627 generated / 186s ≈ 3.37 ult/s for a baseline
 * Arcanist, conservation-closed (627 − 749 spent = 76 − 198 final−initial).
 */
export function calibrateFromEvents(input: CalibrationInput): CalibrationResult {
  const { events, fightDurationSeconds, targetActorID } = input;
  const safeDuration = fightDurationSeconds > 0 ? fightDurationSeconds : 1;

  // Collect the actor's ultimate snapshots in timestamp order.
  const series: number[] = [];
  for (const event of events) {
    const u = ultimateSnapshot(event, targetActorID);
    if (u != null) series.push(u);
  }

  let generated = 0;
  let spent = 0;
  let approxCasts = 0;
  let hitCap = false;
  let prev: number | null = null;
  for (const u of series) {
    if (u >= ULTIMATE_POOL_CAP) hitCap = true;
    if (prev != null) {
      const delta = u - prev;
      if (delta > 0) generated += delta;
      else if (delta < 0) {
        spent += -delta;
        approxCasts += 1;
      }
    }
    prev = u;
  }

  return {
    fightDurationSeconds,
    totalGenerated: generated,
    totalSpent: spent,
    approxCasts,
    perSecond: generated / safeDuration,
    samples: series.length,
    hitCap,
  };
}
