import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { KnownAbilities, KnownSetIDs } from '../types/abilities';
import { CombatantInfoEvent } from '../types/combatlogEvents';
import { ArmorType, GearSlot, PlayerGear } from '../types/playerDetails';

import { BuffLookupData, isBuffActive } from './BuffLookupUtils';

export const MAX_RESISTANCE = 33000; // 33,000 resistance = 50% damage reduction (soft cap)

// ESO damage reduction constants
export const RESISTANCE_TO_DAMAGE_REDUCTION_RATIO = 660; // 660 resistance = 1% damage reduction

// Common resistance values in ESO
export enum ResistanceValues {
  MAJOR_RESOLVE = 5948, // Major Resolve/Ward buff
  MINOR_RESOLVE = 2974, // Minor Resolve/Ward buff
  ARMOR_FOCUS = 3960, // Armor Focus (Heavy Armor passive)
  CONSTITUTION = 1320, // Constitution (Heavy Armor passive per piece)

  // Armor piece resistance values
  HEAVY_CHEST = 2772, // Heavy armor chest piece
  HEAVY_FEET = 2425, // Heavy armor foot piece
  HEAVY_HANDS = 1386, // Heavy armor hand piece
  HEAVY_HEAD = 2425,
  HEAVY_LEGS = 2425, // Heavy armor leg piece
  HEAVY_SHOULDERS = 2425,
  HEAVY_WAIST = 1039, // Heavy armor waist piece
  LIGHT_CHEST = 1396,
  LIGHT_FEET = 1221, // Light armor foot piece
  LIGHT_HANDS = 698,
  LIGHT_HEAD = 1221, // Light armor head piece
  LIGHT_LEGS = 1221, // Light armor leg piece
  LIGHT_SHOULDERS = 1221, // Light armor shoulder piece
  LIGHT_WAIST = 523,
  MEDIUM_CHEST = 2084,
  MEDIUM_FEET = 1823,
  MEDIUM_HANDS = 1042,
  MEDIUM_HEAD = 1823, // Medium armor head piece
  MEDIUM_LEGS = 1823, // Medium armor leg piece
  MEDIUM_SHOULDERS = 1823,
  MEDIUM_WAIST = 781,
  // Add more as needed
}

interface BaseDamageReductionSource {
  name: string;
  description: string;
}

export interface DamageReductionAuraSource extends BaseDamageReductionSource {
  resistanceValue: ResistanceValues;
  ability: KnownAbilities;
  source: 'aura';
}

export interface DamageReductionGearSource extends BaseDamageReductionSource {
  resistanceValue: ResistanceValues | number;
  set: KnownSetIDs;
  numberOfPieces: number;
  source: 'gear';
}

export interface DamageReductionBuffSource extends BaseDamageReductionSource {
  resistanceValue: ResistanceValues;
  ability: KnownAbilities;
  source: 'buff';
}

export interface DamageReductionDebuffSource extends BaseDamageReductionSource {
  resistanceValue: ResistanceValues;
  ability: KnownAbilities;
  source: 'debuff';
}

export enum ComputedDamageReductionSources {
  ARMOR_RESISTANCE,
  HEAVY_ARMOR_CONSTITUTION,
  ARMOR_FOCUS,
  CHAMPION_POINTS_RESISTANCE,
  RACIAL_RESISTANCE,
  BLOCK_MITIGATION,
  // Add more computed sources as needed
}

export interface DamageReductionComputedSource extends BaseDamageReductionSource {
  key: ComputedDamageReductionSources;
  source: 'computed';
}

export type DamageReductionSource =
  | DamageReductionAuraSource
  | DamageReductionGearSource
  | DamageReductionBuffSource
  | DamageReductionDebuffSource
  | DamageReductionComputedSource;

export type DamageReductionSourceWithActiveState = DamageReductionSource & { isActive: boolean };

