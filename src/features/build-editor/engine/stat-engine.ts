/**
 * Stat Engine — Pure Calculation Functions
 *
 * Takes a BuildSetup + Build and returns computed stats.
 * No React, no Redux — just math. Components call this via useMemo.
 */

import type { GearConfig } from '../../loadout-manager/types/loadout.types';
import { EQUIP_SLOTS } from '../data/esoStaticData';
import { resolveApparelWeight } from '../data/setArmorWeights';
import type { Build, BuildSetup, GameMode } from '../types/build.types';

import {
  ANTHELMIR_DIVISOR,
  ARMOR_CAP,
  ARMOR_MAX,
  BALORGH_MULTIPLIER,
  BASE_CRIT_CHANCE,
  BASE_CRIT_DAMAGE,
  CLASS_MASTERY_CRIT_PASSIVES,
  CLASS_PASSIVES,
  CP_FIGHTING_FINESSE_CRIT_DMG,
  CP_FIGHTING_FINESSE_ID,
  CP_PIERCING_ID,
  CP_PIERCING_PER_STAGE,
  CP_PRECISION_ID,
  CP_PRECISION_PER_STAGE,
  CRIT_CHANCE_DIVISOR,
  CRIT_DMG_BUFFS,
  CRIT_DMG_CAPS,
  CRIT_DMG_GEAR,
  DEFAULT_STAT_OVERRIDES,
  LIGHT_ARMOR_PEN_PER_PIECE,
  MEDIUM_ARMOR_CRIT_DMG_PER_PIECE,
  MUNDUS_BONUSES,
  PEN_BUFFS,
  PEN_CAPS,
  RACE_PASSIVES,
  TRAIT_DEFENDING_RESISTANCE,
  TRAIT_NIRNHONED_ARMOR_RESISTANCE,
  TRAIT_PRECISE_CRIT_RATING,
  TRAIT_SHARPENED_PEN,
} from './stat-constants';
import type { BuildStats, StatItem, StatOverrides, StatResult, StatStatus } from './stat-types';

// ─── Armor weight counting ──────────────────────────────────────────────────

const APPAREL_SLOTS = EQUIP_SLOTS.filter((s) => s.category === 'apparel').map((s) => s.slot);

interface ArmorWeightCounts {
  light: number;
  medium: number;
  heavy: number;
}

export function countArmorWeights(gear: GearConfig): ArmorWeightCounts {
  const counts: ArmorWeightCounts = { light: 0, medium: 0, heavy: 0 };
  for (const slot of APPAREL_SLOTS) {
    const piece = gear[slot];
    if (!piece?.id) continue;
    // Locked weight wins over a stored/absent weight — see resolveApparelWeight.
    counts[resolveApparelWeight(piece.id, piece.weight)]++;
  }
  return counts;
}

// ─── Trait counting ────────────────────────────────────────────────────────

/**
 * Count how many Divines-traited apparel pieces are equipped.
 * Used to scale Mundus Stone bonuses via MundusDef.perDivines.
 */
export function countDivinesPieces(gear: GearConfig): number {
  let count = 0;
  for (const slot of APPAREL_SLOTS) {
    const piece = gear[slot];
    if (piece?.id && piece.trait === 'divines') count++;
  }
  return count;
}

/** Weapon slots: front bar main + off, back bar main + off */
const WEAPON_SLOTS = EQUIP_SLOTS.filter((s) => s.category === 'weapons').map((s) => s.slot);

/**
 * Count how many equipped weapons have a specific trait.
 */
export function countWeaponTrait(gear: GearConfig, traitId: string): number {
  let count = 0;
  for (const slot of WEAPON_SLOTS) {
    const piece = gear[slot];
    if (piece?.id && piece.trait === traitId) count++;
  }
  return count;
}

/**
 * Count how many equipped armor pieces have a specific trait.
 */
