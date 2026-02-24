/**
 * Tooltip Scaling Utilities
 *
 * Tracks buffs that modify the tooltip (base damage) itself by changing the
 * weapon damage or spell damage stat. Since abilities scale off these stats,
 * any buff that modifies them causes a proportional change to tooltip damage.
 *
 * ESO tooltip formula (simplified):
 *   tooltip = coefficient × (max(weaponDamage, spellDamage) + max(stamina, magicka) / 10.46)
 *
 * Post-hybridization, Brutality and Sorcery both affect the same effective stat:
 *   effective_stat = base_WD × (1 + majorBrut% + minorBrut%) + courage_flat
 *
 * The tooltip impact is estimated as:
 *   tooltipMultiplier = 1 + (base_WD × brut% + courage_flat) / (base_WD + resource/10.46)
 *
 * Tracked buffs:
 *   - Major Brutality/Sorcery: +20% weapon/spell damage → ~+12.3% tooltip
 *   - Minor Brutality/Sorcery: +10% weapon/spell damage → ~+6.2% tooltip
 *   - Major Courage: +430 flat weapon/spell damage → ~+4.8% tooltip
 *   - Minor Courage: +215 flat weapon/spell damage → ~+2.4% tooltip
 *   - Powerful Assault: +307 flat weapon/spell damage → ~+3.4% tooltip
 *
 * Note: These are approximations. The exact tooltip impact depends on each
 * player's stat allocation. The model uses default assumptions for a typical
 * DPS build: ~5500 base WD/SD and ~36000 resource.
 */

import { KnownAbilities } from '../types/abilities';

