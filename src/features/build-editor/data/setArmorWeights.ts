/**
 * Set Armor Weight lookup — tells the build editor which sets are LOCKED to a
 * single armor weight in-game, so the weight chip can't be wrongly cycled.
 *
 * Game rule (verified against authoritative sources — see project memory):
 *   - Mythics, and non-craftable overland / dungeon-drop / trial-drop sets are
 *     LOCKED to one armor weight (e.g. Huntsman's Warmask = Medium, Mother's
 *     Sorrow = Light, Plague Doctor = Heavy).
 *   - Crafted sets (Hunding's Rage, Julianos, Armor Master, …) and Monster sets
 *     (head + shoulders) come in ALL THREE weights — the player chooses. These
 *     are absent from the map, so `getLockedArmorWeight` returns null = free.
 *
 * Data source: LibSets armor-types table → `setArmorWeights.generated.ts`
 * (regenerate with `node scripts/generate-set-armor-weights.mjs`).
 */

import { getItemInfo } from '../../loadout-manager/data/itemIdMap';
import type { ArmorWeight } from '../../loadout-manager/types/loadout.types';

import { LOCKED_SET_ARMOR_WEIGHTS } from './setArmorWeights.generated';

/**
 * Normalize a set name to the key form used by the generated map. MUST match
 * the normalization in `gearSetRegistry.ts` and the generator script, so that
 * runtime set names (which may carry the "Perfected " prefix or curly quotes)
 * resolve to the same key.
 */
export function normalizeSetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/[‘’]/g, "'") // curly single quotes → straight apostrophe
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The armor weight a set is locked to, or null if the set comes in multiple
 * weights (crafted / monster sets) and the user may choose freely.
 *
 * Returns null for unknown set names too — unknown sets default to free choice
 * rather than an arbitrary lock.
 */
export function getLockedArmorWeight(setName: string | null | undefined): ArmorWeight | null {
  if (!setName) return null;
  return LOCKED_SET_ARMOR_WEIGHTS[normalizeSetName(setName)] ?? null;
}

/**
 * True when a set's armor weight is fixed in-game and the weight chip should be
 * shown as a read-only badge instead of a clickable cycle control.
 */
export function isArmorWeightLocked(setName: string | null | undefined): boolean {
  return getLockedArmorWeight(setName) !== null;
}

/**
 * Resolve the armor weight an equipped APPAREL piece counts as — the single
 * source of truth shared by stat counting and CSPS export so they never
 * disagree with what the picker displays.
 *
 * A set that only exists in one weight in-game (mythic / overland / dungeon /
 * trial drop) is AUTHORITATIVE — its locked weight wins even over a stored
 * `storedWeight`, because imported/CSPS gear often carries no weight (the
 * importer writes only id/trait/enchant) or a stale value. Falls back to the
 * stored weight, then to 'heavy' (ESO's default when nothing else is known).
 */
export function resolveApparelWeight(
  id: string | number | null | undefined,
  storedWeight?: ArmorWeight,
): ArmorWeight {
  const numericId = typeof id === 'number' ? id : Number(id);
  if (Number.isFinite(numericId) && numericId > 0) {
    const locked = getLockedArmorWeight(getItemInfo(numericId)?.setName);
    if (locked) return locked;
  }
  return storedWeight ?? 'heavy';
}

/** ESO ArmorType numeric code for an armor weight (LIGHT=1, MEDIUM=2, HEAVY=3). */
export const ARMOR_WEIGHT_TO_ESO_TYPE: Readonly<Record<ArmorWeight, number>> = {
  light: 1,
  medium: 2,
  heavy: 3,
};

/**
 * Inverse of ARMOR_WEIGHT_TO_ESO_TYPE — maps an ESO armor-type code back to an
 * armor weight, or null for 0/unknown (no armor weight). Used by CSPS import so
 * a serialized weight round-trips back into GearPiece.weight.
 */
export function esoTypeToArmorWeight(type: number | null | undefined): ArmorWeight | null {
  switch (type) {
    case 1:
      return 'light';
    case 2:
      return 'medium';
    case 3:
      return 'heavy';
    default:
      return null;
  }
}