export function countArmorTrait(gear: GearConfig, traitId: string): number {
  let count = 0;
  for (const slot of APPAREL_SLOTS) {
    const piece = gear[slot];
    if (piece?.id && piece.trait === traitId) count++;
  }
  return count;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveStatus(total: number, cap: number, maxCap: number): StatStatus {
  if (total < cap) return 'under';
  if (total <= maxCap) return 'optimal';
  return 'over';
}

function makeResult(items: StatItem[], cap: number, maxCap: number): StatResult {
  const total = items.filter((i) => i.enabled).reduce((sum, i) => sum + i.value, 0);
  return {
    total,
    cap,
    maxCap,
    status: resolveStatus(total, cap, maxCap),
    items,
  };
}

/** Display name for a class passive — appends its condition, if any. */
function classPassiveLabel(cp: { name: string; condition?: string }): string {
  return cp.condition ? `${cp.name} (${cp.condition})` : cp.name;
}

/**
 * Whether a class passive's contribution is enabled. Always-on passives
 * (no `defaultEnabled`) are auto-applied; conditional ones (flank/execute,
 * `defaultEnabled: false`) are a toggle keyed by display label in
 * overrides.buffs — the same label the Buff Toggles UI writes.
 */
function classPassiveEnabled(
  cp: { name: string; condition?: string; defaultEnabled?: boolean },
  overrides: StatOverrides,
): boolean {
  if (cp.defaultEnabled === undefined) return true;
  return overrides.buffs[classPassiveLabel(cp)] ?? cp.defaultEnabled;
}

// ─── Penetration ────────────────────────────────────────────────────────────

export function calculatePenetration(
  setup: BuildSetup,
  build: Build,
  overrides: StatOverrides,
): StatResult {
  const mode: GameMode = build.gameMode;
  const { cap, max } = PEN_CAPS[mode];
  const items: StatItem[] = [];

  // Group buffs
  for (const buff of PEN_BUFFS) {
    if (!buff.modes.includes(mode)) continue;
    const enabled = overrides.buffs[buff.name] ?? buff.defaultEnabled;
    items.push({
      name: buff.name,
      value: buff.value,
      source: 'buff',
      enabled,
      autoDetected: false,
    });
  }

  // Light Armor Concentration — auto-detected from gear weight
  const armorCounts = countArmorWeights(setup.gear);
  if (armorCounts.light > 0) {
    items.push({
      name: `Light Armor (${armorCounts.light}pc)`,
      value: armorCounts.light * LIGHT_ARMOR_PEN_PER_PIECE,
      source: 'passive',
      enabled: true,
      autoDetected: true,
    });
  }

  // Race passives
  const primaryRace = build.races[0] ?? '';
  for (const rp of RACE_PASSIVES) {
    if (rp.stat !== 'penetration') continue;
    const detected = rp.raceId === primaryRace;
    if (detected) {
      items.push({
        name: rp.name,
        value: rp.value,
        source: 'race',
        enabled: true,
        autoDetected: true,
      });
    }
  }

  // Class passives
  const activeLines = build.classSkillLines.filter(Boolean) as string[];
  for (const cp of CLASS_PASSIVES) {
    if (cp.stat !== 'penetration') continue;
    if (activeLines.includes(cp.skillLineId)) {
      items.push({
        name: classPassiveLabel(cp),
        value: cp.value,
        source: 'class',
        enabled: classPassiveEnabled(cp, overrides),
        autoDetected: cp.defaultEnabled === undefined,
      });
    }
  }

  // Mundus stone (scaled by Divines trait count)
  const divinesCount = countDivinesPieces(setup.gear);
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'penetration') continue;
    if (setup.mundusStone === md.mundusId) {
      const value = md.baseValue + divinesCount * md.perDivines;
      items.push({
        name: divinesCount > 0 ? `${md.name} (${divinesCount} Divines)` : md.name,
        value,
        source: 'mundus',
        enabled: true,
        autoDetected: true,
      });
    }
  }

  // Sharpened weapon trait — auto-detected from gear
  const sharpenedCount = countWeaponTrait(setup.gear, 'sharpened');
  if (sharpenedCount > 0) {
    items.push({
      name: `Sharpened (${sharpenedCount} weapon${sharpenedCount > 1 ? 's' : ''})`,
      value: sharpenedCount * TRAIT_SHARPENED_PEN,
      source: 'gear',
      enabled: true,
      autoDetected: true,
    });
  }

  // CP passive: Piercing
  const piercingStages = setup.cp.warfare.passives[CP_PIERCING_ID] ?? 0;
  if (piercingStages > 0) {
    items.push({
      name: 'CP: Piercing',
      value: piercingStages * CP_PIERCING_PER_STAGE,
      source: 'cp',
      enabled: true,
      autoDetected: true,
    });
  }

  // Anthelmir (weapon damage based)
  if (overrides.weaponDamage > 0) {
    items.push({
      name: 'Anthelmir',
      value: Math.round(overrides.weaponDamage / ANTHELMIR_DIVISOR),
      source: 'gear',
      enabled: overrides.buffs['Anthelmir'] ?? false,
      autoDetected: false,
    });
  }

  // Balorgh (ultimate based)
  if (overrides.balorghUltimate > 0) {
    items.push({
      name: 'Balorgh',
      value: Math.round(overrides.balorghUltimate * BALORGH_MULTIPLIER),
      source: 'gear',
      enabled: overrides.buffs['Balorgh'] ?? false,
      autoDetected: false,
    });
  }

  return makeResult(items, cap, max);
}

