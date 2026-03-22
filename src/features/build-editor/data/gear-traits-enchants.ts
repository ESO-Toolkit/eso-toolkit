/**
 * ESO Gear Traits & Enchantments (Glyphs)
 *
 * Complete data for all craftable/findable traits and enchantments in
 * Elder Scrolls Online, organized by equipment category.
 *
 * Categories map to EquipSlotDef.category:
 *   apparel     → Armor traits + Armor glyphs
 *   accessories → Jewelry traits + Jewelry glyphs
 *   weapons     → Weapon traits + Weapon glyphs
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type GearCategory = 'armor' | 'weapon' | 'jewelry';

export interface TraitDef {
  id: string;
  name: string;
  description: string;
}

export interface EnchantDef {
  id: string;
  name: string;
  description: string;
}

// ─── Slot category → gear category mapping ──────────────────────────────────

const SLOT_TO_GEAR_CATEGORY: Record<string, GearCategory> = {
  apparel: 'armor',
  accessories: 'jewelry',
  weapons: 'weapon',
};

export function getGearCategory(slotCategory: string): GearCategory {
  return SLOT_TO_GEAR_CATEGORY[slotCategory] ?? 'armor';
}

// ─── Armor Traits (9) ───────────────────────────────────────────────────────

export const ARMOR_TRAITS: TraitDef[] = [
  { id: 'divines', name: 'Divines', description: 'Increases Mundus Stone effects' },
  { id: 'infused', name: 'Infused', description: 'Increases armor enchantment effect' },
  { id: 'reinforced', name: 'Reinforced', description: "Increases this item's armor value" },
  { id: 'well-fitted', name: 'Well-Fitted', description: 'Reduces sprint and dodge roll cost' },
  { id: 'sturdy', name: 'Sturdy', description: 'Reduces block cost' },
  { id: 'impenetrable', name: 'Impenetrable', description: 'Increases Critical Resistance' },
  { id: 'training', name: 'Training', description: 'Increases experience gained from kills' },
  { id: 'invigorating', name: 'Invigorating', description: 'Increases Health, Magicka, and Stamina Recovery' },
  { id: 'nirnhoned', name: 'Nirnhoned', description: 'Increases Physical and Spell Resistance' },
];

// ─── Weapon Traits (9) ──────────────────────────────────────────────────────

export const WEAPON_TRAITS: TraitDef[] = [
  { id: 'precise', name: 'Precise', description: 'Increases Weapon and Spell Critical' },
  { id: 'infused', name: 'Infused', description: 'Increases weapon enchantment effect and reduces cooldown' },
  { id: 'sharpened', name: 'Sharpened', description: 'Increases Physical and Spell Penetration' },
  { id: 'powered', name: 'Powered', description: 'Increases healing done' },
  { id: 'charged', name: 'Charged', description: 'Increases chance to apply status effects' },
  { id: 'defending', name: 'Defending', description: 'Increases Physical and Spell Resistance' },
  { id: 'training', name: 'Training', description: 'Increases experience gained from kills' },
  { id: 'decisive', name: 'Decisive', description: 'Chance to gain additional Ultimate' },
  { id: 'nirnhoned', name: 'Nirnhoned', description: 'Increases weapon damage' },
];

// ─── Jewelry Traits (9) ─────────────────────────────────────────────────────

export const JEWELRY_TRAITS: TraitDef[] = [
  { id: 'bloodthirsty', name: 'Bloodthirsty', description: 'Increases damage against low-health enemies' },
  { id: 'arcane', name: 'Arcane', description: 'Increases Maximum Magicka' },
  { id: 'robust', name: 'Robust', description: 'Increases Maximum Stamina' },
  { id: 'healthy', name: 'Healthy', description: 'Increases Maximum Health' },
  { id: 'infused', name: 'Infused', description: 'Increases jewelry enchantment effect' },
  { id: 'harmony', name: 'Harmony', description: 'Activating a Synergy restores resources' },
  { id: 'protective', name: 'Protective', description: 'Increases Physical and Spell Resistance' },
  { id: 'swift', name: 'Swift', description: 'Increases Movement Speed' },
  { id: 'triune', name: 'Triune', description: 'Increases Maximum Health, Magicka, and Stamina' },
];

// ─── Armor Enchantments (4) ─────────────────────────────────────────────────

export const ARMOR_ENCHANTS: EnchantDef[] = [
  { id: 'health', name: 'Glyph of Health', description: 'Adds Maximum Health' },
  { id: 'magicka', name: 'Glyph of Magicka', description: 'Adds Maximum Magicka' },
  { id: 'stamina', name: 'Glyph of Stamina', description: 'Adds Maximum Stamina' },
  { id: 'prismatic-defense', name: 'Glyph of Prismatic Defense', description: 'Adds Maximum Health, Magicka, and Stamina' },
];

// ─── Weapon Enchantments (14) ───────────────────────────────────────────────

export const WEAPON_ENCHANTS: EnchantDef[] = [
  { id: 'weapon-damage', name: 'Glyph of Weapon Damage', description: 'Increases Weapon and Spell Damage' },
  { id: 'absorb-stamina', name: 'Glyph of Absorb Stamina', description: 'Deals Physical Damage and recovers Stamina' },
  { id: 'absorb-magicka', name: 'Glyph of Absorb Magicka', description: 'Deals Magic Damage and recovers Magicka' },
  { id: 'absorb-health', name: 'Glyph of Absorb Health', description: 'Deals Magic Damage and recovers Health' },
  { id: 'crushing', name: 'Glyph of Crushing', description: "Reduces target's Physical and Spell Resistance" },
  { id: 'weakening', name: 'Glyph of Weakening', description: "Reduces target's Weapon and Spell Damage" },
  { id: 'flame', name: 'Glyph of Flame', description: 'Deals Fire Damage' },
  { id: 'frost', name: 'Glyph of Frost', description: 'Deals Frost Damage' },
  { id: 'shock', name: 'Glyph of Shock', description: 'Deals Shock Damage' },
  { id: 'poison', name: 'Glyph of Poison', description: 'Deals Poison Damage' },
  { id: 'foulness', name: 'Glyph of Foulness', description: 'Deals Disease Damage' },
  { id: 'decrease-health', name: 'Glyph of Decrease Health', description: 'Deals Oblivion Damage' },
  { id: 'hardening', name: 'Glyph of Hardening', description: 'Grants a Damage Shield' },
  { id: 'prismatic-onslaught', name: 'Glyph of Prismatic Onslaught', description: 'Deals Magic Damage and recovers resources' },
];

// ─── Jewelry Enchantments (20) ──────────────────────────────────────────────

export const JEWELRY_ENCHANTS: EnchantDef[] = [
  { id: 'increase-spell-damage', name: 'Glyph of Increase Magical Harm', description: 'Adds Spell and Weapon Damage plus Magicka Recovery' },
  { id: 'increase-physical-damage', name: 'Glyph of Increase Physical Harm', description: 'Adds Weapon and Spell Damage plus Stamina Recovery' },
  { id: 'magicka-recovery', name: 'Glyph of Magicka Recovery', description: 'Adds Magicka Recovery' },
  { id: 'stamina-recovery', name: 'Glyph of Stamina Recovery', description: 'Adds Stamina Recovery' },
  { id: 'health-recovery', name: 'Glyph of Health Recovery', description: 'Adds Health Recovery' },
  { id: 'prismatic-recovery', name: 'Glyph of Prismatic Recovery', description: 'Adds Health, Magicka, and Stamina Recovery' },
  { id: 'reduce-spell-cost', name: 'Glyph of Reduce Spell Cost', description: 'Reduces Magicka cost of abilities' },
  { id: 'reduce-feat-cost', name: 'Glyph of Reduce Feat Cost', description: 'Reduces Stamina cost of abilities' },
  { id: 'reduce-skill-cost', name: 'Glyph of Reduce Skill Cost', description: 'Reduces Health, Magicka, and Stamina ability costs' },
  { id: 'decrease-spell-harm', name: 'Glyph of Decrease Spell Harm', description: 'Adds Spell Resistance' },
  { id: 'decrease-physical-harm', name: 'Glyph of Decrease Physical Harm', description: 'Adds Physical Resistance' },
  { id: 'potion-boost', name: 'Glyph of Potion Boost', description: 'Increases duration of Potion effects' },
  { id: 'potion-speed', name: 'Glyph of Potion Speed', description: 'Reduces Potion cooldown' },
  { id: 'bashing', name: 'Glyph of Bashing', description: 'Increases Bash damage' },
  { id: 'bracing', name: 'Glyph of Bracing', description: 'Reduces cost of Blocking' },
  { id: 'flame-resist', name: 'Glyph of Flame Resist', description: 'Adds Fire Resistance' },
  { id: 'frost-resist', name: 'Glyph of Frost Resist', description: 'Adds Frost Resistance' },
  { id: 'shock-resist', name: 'Glyph of Shock Resist', description: 'Adds Shock Resistance' },
  { id: 'poison-resist', name: 'Glyph of Poison Resist', description: 'Adds Poison Resistance' },
  { id: 'disease-resist', name: 'Glyph of Disease Resist', description: 'Adds Disease Resistance' },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────

const TRAITS_BY_CATEGORY: Record<GearCategory, TraitDef[]> = {
  armor: ARMOR_TRAITS,
  weapon: WEAPON_TRAITS,
  jewelry: JEWELRY_TRAITS,
};

const ENCHANTS_BY_CATEGORY: Record<GearCategory, EnchantDef[]> = {
  armor: ARMOR_ENCHANTS,
  weapon: WEAPON_ENCHANTS,
  jewelry: JEWELRY_ENCHANTS,
};

/** Get the list of valid traits for a slot category. */
export function getTraitsForSlot(slotCategory: string): TraitDef[] {
  return TRAITS_BY_CATEGORY[getGearCategory(slotCategory)] ?? ARMOR_TRAITS;
}

/** Get the list of valid enchants for a slot category. */
export function getEnchantsForSlot(slotCategory: string): EnchantDef[] {
  return ENCHANTS_BY_CATEGORY[getGearCategory(slotCategory)] ?? ARMOR_ENCHANTS;
}

/** Resolve a trait ID to its display name. */
export function getTraitName(traitId: string, slotCategory: string): string | undefined {
  const traits = getTraitsForSlot(slotCategory);
  return traits.find((t) => t.id === traitId)?.name;
}

/** Resolve an enchant ID to its display name (short, without "Glyph of" prefix). */
export function getEnchantShortName(enchantId: string, slotCategory: string): string | undefined {
  const enchants = getEnchantsForSlot(slotCategory);
  const found = enchants.find((e) => e.id === enchantId);
  if (!found) return undefined;
  return found.name.replace(/^Glyph of\s+/i, '');
}
