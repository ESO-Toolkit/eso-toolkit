/**
 * Utilities for detecting and handling ESO food and drink buffs
 */

import {
  TRI_STAT_FOOD,
  HEALTH_AND_REGEN_FOOD,
  HEALTH_FOOD,
  MAGICKA_FOOD,
  STAMINA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
} from '../types/abilities';

// Named foods (specific food items)
const NAMED_FOOD_REGEXPS: RegExp[] = [
  /Artaeum\s+Takeaway\s+Broth/i,
  /Bewitched\s+Sugar\s+Skulls/i,
  /Clockwork\s+Citrus\s+Filet/i,
  /Crown\s+Fortifying\s+Meal/i,
  /Crown\s+Vigorous\s+Tincture/i,
  /Dubious\s+Camoran\s+Throne/i,
  /Eye\s+Scream/i,
  /Ghastly\s+Eye\s+Bowl/i,
  /Jewels\s+of\s+Misrule/i,
  /Lava\s+Foot\s+Soup.*Saltrice/i,
  /Smoked\s+Bear\s+Haunch/i,
  /Witchmother.?s\s+Potent\s+Brew/i,
];

// Generic effect auras (fallback when named foods not found)
const FOOD_EFFECT_REGEXPS: RegExp[] = [
  /Increase\s+All\s+Primary\s+Stats/i,
  /Increase\s+Max\s+Health\s+&\s+Magicka/i,
  /Increase\s+Max\s+Health\s+&\s+Stamina/i,
];

/**
 * Detects food/drink buffs from player auras
 * @param auras - Array of player auras
 * @returns Food aura information or undefined if none found
 */
export function detectFoodFromAuras(
  auras?: Array<{ name: string; id: number; stacks?: number }>,
): { name: string; id: number } | undefined {
  if (!auras || auras.length === 0) return undefined;

  // First priority: Check for named foods using regex
  for (const a of auras) {
    const n = a?.name || '';
    if (NAMED_FOOD_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }

  // Second priority: Check against the known food ID sets
  for (const a of auras) {
    const id = a.id;

    if (
      TRI_STAT_FOOD.has(id) ||
      HEALTH_AND_REGEN_FOOD.has(id) ||
      HEALTH_FOOD.has(id) ||
      MAGICKA_FOOD.has(id) ||
      STAMINA_FOOD.has(id) ||
      INCREASE_MAX_HEALTH_AND_STAMINA.has(id) ||
      INCREASE_MAX_HEALTH_AND_MAGICKA.has(id)
    ) {
      return { name: a.name || '', id: a.id };
    }
  }

  // Third priority: Fallback to generic effect auras
  for (const a of auras) {
    const n = a?.name || '';
    if (FOOD_EFFECT_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }

  return undefined;
}

/**
 * Abbreviates food names for display
 * @param name - The full food name
 * @returns Abbreviated food name
 */
export function abbreviateFood(name: string): string {
  // Special named food abbreviations
  if (name.includes('Lava Foot Soup')) return 'LFSS';
  if (name.includes('Artaeum Takeaway Broth')) return 'ATB';
  if (name.includes('Bewitched Sugar Skulls')) return 'BSS';
  if (name.includes('Clockwork Citrus Filet')) return 'CCF';
  if (name.includes('Crown Fortifying Meal')) return 'CFM';
  if (name.includes('Crown Vigorous Tincture')) return 'CVT';
  if (name.includes('Dubious Camoran Throne')) return 'DCT';
  if (name.includes('Eye Scream')) return 'ES';
  if (name.includes('Ghastly Eye Bowl')) return 'GEB';
  if (name.includes('Jewels of Misrule')) return 'JOM';
  if (name.includes('Smoked Bear Haunch')) return 'SBH';
  if (name.includes('Witchmother')) return 'WPB';

  // Generic food type abbreviations
  if (name.includes('Tri-Stat')) return 'TRI';
  if (name.includes('Health') && name.includes('Regen')) return 'HRGN';
  if (name.includes('Health') && name.includes('Stamina')) return 'HSTA';
  if (name.includes('Health') && name.includes('Magicka')) return 'HMAG';
  if (name.includes('Health')) return 'HLTH';
  if (name.includes('Magicka')) return 'MAGK';
  if (name.includes('Stamina')) return 'STMN';

  // Fallback: take first letter of each word, max 4 chars
  const words = name.split(' ').filter((word) => word.length > 0);
  const abbreviation = words
    .slice(0, 4)
    .map((word) => word[0])
    .join('');
  return abbreviation.slice(0, 4).toUpperCase();
}

/**
 * Gets the color for a food type based on its ID
 * @param foodId - The food ability ID
 * @returns CSS color string
 */
export function getFoodColor(foodId?: number): string {
  if (!foodId) return '#888';
  if (TRI_STAT_FOOD.has(foodId)) return '#4CAF50'; // Green for tri-stat
  if (HEALTH_AND_REGEN_FOOD.has(foodId)) return '#FF9800'; // Orange for health+regen
  if (HEALTH_FOOD.has(foodId)) return '#F44336'; // Red for health
  if (MAGICKA_FOOD.has(foodId)) return '#3F51B5'; // Blue for magicka
  if (STAMINA_FOOD.has(foodId)) return '#4CAF50'; // Green for stamina
  if (INCREASE_MAX_HEALTH_AND_STAMINA.has(foodId)) return '#FF5722'; // Deep orange
  if (INCREASE_MAX_HEALTH_AND_MAGICKA.has(foodId)) return '#9C27B0'; // Purple
  return '#888'; // Gray for unknown
}