// ─── Critical Damage ────────────────────────────────────────────────────────

export function calculateCritDamage(
  setup: BuildSetup,
  build: Build,
  overrides: StatOverrides,
): StatResult {
  const mode: GameMode = build.gameMode;
  let { cap, max } = CRIT_DMG_CAPS;
  const items: StatItem[] = [];

  // U50 Class Mastery passives the player selected (only relevant while not
  // subclassed — the selection is build-level and already gated by the picker).
  const selectedMastery = new Set(build.classMasteryPassives ?? []);
  const masteryCrit = CLASS_MASTERY_CRIT_PASSIVES.filter((p) => selectedMastery.has(p.id));
  // Buffs (e.g. Major Force / Major Brittle) supplied by a selected passive —
  // map buff name → the passive granting it, so the buff loop can force it on
  // and label its source instead of letting it double-count with the toggle.
  const buffFromMastery = new Map(
    masteryCrit.filter((p) => p.grantsBuff).map((p) => [p.grantsBuff as string, p.name]),
  );

  // Base character crit damage (always on)
  items.push({
    name: 'Base Crit Damage',
    value: BASE_CRIT_DAMAGE,
    source: 'base',
    enabled: true,
    isPercent: true,
    autoDetected: true,
  });

  // Group buffs
  for (const buff of CRIT_DMG_BUFFS) {
    if (!buff.modes.includes(mode)) continue;
    // A selected Class Mastery passive that grants this buff forces it on and
    // marks it auto-detected so it can't be double-counted with the toggle.
    const grantingPassive = buffFromMastery.get(buff.name);
    const enabled = grantingPassive ? true : (overrides.buffs[buff.name] ?? buff.defaultEnabled);
    items.push({
      name: grantingPassive ? `${buff.name} (${grantingPassive})` : buff.name,
      value: buff.value,
      source: grantingPassive ? 'class' : 'buff',
      enabled,
      isPercent: true,
      autoDetected: Boolean(grantingPassive),
    });
  }

  // Gear sets
  for (const gear of CRIT_DMG_GEAR) {
    if (!gear.modes.includes(mode)) continue;
    const enabled = overrides.buffs[gear.name] ?? gear.defaultEnabled;
    items.push({
      name: gear.name,
      value: gear.value,
      source: 'gear',
      enabled,
      isPercent: true,
      autoDetected: false,
    });
  }

  // Medium Armor Dexterity — auto-detected from gear weight
  const critArmorCounts = countArmorWeights(setup.gear);
  if (critArmorCounts.medium > 0) {
    items.push({
      name: `Medium Armor (${critArmorCounts.medium}pc)`,
      value: critArmorCounts.medium * MEDIUM_ARMOR_CRIT_DMG_PER_PIECE,
      source: 'passive',
      enabled: true,
      isPercent: true,
      autoDetected: false,
    });
  }

  // Race passives
  const primaryRace = build.races[0] ?? '';
  for (const rp of RACE_PASSIVES) {
    if (rp.stat !== 'critDamage') continue;
    if (rp.raceId === primaryRace) {
      items.push({
        name: rp.name,
        value: rp.value,
        source: 'race',
        enabled: true,
        isPercent: rp.isPercent,
        autoDetected: true,
      });
    }
  }

  // Class passives
  const activeLines = build.classSkillLines.filter(Boolean) as string[];
  for (const cp of CLASS_PASSIVES) {
    if (cp.stat !== 'critDamage') continue;
    if (activeLines.includes(cp.skillLineId)) {
      items.push({
        name: classPassiveLabel(cp),
        value: cp.value,
        source: 'class',
        enabled: classPassiveEnabled(cp, overrides),
        isPercent: cp.isPercent,
        autoDetected: cp.defaultEnabled === undefined,
      });
    }
  }

  // Mundus stone (scaled by Divines trait count)
  const critDivinesCount = countDivinesPieces(setup.gear);
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'critDamage') continue;
    if (setup.mundusStone === md.mundusId) {
      const value = md.baseValue + critDivinesCount * md.perDivines;
      items.push({
        name: critDivinesCount > 0 ? `${md.name} (${critDivinesCount} Divines)` : md.name,
        value,
        source: 'mundus',
        enabled: true,
        isPercent: md.isPercent,
        autoDetected: true,
      });
    }
  }

  // CP slottable: Fighting Finesse
  const hasFightingFinesse = setup.cp.warfare.slots.some((s) => s === CP_FIGHTING_FINESSE_ID);
  if (hasFightingFinesse) {
    items.push({
      name: 'CP: Fighting Finesse',
      value: CP_FIGHTING_FINESSE_CRIT_DMG,
      source: 'cp',
      enabled: true,
      isPercent: true,
      autoDetected: true,
    });
  }

  // Class Mastery passives that add crit damage on their own (not via a named
  // buff) — e.g. Nightblade's Above and Beyond. Some also raise the cap.
  for (const passive of masteryCrit) {
    if (passive.grantsBuff) continue; // already handled in the buff loop
    if (passive.capBonus) {
      cap += passive.capBonus;
      max += passive.capBonus;
    }
    const value = mode === 'pvp' ? (passive.valuePvp ?? passive.value ?? 0) : (passive.value ?? 0);
    if (value) {
      items.push({
        name: passive.name,
        value,
        source: 'class',
        enabled: true,
        isPercent: true,
        autoDetected: true,
      });
    }
  }

  return makeResult(items, cap, max);
}

