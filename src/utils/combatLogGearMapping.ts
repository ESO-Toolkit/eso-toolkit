/**
 * Combat-log gear → Build Editor trait/enchant mapping.
 *
 * ESO Logs `combatantInfo.gear[]` reports each piece's trait and enchant as
 * opaque numeric codes (`PlayerGear.trait`, `PlayerGear.enchantType`). The
 * report's gear panel already decodes those codes to human names via the
 * `TRAIT_NAMES` / `ENCHANTMENT_NAMES` tables (the app's single source of truth,
 * reverse-engineered from real logs). The Build Editor, however, stores traits
 * and enchants as kebab string IDs scoped per gear category
 * (`gear-traits-enchants.ts`).
 *
 * This module bridges the two so "Extract Build from Log" carries traits and
 * enchants across — and it does so by going THROUGH the same display names the
 * report shows, so the editor always shows the same trait/enchant the user just
 * saw on the report. Anything that can't be mapped (crafting-only traits,
 * ambiguous/foreign codes, off-category glyphs) degrades to `undefined` — the
 * piece simply carries no trait/enchant rather than a wrong one.
 *
 * Fidelity is therefore bounded by the accuracy of TRAIT_NAMES / ENCHANTMENT_NAMES:
 * those decode tables carry a few user-patched relabels, so a small number of
 * alias keys here (e.g. weapon 'prismaticonslaught') currently have no code that
 * decodes to them. That's intentional — keeping the extraction consistent with
 * what the report displays matters more than second-guessing the decode tables.
 */

import {
  ARMOR_TRAITS,
  WEAPON_TRAITS,
  JEWELRY_TRAITS,
  ARMOR_ENCHANTS,
  WEAPON_ENCHANTS,
  JEWELRY_ENCHANTS,
  type GearCategory,
} from '@/features/build-editor/data/gear-traits-enchants';
import { getSetItemsBySlot } from '@/features/loadout-manager/data/itemIdMap';
import type { SlotType } from '@/features/loadout-manager/data/slotTypes';
import {
  deriveItemNameForSlot,
  parseWeaponTypeFromIconUrl,
} from '@/features/loadout-manager/utils/itemIconResolver';
import { TRAIT_NAMES, ENCHANTMENT_NAMES } from '@/utils/gearMappings';

