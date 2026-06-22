/**
 * Wizard's Wardrobe "Transfer" import-code generator.
 *
 * Wizard's Wardrobe (the in-game ESO addon) has a built-in Import/Export feature
 * (`WizardsWardrobeTransfer.lua`): the player right-clicks a setup slot →
 * Import → pastes a JSON string. This module turns one of the app's
 * `LoadoutSetup`s into exactly that JSON, so a build planned on the web can be
 * pasted into the game with no SavedVariables file editing.
 *
 * Transfer JSON shape (confirmed against the addon source):
 *   {
 *     name,
 *     skills: { "0": { "3..8": abilityId }, "1": { ... } },   // 0 = front, 1 = back
 *     gear:   { "<EQUIP_SLOT>": [equipType, setId, traitType] },
 *     cp:     { "1".."12": championAbilityId },
 *     food:   <foodItemId>
 *   }
 *
 * Gear is encoded as the abstract triple `[equipType, setId, traitType]`, NOT an
 * item instance — on import WW equips an item the player already owns that matches
 * the set + slot (preferring the requested trait). Because equipType and setId are
 * HARD-matched in-game, this generator OMITS any slot it cannot resolve with
 * confidence (rather than emit a wrong/zero value that would silently drop the
 * slot). Weapon slots are omitted because the loadout model does not record weapon
 * type (1H/2H/shield), which equipType depends on. Omitted slots are reported in
 * `unresolvedSlots` so the UI can tell the user to set them manually.
 *
 * The in-game import box caps input at 1000 characters (`overCharLimit`).
 */

import { findSetIdByName } from '@/utils/setNameUtils';

import {
  SLOT_TO_EQUIP_TYPE,
  WEAPON_SLOTS,
  WW_EXCLUDED_SLOTS,
  slotTraitCategory,
  traitIdToTraitType,
} from '../data/esoEquipmentEnums';
import { getItemInfo } from '../data/itemIdMap';
import type { LoadoutSetup, GearPiece } from '../types/loadout.types';

import { getItemIdFromLink } from './itemLinkParser';

/** WW input box hard limit (`SetMaxInputChars(1000)`). */
export const WW_TRANSFER_CHAR_LIMIT = 1000;

/** `[equipType, setId, traitType]` — the WW gear tuple. */
export type WWGearTuple = [number, number, number];

/** A single setup encoded in WW Transfer JSON shape. */
export interface WWTransferSetup {
  name: string;
  skills: { '0': Record<string, number>; '1': Record<string, number> };
  gear: Record<string, WWGearTuple>;
  cp: Record<string, number>;
  food?: number;
}

/** A gear slot that could not be encoded, with a user-facing reason. */
export interface UnresolvedSlot {
  slot: number;
  reason: string;
}

export interface WWTransferResult {
  /** Minified JSON to paste into the Wizard's Wardrobe Import box. */
  json: string;
  /** The structured payload (handy for previews / tests). */
  data: WWTransferSetup;
  /** Gear slots intentionally left out (weapon slots, unknown sets). */
  unresolvedSlots: UnresolvedSlot[];
  /** Length of `json`. */
  charCount: number;
  /** True when `charCount` exceeds the in-game paste limit. */
  overCharLimit: boolean;
}

/**
 * Best-effort itemId for a gear piece. Prefers the item link (WW-imported pieces
 * store an account-local `id` that is a uniqueId, not an itemId — the link is the
 * portable source). Falls back to a numeric `id` only when it is plausibly an
 * itemId (uniqueIds are 64-bit and far larger than any real itemId).
 */
function resolveItemId(piece: GearPiece): number | undefined {
  if (piece.link) {
    const fromLink = getItemIdFromLink(piece.link);
    if (fromLink && fromLink > 0) return fromLink;
  }
  if (typeof piece.id === 'number' && Number.isFinite(piece.id) && piece.id > 0) {
    return piece.id;
  }
  if (typeof piece.id === 'string' && /^\d+$/.test(piece.id.trim())) {
    const n = Number(piece.id.trim());
    // Real itemIds are < ~500k; anything larger is an item uniqueId, not an itemId.
    if (Number.isFinite(n) && n > 0 && n < 500_000) return n;
  }
  return undefined;
}

