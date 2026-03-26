/**
 * ESO Gear Traits — static data.
 * All 27 traits across armor, weapon, and jewelry.
 * Some names appear in multiple slot types (e.g. Infused, Nirnhoned, Training).
 */

export interface TraitDef {
  id: string;
  name: string;
  slotTypes: ReadonlyArray<'armor' | 'weapon' | 'jewelry'>;
  description: string;
}

export const ESO_TRAITS: ReadonlyArray<TraitDef> = [
  // ─── Armor-only traits ─────────────────────────────────────────────────────
  {
    id: 'divines',
    name: 'Divines',
    slotTypes: ['armor'],
    description: 'Increases Mundus Stone effects.',
  },
  {
    id: 'impenetrable',
    name: 'Impenetrable',
    slotTypes: ['armor'],
    description: 'Increases your Critical Resistance.',
  },
  {
    id: 'reinforced',
    name: 'Reinforced',
    slotTypes: ['armor'],
    description: 'Increases the armor value of this item.',
  },
  {
    id: 'sturdy',
    name: 'Sturdy',
    slotTypes: ['armor'],
    description: 'Reduces the cost of Block.',
  },
  {
    id: 'well-fitted',
    name: 'Well-Fitted',
    slotTypes: ['armor'],
    description: 'Reduces the cost of Roll Dodge and Sprint.',
  },
  {
    id: 'invigorating',
    name: 'Invigorating',
    slotTypes: ['armor'],
    description: 'Increases Health, Magicka, and Stamina Recovery.',
  },
  // ─── Weapon-only traits ────────────────────────────────────────────────────
  {
    id: 'precise',
    name: 'Precise',
    slotTypes: ['weapon'],
    description: 'Increases Weapon and Spell Critical rating.',
  },
  {
    id: 'decisive',
    name: 'Decisive',
    slotTypes: ['weapon'],
    description: 'Chance to gain an additional Ultimate when gaining Ultimate.',
  },
  {
    id: 'sharpened',
    name: 'Sharpened',
    slotTypes: ['weapon'],
    description: 'Increases Armor and Spell Penetration.',
  },
  {
    id: 'defending',
    name: 'Defending',
    slotTypes: ['weapon'],
    description: 'Increases Physical and Spell Resistance.',
  },
  {
    id: 'powered',
    name: 'Powered',
    slotTypes: ['weapon'],
    description: 'Increases your Healing Done.',
  },
  {
    id: 'charged',
    name: 'Charged',
    slotTypes: ['weapon'],
    description: 'Increases your chance to apply status effects.',
  },
  // ─── Jewelry-only traits ───────────────────────────────────────────────────
  {
    id: 'arcane',
    name: 'Arcane',
    slotTypes: ['jewelry'],
    description: 'Increases your Max Magicka.',
  },
  {
    id: 'healthy',
    name: 'Healthy',
    slotTypes: ['jewelry'],
    description: 'Increases your Max Health.',
  },
  {
    id: 'robust',
    name: 'Robust',
    slotTypes: ['jewelry'],
    description: 'Increases your Max Stamina.',
  },
  {
    id: 'triune',
    name: 'Triune',
    slotTypes: ['jewelry'],
    description: 'Increases your Max Magicka, Health, and Stamina.',
  },
  {
    id: 'bloodthirsty',
    name: 'Bloodthirsty',
    slotTypes: ['jewelry'],
    description: 'Increases your Weapon and Spell Damage against enemies below 90% Health.',
  },
  {
    id: 'harmony',
    name: 'Harmony',
    slotTypes: ['jewelry'],
    description: 'Increases the damage and healing of your Synergy abilities.',
  },
  {
    id: 'protective',
    name: 'Protective',
    slotTypes: ['jewelry'],
    description: 'Increases your Physical and Spell Resistance.',
  },
  {
    id: 'swift',
    name: 'Swift',
    slotTypes: ['jewelry'],
    description: 'Increases your Movement Speed.',
  },
  // ─── Shared traits (appear on multiple slot types) ─────────────────────────
  {
    id: 'infused',
    name: 'Infused',
    slotTypes: ['armor', 'weapon', 'jewelry'],
    description:
      'Increases the Enchantment effect on this item. Reduces Enchantment cooldown on weapons.',
  },
  {
    id: 'nirnhoned',
    name: 'Nirnhoned',
    slotTypes: ['armor', 'weapon'],
    description:
      'Increases Spell and Physical Resistance (armor) or Weapon and Spell Damage (weapon).',
  },
  {
    id: 'training',
    name: 'Training',
    slotTypes: ['armor', 'weapon'],
    description: 'Increases experience gained from kills in this item type.',
  },
] as const;

/** Quick name lookup by trait ID. */
export const TRAIT_LOOKUP: Readonly<Record<string, TraitDef>> = Object.fromEntries(
  ESO_TRAITS.map((t) => [t.id, t]),
);

/** Display name for a trait ID, falling back to the raw ID if unknown. */
export function getTraitName(id: string): string {
  return TRAIT_LOOKUP[id]?.name ?? id;
}
