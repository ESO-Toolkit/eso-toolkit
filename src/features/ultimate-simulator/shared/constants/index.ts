/**
 * Engine-level constants shared by the Ultimate Calculator and the Arcanist
 * Ultimate Simulator.
 *
 * The all-class source data for the CALCULATOR lives in `./catalog.ts`; this file
 * holds the Decisive proc ladder, the default fight length, the
 * `makeDecisiveConfig` helper, and the SIMULATOR's Monte Carlo defaults plus its
 * raid-context Arcanist preset (`RAID_CONTEXT_SOURCES`). The
 * `SHEET_VALIDATION_SOURCES` preset (sheetValidation.ts) is kept as a regression
 * anchor for the engine, reproducing the original ported model's known outputs.
 *
 * Calibration against real ESO Logs data (the source of truth) can later override
 * any of these — they are defaults, not assumptions baked in code.
 */

import type { UltimateSource, DecisiveConfig } from '../types';

/** Default fight length (3 minutes — a typical raid boss pull). */
export const DEFAULT_FIGHT_DURATION_SECONDS = 180;

/** Default Monte Carlo run count (10k → standard error ≈ sheet's ÷10). */
export const DEFAULT_MONTE_CARLO_RUNS = 10000;

/** Default base seed for reproducible aggregates. */
export const DEFAULT_BASE_SEED = 1;

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

/**
 * Raid-context source preset for the Arcanist Ultimate SIMULATOR (corrected from
 * the sheet).
 *
 * Tick cadences: Heroism buffs tick every 1.5s (instancesPerSecond = 1/1.5).
 * The "base" row is the light/heavy-attack buff (3 ult/sec, 1 instance/sec),
 * NOT a passive regen (no such stat exists). Implacable Outcome is a triggered
 * +4 on an 8s ICD. Pillager's Profit is batteried from the group healer.
 *
 * `instancesPerSecond` and `amountPerInstance` are chosen so each row's expected
 * ult/s matches the sheet's "Est. Ult/s" column, and the total instance count
 * reconciles with the sheet's SUM Ticks (404.8 over 180s) for Decisive validation.
 */
export const RAID_CONTEXT_SOURCES: readonly UltimateSource[] = [
  {
    id: 'base-light-attack',
    label: 'Base (light-attack buff)',
    kind: 'periodic',
    amountPerInstance: 3,
    instancesPerSecond: 1, // 3 ult/sec while weaving
    uptime: 0.99,
    rollsDecisive: true,
    note: 'Light/heavy-attack hidden buff — the real base income (no passive ult regen exists).',
  },
  {
    id: 'minor-heroism',
    label: 'Minor Heroism',
    kind: 'periodic',
    amountPerInstance: 1,
    instancesPerSecond: 1 / 1.5, // 1 ult / 1.5s
    uptime: 0.95,
    rollsDecisive: true,
    note: 'From Cryptcanon Vestments (Mythic) / ult potions / sets.',
  },
  {
    id: 'major-heroism',
    label: 'Major Heroism',
    kind: 'periodic',
    amountPerInstance: 3,
    instancesPerSecond: 1 / 1.5, // 3 ult / 1.5s
    uptime: 0.78,
    rollsDecisive: true,
    note: 'Group buff — from a Warden U50 Class Mastery scrip in the raid.',
  },
  {
    id: 'implacable-outcome',
    label: 'Implacable Outcome',
    kind: 'triggered',
    amountPerInstance: 4,
    instancesPerSecond: 1 / 8, // +4 ult, max once / 8s on Crux consume
    uptime: 1,
    rollsDecisive: true,
    note: 'Arcanist passive (Soldier of Apocrypha): +4 ult on Crux consume, 8s ICD.',
  },
  {
    id: 'pillagers-profit',
    label: "Pillager's Profit (from healer)",
    kind: 'perCast',
    amountPerInstance: 50,
    instancesPerSecond: 1 / 45, // batteried to allies once / 45s
    uptime: 1,
    rollsDecisive: false, // externally-granted; does not roll the wearer's Decisive
    note: "Batteried to the Arcanist by the group healer's Pillager's Profit (~50 ult / 45s).",
  },
];
