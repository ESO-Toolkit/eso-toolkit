/**
 * Constants and presets for the Arcanist Ultimate Simulator.
 *
 * Numbers derive from research (.scratch/ult-sim-research.md) and from decoding
 * the original Google Sheet. The model is a raid-context Arcanist: it RECEIVES
 * group ult support (Major Heroism from a Warden's U50 Class Mastery scrip,
 * Pillager's Profit batteried from the healer) on top of its own base income.
 *
 * Calibration against real ESO Logs data (the source of truth) can later
 * override any of these — they are defaults, not assumptions baked in code.
 */

import type { UltimateSource, DecisiveConfig } from '../types';

/** Default fight length used by the sheet. */
export const DEFAULT_FIGHT_DURATION_SECONDS = 180;

/** Default Monte Carlo run count (10k → standard error ≈ sheet's ÷10). */
export const DEFAULT_MONTE_CARLO_RUNS = 10000;

/** Default base seed for reproducible aggregates. */
export const DEFAULT_BASE_SEED = 1;

/**
 * Decisive per-instance proc chance by weapon quality (single roll).
 * The five-tier ladder; the gold value matches the sheet's decoded 27.68%.
 * NOTE: some sources list legendary as .254 — kept .275 to match the sheet's
 * empirical "Half" value pending in-game verification.
 */
export const DECISIVE_PROC_CHANCE = {
  fine: 0.191,
  superior: 0.212,
  epic: 0.233,
  legendary: 0.275,
} as const;

export type DecisiveQuality = keyof typeof DECISIVE_PROC_CHANCE;

/**
 * Build a DecisiveConfig from quality + whether the weapon is two-handed.
 * 1H / staff / bow = 1 roll per instance; 2H melee = 2 independent rolls
 * (ESO's "two-handed weapons provide twice the bonus").
 */
export function makeDecisiveConfig(quality: DecisiveQuality, twoHanded: boolean): DecisiveConfig {
  return {
    procChance: DECISIVE_PROC_CHANCE[quality],
    rollsPerInstance: twoHanded ? 2 : 1,
  };
}

/**
 * Raid-context source preset (corrected from the sheet).
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
