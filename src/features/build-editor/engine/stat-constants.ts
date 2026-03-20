/**
 * ESO Stat Constants
 * All game constants for penetration, critical damage, critical chance, and armor.
 * Values ported from the legacy calculator (src/assets/calculator/calculator.js)
 * and cross-referenced with ESO game data.
 */

import type { GameMode } from '../types/build.types';

// ─── Caps ───────────────────────────────────────────────────────────────────

export const PEN_CAPS: Record<GameMode, { cap: number; max: number }> = {
  pve: { cap: 18200, max: 18999 },
  pvp: { cap: 33300, max: 37000 },
};

export const CRIT_DMG_CAPS = { cap: 125, max: 127 };

/** Flat crit rating → crit chance %: chance = rating / CRIT_CHANCE_DIVISOR */
export const CRIT_CHANCE_DIVISOR = 219;
export const BASE_CRIT_CHANCE = 10; // every character starts with 10%
export const BASE_CRIT_DAMAGE = 50; // every character starts with 50%

/** Physical/Spell Resistance cap (50% mitigation at 33,100) */
export const ARMOR_CAP = 33100;
export const ARMOR_MAX = 33100; // no "over-optimal" range for armor

// ─── Buff definitions ───────────────────────────────────────────────────────

export interface BuffDef {
  name: string;
  value: number;
  /** For stacking buffs: value per stack */
  per?: number;
  maxStacks?: number;
  defaultEnabled: boolean;
  /** Which stat this buff affects */
  stat: 'penetration' | 'critDamage' | 'critChance' | 'armor';
  /** Which game modes this buff is available in */
  modes: GameMode[];
}

// ── Penetration buffs ─────────────────────────────────────────────────────

export const PEN_BUFFS: BuffDef[] = [
  {
    name: 'Major Breach',
    value: 5948,
    defaultEnabled: true,
    stat: 'penetration',
    modes: ['pve', 'pvp'],
  },
  {
    name: 'Minor Breach',
    value: 2974,
    defaultEnabled: true,
    stat: 'penetration',
    modes: ['pve', 'pvp'],
  },
  {
    name: 'Crusher Enchant',
    value: 2108,
    defaultEnabled: true,
    stat: 'penetration',
    modes: ['pve'],
  },
  {
    name: 'Roar of Alkosh',
    value: 6000,
    defaultEnabled: false,
    stat: 'penetration',
    modes: ['pve'],
  },
  {
    name: "Crimson Oath's Rive",
    value: 3541,
    defaultEnabled: false,
    stat: 'penetration',
    modes: ['pve'],
  },
  { name: 'Tremorscale', value: 2640, defaultEnabled: false, stat: 'penetration', modes: ['pve'] },
  {
    name: 'Runic Sunder',
    value: 2200,
    defaultEnabled: false,
    stat: 'penetration',
    modes: ['pve'],
  },
  {
    name: 'Crystal Weapon',
    value: 1000,
    defaultEnabled: false,
    stat: 'penetration',
    modes: ['pvp'],
  },
];

// ── Critical Damage buffs ─────────────────────────────────────────────────

export const CRIT_DMG_BUFFS: BuffDef[] = [
  {
    name: 'Minor Force',
    value: 10,
    defaultEnabled: true,
    stat: 'critDamage',
    modes: ['pve', 'pvp'],
  },
  {
    name: 'Major Force',
    value: 20,
    defaultEnabled: false,
    stat: 'critDamage',
    modes: ['pve', 'pvp'],
  },
  { name: 'Minor Brittle', value: 10, defaultEnabled: true, stat: 'critDamage', modes: ['pve'] },
  { name: 'Major Brittle', value: 20, defaultEnabled: false, stat: 'critDamage', modes: ['pve'] },
  {
    name: 'Elemental Catalyst',
    value: 5,
    per: 5,
    maxStacks: 3,
    defaultEnabled: false,
    stat: 'critDamage',
    modes: ['pve'],
  },
];

// ── Critical Damage gear ──────────────────────────────────────────────────

