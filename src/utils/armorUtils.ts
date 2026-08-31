/**
 * Utilities for analyzing player gear and armor
 */

import { ArmorType, GearSlot, PlayerGear } from '../types/playerDetails';

/**
 * Item IDs for mythic armor pieces that ESOLogs misreports as Light.
 *
 * Root cause: ESOLogs reports all mythic armor as type=1 (Light) regardless of actual
 * weight, because mythic items have no armor-weight variants in the game data.
 * https://bkrupa.atlassian.net/browse/ESO-667
 */
export enum MythicArmorId {
  SnowTreaders = 165879, // set 519 — medium feet
  BloodlordsEmbrace = 165899, // set 521 — heavy chest
  Harpooners_WadingKilt = 175524, // set 594 — medium waist
  GazeOfSithis = 175525, // set 593 — heavy head
  DovRhaSabatons = 187655, // set 655 — heavy feet
  LefthandersAegisBelt = 187656, // set 656 — medium waist
  FaunsLarkCladding = 190886, // set 674 — medium chest
  SyrabanesWard = 190888, // set 676 — heavy waist
  EsotericEnvironmentGreaves = 194510, // set 692 — heavy legs
  RourkenSteamguards = 205385, // set 760 — heavy hands
  RakkhatsVoidmantle = 216236, // set 812 — medium shoulders
  HuntsmansWarmask = 223189, // set 845 — medium head
}

/**
 * Corrections for mythic armor pieces where ESOLogs reports the wrong armor weight.
 * Only non-light mythics need entries here; light mythics are already correct.
 */
const ARMOR_TYPE_CORRECTIONS: Record<MythicArmorId, ArmorType> = {
  [MythicArmorId.SnowTreaders]: ArmorType.MEDIUM,
  [MythicArmorId.BloodlordsEmbrace]: ArmorType.HEAVY,
  [MythicArmorId.Harpooners_WadingKilt]: ArmorType.MEDIUM,
  [MythicArmorId.GazeOfSithis]: ArmorType.HEAVY,
  [MythicArmorId.DovRhaSabatons]: ArmorType.HEAVY,
  [MythicArmorId.LefthandersAegisBelt]: ArmorType.MEDIUM,
  [MythicArmorId.FaunsLarkCladding]: ArmorType.MEDIUM,
  [MythicArmorId.SyrabanesWard]: ArmorType.HEAVY,
  [MythicArmorId.EsotericEnvironmentGreaves]: ArmorType.HEAVY,
  [MythicArmorId.RourkenSteamguards]: ArmorType.HEAVY,
  [MythicArmorId.RakkhatsVoidmantle]: ArmorType.MEDIUM,
  [MythicArmorId.HuntsmansWarmask]: ArmorType.MEDIUM,
};

/**
 * Returns the correct armor type for a gear item, applying any known corrections
 * for items where ESOLogs source data has an incorrect armor weight.
 *
 * Returns a raw type code, not `GearType`: `item.type` passes through unchanged
 * for non-mythics, and logs report codes this app does not model (including 0
 * for "not reported"). Compare the result against `ArmorType` members.
 */
export function resolveArmorType(item: PlayerGear): number {
  return ARMOR_TYPE_CORRECTIONS[item.id as MythicArmorId] ?? item.type;
}

/**
 * True when a gear slot holds a body-armor piece (HEAD–FEET). Weapon slots
 * (10–13) and jewelry (7–9) are excluded.
 *
 * Weight tallies MUST gate on this because WeaponType and ArmorType share
 * numeric values (AXE=1=LIGHT, MACE=2=MEDIUM, SWORD=3=HEAVY): without a slot
 * check a 1H melee weapon's `type` is miscounted as an armor weight.
 */
export function isBodyArmorSlot(slot: number): boolean {
  return slot >= GearSlot.HEAD && slot <= GearSlot.FEET;
}

/**
 * True when a gear slot holds a weapon (MAIN_HAND–BACKUP_OFF_HAND, 10–13).
 *
 * Callers that infer a two-handed weapon from `item.type` MUST gate on this:
 * ArmorType.JEWELRY (4) shares its numeric value with WeaponType.TWO_HANDED_SWORD
 * (4), so a jewelry piece's `type` would otherwise read as a greatsword.
 */
export function isWeaponSlot(slot: number): boolean {
  return slot >= GearSlot.MAIN_HAND && slot <= GearSlot.BACKUP_OFF_HAND;
}

/**
 * Counts armor pieces by weight type
 * @param gear - Array of player gear
 * @returns Object with counts for each armor weight
 */
export function getArmorWeightCounts(gear: PlayerGear[]): {
  heavy: number;
  medium: number;
  light: number;
} {
  let heavy = 0,
    medium = 0,
    light = 0;

  for (const g of gear) {
    if (!g || g.id === 0) continue;
    if (!isBodyArmorSlot(g.slot)) continue;

    switch (resolveArmorType(g)) {
      case ArmorType.HEAVY:
        heavy += 1;
        break;
      case ArmorType.MEDIUM:
        medium += 1;
        break;
      case ArmorType.LIGHT:
        light += 1;
        break;
    }
  }

  return { heavy, medium, light };
}
