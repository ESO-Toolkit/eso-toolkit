/**
 * Canonical ESO (Elder Scrolls Online) equipment/trait enum values.
 *
 * These integers are the values returned by the live ESO Lua API
 * (`GetItemLinkEquipType`, `GetItemLinkTraitInfo`, the `EQUIP_SLOT_*` globals).
 * They are needed to encode a Wizard's Wardrobe "Transfer" import code, whose
 * gear tuple is `[equipType, setId, traitType]` keyed by `String(EQUIP_SLOT)`.
 *
 * Values cross-verified (2026-06) against two independent sources and the
 * addon source itself:
 *  - esoui globals dump: Baertram/IntelliJ_ESOUI_AutoCompletion `eso-api_globals.lua`
 *  - trait cross-check:  Baertram/LibResearch `LibResearch.lua`
 *  - name set:           esoui/esoui `ESOUIDocumentation.txt` (API 101050)
 *  - transfer format:    nicokimmel/wizardswardrobe `WizardsWardrobeTransfer.lua`
 *
 * traitType is a SOFT field for WW import (it prefers the requested trait, else
 * any matching item), so an unmapped trait safely degrades to 0 ("any"). equipType
 * and setId are HARD-matched, so callers must omit a slot rather than emit a guess.
 */

/** `EQUIP_TYPE_*` — the value returned by `GetItemLinkEquipType(link)`. */
export const EQUIP_TYPE = {
  INVALID: 0,
  HEAD: 1,
  NECK: 2,
  CHEST: 3,
  SHOULDERS: 4,
  ONE_HAND: 5,
  TWO_HAND: 6,
  OFF_HAND: 7,
  WAIST: 8,
  LEGS: 9,
  FEET: 10,
  COSTUME: 11,
  RING: 12,
  HAND: 13,
  MAIN_HAND: 14,
  POISON: 15,
} as const;

/**
 * `EQUIP_SLOT_*` — the equipment slot ids. The app's internal gear slot indices
 * (see `loadout.types.ts` GearConfig) already match these ESO constants, and WW's
 * Transfer `gear` map is keyed by `String(EQUIP_SLOT)`.
 */
export const EQUIP_SLOT = {
  HEAD: 0,
  NECK: 1,
  CHEST: 2,
  SHOULDERS: 3,
  MAIN_HAND: 4,
  OFF_HAND: 5,
  WAIST: 6,
  WRIST: 7,
  LEGS: 8,
  FEET: 9,
  COSTUME: 10,
  RING1: 11,
  RING2: 12,
  POISON: 13,
  BACKUP_POISON: 14,
  RANGED: 15,
  HAND: 16,
  BACKUP_MAIN: 20,
  BACKUP_OFF: 21,
} as const;

/** Slots WW's Transfer export deliberately skips (`WizardsWardrobeTransfer.lua`). */
export const WW_EXCLUDED_SLOTS: ReadonlySet<number> = new Set([
  EQUIP_SLOT.COSTUME,
  EQUIP_SLOT.POISON,
  EQUIP_SLOT.BACKUP_POISON,
  EQUIP_SLOT.WRIST, // deprecated/unused
  EQUIP_SLOT.RANGED, // unused
]);

export type GearTraitCategory = 'armor' | 'weapon' | 'jewelry';

/**
 * Internal gear-slot index → `EQUIP_TYPE` for the deterministic (armor + jewelry)
 * slots. Weapon slots (main/off/backup) are intentionally absent: their equipType
 * (ONE_HAND / TWO_HAND / OFF_HAND) depends on the weapon's type, which the loadout
 * gear model does not store — callers must omit those slots, not guess.
 */
export const SLOT_TO_EQUIP_TYPE: Readonly<Record<number, number>> = {
  [EQUIP_SLOT.HEAD]: EQUIP_TYPE.HEAD,
  [EQUIP_SLOT.NECK]: EQUIP_TYPE.NECK,
  [EQUIP_SLOT.CHEST]: EQUIP_TYPE.CHEST,
  [EQUIP_SLOT.SHOULDERS]: EQUIP_TYPE.SHOULDERS,
  [EQUIP_SLOT.WAIST]: EQUIP_TYPE.WAIST,
  [EQUIP_SLOT.LEGS]: EQUIP_TYPE.LEGS,
  [EQUIP_SLOT.FEET]: EQUIP_TYPE.FEET,
  [EQUIP_SLOT.HAND]: EQUIP_TYPE.HAND,
  [EQUIP_SLOT.RING1]: EQUIP_TYPE.RING,
  [EQUIP_SLOT.RING2]: EQUIP_TYPE.RING,
};