// ─── Critical Chance ────────────────────────────────────────────────────────

export function calculateCritChance(
  setup: BuildSetup,
  build: Build,
  overrides: StatOverrides,
): StatResult {
  const cap = 100;
  const max = 100;
  const items: StatItem[] = [];

  // Base crit chance
  items.push({
    name: 'Base Crit Chance',
    value: BASE_CRIT_CHANCE,
    source: 'base',
    enabled: true,
    isPercent: true,
    autoDetected: true,
  });

  // Race passives (Khajiit crit rating → %)
  const primaryRace = build.races[0] ?? '';
  for (const rp of RACE_PASSIVES) {
    if (rp.stat !== 'critChance') continue;
    if (rp.raceId === primaryRace) {
      const pct = parseFloat((rp.value / CRIT_CHANCE_DIVISOR).toFixed(1));
      items.push({
        name: rp.name,
        value: pct,
        source: 'race',
        enabled: true,
        isPercent: true,
        autoDetected: true,
      });
    }
  }

  // Mundus stone (Thief: crit rating → %, scaled by Divines)
  const critChanceDivines = countDivinesPieces(setup.gear);
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'critChance') continue;
    if (setup.mundusStone === md.mundusId) {
      const scaledValue = md.baseValue + critChanceDivines * md.perDivines;
      const pct = parseFloat((scaledValue / CRIT_CHANCE_DIVISOR).toFixed(1));
      items.push({
        name: critChanceDivines > 0 ? `${md.name} (${critChanceDivines} Divines)` : md.name,
        value: pct,
        source: 'mundus',
        enabled: true,
        isPercent: true,
        autoDetected: true,
      });
    }
  }

  // Precise weapon trait — auto-detected from gear
  const preciseCount = countWeaponTrait(setup.gear, 'precise');
  if (preciseCount > 0) {
    const rating = preciseCount * TRAIT_PRECISE_CRIT_RATING;
    const pct = parseFloat((rating / CRIT_CHANCE_DIVISOR).toFixed(1));
    items.push({
      name: `Precise (${preciseCount} weapon${preciseCount > 1 ? 's' : ''})`,
      value: pct,
      source: 'gear',
      enabled: true,
      isPercent: true,
      autoDetected: true,
    });
  }

  // CP passive: Precision (160 crit rating per stage → %)
  const precisionStages = setup.cp.warfare.passives[CP_PRECISION_ID] ?? 0;
  if (precisionStages > 0) {
    const rating = precisionStages * CP_PRECISION_PER_STAGE;
    const pct = parseFloat((rating / CRIT_CHANCE_DIVISOR).toFixed(1));
    items.push({
      name: 'CP: Precision',
      value: pct,
      source: 'cp',
      enabled: true,
      isPercent: true,
      autoDetected: true,
    });
  }

  // Class passives (crit chance) — ratings convert to % via CRIT_CHANCE_DIVISOR.
  const critChanceLines = build.classSkillLines.filter(Boolean) as string[];
  for (const cp of CLASS_PASSIVES) {
    if (cp.stat !== 'critChance') continue;
    if (!critChanceLines.includes(cp.skillLineId)) continue;
    const pct = cp.isRating ? parseFloat((cp.value / CRIT_CHANCE_DIVISOR).toFixed(1)) : cp.value;
    items.push({
      name: classPassiveLabel(cp),
      value: pct,
      source: 'class',
      enabled: classPassiveEnabled(cp, overrides),
      isPercent: true,
      autoDetected: cp.defaultEnabled === undefined,
    });
  }

  return makeResult(items, cap, max);
}