function buildSkills(skills: LoadoutSetup['skills']): WWTransferSetup['skills'] {
  const out: WWTransferSetup['skills'] = { '0': {}, '1': {} };
  for (const bar of [0, 1] as const) {
    const sourceBar = skills?.[bar];
    if (!sourceBar) continue;
    for (const [slotStr, abilityId] of Object.entries(sourceBar)) {
      const slot = Number(slotStr);
      // WW expects ability slots 3-7 plus the ultimate at slot 8.
      if (slot >= 3 && slot <= 8 && typeof abilityId === 'number' && abilityId > 0) {
        out[String(bar) as '0' | '1'][String(slot)] = abilityId;
      }
    }
  }
  return out;
}

function buildChampionPoints(cp: LoadoutSetup['cp']): Record<string, number> {
  const out: Record<string, number> = {};
  if (!cp) return out;
  for (const [slotStr, abilityId] of Object.entries(cp)) {
    const slot = Number(slotStr);
    if (slot >= 1 && slot <= 12 && typeof abilityId === 'number' && abilityId > 0) {
      out[String(slot)] = abilityId;
    }
  }
  return out;
}

function resolveFoodItemId(food: LoadoutSetup['food']): number | undefined {
  if (!food) return undefined;
  if (typeof food.id === 'number' && Number.isFinite(food.id) && food.id > 0) return food.id;
  if (food.link) {
    const fromLink = getItemIdFromLink(food.link);
    if (fromLink && fromLink > 0) return fromLink;
  }
  return undefined;
}

/**
 * Encode a single `LoadoutSetup` as a Wizard's Wardrobe Transfer import code.
 */
export function loadoutSetupToWWTransfer(setup: LoadoutSetup): WWTransferResult {
  const unresolvedSlots: UnresolvedSlot[] = [];
  const gear: Record<string, WWGearTuple> = {};

  for (const [slotStr, rawPiece] of Object.entries(setup.gear ?? {})) {
    if (slotStr === 'mythic') continue; // GearConfig.mythic is a slot index, not a piece
    const slot = Number(slotStr);
    if (!Number.isInteger(slot) || WW_EXCLUDED_SLOTS.has(slot)) continue;

    const piece = rawPiece as GearPiece;
    if (!piece || (!piece.link && piece.id == null)) continue; // empty slot

    if (WEAPON_SLOTS.has(slot)) {
      unresolvedSlots.push({
        slot,
        reason: 'Weapon slot — weapon type is not stored, so set it manually in Wizard’s Wardrobe.',
      });
      continue;
    }

    const equipType = SLOT_TO_EQUIP_TYPE[slot];
    if (!equipType) continue; // not an exportable armor/jewelry slot

    const itemId = resolveItemId(piece);
    const setName = itemId ? getItemInfo(itemId)?.setName : undefined;
    const setId = findSetIdByName(setName);
    if (!setId) {
      unresolvedSlots.push({
        slot,
        reason: setName
          ? `Set "${setName}" isn’t in the catalog yet — set this slot manually.`
          : 'Item / set couldn’t be identified — set this slot manually.',
      });
      continue;
    }

    const traitType = traitIdToTraitType(slotTraitCategory(slot), piece.trait);
    gear[String(slot)] = [equipType, setId, traitType];
  }

  const data: WWTransferSetup = {
    name: setup.name?.trim() || 'Imported Setup',
    skills: buildSkills(setup.skills),
    gear,
    cp: buildChampionPoints(setup.cp),
  };

  const food = resolveFoodItemId(setup.food);
  if (food !== undefined) data.food = food;

  const json = JSON.stringify(data);
  return {
    json,
    data,
    unresolvedSlots,
    charCount: json.length,
    overCharLimit: json.length > WW_TRANSFER_CHAR_LIMIT,
  };
}