export const DAMAGE_REDUCTION_SOURCES = Object.freeze<DamageReductionSource[]>([
  {
    key: ComputedDamageReductionSources.ARMOR_RESISTANCE,
    name: 'Armor Resistance',
    description: 'Base resistance from equipped armor pieces',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.HEAVY_ARMOR_CONSTITUTION,
    name: 'Constitution',
    description: 'Heavy Armor passive: +1320 Physical and Spell Resistance per piece',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.ARMOR_FOCUS,
    name: 'Armor Focus',
    description: 'Heavy Armor passive: +3960 Physical and Spell Resistance when 5+ pieces equipped',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.CHAMPION_POINTS_RESISTANCE,
    name: 'Champion Point Resistance',
    description: 'Resistance bonuses from Champion Points - [NOT FULLY IMPLEMENTED]',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.RACIAL_RESISTANCE,
    name: 'Racial Resistance',
    description: 'Resistance bonuses from racial passives - [NOT FULLY IMPLEMENTED]',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.BLOCK_MITIGATION,
    name: 'Block Mitigation',
    description: 'Damage reduction from actively blocking - [NOT FULLY IMPLEMENTED]',
    source: 'computed',
  },
  {
    ability: KnownAbilities.MAJOR_RESOLVE,
    resistanceValue: ResistanceValues.MAJOR_RESOLVE,
    name: 'Major Resolve',
    description: 'Major Resolve buff: +5948 Physical and Spell Resistance (Generic)',
    source: 'buff',
  },
  {
    ability: KnownAbilities.MINOR_RESOLVE,
    resistanceValue: ResistanceValues.MINOR_RESOLVE,
    name: 'Minor Resolve',
    description: 'Minor Resolve buff: +2974 Physical and Spell Resistance',
    source: 'buff',
  },
]);

/**
 * Contains all damage reduction data for a specific player at a point in time
 * All values are in resistance units, convert to percentage in the view layer
 */
export interface PlayerDamageReductionSnapshot {
  playerId: number;
  playerName: string;
  timestamp: number;
  sources: DamageReductionSourceWithActiveState[];
  totalResistance: number;
  staticResistance: number;
  dynamicResistance: number;
}

/**
 * Convert resistance value to damage reduction percentage
 * ESO uses a diminishing returns formula, not linear
 * Formula: Damage Reduction % = Resistance / (Resistance + 33000) * 100
 * This gives: 33000 resistance = 50% damage reduction (soft cap)
 */
export function resistanceToDamageReduction(resistance: number): number {
  if (resistance <= 0) return 0;

  // Cap resistance at the maximum effective value
  const cappedResistance = Math.min(MAX_RESISTANCE, resistance);

  return Math.min(50, cappedResistance / RESISTANCE_TO_DAMAGE_REDUCTION_RATIO); // Cap at 50% as per ESO mechanics
}

/**
 * Get resistance value from a damage reduction source
 */
export function getSourceResistanceValue(source: DamageReductionSourceWithActiveState): number {
  if ('resistanceValue' in source) {
    return source.resistanceValue;
  }
  return 0; // Computed sources that don't have a direct resistance value
}

/**
 * Calculate total armor resistance from equipped armor pieces
 * Uses the actual resistance values provided by the user
 */
export function calculateArmorResistance(combatantInfo: CombatantInfoEvent | null): number {
  if (!combatantInfo || !combatantInfo.gear) return 0;

  let totalResistance = 0;

  // Armor slots that provide resistance (excluding jewelry and weapons)
  const armorSlots = [
    GearSlot.HEAD,
    GearSlot.CHEST,
    GearSlot.SHOULDERS,
    GearSlot.WAIST,
    GearSlot.HANDS,
    GearSlot.LEGS,
    GearSlot.FEET,
  ];

  armorSlots.forEach((slotIndex) => {
    if (slotIndex < combatantInfo.gear.length) {
      const armorPiece = combatantInfo.gear[slotIndex];
      if (armorPiece && armorPiece.id !== 0) {
        // Add base resistance based on armor type and slot
        totalResistance += getBaseArmorResistance(armorPiece, slotIndex);
      }
    }
  });

  return totalResistance;
}

/**
 * Get base resistance value for an armor piece based on type and slot
 * Uses the real values provided by the user
 */