// ─── Armor (Physical / Spell Resistance) ────────────────────────────────────

export function calculateArmor(
  setup: BuildSetup,
  build: Build,
  overrides: StatOverrides,
): StatResult {
  const items: StatItem[] = [];

  // Race passives for armor
  const primaryRace = build.races[0] ?? '';
  for (const rp of RACE_PASSIVES) {
    if (rp.stat !== 'armor') continue;
    if (rp.raceId === primaryRace) {
      items.push({
        name: rp.name,
        value: rp.value,
        source: 'race',
        enabled: true,
        autoDetected: true,
      });
    }
  }

  // Mundus stone (The Lady, scaled by Divines)
  const armorDivinesCount = countDivinesPieces(setup.gear);
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'armor') continue;
    if (setup.mundusStone === md.mundusId) {
      const value = md.baseValue + armorDivinesCount * md.perDivines;
      items.push({
        name: armorDivinesCount > 0 ? `${md.name} (${armorDivinesCount} Divines)` : md.name,
        value,
        source: 'mundus',
        enabled: true,
        autoDetected: true,
      });
    }
  }

  // Nirnhoned armor trait — auto-detected from gear
  const nirnhonedCount = countArmorTrait(setup.gear, 'nirnhoned');
  if (nirnhonedCount > 0) {
    items.push({
      name: `Nirnhoned (${nirnhonedCount}pc)`,
      value: nirnhonedCount * TRAIT_NIRNHONED_ARMOR_RESISTANCE,
      source: 'gear',
      enabled: true,
      autoDetected: true,
    });
  }

  // Defending weapon trait — auto-detected from gear
  const defendingCount = countWeaponTrait(setup.gear, 'defending');
  if (defendingCount > 0) {
    items.push({
      name: `Defending (${defendingCount} weapon${defendingCount > 1 ? 's' : ''})`,
      value: defendingCount * TRAIT_DEFENDING_RESISTANCE,
      source: 'gear',
      enabled: true,
      autoDetected: true,
    });
  }

  // Class passives (armor / resistance). This panel tracks resistance ADDITIONS
  // on top of equipped gear (gear base armor isn't summed here), so a flat
  // resistance grant adds directly. A "% of total armor" passive (Balanced
  // Warrior) can't be folded into this additive subtotal without the gear base,
  // so it's surfaced as an informational item (value 0) rather than a wrong
  // number.
  const armorLines = build.classSkillLines.filter(Boolean) as string[];
  for (const cp of CLASS_PASSIVES) {
    if (cp.stat !== 'armor') continue;
    if (!armorLines.includes(cp.skillLineId)) continue;
    if (cp.percentOfSubtotal) {
      items.push({
        name: `${cp.name} (+${cp.value}% Armor)`,
        value: 0,
        source: 'class',
        enabled: classPassiveEnabled(cp, overrides),
        isPercent: true,
        autoDetected: cp.defaultEnabled === undefined,
      });
      continue;
    }
    items.push({
      name: classPassiveLabel(cp),
      value: cp.value,
      source: 'class',
      enabled: classPassiveEnabled(cp, overrides),
      autoDetected: cp.defaultEnabled === undefined,
    });
  }

  return makeResult(items, ARMOR_CAP, ARMOR_MAX);
}

// ─── Master function ────────────────────────────────────────────────────────

export function calculateBuildStats(
  setup: BuildSetup,
  build: Build,
  overrides?: StatOverrides,
): BuildStats {
  const ov = overrides ?? DEFAULT_STAT_OVERRIDES;
  return {
    penetration: calculatePenetration(setup, build, ov),
    critDamage: calculateCritDamage(setup, build, ov),
    critChance: calculateCritChance(setup, build, ov),
    armor: calculateArmor(setup, build, ov),
  };
}
