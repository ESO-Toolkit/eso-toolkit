/**
 * Utilities for detecting and classifying ESO combat potion types.
 *
 * Detection uses a multi-stage strategy:
 *   1. Specific aura IDs that are exclusively from potions (most accurate).
 *   2. Aura name patterns for well-known buff combos (e.g. Major Brutality +
 *      Major Savagery for Weapon Power Potions).
 *
 * This mirrors the approach used by BTV Tools.
 */

import { MAGICKA_POTION_RESTORE_EFFECT, STAMINA_POTION_RESTORE_EFFECT } from '../types/abilities';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type PotionType =
  | 'tri-stat'
  | 'weapon-power'
  | 'spell-power'
  | 'magicka'
  | 'stamina'
  | 'health'
  | 'unknown'
  | 'none';

// --------------------------------------------------------------------------
// Major Heroism aura IDs (appear when a Tri-Stat / Heroism potion is used).
// This buff is provided by a small number of sources; its presence alongside
// potionUse > 0 is a strong signal.
// --------------------------------------------------------------------------
const MAJOR_HEROISM_IDS = new Set([
  61709, 63705, 63707, 65133, 87234, 92775, 94165, 94172, 94179, 111377, 111380, 150974, 193747,
  194148, 194149, 213946, 236448,
]);

// --------------------------------------------------------------------------
// Detection helpers
// --------------------------------------------------------------------------

/** Returns true when ANY of the provided IDs appear in the aura list. */
function hasAuraById(
  auras: Array<{ name: string; id: number }>,
  idSet: ReadonlySet<number>,
): boolean {
  return auras.some((a) => idSet.has(a.id));
}

/** Returns true when the aura list contains an entry whose name matches the pattern. */
function hasAuraByName(auras: Array<{ name: string; id: number }>, nameRegexp: RegExp): boolean {
  return auras.some((a) => nameRegexp.test(a.name ?? ''));
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Detects what type of combat potion a player used based on their aura list.
 *
 * When `potionUse` is 0 the function returns `'none'` immediately.  When a
 * type cannot be determined from the auras `'unknown'` is returned.
 *
 * @param auras     - The player's aura list from the WCL payload.
 * @param potionUse - Number of potions used (from `PlayerDetailsEntry.potionUse`).
 */
export function detectPotionType(
  auras: Array<{ name: string; id: number; stacks?: number }> | undefined,
  potionUse: number,
): PotionType {
  if (potionUse === 0) return 'none';
  if (!auras || auras.length === 0) return 'unknown';

  // --- Stage 1: exclusive IDs (highest confidence) -------------------------

  // Stamina Potion Restore Effect (ID 6119)
  if (hasAuraById(auras, STAMINA_POTION_RESTORE_EFFECT)) return 'stamina';

  // Magicka Potion Restore Effect (ID 6118)
  if (hasAuraById(auras, MAGICKA_POTION_RESTORE_EFFECT)) return 'magicka';

  // Major Heroism → Tri-Stat / Heroism potion
  if (hasAuraById(auras, MAJOR_HEROISM_IDS) || hasAuraByName(auras, /^Major Heroism$/i)) {
    return 'tri-stat';
  }

  // --- Stage 2: well-known buff combos (good confidence) ------------------

  const hasMajorBrutality = hasAuraByName(auras, /^Major Brutality$/i);
  const hasMajorSavagery = hasAuraByName(auras, /^Major Savagery$/i);
  if (hasMajorBrutality && hasMajorSavagery) return 'weapon-power';

  const hasMajorSorcery = hasAuraByName(auras, /^Major Sorcery$/i);
  const hasMajorProphecy = hasAuraByName(auras, /^Major Prophecy$/i);
  if (hasMajorSorcery && hasMajorProphecy) return 'spell-power';

  // --- Stage 3: single-buff name patterns (lower confidence) ---------------

  if (hasAuraByName(auras, /stamina.?potion|restore.?stamina.*potion/i)) return 'stamina';
  if (hasAuraByName(auras, /magicka.?potion|restore.?magicka.*potion/i)) return 'magicka';
  if (hasAuraByName(auras, /health.?potion|restore.?health.*potion/i)) return 'health';

  // Potions were used but we couldn't classify the type from the aura data.
  return 'unknown';
}

// --------------------------------------------------------------------------
// Display helpers
// --------------------------------------------------------------------------

/**
 * Returns a short (≤5 char) display label for the potion type suitable for
 * compact UI display.
 */
export function abbreviatePotion(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return 'TRI';
    case 'weapon-power':
      return 'WPN';
    case 'spell-power':
      return 'SPL';
    case 'stamina':
      return 'STAM';
    case 'magicka':
      return 'MAG';
    case 'health':
      return 'HP';
    case 'unknown':
      return '?';
    case 'none':
      return 'NONE';
  }
}

/**
 * Returns a CSS colour string for the given potion type, consistent with the
 * palette used for food buffs in `foodDetectionUtils`.
 */
export function getPotionColor(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return '#4CAF50'; // Green – matches tri-stat food
    case 'weapon-power':
      return '#FF9800'; // Orange – physical / stamina energy
    case 'spell-power':
      return '#9C27B0'; // Purple – magic energy
    case 'stamina':
      return '#8BC34A'; // Light green – stamina
    case 'magicka':
      return '#3F51B5'; // Blue – magicka, matches magicka food
    case 'health':
      return '#F44336'; // Red – health, matches health food
    case 'unknown':
    case 'none':
      return '#888';
  }
}

/**
 * Returns a human-readable description of the potion type for tooltip display.
 */
export function describePotionType(potionType: PotionType): string {
  switch (potionType) {
    case 'tri-stat':
      return 'Tri-Stat Potion (Health, Magicka & Stamina)';
    case 'weapon-power':
      return 'Weapon Power Potion (Major Brutality & Savagery)';
    case 'spell-power':
      return 'Spell Power Potion (Major Sorcery & Prophecy)';
    case 'stamina':
      return 'Stamina Potion';
    case 'magicka':
      return 'Magicka Potion';
    case 'health':
      return 'Health Potion';
    case 'unknown':
      return 'Potion (type undetected)';
    case 'none':
      return 'No potion used';
  }
}
