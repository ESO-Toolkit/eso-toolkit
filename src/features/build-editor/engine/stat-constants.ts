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
  /**
   * For most passives this is the final contribution: a flat rating
   * (penetration/armor) or a percentage (when isPercent). For crit chance set
   * via `isRating`, `value` is a crit RATING that the engine converts to % by
   * dividing by CRIT_CHANCE_DIVISOR (mirrors RACE_PASSIVES). For
   * `percentOfSubtotal`, `value` is a percent applied to the running subtotal
   * of the other enabled items in that stat (e.g. "+6% Armor").
   */
  value: number;
  /** value is already a final percentage (e.g. +12% crit damage). */
  isPercent?: boolean;
  /** value is a crit RATING to divide by CRIT_CHANCE_DIVISOR (crit chance only). */
  isRating?: boolean;
  /** value is a percent multiplier on the subtotal of other items in this stat. */
  percentOfSubtotal?: boolean;
  /**
   * Conditional passives (flank, execute) start unchecked so the user opts in.
   * Omitted/undefined means always-on auto-applied. When present, the item is a
   * toggle keyed by `name` in StatOverrides.buffs, defaulting to this value.
   */
  defaultEnabled?: boolean;
  /** Short activation condition shown in the UI, e.g. "while flanking". */
  condition?: string;
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
  // Dragonknight — Earthen Heart: Blessing at the Peak
  {
    skillLineId: 'class.earthen-heart',
    stat: 'critDamage',
    name: 'Blessing at the Peak',
    value: 10,
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

  // ── U50 base-class passives that grant a modeled stat ──────────────────────
  // (verified against the live in-game tooltip dump, API 101050)

  // Nightblade — Assassination: Hemorrhage also grants Minor Savagery (the
  // +10% crit DAMAGE half is modeled above; this is its crit CHANCE half).
  {
    skillLineId: 'class.assassination',
    stat: 'critChance',
    name: 'Hemorrhage (Minor Savagery)',
    value: 1314, // Weapon Critical rating
    isRating: true,
  },
  // Sorcerer — Dark Magic: Exploitation grants Minor Prophecy to you + group.
  {
    skillLineId: 'class.dark-magic',
    stat: 'critChance',
    name: 'Exploitation (Minor Prophecy)',
    value: 1314, // Spell Critical rating
    isRating: true,
  },
  // Nightblade — Assassination: Pressure Points (+438 crit rating per NB
  // ability slotted; modeled at the fully-slotted 5 abilities, like the other
  // per-slot passives above).
  {
    skillLineId: 'class.assassination',
    stat: 'critChance',
    name: 'Pressure Points',
    value: 2190, // 438 × 5 slotted
    isRating: true,
  },
  // Nightblade — Assassination: Master Assassin (crit chance only while
  // flanking — conditional, off by default).
  {
    skillLineId: 'class.assassination',
    stat: 'critChance',
    name: 'Master Assassin',
    value: 1448, // crit rating ≈ 6.6%
    isRating: true,
    defaultEnabled: false,
    condition: 'while flanking',
  },
  // Necromancer — Grave Lord: Death Knell (+20% crit chance vs enemies under
  // 33% Health — conditional, off by default).
  {
    skillLineId: 'class.grave-lord',
    stat: 'critChance',
    name: 'Death Knell',
    value: 20,
    isPercent: true,
    defaultEnabled: false,
    condition: 'target under 33% Health',
  },
  // Templar — Aedric Spear: Balanced Warrior (+6% Armor — a multiplier on the
  // armor subtotal, not a flat add).
  {
    skillLineId: 'class.aedric-spear',
    stat: 'armor',
    name: 'Balanced Warrior',
    value: 6,
    percentOfSubtotal: true,
  },
  // Dragonknight — Earthen Heart: Heart of Stone (+2974 Armor).
  {
    skillLineId: 'class.earthen-heart',
    stat: 'armor',
    name: 'Heart of Stone',
    value: 2974,
  },
  // Arcanist — Soldier of Apocrypha: Aegis of the Unseen (+3271 Armor while a
  // beneficial Soldier of Apocrypha ability is active on you).
  {
    skillLineId: 'class.soldier-of-apocrypha',
    stat: 'armor',
    name: 'Aegis of the Unseen',
    value: 3271,
  },
  // Nightblade — Shadow: Shadow Barrier grants Major Resolve (+5948 resistance)
  // on casting a Shadow ability.
  {
    skillLineId: 'class.shadow',
    stat: 'armor',
    name: 'Shadow Barrier (Major Resolve)',
    value: 5948,
  },
  // Warden — Winter's Embrace: Frozen Armor (+1240 resistance per Winter's
  // Embrace ability slotted; modeled at the fully-slotted 5 abilities).
  {
    skillLineId: 'class.winter-s-embrace',
    stat: 'armor',
    name: 'Frozen Armor',
    value: 6200, // 1240 × 5 slotted
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
    // The Shadow at CP160 gold is ~11.6% crit damage at 0 Divines, scaling
    // multiplicatively with Divines (~×1.077 per gold piece). Modeled additively
    // as base 11.6 + ~1% per Divines, which tracks the real curve within ~1%
    // across 0–7 Divines. (Was 13 base, which ran ~1.5% high.)
    mundusId: 'shadow',
    stat: 'critDamage',
    name: 'The Shadow',
    baseValue: 11.6,
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

// ─── Trait stat contributions (gold quality, CP160) ─────────────────────────

/** Sharpened weapon trait: flat penetration per weapon */
export const TRAIT_SHARPENED_PEN = 2752;

/** Precise weapon trait: flat crit rating per weapon */
export const TRAIT_PRECISE_CRIT_RATING = 2295;

/** Nirnhoned armor trait: flat resistance per armor piece */
export const TRAIT_NIRNHONED_ARMOR_RESISTANCE = 253;

/** Defending weapon trait: flat resistance per weapon */
export const TRAIT_DEFENDING_RESISTANCE = 2752;

// ─── Class Mastery passives (U50) that affect crit damage ───────────────────

/**
 * The build editor's stat engine only models penetration, crit damage, crit
 * chance, and armor. Of the 35 U50 Class Mastery passives, exactly three move
 * any of those four stats — all three affect crit damage. The rest grant
 * weapon/spell damage, max stats, recovery, shields, etc. that this engine
 * doesn't model, so they stay cosmetic to the calculator.
 *
 * Keyed by the passive's ability id (see ClassSkillId). Selecting the passive
 * in the build auto-applies the effect, exactly like a class skill-line passive
 * — these are not manual buff toggles.
 */
export interface ClassMasteryCritPassive {
  /** Ability id from ClassSkillId. */
  id: number;
  /** Display name of the passive (the picker label). */
  name: string;
  /**
   * If the passive merely supplies an already-modeled named buff (e.g. Major
   * Force), this is that buff's name in CRIT_DMG_BUFFS. When set, selecting the
   * passive forces that buff on (auto-detected) instead of adding a second
   * line, so it can never double-count with the manual buff toggle.
   */
  grantsBuff?: string;
  /**
   * Crit-damage % the passive adds on its own (only for passives not covered by
   * an existing buff). PvP value differs for effects reduced vs Battle Spirit.
   */
  value?: number;
  valuePvp?: number;
  /** Amount this passive raises the crit-damage cap/max by, if any. */
  capBonus?: number;
}

export const CLASS_MASTERY_CRIT_PASSIVES: ClassMasteryCritPassive[] = [
  // Arcanist — Ink-Scribe's Verve: grants Major Force (+20% crit dmg) to the group.
  { id: 263416, name: "Ink-Scribe's Verve", grantsBuff: 'Major Force' },
  // Warden — Tundra's Maw: applies Major Brittle (+20% crit dmg taken) on Chill.
  { id: 263519, name: "Tundra's Maw", grantsBuff: 'Major Brittle' },
  // Nightblade — Above and Beyond: +25% crit damage (PvE) / +5% vs Battle Spirit,
  // and raises the maximum crit damage by +30%.
  { id: 263605, name: 'Above and Beyond', value: 25, valuePvp: 5, capBonus: 30 },
];

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
