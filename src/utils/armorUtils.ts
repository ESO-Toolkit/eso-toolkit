/**
 * Utilities for analyzing player gear and armor
 */

import { ArmorType, GearType, PlayerGear } from '../types/playerDetails';

/**
 * Corrections for items where ESOLogs source data reports the wrong armor weight.
 * Maps item ID → correct ArmorType.
 *
 * Root cause: ESOLogs reports all mythic armor as type=1 (Light) regardless of actual
 * weight, because mythic items have no armor-weight variants in the game data.
 * Only non-light mythics need entries here; light mythics are already correct.
 * https://bkrupa.atlassian.net/browse/ESO-667
 */
const ARMOR_TYPE_CORRECTIONS: Record<number, ArmorType> = {
  165879: ArmorType.MEDIUM, // Snow Treaders (set 519) — medium feet
  165899: ArmorType.HEAVY, // Bloodlord's Embrace (set 521) — heavy chest
  175524: ArmorType.MEDIUM, // Harpooner's Wading Kilt (set 594) — medium waist
  175525: ArmorType.HEAVY, // Gaze of Sithis (set 593) — heavy head
  187655: ArmorType.HEAVY, // Dov-Rha Sabatons (set 655) — heavy feet
  187656: ArmorType.MEDIUM, // Lefthander's Aegis Belt (set 656) — medium waist
  190886: ArmorType.MEDIUM, // Faun's Lark Cladding (set 674) — medium chest
  190888: ArmorType.HEAVY, // Syrabane's Ward (set 676) — heavy waist
  194510: ArmorType.HEAVY, // Esoteric Environment Greaves (set 692) — heavy legs
  205385: ArmorType.HEAVY, // Rourken Steamguards (set 760) — heavy hands
  216236: ArmorType.MEDIUM, // Rakkhat's Voidmantle (set 812) — medium shoulders
  223189: ArmorType.MEDIUM, // Huntsman's Warmask (set 845) — medium head
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