export const CRIT_DMG_GEAR: BuffDef[] = [
  {
    name: 'Lucent Echoes',
    value: 11,
    defaultEnabled: false,
    stat: 'critDamage',
    modes: ['pve', 'pvp'],
  },
  {
    name: "Sul-Xan's Torment",
    value: 12,
    defaultEnabled: false,
    stat: 'critDamage',
    modes: ['pve'],
  },
  {
    name: "Harpooner's Wading Kilt",
    value: 10,
    per: 1,
    maxStacks: 10,
    defaultEnabled: false,
    stat: 'critDamage',
    modes: ['pve'],
  },
];

// ─── Race passives ──────────────────────────────────────────────────────────

export interface RacePassive {
  raceId: string;
  stat: 'penetration' | 'critDamage' | 'critChance' | 'armor';
  name: string;
  value: number;
  isPercent?: boolean;
}

export const RACE_PASSIVES: RacePassive[] = [
  { raceId: 'woodelf', stat: 'penetration', name: "Hunter's Eye", value: 950 },
  { raceId: 'khajiit', stat: 'critDamage', name: 'Feline Ambush', value: 12, isPercent: true },
  { raceId: 'khajiit', stat: 'critChance', name: 'Lunar Blessings', value: 2284 }, // flat crit rating
  { raceId: 'nord', stat: 'armor', name: 'Stalwart', value: 2600 },
  { raceId: 'imperial', stat: 'armor', name: 'Imperial Mettle', value: 2000 },
  { raceId: 'orc', stat: 'armor', name: 'Unflinching Rage', value: 2000 },
];

// ─── Class passives (keyed by classSkillLineId) ─────────────────────────────

export interface ClassPassive {
  skillLineId: string;
  stat: 'penetration' | 'critDamage' | 'critChance' | 'armor';
  name: string;
  value: number;
  isPercent?: boolean;
}

export const CLASS_PASSIVES: ClassPassive[] = [
  // Necromancer — Grave Lord: Dismember
  { skillLineId: 'class.grave-lord', stat: 'penetration', name: 'Dismember', value: 3271 },
  // Arcanist — Herald of the Tome: Splintered Secrets (1240 × 2 stacks default)
  {
    skillLineId: 'class.herald-of-the-tome',
    stat: 'penetration',
    name: 'Splintered Secrets',
    value: 2480,
  },
  // Arcanist — Herald of the Tome: Fated Fortune (6% × 2 ranks)
  {
    skillLineId: 'class.herald-of-the-tome',
    stat: 'critDamage',
    name: 'Fated Fortune',
    value: 12,
    isPercent: true,
  },
  // Nightblade — Assassination: Hemorrhage (5% × 2 ranks)
  {
    skillLineId: 'class.assassination',
    stat: 'critDamage',
    name: 'Hemorrhage',
    value: 10,
    isPercent: true,
  },
  // Templar — Aedric Spear: Piercing Spear
  {
    skillLineId: 'class.aedric-spear',
    stat: 'critDamage',
    name: 'Piercing Spear',
    value: 12,
    isPercent: true,
  },
  // Warden — Animal Companions: Advanced Species
  {
    skillLineId: 'class.animal-companions',
    stat: 'critDamage',
    name: 'Advanced Species',
    value: 15,
    isPercent: true,
  },
];

// ─── Mundus stone bonuses ───────────────────────────────────────────────────

export interface MundusDef {
  mundusId: string;
  stat: 'penetration' | 'critDamage' | 'critChance' | 'armor';
  name: string;
  /** Value with 0 Divines pieces */
  baseValue: number;
  /** Additional value per Divines trait piece (approximate) */
  perDivines: number;
  isPercent?: boolean;
  /** True if value is flat crit rating (converted to % via CRIT_CHANCE_DIVISOR) */
  isCritRating?: boolean;
}

export const MUNDUS_BONUSES: MundusDef[] = [
  { mundusId: 'lover', stat: 'penetration', name: 'The Lover', baseValue: 2752, perDivines: 220 },
  {
    mundusId: 'shadow',
    stat: 'critDamage',
    name: 'The Shadow',
    baseValue: 13,
    perDivines: 1,
    isPercent: true,
  },
  {
    mundusId: 'thief',
    stat: 'critChance',
    name: 'The Thief',
    baseValue: 1537,
    perDivines: 123,
    isCritRating: true,
  },
  { mundusId: 'lady', stat: 'armor', name: 'The Lady', baseValue: 2752, perDivines: 220 },
];

// ─── Armor passives ─────────────────────────────────────────────────────────

