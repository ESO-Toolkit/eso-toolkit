/**
 * Stat Engine — Pure Calculation Functions
 *
 * Takes a BuildSetup + Build and returns computed stats.
 * No React, no Redux — just math. Components call this via useMemo.
 */

import type { GearConfig } from '../../loadout-manager/types/loadout.types';
import { EQUIP_SLOTS } from '../data/esoStaticData';
import type { Build, BuildSetup, GameMode } from '../types/build.types';

import {
  ANTHELMIR_DIVISOR,
  ARMOR_CAP,
  ARMOR_MAX,
  BALORGH_MULTIPLIER,
  BASE_CRIT_CHANCE,
  BASE_CRIT_DAMAGE,
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
    const weight = piece.weight ?? 'heavy';
    counts[weight]++;
  }
  return counts;
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
    const detected = activeLines.includes(cp.skillLineId);
    if (detected) {
      items.push({
        name: cp.name,
        value: cp.value,
        source: 'class',
        enabled: true,
        autoDetected: true,
      });
    }
  }

  // Mundus stone
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'penetration') continue;
    if (setup.mundusStone === md.mundusId) {
      items.push({
        name: md.name,
        value: md.baseValue,
        source: 'mundus',
        enabled: true,
        autoDetected: true,
      });
    }
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
  const { cap, max } = CRIT_DMG_CAPS;
  const items: StatItem[] = [];

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
    const enabled = overrides.buffs[buff.name] ?? buff.defaultEnabled;
    items.push({
      name: buff.name,
      value: buff.value,
      source: 'buff',
      enabled,
      isPercent: true,
      autoDetected: false,
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
        name: cp.name,
        value: cp.value,
        source: 'class',
        enabled: true,
        isPercent: cp.isPercent,
        autoDetected: true,
      });
    }
  }

  // Mundus stone
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'critDamage') continue;
    if (setup.mundusStone === md.mundusId) {
      items.push({
        name: md.name,
        value: md.baseValue,
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

  return makeResult(items, cap, max);
}

// ─── Critical Chance ────────────────────────────────────────────────────────

export function calculateCritChance(
  setup: BuildSetup,
  build: Build,
  _overrides: StatOverrides,
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

  // Mundus stone (Thief: crit rating → %)
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'critChance') continue;
    if (setup.mundusStone === md.mundusId) {
      const pct = parseFloat((md.baseValue / CRIT_CHANCE_DIVISOR).toFixed(1));
      items.push({
        name: md.name,
        value: pct,
        source: 'mundus',
        enabled: true,
        isPercent: true,
        autoDetected: true,
      });
    }
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

  return makeResult(items, cap, max);
}

// ─── Armor (Physical / Spell Resistance) ────────────────────────────────────

export function calculateArmor(
  setup: BuildSetup,
  build: Build,
  _overrides: StatOverrides,
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

  // Mundus stone (The Lady)
  for (const md of MUNDUS_BONUSES) {
    if (md.stat !== 'armor') continue;
    if (setup.mundusStone === md.mundusId) {
      items.push({
        name: md.name,
        value: md.baseValue,
        source: 'mundus',
        enabled: true,
        autoDetected: true,
      });
    }
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
