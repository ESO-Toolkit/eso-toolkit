/**
 * Utilities for analyzing player gear and armor
 */

import { ArmorType, PlayerGear } from '../types/playerDetails';

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

    switch (g.type) {
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
