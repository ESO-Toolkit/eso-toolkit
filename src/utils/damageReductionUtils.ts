import { wardenData } from '../data/skillsets/warden';
import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { KnownAbilities, KnownSetIDs } from '../types/abilities';
import { CombatantInfoEvent } from '../types/combatlogEvents';
import { ArmorType, GearSlot, GearTrait, PlayerGear, WeaponType } from '../types/playerDetails';

import { BuffLookupData, isBuffActiveOnTarget } from './BuffLookupUtils';
import { ItemQuality } from './gearUtilities';

/**
 * Calculate dynamic damage reduction from buffs and debuffs at a specific timestamp for a specific player
 * These are sources that change during combat
 */
export function calculateDynamicDamageReductionAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  timestamp: number,
  playerId: number
): number {
  let buffResistance = 0;
  let debuffResistance = 0;

  for (const source of DAMAGE_REDUCTION_SOURCES) {
    let isActive = false;

    switch (source.source) {
      case 'buff':
        isActive = isBuffActiveOnTarget(buffLookup, source.ability, timestamp, playerId);
        if (isActive) {
          buffResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      case 'debuff':
        isActive = isBuffActiveOnTarget(debuffLookup, source.ability, timestamp, playerId);
        if (isActive) {
          debuffResistance += getSourceResistanceValue({ ...source, isActive: true });
        }
        break;
      // Skip static sources - these are calculated once
    }
  }

  return buffResistance + debuffResistance;
}

export const MAX_RESISTANCE = 33000; // 33,000 resistance = 50% damage reduction (soft cap)

// ESO damage reduction constants
export const RESISTANCE_TO_DAMAGE_REDUCTION_RATIO = 660; // 660 resistance = 1% damage reduction

const ARMOR_GOLD_QUALITY_BONUS_MULTIPLIER = Object.freeze<Record<ItemQuality, number>>({
  [ItemQuality.LEGENDARY]: 1,
  [ItemQuality.EPIC]: 1.0357,
  [ItemQuality.RARE]: 1.0611,
  [ItemQuality.UNCOMMON]: 1.1017,
  [ItemQuality.COMMON]: 1.1454,
});

const REINFORCED_MULTIPLIER = Object.freeze<Record<ItemQuality, number>>({
  [ItemQuality.LEGENDARY]: 1.16,
  [ItemQuality.EPIC]: 1.15,
  [ItemQuality.RARE]: 1.14,
  [ItemQuality.UNCOMMON]: 1.13,
  [ItemQuality.COMMON]: 1.12,
});

// Common resistance values in ESO
export const ResistanceValues = Object.freeze<Record<string, number>>({
  AEGIS_OF_THE_UNSEEN: 3271,
  BULWARK: 1900, // Bulwark (Champion Point)
  FORTIFIED: 1731, // Fortified (Champion Point)
  FROZEN_ARMOR_PER_ABILITY: 1240, // Frozen Armor: +1240 resistance per Winter's Embrace ability slotted
  MAJOR_RESOLVE: 5948, // Major Resolve/Ward buff
  MINOR_RESOLVE: 2974, // Minor Resolve/Ward buff
  RESOLVE: 343.2, // Resolve (Heavy Armor passive per piece)
  RUNIC_SUNDER: 2200,

  // Armor piece resistance values
  HEAVY_CHEST: 2772, // Heavy armor chest piece
  HEAVY_FEET: 2425, // Heavy armor foot piece
  HEAVY_HANDS: 1386, // Heavy armor hand piece
  HEAVY_HEAD: 2425,
  HEAVY_LEGS: 2425, // Heavy armor leg piece
  HEAVY_SHOULDERS: 2425,
  HEAVY_WAIST: 1039, // Heavy armor waist piece
  LIGHT_CHEST: 1396,
  LIGHT_FEET: 1221, // Light armor foot piece
  LIGHT_HANDS: 698,
  LIGHT_HEAD: 1221, // Light armor head piece
  LIGHT_LEGS: 1221, // Light armor leg piece
  LIGHT_SHOULDERS: 1221, // Light armor shoulder piece
  LIGHT_WAIST: 523,
  MEDIUM_CHEST: 2084,
  MEDIUM_FEET: 1823,
  MEDIUM_HANDS: 1042,
  MEDIUM_HEAD: 1823, // Medium armor head piece
  MEDIUM_LEGS: 1823, // Medium armor leg piece
  MEDIUM_SHOULDERS: 1823,
  MEDIUM_WAIST: 781,
  // Add more as needed
});

interface BaseDamageReductionSource {
  name: string;
  description: string;
}

export interface DamageReductionAuraSource extends BaseDamageReductionSource {
  resistanceValue: number;
  ability: KnownAbilities;
  source: 'aura';
}

export interface DamageReductionGearSource extends BaseDamageReductionSource {
  resistanceValue: number;
  set: KnownSetIDs;
  numberOfPieces: number;
  source: 'gear';
}

export interface DamageReductionBuffSource extends BaseDamageReductionSource {
  resistanceValue: number;
  ability: KnownAbilities;
  source: 'buff';
}

export interface DamageReductionDebuffSource extends BaseDamageReductionSource {
  resistanceValue: number;
  ability: KnownAbilities;
  source: 'debuff';
}

export enum ComputedDamageReductionSources {
  ARMOR_RESISTANCE,
  HEAVY_ARMOR_RESOLVE,
  FORTIFIED,
  FROZEN_ARMOR,
  AEGIS_OF_THE_UNSEEN,
  BULWARK,
  // Add more computed sources as needed
}

export interface DamageReductionComputedSource extends BaseDamageReductionSource {
  key: ComputedDamageReductionSources;
  source: 'computed';
}

export interface DamageReductionNotImplementedSource extends BaseDamageReductionSource {
  source: 'not_implemented';
}

export type DamageReductionSource =
  | DamageReductionAuraSource
  | DamageReductionGearSource
  | DamageReductionBuffSource
  | DamageReductionDebuffSource
  | DamageReductionComputedSource
  | DamageReductionNotImplementedSource;

export type DamageReductionSourceWithActiveState = DamageReductionSource & { isActive: boolean };

export const DAMAGE_REDUCTION_SOURCES = Object.freeze<DamageReductionSource[]>([
  {
    key: ComputedDamageReductionSources.ARMOR_RESISTANCE,
    name: 'Armor Resistance',
    description: 'Base resistance from equipped armor pieces',
    source: 'computed',
  },
  {
    key: ComputedDamageReductionSources.HEAVY_ARMOR_RESOLVE,
    name: 'Resolve',
    description: 'Heavy Armor passive: +343 Physical and Spell Resistance per piece',
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
  {
    key: ComputedDamageReductionSources.BULWARK,
    source: 'computed',
    name: 'Bulwark',
    description:
      'Bulwark Champion Point: While you have a Shield or Frost Staff equipped, your Spell and Physical Resistance is increased by 1900.',
  },
  {
    key: ComputedDamageReductionSources.FORTIFIED,
    source: 'computed',
    name: 'Fortified',
    description: 'Fortified Champion Point: +1731 Armor, assumed always active',
  },
  {
    key: ComputedDamageReductionSources.FROZEN_ARMOR,
    source: 'computed',
    name: 'Frozen Armor',
    description: "Increases resistance by 1240 for every Winter's Embrace ability slotted",
  },
  {
    key: ComputedDamageReductionSources.AEGIS_OF_THE_UNSEEN,
    source: 'computed',
    name: 'Aegis of the Unseen',
    description: 'Grants 3271 armor while any arcanist ability is active',
  },

  {
    ability: KnownAbilities.RUNIC_SUNDER_BUFF,
    resistanceValue: ResistanceValues.RUNIC_SUNDER,
    name: 'Runic Sunder',
    description: 'Runic Sunder: +2200 armor while active',
    source: 'buff',
  },
  // Note: Additional damage reduction sources are not yet fully implemented, including:
  // - Major/Minor Protection buffs (-10%/-5% damage taken)
  // - Gear set bonuses (Ebon Armory, Fortified Brass, etc.)
  // - Block damage reduction while actively blocking
  // - Class-specific damage shields and mitigation abilities
  // - Champion Point investments beyond Bulwark
  // - Debuff immunities and resistances
] as DamageReductionSource[]);

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
        let itemResist = getBaseArmorResistance(armorPiece, slotIndex);

        itemResist = Math.floor(
          itemResist / ARMOR_GOLD_QUALITY_BONUS_MULTIPLIER[armorPiece.quality]
        );

        if (armorPiece.trait === GearTrait.REINFORCED) {
          itemResist = Math.floor(itemResist * REINFORCED_MULTIPLIER[armorPiece.quality]);
        }

        totalResistance += itemResist;
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
  playerData: PlayerDetailsWithRole
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
  source: DamageReductionComputedSource | DamageReductionNotImplementedSource,
  playerData: PlayerDetailsWithRole
): boolean {
  if (source.source === 'not_implemented') {
    return false;
  }

  switch (source.key) {
    case ComputedDamageReductionSources.ARMOR_RESISTANCE:
      // Armor resistance is always active if player has armor equipped
      return combatantInfo !== null && combatantInfo.gear !== null;
    case ComputedDamageReductionSources.HEAVY_ARMOR_RESOLVE:
      // Active if player has heavy armor pieces
      return countHeavyArmorPieces(combatantInfo) > 0;
    case ComputedDamageReductionSources.FORTIFIED:
      // Fortified champion point - assume always active
      return true;
    case ComputedDamageReductionSources.FROZEN_ARMOR:
      return isAuraActive(combatantInfo, KnownAbilities.FROZEN_ARMOR);
    case ComputedDamageReductionSources.AEGIS_OF_THE_UNSEEN:
      return isAuraActive(combatantInfo, KnownAbilities.AEGIS_OF_THE_UNSEEN);
    case ComputedDamageReductionSources.BULWARK:
      return hasShieldOrFrostStaff(combatantInfo);
    default:
      return false;
  }
}

/**
 * Get resistance value from a computed damage reduction source
 */
export function getResistanceFromComputedSource(
  source: DamageReductionComputedSource | DamageReductionNotImplementedSource,
  combatantInfo: CombatantInfoEvent | null,
  playerData: PlayerDetailsWithRole
): number {
  if (source.source === 'not_implemented') {
    return 0;
  }

  switch (source.key) {
    case ComputedDamageReductionSources.ARMOR_RESISTANCE:
      return calculateArmorResistance(combatantInfo);
    case ComputedDamageReductionSources.HEAVY_ARMOR_RESOLVE:
      // Resolve provides 343 resistance per piece of heavy armor
      return countHeavyArmorPieces(combatantInfo) * ResistanceValues.RESOLVE;
    case ComputedDamageReductionSources.FORTIFIED:
      return ResistanceValues.FORTIFIED;
    case ComputedDamageReductionSources.FROZEN_ARMOR:
      // Calculate resistance based on Winter's Embrace abilities slotted
      return countWintersEmbraceAbilities(playerData) * ResistanceValues.FROZEN_ARMOR_PER_ABILITY;
    case ComputedDamageReductionSources.AEGIS_OF_THE_UNSEEN:
      // Returns 3271 armor if any arcanist ability is active, otherwise 0
      return ResistanceValues.AEGIS_OF_THE_UNSEEN; // Using literal value due to enum corruption issue
    case ComputedDamageReductionSources.BULWARK:
      return ResistanceValues.BULWARK;
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

/**
 * Helper function to count Winter's Embrace abilities slotted
 * TODO: Implement proper detection of Winter's Embrace abilities from player data
 */
function countWintersEmbraceAbilities(playerData: PlayerDetailsWithRole): number {
  if (!playerData) return 0;

  const wardenAbilities = playerData.combatantInfo.talents.slice(0, 6).filter((t) =>
    Object.values(wardenData.skillLines.wintersEmbrace.activeAbilities || {})
      .flatMap((ability) => {
        return [ability, ...(ability.morphs ? Object.values(ability.morphs) : [])];
      })
      .some((a) => a?.name === t.name)
  );
  return wardenAbilities.length;
}

/**
 * Helper function to check if player has a shield or frost staff equipped
 * Bulwark Champion Point provides 1900 resistance while either is equipped
 */
function hasShieldOrFrostStaff(combatantInfo: CombatantInfoEvent | null): boolean {
  if (!combatantInfo || !combatantInfo.gear) return false;

  const weaponSlots = [
    GearSlot.MAIN_HAND,
    GearSlot.OFF_HAND,
    GearSlot.BACKUP_MAIN_HAND,
    GearSlot.BACKUP_OFF_HAND,
  ];

  for (const slotIndex of weaponSlots) {
    if (slotIndex < combatantInfo.gear.length) {
      const weapon = combatantInfo.gear[slotIndex];
      if (weapon && (weapon.type === WeaponType.SHIELD || weapon.type === WeaponType.FROST_STAFF)) {
        return true;
      }
    }
  }

  return false;
}
