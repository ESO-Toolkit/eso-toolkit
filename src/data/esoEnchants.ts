/**
 * ESO Gear Enchants (Glyphs) — static data.
 * Covers armor, weapon, and jewelry glyphs used in endgame builds.
 */

export interface EnchantDef {
  id: string;
  name: string;
  slotTypes: ReadonlyArray<'armor' | 'weapon' | 'jewelry'>;
  stat: string;
}

export const ESO_ENCHANTS: ReadonlyArray<EnchantDef> = [
  // ─── Armor glyphs ──────────────────────────────────────────────────────────
  {
    id: 'health',
    name: 'Glyph of Health',
    slotTypes: ['armor'],
    stat: '+Max Health',
  },
  {
    id: 'magicka',
    name: 'Glyph of Magicka',
    slotTypes: ['armor'],
    stat: '+Max Magicka',
  },
  {
    id: 'stamina',
    name: 'Glyph of Stamina',
    slotTypes: ['armor'],
    stat: '+Max Stamina',
  },
  {
    id: 'prismatic-defense',
    name: 'Glyph of Prismatic Defense',
    slotTypes: ['armor'],
    stat: '+Max Health, Magicka & Stamina',
  },
  {
    id: 'shielding',
    name: 'Glyph of Shielding',
    slotTypes: ['armor'],
    stat: 'Reduces Block cost',
  },
  {
    id: 'poisons',
    name: 'Glyph of Poisons',
    slotTypes: ['armor'],
    stat: 'Reduces Poison damage taken',
  },
  {
    id: 'bashing',
    name: 'Glyph of Bashing',
    slotTypes: ['armor'],
    stat: '+Bash damage',
  },
  {
    id: 'absorb-health',
    name: 'Glyph of Absorb Health',
    slotTypes: ['armor'],
    stat: 'Absorbs Health on hit',
  },
  {
    id: 'absorb-magicka',
    name: 'Glyph of Absorb Magicka',
    slotTypes: ['armor'],
    stat: 'Absorbs Magicka on hit',
  },
  {
    id: 'absorb-stamina',
    name: 'Glyph of Absorb Stamina',
    slotTypes: ['armor'],
    stat: 'Absorbs Stamina on hit',
  },
  {
    id: 'reduce-feat-cost',
    name: 'Glyph of Reduced Feat Cost',
    slotTypes: ['armor', 'jewelry'],
    stat: 'Reduces ability cost',
  },
  // ─── Weapon glyphs ─────────────────────────────────────────────────────────
  {
    id: 'weapon-damage',
    name: 'Glyph of Weapon Damage',
    slotTypes: ['weapon', 'jewelry'],
    stat: '+Weapon & Spell Damage',
  },
  {
    id: 'flame',
    name: 'Glyph of Flame',
    slotTypes: ['weapon'],
    stat: 'Deals Flame Damage on hit',
  },
  {
    id: 'frost',
    name: 'Glyph of Frost',
    slotTypes: ['weapon'],
    stat: 'Deals Frost Damage & Chills on hit',
  },
  {
    id: 'shock',
    name: 'Glyph of Shock',
    slotTypes: ['weapon'],
    stat: 'Deals Shock Damage on hit',
  },
  {
    id: 'poison',
    name: 'Glyph of Poison',
    slotTypes: ['weapon'],
    stat: 'Deals Poison Damage on hit',
  },
  {
    id: 'disease',
    name: 'Glyph of Disease',
    slotTypes: ['weapon'],
    stat: 'Deals Disease Damage on hit',
  },
  {
    id: 'hardening',
    name: 'Glyph of Hardening',
    slotTypes: ['weapon'],
    stat: 'Grants a Damage Shield on hit',
  },
  {
    id: 'weakening',
    name: 'Glyph of Weakening',
    slotTypes: ['weapon'],
    stat: 'Reduces enemy Weapon & Spell Damage',
  },
  {
    id: 'oblivion',
    name: 'Glyph of Oblivion',
    slotTypes: ['weapon'],
    stat: 'Deals Oblivion Damage on hit',
  },
  {
    id: 'life-drain',
    name: 'Glyph of Life Drain',
    slotTypes: ['weapon'],
    stat: 'Absorbs Health on hit',
  },
  {
    id: 'crushing',
    name: 'Glyph of Crushing',
    slotTypes: ['weapon'],
    stat: 'Reduces enemy Physical & Spell Resistance',
  },
  {
    id: 'weapon-critical',
    name: 'Glyph of Weapon Critical',
    slotTypes: ['weapon'],
    stat: '+Weapon & Spell Critical',
  },
  // ─── Jewelry glyphs ────────────────────────────────────────────────────────
  {
    id: 'spell-damage',
    name: 'Glyph of Spell Damage',
    slotTypes: ['jewelry'],
    stat: '+Weapon & Spell Damage',
  },
  {
    id: 'magicka-recovery',
    name: 'Glyph of Magicka Recovery',
    slotTypes: ['jewelry'],
    stat: '+Magicka Recovery',
  },
  {
    id: 'stamina-recovery',
    name: 'Glyph of Stamina Recovery',
    slotTypes: ['jewelry'],
    stat: '+Stamina Recovery',
  },
  {
    id: 'health-recovery',
    name: 'Glyph of Health Recovery',
    slotTypes: ['jewelry'],
    stat: '+Health Recovery',
  },
  {
    id: 'prismatic-recovery',
    name: 'Glyph of Prismatic Recovery',
    slotTypes: ['jewelry'],
    stat: '+Magicka, Health & Stamina Recovery',
  },
  {
    id: 'increase-physical-harm',
    name: 'Glyph of Increase Physical Harm',
    slotTypes: ['jewelry'],
    stat: '+Physical Penetration',
  },
  {
    id: 'increase-magical-harm',
    name: 'Glyph of Increase Magical Harm',
    slotTypes: ['jewelry'],
    stat: '+Spell Penetration',
  },
  {
    id: 'reduce-block-cost',
    name: 'Glyph of Reduced Block Cost',
    slotTypes: ['jewelry'],
    stat: 'Reduces Block cost',
  },
] as const;

/** Quick lookup by enchant ID. */
export const ENCHANT_LOOKUP: Readonly<Record<string, EnchantDef>> = Object.fromEntries(
  ESO_ENCHANTS.map((e) => [e.id, e]),
);

/** Display name for an enchant ID, falling back to the raw ID if unknown. */
export function getEnchantName(id: string): string {
  return ENCHANT_LOOKUP[id]?.name ?? id;
}