/** Weapon gear-slot indices (equipType is weapon-type-dependent — derive per item). */
export const WEAPON_SLOTS: ReadonlySet<number> = new Set([
  EQUIP_SLOT.MAIN_HAND,
  EQUIP_SLOT.OFF_HAND,
  EQUIP_SLOT.BACKUP_MAIN,
  EQUIP_SLOT.BACKUP_OFF,
]);

/**
 * ESO weapon-type label → `EQUIP_TYPE` int. The labels are exactly the values
 * produced by `getWeaponTypeLabel` (itemIconResolver). equipType is intrinsic to
 * the weapon (not the slot it sits in): every one-handed weapon equips as
 * ONE_HAND even in the off-hand slot, a shield equips as OFF_HAND, and every
 * two-handed weapon (greatsword / battle axe / maul / bow / all staves) equips as
 * TWO_HAND. The generic "Staff" label (element unknown) is still unambiguously
 * TWO_HAND, so it resolves here even though its element doesn't.
 */
export const WEAPON_LABEL_TO_EQUIP_TYPE: Readonly<Record<string, number>> = {
  // One-handed weapons
  Sword: EQUIP_TYPE.ONE_HAND,
  Axe: EQUIP_TYPE.ONE_HAND,
  Mace: EQUIP_TYPE.ONE_HAND,
  Dagger: EQUIP_TYPE.ONE_HAND,
  // Off-hand
  Shield: EQUIP_TYPE.OFF_HAND,
  // Two-handed weapons
  Greatsword: EQUIP_TYPE.TWO_HAND,
  'Battle Axe': EQUIP_TYPE.TWO_HAND,
  Maul: EQUIP_TYPE.TWO_HAND,
  Bow: EQUIP_TYPE.TWO_HAND,
  Staff: EQUIP_TYPE.TWO_HAND,
  'Inferno Staff': EQUIP_TYPE.TWO_HAND,
  'Ice Staff': EQUIP_TYPE.TWO_HAND,
  'Lightning Staff': EQUIP_TYPE.TWO_HAND,
  'Restoration Staff': EQUIP_TYPE.TWO_HAND,
};

/**
 * Resolve a weapon-type label (e.g. "Dagger", "Greatsword", "Inferno Staff") to
 * its `EQUIP_TYPE` int. Returns undefined for non-weapon / unrecognized labels so
 * callers can omit the slot rather than emit a wrong (hard-matched) equipType.
 */
export function weaponLabelToEquipType(label: string | null | undefined): number | undefined {
  if (!label) return undefined;
  return WEAPON_LABEL_TO_EQUIP_TYPE[label.trim()];
}

/** Internal gear-slot index → trait category (for resolving the trait int). */
export function slotTraitCategory(slot: number): GearTraitCategory {
  if (slot === EQUIP_SLOT.NECK || slot === EQUIP_SLOT.RING1 || slot === EQUIP_SLOT.RING2) {
    return 'jewelry';
  }
  if (WEAPON_SLOTS.has(slot)) return 'weapon';
  return 'armor';
}

/**
 * kebab-case trait id (as stored in `GearPiece.trait`, matching the ids in
 * build-editor `gear-traits-enchants.ts`) → `ITEM_TRAIT_TYPE` int, keyed by gear
 * category. `infused`/`training`/`nirnhoned` differ across categories, hence the
 * nesting. Unmapped ids resolve to 0 ("any trait") — safe for WW import.
 */
export const TRAIT_ID_TO_TRAIT_TYPE: Record<GearTraitCategory, Record<string, number>> = {
  armor: {
    sturdy: 11,
    impenetrable: 12,
    reinforced: 13,
    'well-fitted': 14,
    training: 15,
    infused: 16,
    divines: 18,
    nirnhoned: 25,
    // 'invigorating' has no confirmed ITEM_TRAIT_TYPE constant — falls through to 0 (any).
  },
  weapon: {
    powered: 1,
    charged: 2,
    precise: 3,
    infused: 4,
    defending: 5,
    training: 6,
    sharpened: 7,
    decisive: 8,
    nirnhoned: 26,
  },
  jewelry: {
    healthy: 21,
    arcane: 22,
    robust: 23,
    swift: 28,
    harmony: 29,
    triune: 30,
    bloodthirsty: 31,
    protective: 32,
    infused: 33,
  },
};

/** Resolve a kebab-case trait id to its `ITEM_TRAIT_TYPE` int (0 = none/any). */
export function traitIdToTraitType(
  category: GearTraitCategory,
  traitId: string | undefined,
): number {
  if (!traitId) return 0;
  return TRAIT_ID_TO_TRAIT_TYPE[category][traitId.toLowerCase().trim()] ?? 0;
}
