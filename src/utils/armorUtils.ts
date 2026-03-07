/**
 * Utilities for analyzing player gear and armor
 */

import { ArmorType, GearType, PlayerGear } from '../types/playerDetails';

/**
 * Corrections for items where ESOLogs source data reports the wrong armor weight.
 * Maps item ID → correct ArmorType.
 */
const ARMOR_TYPE_CORRECTIONS: Record<number, ArmorType> = {
  // Huntsman's Warmask is medium armor but ESOLogs reports it as light.
  // https://bkrupa.atlassian.net/browse/ESO-667
  223189: ArmorType.MEDIUM,
};

/**
 * Returns the correct armor type for a gear item, applying any known corrections
 * for items where ESOLogs source data has an incorrect armor weight.
 */
export function resolveArmorType(item: PlayerGear): GearType {
  return ARMOR_TYPE_CORRECTIONS[item.id] ?? item.type;
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