/** Strip case, spaces, hyphens and apostrophes so display names match leniently. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Slot → gear category ────────────────────────────────────────────────────
// CombatantInfo gear slots (GearSlot enum): 0–6 apparel, 7–9 jewelry
// (NECK, RING1, RING2), 10–13 weapons (MAIN/OFF + backups).

export function gearCategoryForSlot(slotIdx: number): GearCategory {
  if (slotIdx >= 7 && slotIdx <= 9) return 'jewelry';
  if (slotIdx >= 10 && slotIdx <= 13) return 'weapon';
  return 'armor';
}

// ─── Trait mapping ───────────────────────────────────────────────────────────
// The report's trait display names line up 1:1 with the Build Editor trait
// names (Divines, Sharpened, Reinforced, Well-Fitted, …), so a normalized-name
// lookup within the slot's category resolves them directly. Crafting-only or
// non-build traits (Ornate, Intricate, Prosperous, …) have no entry and map to
// undefined.

const TRAIT_ID_BY_CATEGORY: Record<GearCategory, Map<string, string>> = {
  armor: new Map(ARMOR_TRAITS.map((t) => [normalize(t.name), t.id])),
  weapon: new Map(WEAPON_TRAITS.map((t) => [normalize(t.name), t.id])),
  jewelry: new Map(JEWELRY_TRAITS.map((t) => [normalize(t.name), t.id])),
};

export function resolveTraitId(
  traitCode: number | undefined | null,
  category: GearCategory,
): string | undefined {
  if (traitCode == null || traitCode === 0) return undefined;
  const displayName = TRAIT_NAMES[traitCode];
  if (!displayName) return undefined;
  return TRAIT_ID_BY_CATEGORY[category].get(normalize(displayName));
}

// ─── Enchant mapping ─────────────────────────────────────────────────────────
// Enchant display names diverge from the Build Editor's "Glyph of …" names
// (e.g. report "Spell Damage" → editor "Glyph of Increase Magical Harm"), and
// the same short name means different glyphs per category (jewelry "Weapon
// Damage" is a different glyph than weapon "Weapon Damage"). So each category
// gets an explicit normalized-display-name → editor-ID table. The category gate
// also prevents an off-category code (the decode tables carry some
// cross-category noise) from resolving to the wrong glyph.

const ENCHANT_ID_BY_CATEGORY: Record<GearCategory, Record<string, string>> = {
  armor: {
    health: 'health',
    increasehealth: 'health',
    magicka: 'magicka',
    increasemagicka: 'magicka',
    stamina: 'stamina',
    increasestamina: 'stamina',
    prismaticdefense: 'prismatic-defense',
    prismaticresistance: 'prismatic-defense',
  },
  weapon: {
    weapondamage: 'weapon-damage',
    berserker: 'weapon-damage',
    absorbhealth: 'absorb-health',
    absorbmagicka: 'absorb-magicka',
    absorbstamina: 'absorb-stamina',
    crusher: 'crushing',
    crushing: 'crushing',
    // ESO Logs reports the Crusher weapon glyph under two enchant codes: code 13
    // decodes to "Crusher", but code 28 decodes to "Reduce Armor" (Crusher's
    // in-game effect — "Reduces the target's Physical and Spell Resistance").
    // Without this alias the latter (common on tank/support back bars, e.g. a
    // Maelstrom Ice Staff) silently drops its enchant on Extract Build.
    reducearmor: 'crushing',
    weakening: 'weakening',
    // Same dual-code pattern as Crusher above: the Weakening weapon glyph reports
    // as code 14 ("Weakening") OR code 32 ("Reduce Physical Harm" — Weakening
    // lowers the target's Weapon/Spell Damage). Code 32 ALSO means the defensive
    // "Decrease Physical Harm" glyph on jewelry, so this alias is weapon-scoped;
    // the jewelry table keeps its own (correct) mapping for the same code.
    reducephysicalharm: 'weakening',
    flamedamage: 'flame',
    firedamage: 'flame',
    flame: 'flame',
    frostdamage: 'frost',
    chilled: 'frost',
    frost: 'frost',
    shockdamage: 'shock',
    shock: 'shock',
    poisondamage: 'poison',
    poison: 'poison',
    diseasedamage: 'foulness',
    disease: 'foulness',
    decreasehealth: 'decrease-health',
    oblivion: 'decrease-health',
    hardening: 'hardening',
    prismaticonslaught: 'prismatic-onslaught',
  },
  jewelry: {
    spelldamage: 'increase-spell-damage',
    increasemagicalharm: 'increase-spell-damage',
    weapondamage: 'increase-physical-damage',
    increasephysicalharm: 'increase-physical-damage',
    magickarecovery: 'magicka-recovery',
    staminarecovery: 'stamina-recovery',
    healthrecovery: 'health-recovery',
    prismaticrecovery: 'prismatic-recovery',
    reducespellcost: 'reduce-spell-cost',
    reducefeatcost: 'reduce-feat-cost',
    reduceskillcost: 'reduce-skill-cost',
    reducemagicalharm: 'decrease-spell-harm',
    decreasespellharm: 'decrease-spell-harm',
    reducephysicalharm: 'decrease-physical-harm',
    decreasephysicalharm: 'decrease-physical-harm',
  },
};

export function resolveEnchantId(
  enchantCode: number | undefined | null,
  category: GearCategory,
): string | undefined {
  if (enchantCode == null || enchantCode === 0) return undefined;
  const displayName = ENCHANTMENT_NAMES[enchantCode];
  if (!displayName) return undefined;
  return ENCHANT_ID_BY_CATEGORY[category][normalize(displayName)];
}

// Internal lookups exported for test cross-checking (e.g. asserting every mapped
// enchant ID actually exists in its category's Build Editor list).
export const __ENCHANT_LISTS_BY_CATEGORY = {
  armor: ARMOR_ENCHANTS,
  weapon: WEAPON_ENCHANTS,
  jewelry: JEWELRY_ENCHANTS,
} as const;
export const __ENCHANT_ID_BY_CATEGORY = ENCHANT_ID_BY_CATEGORY;

// ─── Weapon-type-specific item id resolution ─────────────────────────────────
// The Build Editor derives a weapon's TYPE (Dagger / Sword / Inferno Staff / …)
// from its item id, via the per-set type-specific variant ids the gear picker
// uses. A combat log, however, often reports a GENERIC set-weapon id (e.g.
// 117218 = "Powerful Assault Gear", no slot/type) — which resolves the set name
// but never a weapon type. We have the authoritative `PlayerGear.type`
// (WeaponType enum) + `icon` from the log, so we re-resolve the editor's
// type-specific variant id for the piece's set + weapon type.
//
// NOTE: this reads the loadout-manager icon data, which is loaded asynchronously
// (preloadIconData). Callers that want weapon types resolved must await
// preloadIconData() before invoking convertGear; without it, every candidate
// stays unresolved and we fall back to the raw combat-log id (graceful).

/** WeaponType enum (src/types/playerDetails.ts) → the editor's weapon-type label. */
const WEAPON_TYPE_LABEL: Record<number, string> = {
  1: 'Axe',
  2: 'Mace',
  3: 'Sword',
  4: 'Greatsword',
  5: 'Battle Axe',
  6: 'Maul',
  9: 'Restoration Staff',
  11: 'Dagger',
  12: 'Inferno Staff',
  13: 'Ice Staff',
  14: 'Shield',
  15: 'Lightning Staff',
};

