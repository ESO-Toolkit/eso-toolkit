/**
 * Gear set categorization for the leaderboard sync pipeline.
 *
 * Simplified server-side version of the client's `logToRoster.ts → categorizeSets()`.
 * Works directly with numeric setIDs instead of string display names.
 */

import type { GearItem } from './esologs-client';

// ─── Set ID Constants ────────────────────────────────────────────────────────
// Copied from src/types/roster.ts and src/types/abilities.ts.
// These are the ESO Logs `setID` values (same as the KnownSetIDs enum).

/** Monster sets (2-piece) and mythic sets (1-piece) — go in the monsterSet slot */
const MONSTER_SET_IDS = new Set([
  // Quick Assignment monster sets
  666, 578, 633, 634, 627, 687, 436, 738,
  // Tank monster sets
  577, 534,
  // Healer monster sets
  166, 576, 436, 738,
  // Flexible monster sets (Spaulder also appears here)
  627,
  // Support mythics (heal/tank)
  691, 576,
  // DPS monster sets (used as 2-piece by DPS)
  163, 168, 170, 183, 257, 266, 274, 276, 280, 350, 397, 432, 458, 479,
  534, 620, 666, 687, 738, 577, 578, 633, 634, 627,
]);

/** DPS mythic items — go in the monsterSet slot (override monster sets for DPS) */
const DPS_MYTHIC_IDS = new Set([
  596, // Death Dealer's Fete
  594, // Harpooner's Wading Kilt
  625, // Markyn Ring of Majesty
  658, // Oakensoul Ring
  575, // Ring of the Pale Order
  812, // Rakkhat's Voidmantle
  657, // Sea-Serpent's Coil
  694, // Velothi Ur-Mage's Amulet
  743, // Huntsman's Warmask
]);

/** Arena weapon sets — 2-piece sets from solo/group arenas in weapon slots */
const ARENA_WEAPON_IDS = new Set([
  // Dragonstar Arena
  310, 311, 309, 312,
  // Maelstrom Arena
  363, 373, 526, 369, 522, 533,
  // Asylum Sanctorium
  377, 378, 381,
  // Blackrose Prison
  416, 417, 418, 419, 420, 421, 422, 423,
  // Vateshran Hollows
  557, 558, 559, 560,
]);

/** 5-piece support sets — go in set1/set2 */
const SUPPORT_5PIECE_IDS = new Set([
  // Tank 5-piece
  446, 451, 571, 768, 771, 648, 651, 585, 589, 331, 769, 770, 232,
  // Healer 5-piece
  185, 391, 395, 346, 332, 496, 497, 194, 147, 455,
  // Flexible 5-piece
  649, 650, 180, 194, 331,
]);

/** Sets to exclude (training/leveling gear) */
const EXCLUDED_SET_IDS = new Set([
  815, // Armor of the Trainee
  628, // Druid's Braid
]);

// ─── Categorization ──────────────────────────────────────────────────────────

export interface CategorizedGear {
  /** Primary 5-piece set ID */
  set1?: number;
  /** Secondary 5-piece set ID */
  set2?: number;
  /** Monster or mythic set ID */
  monsterSet?: number;
  /** Arena weapon set name (display name from API) */
  arenaWeapon?: string;
  /** Any extra set IDs not fitting the above slots */
  additionalSets: number[];
}

/**
 * Categorize a player's gear into set slots.
 *
 * Counts piece occurrences per setID, then assigns:
 * - Sets with ≥5 pieces → set1/set2 (5-piece slots)
 * - Known monster/mythic IDs → monsterSet
 * - Known arena weapon IDs → arenaWeapon
 * - Everything else → additionalSets
 */
export function categorizeGear(
  gear: GearItem[],
  isDPS: boolean,
): CategorizedGear {
  // Count pieces per setID
  const counts = new Map<number, { count: number; name?: string }>();
  for (const item of gear) {
    if (!item.setID || item.setID === 0) continue;
    if (EXCLUDED_SET_IDS.has(item.setID)) continue;

    const entry = counts.get(item.setID);
    if (entry) {
      entry.count++;
    } else {
      counts.set(item.setID, { count: 1, name: item.setName ?? item.name });
    }
  }

  const result: CategorizedGear = { additionalSets: [] };
  const assigned = new Set<number>();

  // 1. Arena weapons
  for (const [setId, { name }] of counts) {
    if (ARENA_WEAPON_IDS.has(setId)) {
      result.arenaWeapon = name ?? `Arena Set ${setId}`;
      assigned.add(setId);
      break; // Only one arena weapon
    }
  }

  // 2. DPS mythics (only for DPS players)
  if (isDPS) {
    for (const [setId] of counts) {
      if (DPS_MYTHIC_IDS.has(setId) && !assigned.has(setId)) {
        result.monsterSet = setId;
        assigned.add(setId);
        break;
      }
    }
  }

  // 3. Monster sets (if no DPS mythic was assigned)
  if (!result.monsterSet) {
    for (const [setId] of counts) {
      if (MONSTER_SET_IDS.has(setId) && !assigned.has(setId)) {
        result.monsterSet = setId;
        assigned.add(setId);
        break;
      }
    }
  }

  // 4. 5-piece sets (≥5 pieces OR known support sets with ≥4 pieces)
  const fivePiece: number[] = [];
  for (const [setId, { count }] of counts) {
    if (assigned.has(setId)) continue;
    if (count >= 5 || (count >= 4 && SUPPORT_5PIECE_IDS.has(setId))) {
      fivePiece.push(setId);
      assigned.add(setId);
    }
  }
  // Sort by piece count descending to get the most-worn sets first
  fivePiece.sort((a, b) => (counts.get(b)?.count ?? 0) - (counts.get(a)?.count ?? 0));
  result.set1 = fivePiece[0];
  result.set2 = fivePiece[1];

  // 5. Remaining sets → additionalSets
  for (const [setId] of counts) {
    if (!assigned.has(setId)) {
      result.additionalSets.push(setId);
    }
  }

  return result;
}