function getBaseArmorResistance(armorPiece: PlayerGear, slot: GearSlot): number {
  // Use the actual resistance values provided
  if (armorPiece.type === ArmorType.HEAVY) {
    switch (slot) {
      case GearSlot.CHEST:
        return ResistanceValues.HEAVY_CHEST; // 2772
      case GearSlot.LEGS:
        return ResistanceValues.HEAVY_LEGS; // 2425
      case GearSlot.HANDS:
        return ResistanceValues.HEAVY_HANDS; // 1386
      case GearSlot.WAIST:
        return ResistanceValues.HEAVY_WAIST; // 1039
      case GearSlot.FEET:
        return ResistanceValues.HEAVY_FEET; // 2425
      // For heavy pieces we don't have specific values for, use a reasonable estimate
      case GearSlot.HEAD:
        return ResistanceValues.HEAVY_HEAD;
      case GearSlot.SHOULDERS:
        return ResistanceValues.HEAVY_SHOULDERS;
      default:
        return 0;
    }
  } else if (armorPiece.type === ArmorType.MEDIUM) {
    switch (slot) {
      case GearSlot.HEAD:
        return ResistanceValues.MEDIUM_HEAD; // 1823
      // For other medium pieces, use proportional estimates
      case GearSlot.CHEST:
        return ResistanceValues.MEDIUM_CHEST;
      case GearSlot.LEGS:
        return ResistanceValues.MEDIUM_LEGS;
      case GearSlot.HANDS:
        return ResistanceValues.MEDIUM_HANDS;
      case GearSlot.WAIST:
        return ResistanceValues.MEDIUM_WAIST;
      case GearSlot.FEET:
        return ResistanceValues.MEDIUM_FEET;
      case GearSlot.SHOULDERS:
        return ResistanceValues.MEDIUM_SHOULDERS;
      default:
        return 0;
    }
  } else if (armorPiece.type === ArmorType.LIGHT) {
    switch (slot) {
      case GearSlot.SHOULDERS:
        return ResistanceValues.LIGHT_SHOULDERS; // 1221
      // For other light pieces, use proportional estimates
      case GearSlot.CHEST:
        return ResistanceValues.LIGHT_CHEST;
      case GearSlot.LEGS:
        return ResistanceValues.LIGHT_LEGS;
      case GearSlot.HANDS:
        return ResistanceValues.LIGHT_HANDS;
      case GearSlot.WAIST:
        return ResistanceValues.LIGHT_WAIST;
      case GearSlot.FEET:
        return ResistanceValues.LIGHT_FEET;
      case GearSlot.HEAD:
        return ResistanceValues.LIGHT_HEAD;
      default:
        return 0;
    }
  }

  return 0; // Jewelry or unknown type
}

/**
 * Calculate static damage reduction resistance for a player (gear, passive skills, etc.)
 * These are sources that don't change during combat
 */
export function calculateStaticResistanceValue(
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined
): number {
  const baseResistance = 0; // Base resistance value

  let gearResistance = 0;
  let auraResistance = 0;
  let computedResistance = 0;

  for (const source of DAMAGE_REDUCTION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'aura':
        isActive = isAuraActive(combatantInfo, source.ability);
        if (isActive) {
          auraResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      case 'gear':
        isActive = isGearSourceActive(combatantInfo, source.set, source.numberOfPieces);
        if (isActive) {
          gearResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      case 'computed':
        isActive = isComputedSourceActive(combatantInfo, source, playerData);
        if (isActive) {
          computedResistance += getResistanceFromComputedSource(source, combatantInfo, playerData);
        }
        break;
      // Skip buff and debuff sources - these are dynamic
    }
  }

  return baseResistance + gearResistance + auraResistance + computedResistance;
}

/**
 * Calculate dynamic damage reduction resistance at a specific timestamp (buffs, debuffs)
 * These are sources that change during combat
 */
export function calculateDynamicDamageReductionAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  timestamp: number
): number {
  let buffResistance = 0;
  let debuffResistance = 0;

  for (const source of DAMAGE_REDUCTION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'buff':
        isActive = isBuffActive(buffLookup, source.ability, timestamp);
        if (isActive) {
          buffResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      case 'debuff':
        isActive = isBuffActive(debuffLookup, source.ability, timestamp);
        if (isActive) {
          debuffResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      // Skip static sources - these are calculated once
    }
  }

  return buffResistance + debuffResistance;
}

/**
 * Helper function to check if an aura is active for damage reduction
 */
export function isAuraActive(
  combatantInfo: CombatantInfoEvent | null,
  abilityId: KnownAbilities
): boolean {
  if (!combatantInfo || !combatantInfo.auras) return false;
  return combatantInfo.auras.some((aura) => aura.ability === abilityId);
}

/**
 * Helper function to check if a gear set source is active
 */
export function isGearSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  setId: KnownSetIDs,
  numberOfPieces: number
): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;
  // Count gear pieces with matching set ID
  let gearCount = 0;
  for (const gearPiece of combatantInfo.gear) {
    if (gearPiece && gearPiece.setID === setId) {
      gearCount++;
    }
  }
  return gearCount >= numberOfPieces;
}

