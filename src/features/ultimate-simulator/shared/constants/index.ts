/**
 * Engine-level constants for the Ultimate Calculator.
 *
 * The all-class source data lives in `./catalog.ts`; this file holds only the
 * Decisive proc ladder, the default fight length, and the `makeDecisiveConfig`
 * helper. The `SHEET_VALIDATION_SOURCES` preset (sheetValidation.ts) is kept as a
 * regression anchor for the engine, reproducing the original ported model's
 * known outputs.
 */

import type { DecisiveConfig } from '../types';

/** Default fight length (3 minutes — a typical raid boss pull). */
export const DEFAULT_FIGHT_DURATION_SECONDS = 180;

/**
 * Per-instance chance the Decisive trait grants +1 ultimate, by weapon quality.
 *
 * The full FIVE-tier ladder, verified against UESP (Online:Decisive):
 * Normal 19.1% / Fine 21.2% / Superior 23.3% / Epic 25.4% / Legendary 27.5%
 * (each tier +2.1%). Decisive exists from white quality up. (The historical
 * "0.254 vs 0.275" disagreement was Epic vs Legendary — two different tiers, not
 * two competing Legendary values.)
 */
export const DECISIVE_PROC_CHANCE = {
  normal: 0.191,
  fine: 0.212,
  superior: 0.233,
  epic: 0.254,
  legendary: 0.275,
} as const;

export type DecisiveQuality = keyof typeof DECISIVE_PROC_CHANCE;

/** Default weapon quality assumed when Decisive is enabled (an optimized build). */
export const DEFAULT_DECISIVE_QUALITY: DecisiveQuality = 'legendary';

/**
 * Build a DecisiveConfig from quality + whether the weapon is two-handed.
 * 1H / restoration & destruction staff & bow each count as their own weapon for
 * trait purposes (1 roll); a TWO-HANDED melee weapon (greatsword / battle axe /
 * maul) occupies both bars' weapon slots and "provides twice the bonus" — modeled
 * as 2 independent rolls per instance (mean = 2 × procChance).
 */
export function makeDecisiveConfig(quality: DecisiveQuality, twoHanded: boolean): DecisiveConfig {
  return {
    procChance: DECISIVE_PROC_CHANCE[quality],
    rollsPerInstance: twoHanded ? 2 : 1,
  };
}