// Known weapon-type labels, LONGEST first, so a candidate name's specific type
// reads as its longest matching suffix — "Battle Axe" wins over "Axe", "Greatsword"
// over "Sword". This (vs a cross-candidate common-prefix strip) avoids both the
// "Axe" ⊂ "Battle Axe" substring collision and the prefix over-strip that happened
// when a set's weapon pool was type-homogeneous or shared leading letters.
const WEAPON_LABELS_LONGEST_FIRST: string[] = [
  ...new Set([...Object.values(WEAPON_TYPE_LABEL), 'Bow']),
].sort((a, b) => b.length - a.length);

/** The specific weapon-type label a resolved item name ends with, if any. */
function candidateWeaponLabel(name: string): string | undefined {
  for (const label of WEAPON_LABELS_LONGEST_FIRST) {
    if (name.endsWith(` ${label}`)) return label;
  }
  return undefined;
}

/**
 * The weapon-type label implied by a combat-log piece: prefer the WeaponType
 * enum (distinguishes staff elements, which a generic staff icon cannot), then
 * fall back to parsing the log's icon token (covers Bow and any unmapped type).
 */
function weaponTypeLabel(weaponType: number | undefined | null, icon?: string): string | undefined {
  if (weaponType != null) {
    const fromEnum = WEAPON_TYPE_LABEL[weaponType];
    if (fromEnum) return fromEnum;
  }
  // parseWeaponTypeFromIconUrl wants a `/icons/<file>.png` shaped URL.
  const fromIcon = icon ? parseWeaponTypeFromIconUrl(`/icons/${icon}.png`) : null;
  // A bare "Staff" can't pick between elements — ignore it (the enum path above
  // already handles the four staff elements); keep only specific labels.
  return fromIcon && fromIcon !== 'Staff' ? fromIcon : undefined;
}

/**
 * Resolve the Build Editor item id for a weapon piece so the editor shows the
 * correct weapon type. Returns the original id unchanged when the type can't be
 * determined or no matching set variant exists (e.g. icon data not yet loaded).
 */
export function resolveWeaponItemId(opts: {
  combatLogId: number;
  weaponType: number | undefined | null;
  icon?: string;
  setName?: string;
  slotType: Extract<SlotType, 'weapon' | 'offhand'>;
}): number {
  const { combatLogId, weaponType, icon, setName, slotType } = opts;
  if (!setName) return combatLogId;

  const targetLabel = weaponTypeLabel(weaponType, icon);
  if (!targetLabel) return combatLogId;

  // Resolution is idempotent: a combat-log id that already pins this weapon type
  // re-resolves to the same (or an equivalent same-type) variant, while a generic
  // set-weapon id gets upgraded to the type-specific one.

  // Pull the set's type-specific variants. Off-hand 1H weapons (dual wield)
  // live in the weapon pool, so search both and dedupe.
  const ids = new Set<number>([
    ...getSetItemsBySlot(setName, slotType),
    ...(slotType === 'offhand' ? getSetItemsBySlot(setName, 'weapon') : []),
  ]);
  if (ids.size === 0) return combatLogId;

  // Match each candidate by its own longest-known-type-label suffix (independent
  // of the other candidates), so a narrow or type-homogeneous pool resolves the
  // same as a full one and a 1H "Axe" target never matches a "Battle Axe" item.
  for (const cid of ids) {
    const name = deriveItemNameForSlot(cid, slotType);
    if (name && candidateWeaponLabel(name) === targetLabel) return cid;
  }
  return combatLogId;
}

// Exported for testing the longest-suffix disambiguation (the only part of the
// weapon-type resolution exercisable without the async icon data).
export { candidateWeaponLabel as __candidateWeaponLabel };