/** Light Armor Concentration: 939 pen per light piece */
export const LIGHT_ARMOR_PEN_PER_PIECE = 939;

/** Medium Armor Dexterity: 2% crit dmg per medium piece */
export const MEDIUM_ARMOR_CRIT_DMG_PER_PIECE = 2;

// ─── Weapon passives ────────────────────────────────────────────────────────

export interface WeaponPassive {
  /** Weapon type identifier */
  weaponType: string;
  stat: 'penetration' | 'critDamage' | 'critChance';
  name: string;
  value: number;
  isPercent?: boolean;
}

export const WEAPON_PASSIVES: WeaponPassive[] = [
  // Dual Wield: Twin Blade and Blunt (Mace) — 1487 pen per mace
  { weaponType: 'mace-dw', stat: 'penetration', name: 'Twin Blade & Blunt (Mace)', value: 1487 },
  // Two Handed: Heavy Weapons (Maul) — 2974 pen
  { weaponType: 'maul-2h', stat: 'penetration', name: 'Heavy Weapons (Maul)', value: 2974 },
  // Dual Wield: Twin Blade and Blunt (Axe) — 6% crit dmg per axe
  {
    weaponType: 'axe-dw',
    stat: 'critDamage',
    name: 'Twin Blade & Blunt (Axe)',
    value: 6,
    isPercent: true,
  },
  // Two Handed: Heavy Weapons (Axe) — 6% crit dmg
  {
    weaponType: 'axe-2h',
    stat: 'critDamage',
    name: 'Heavy Weapons (Axe)',
    value: 6,
    isPercent: true,
  },
  // Dual Wield: Twin Blade and Blunt (Dagger) — increased crit chance
  { weaponType: 'dagger-dw', stat: 'critChance', name: 'Twin Blade & Blunt (Dagger)', value: 1612 },
];

// ─── Champion Point constants ───────────────────────────────────────────────

/** Piercing CP passive: 350 pen per stage allocated */
export const CP_PIERCING_PER_STAGE = 350;
export const CP_PIERCING_ID = 'piercing';

/** Precision CP passive: 160 crit rating per stage */
export const CP_PRECISION_PER_STAGE = 160;
export const CP_PRECISION_ID = 'precision';

/** Force of Nature (slottable): 220 pen per stack, tracked via overrides */
export const CP_FORCE_OF_NATURE_PEN = 220;
export const CP_FORCE_OF_NATURE_ID = 276; // ChampionPointAbilityId.ForceOfNature

/** Fighting Finesse (slottable): 4% crit damage per stage (max 2) */
export const CP_FIGHTING_FINESSE_CRIT_DMG = 4;
export const CP_FIGHTING_FINESSE_ID = 12; // ChampionPointAbilityId.FightingFinesse

/** Backstabber: Not in the slottable enum but tracked via calculator */
export const CP_BACKSTABBER_CRIT_DMG = 2;

// ─── Anthelmir / Balorgh special calculations ───────────────────────────────

/** Anthelmir pen = weaponDamage / 2.5 */
export const ANTHELMIR_DIVISOR = 2.5;

/** Balorgh pen = ultimateCost × 23 */
export const BALORGH_MULTIPLIER = 23;

// ─── Armor base values ──────────────────────────────────────────────────────

/** Base resistance at level 50 (before any gear) */
export const BASE_ARMOR_RESISTANCE = 0;

// ─── Default stat overrides (common PvE assumptions) ────────────────────────

export const DEFAULT_STAT_OVERRIDES = {
  buffs: {
    'Major Breach': true,
    'Minor Breach': true,
    'Crusher Enchant': true,
    'Minor Force': true,
    'Minor Brittle': true,
    'Roar of Alkosh': false,
    "Crimson Oath's Rive": false,
    Tremorscale: false,
    'Runic Sunder': false,
    'Crystal Weapon': false,
    'Major Force': false,
    'Major Brittle': false,
    'Elemental Catalyst': false,
    'Lucent Echoes': false,
    "Sul-Xan's Torment": false,
    "Harpooner's Wading Kilt": false,
  } as Record<string, boolean>,
  lightArmorCount: 1,
  mediumArmorCount: 6,
  weaponDamage: 0,
  balorghUltimate: 0,
};
