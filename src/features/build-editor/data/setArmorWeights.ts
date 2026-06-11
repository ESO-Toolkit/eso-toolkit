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