/**
 * Helper function to check if a computed source is active
 */
export function isComputedSourceActive(
  combatantInfo: CombatantInfoEvent | null,
  source: DamageReductionComputedSource,
  playerData: PlayerDetailsWithRole | undefined
): boolean {
  switch (source.key) {
    case ComputedDamageReductionSources.ARMOR_RESISTANCE:
      // Armor resistance is always active if player has armor equipped
      return combatantInfo !== null && combatantInfo.gear !== null;
    case ComputedDamageReductionSources.HEAVY_ARMOR_CONSTITUTION:
      // Active if player has heavy armor pieces
      return countHeavyArmorPieces(combatantInfo) > 0;
    case ComputedDamageReductionSources.ARMOR_FOCUS:
      // Active if player has 5+ pieces of heavy armor
      return countHeavyArmorPieces(combatantInfo) >= 5;
    case ComputedDamageReductionSources.CHAMPION_POINTS_RESISTANCE:
      // Champion points resistance - would need implementation
      return false; // Placeholder
    case ComputedDamageReductionSources.RACIAL_RESISTANCE:
      // Racial resistance - would need racial data
      return false; // Placeholder
    case ComputedDamageReductionSources.BLOCK_MITIGATION:
      // Block mitigation - complex to implement
      return false; // Placeholder
    default:
      return false;
  }
}

/**
 * Get resistance value from a computed damage reduction source
 */
export function getResistanceFromComputedSource(
  source: DamageReductionComputedSource,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole | undefined
): number {
  switch (source.key) {
    case ComputedDamageReductionSources.ARMOR_RESISTANCE:
      return calculateArmorResistance(combatantInfo);
    case ComputedDamageReductionSources.HEAVY_ARMOR_CONSTITUTION:
      // Constitution provides 1320 resistance per piece of heavy armor
      return countHeavyArmorPieces(combatantInfo) * ResistanceValues.CONSTITUTION;
    case ComputedDamageReductionSources.ARMOR_FOCUS:
      // Armor Focus provides 3960 resistance with 5+ pieces of heavy armor
      return countHeavyArmorPieces(combatantInfo) >= 5 ? ResistanceValues.ARMOR_FOCUS : 0;
    case ComputedDamageReductionSources.CHAMPION_POINTS_RESISTANCE:
      // Would need champion points data
      return 0; // Placeholder
    case ComputedDamageReductionSources.RACIAL_RESISTANCE:
      // Would need racial data
      return 0; // Placeholder
    case ComputedDamageReductionSources.BLOCK_MITIGATION:
      // Would need block state data
      return 0; // Placeholder
    default:
      return 0;
  }
}

/**
 * Helper function to count heavy armor pieces
 */
function countHeavyArmorPieces(combatantInfo: CombatantInfoEvent | null): number {
  if (!combatantInfo || !combatantInfo.gear) return 0;

  let count = 0;
  const armorSlots = [
    GearSlot.HEAD,
    GearSlot.CHEST,
    GearSlot.SHOULDERS,
    GearSlot.WAIST,
    GearSlot.HANDS,
    GearSlot.LEGS,
    GearSlot.FEET,
  ];

  armorSlots.forEach((slotIndex) => {
    if (slotIndex < combatantInfo.gear.length) {
      const armorPiece = combatantInfo.gear[slotIndex];
      if (armorPiece && armorPiece.type === ArmorType.HEAVY) {
        count++;
      }
    }
  });

  return count;
}