import {
  type BuffLookupData,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';

// ─── Constants ──────────────────────────────────────────────────────────────────

/**
 * Assumed base weapon/spell damage before percentage buffs.
 * Typical DPS builds have ~5000-6000 base WD/SD.
 */
const ASSUMED_BASE_OFFENSIVE_STAT = 5500;

/**
 * Assumed max resource contribution to tooltip.
 * For typical DPS: ~36000 resource / 10.46 ≈ 3442
 */
const ASSUMED_RESOURCE_CONTRIBUTION = 3442;

/**
 * Total tooltip input denominator: base_WD + resource_contribution.
 * Used to convert flat stat bonuses to tooltip percentages.
 */
const TOOLTIP_INPUT_TOTAL = ASSUMED_BASE_OFFENSIVE_STAT + ASSUMED_RESOURCE_CONTRIBUTION; // ~8942

// ─── Buff Values ────────────────────────────────────────────────────────────────

/** Tooltip scaling percentage values for each buff source */
export const TooltipScalingValues = {
  /** Major Brutality/Sorcery: +20% weapon/spell damage */
  MAJOR_BRUTALITY_SORCERY_PCT: 20,
  /** Minor Brutality/Sorcery: +10% weapon/spell damage */
  MINOR_BRUTALITY_SORCERY_PCT: 10,
  /** Major Courage: +430 flat weapon/spell damage */
  MAJOR_COURAGE_FLAT: 430,
  /** Minor Courage: +215 flat weapon/spell damage */
  MINOR_COURAGE_FLAT: 215,
  /** Powerful Assault: +307 flat weapon/spell damage */
  POWERFUL_ASSAULT_FLAT: 307,
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TooltipScalingBreakdown {
  /** Whether Major Brutality or Major Sorcery (or the combined buff) is active */
  hasMajorBrutalitySorcery: boolean;
  /** Whether Minor Brutality or Minor Sorcery is active */
  hasMinorBrutalitySorcery: boolean;
  /** Whether Major Courage is active */
  hasMajorCourage: boolean;
  /** Whether Minor Courage is active */
  hasMinorCourage: boolean;
  /** Whether Powerful Assault is active */
  hasPowerfulAssault: boolean;
  /**
   * Combined estimated tooltip multiplier.
   * Computed as: 1 + (base_WD × pct_bonus% + flat_bonus) / tooltip_input_total.
   * This is an approximation assuming typical DPS stat allocation.
   */
  estimatedMultiplier: number;
  /** Which sources are active */
  activeSources: TooltipScalingSource[];
}

export interface TooltipScalingSource {
  name: string;
  abilityId: KnownAbilities;
  /** The estimated effect on tooltip as a percentage (e.g. 12.3 = +12.3% tooltip) */
  tooltipEffectPercent: number;
  isActive: boolean;
}

// ─── Source Definitions ─────────────────────────────────────────────────────────

/** Major Brutality/Sorcery ability IDs (any active = +20% WD/SD) */
const MAJOR_BRUTALITY_SORCERY_IDS: readonly KnownAbilities[] = [
  KnownAbilities.MAJOR_BRUTALITY,
  KnownAbilities.MAJOR_SORCERY,
  KnownAbilities.MAJOR_BRUTALITY_AND_SORCERY,
];

/** Minor Brutality/Sorcery ability IDs (any active = +10% WD/SD) */
const MINOR_BRUTALITY_SORCERY_IDS: readonly KnownAbilities[] = [
  KnownAbilities.MINOR_BRUTALITY,
  KnownAbilities.MINOR_SORCERY,
];

// ─── Core Computation ───────────────────────────────────────────────────────────

/**
 * Compute the estimated tooltip damage change from a percentage buff on WD/SD.
 *
 * @param pctBonus - Percentage increase to weapon/spell damage (e.g. 20 for +20%)
 * @returns Estimated percentage increase to tooltip damage
 */
function pctBonusToTooltipEffect(pctBonus: number): number {
  // tooltip_effect = (base_WD × pctBonus%) / (base_WD + resource_contribution)
  return (ASSUMED_BASE_OFFENSIVE_STAT * (pctBonus / 100) / TOOLTIP_INPUT_TOTAL) * 100;
}

/**
 * Compute the estimated tooltip damage change from a flat WD/SD bonus.
 *
 * @param flatBonus - Flat weapon/spell damage added
 * @returns Estimated percentage increase to tooltip damage
 */
function flatBonusToTooltipEffect(flatBonus: number): number {
  return (flatBonus / TOOLTIP_INPUT_TOTAL) * 100;
}

/**
 * Check if any of the given ability IDs are active, using event.buffs snapshot
 * as primary source (more reliable for attacker-side buffs) with BuffLookup fallback.
 */
function isAnyBuffActive(
  ids: readonly KnownAbilities[],
  eventBuffIds: ReadonlySet<number> | null,
  buffLookup: BuffLookupData,
  timestamp: number,
  sourceID: number,
): boolean {
  if (eventBuffIds) {
    return ids.some((id) => eventBuffIds.has(id));
  }
  return ids.some((id) => isBuffActiveOnTarget(buffLookup, id, timestamp, sourceID));
}

/**
 * Check if a specific ability ID is active, using event.buffs snapshot
 * as primary source with BuffLookup fallback.
 */
function isSingleBuffActive(
  id: KnownAbilities,
  eventBuffIds: ReadonlySet<number> | null,
  buffLookup: BuffLookupData,
  timestamp: number,
  sourceID: number,
): boolean {
  if (eventBuffIds) {
    return eventBuffIds.has(id);
  }
  return isBuffActiveOnTarget(buffLookup, id, timestamp, sourceID);
}

/**
 * Calculate the tooltip scaling multiplier at a specific timestamp for a damage event.
 *
 * Checks for Major/Minor Brutality/Sorcery, Major/Minor Courage, and Powerful Assault
 * on the attacker (source). Uses event.buffs snapshot as primary data source when
 * available (more reliable for attacker-side buffs), with BuffLookup as fallback.
 *
 * The total tooltip multiplier is additive across all sources:
 *   multiplier = 1 + (base_WD × total_pct_bonus% + total_flat_bonus) / tooltip_input_total
 *
 * @param buffLookup - Buff lookup data (fallback for attacker buffs)
 * @param timestamp - The timestamp of the damage event
 * @param sourceID - The attacker's ID (buffs are checked on this target)
 * @param eventBuffIds - Optional set of buff ability IDs from event.buffs snapshot (preferred source)
 * @returns TooltipScalingBreakdown with estimated multiplier and active sources
 */
export function calculateTooltipScalingAtTimestamp(
  buffLookup: BuffLookupData,
  timestamp: number,
  sourceID: number,
  eventBuffIds?: ReadonlySet<number> | null,
): TooltipScalingBreakdown {
  const buffIds = eventBuffIds ?? null;
  const activeSources: TooltipScalingSource[] = [];
  let totalPctBonus = 0; // Additive percentage bonus to WD/SD
  let totalFlatBonus = 0; // Additive flat bonus to WD/SD

  // 1. Major Brutality/Sorcery (+20% WD/SD)
  const hasMajorBrutSorc = isAnyBuffActive(
    MAJOR_BRUTALITY_SORCERY_IDS,
    buffIds,
    buffLookup,
    timestamp,
    sourceID,
  );
  const majorBrutSorcEffect = pctBonusToTooltipEffect(
    TooltipScalingValues.MAJOR_BRUTALITY_SORCERY_PCT,
  );
  activeSources.push({
    name: 'Major Brutality/Sorcery',
    abilityId: KnownAbilities.MAJOR_BRUTALITY,
    tooltipEffectPercent: majorBrutSorcEffect,
    isActive: hasMajorBrutSorc,
  });
  if (hasMajorBrutSorc) {
    totalPctBonus += TooltipScalingValues.MAJOR_BRUTALITY_SORCERY_PCT;
  }

  // 2. Minor Brutality/Sorcery (+10% WD/SD)
  const hasMinorBrutSorc = isAnyBuffActive(
    MINOR_BRUTALITY_SORCERY_IDS,
    buffIds,
    buffLookup,
    timestamp,
    sourceID,
  );
  const minorBrutSorcEffect = pctBonusToTooltipEffect(
    TooltipScalingValues.MINOR_BRUTALITY_SORCERY_PCT,
  );
  activeSources.push({
    name: 'Minor Brutality/Sorcery',
    abilityId: KnownAbilities.MINOR_BRUTALITY,
    tooltipEffectPercent: minorBrutSorcEffect,
    isActive: hasMinorBrutSorc,
  });
  if (hasMinorBrutSorc) {
    totalPctBonus += TooltipScalingValues.MINOR_BRUTALITY_SORCERY_PCT;
  }

  // 3. Major Courage (+430 flat WD/SD)
  const hasMajorCourage = isSingleBuffActive(
    KnownAbilities.MAJOR_COURAGE,
    buffIds,
    buffLookup,
    timestamp,
    sourceID,
  );
  const majorCourageEffect = flatBonusToTooltipEffect(TooltipScalingValues.MAJOR_COURAGE_FLAT);
  activeSources.push({
    name: 'Major Courage',
    abilityId: KnownAbilities.MAJOR_COURAGE,
    tooltipEffectPercent: majorCourageEffect,
    isActive: hasMajorCourage,
  });
  if (hasMajorCourage) {
    totalFlatBonus += TooltipScalingValues.MAJOR_COURAGE_FLAT;
  }

  // 4. Minor Courage (+215 flat WD/SD)
  const hasMinorCourage = isSingleBuffActive(
    KnownAbilities.MINOR_COURAGE,
    buffIds,
    buffLookup,
    timestamp,
    sourceID,
  );
  const minorCourageEffect = flatBonusToTooltipEffect(TooltipScalingValues.MINOR_COURAGE_FLAT);
  activeSources.push({
    name: 'Minor Courage',
    abilityId: KnownAbilities.MINOR_COURAGE,
    tooltipEffectPercent: minorCourageEffect,
    isActive: hasMinorCourage,
  });
  if (hasMinorCourage) {
    totalFlatBonus += TooltipScalingValues.MINOR_COURAGE_FLAT;
  }

  // 5. Powerful Assault (+307 flat WD/SD)
  const hasPowerfulAssault = isSingleBuffActive(
    KnownAbilities.POWERFUL_ASSAULT,
    buffIds,
    buffLookup,
    timestamp,
    sourceID,
  );
  const powerfulAssaultEffect = flatBonusToTooltipEffect(
    TooltipScalingValues.POWERFUL_ASSAULT_FLAT,
  );
  activeSources.push({
    name: 'Powerful Assault',
    abilityId: KnownAbilities.POWERFUL_ASSAULT,
    tooltipEffectPercent: powerfulAssaultEffect,
    isActive: hasPowerfulAssault,
  });
  if (hasPowerfulAssault) {
    totalFlatBonus += TooltipScalingValues.POWERFUL_ASSAULT_FLAT;
  }

  // Compute combined tooltip multiplier (additive model)
  // multiplier = 1 + (base_WD × total_pct% + total_flat) / tooltip_total
  const statBonusFromPct = ASSUMED_BASE_OFFENSIVE_STAT * (totalPctBonus / 100);
  const estimatedMultiplier = 1 + (statBonusFromPct + totalFlatBonus) / TOOLTIP_INPUT_TOTAL;

  return {
    hasMajorBrutalitySorcery: hasMajorBrutSorc,
    hasMinorBrutalitySorcery: hasMinorBrutSorc,
    hasMajorCourage,
    hasMinorCourage,
    hasPowerfulAssault,
    estimatedMultiplier,
    activeSources,
  };
}
