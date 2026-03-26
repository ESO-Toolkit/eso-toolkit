/**
 * Curated ESO potion data for the build editor.
 *
 * Unlike food/drink (auto-generated from UESP recipe data), potions are
 * alchemy-crafted from reagent combinations. Endgame players use a small set
 * of well-known potion archetypes, so a curated list is more practical than
 * scraping all possible combinations.
 *
 * IDs are synthetic (category prefix + index) since alchemy potions don't have
 * fixed item IDs like provisioning recipes.
 */

export type PotionCategory =
  | 'Damage (Magicka)'
  | 'Damage (Stamina)'
  | 'Sustain'
  | 'Defensive'
  | 'Utility'
  | 'Ultimate';

export interface EsoPotion {
  readonly id: number;
  readonly name: string;
  readonly category: PotionCategory;
  readonly effects: readonly string[];
  readonly reagents: readonly string[];
  readonly role: string;
}

export const ESO_POTIONS: readonly EsoPotion[] = [
  // ── Damage (Magicka) ────────────────────────────────────────────────────────
  {
    id: 9001,
    name: 'Essence of Spell Power',
    category: 'Damage (Magicka)',
    effects: ['Restore Magicka', 'Major Sorcery', 'Major Prophecy'],
    reagents: ['Corn Flower', "Lady's Smock", 'Water Hyacinth'],
    role: 'Magicka DPS',
  },
  {
    id: 9002,
    name: 'Essence of Spell Critical',
    category: 'Damage (Magicka)',
    effects: ['Restore Magicka', 'Major Prophecy', 'Major Intellect'],
    reagents: ['Corn Flower', "Lady's Smock", "Namira's Rot"],
    role: 'Magicka DPS',
  },

  // ── Damage (Stamina) ───────────────────────────────────────────────────────
  {
    id: 9011,
    name: 'Essence of Weapon Power',
    category: 'Damage (Stamina)',
    effects: ['Restore Stamina', 'Major Brutality', 'Major Savagery'],
    reagents: ['Blessed Thistle', 'Dragonthorn', 'Wormwood'],
    role: 'Stamina DPS',
  },
  {
    id: 9012,
    name: 'Essence of Weapon Critical',
    category: 'Damage (Stamina)',
    effects: ['Restore Stamina', 'Major Savagery', 'Major Endurance'],
    reagents: ['Blessed Thistle', 'Dragonthorn', "Namira's Rot"],
    role: 'Stamina DPS',
  },

  // ── Sustain ─────────────────────────────────────────────────────────────────
  {
    id: 9021,
    name: 'Essence of Health (Tri-Stat)',
    category: 'Sustain',
    effects: ['Restore Health', 'Restore Magicka', 'Restore Stamina'],
    reagents: ['Bugloss', 'Columbine', 'Mountain Flower'],
    role: 'Tank / Healer / Universal',
  },
  {
    id: 9022,
    name: 'Essence of Health',
    category: 'Sustain',
    effects: ['Restore Health', 'Major Fortitude', 'Major Vitality'],
    reagents: ['Bugloss', 'Mountain Flower', 'Columbine'],
    role: 'Tank',
  },
  {
    id: 9023,
    name: 'Essence of Magicka',
    category: 'Sustain',
    effects: ['Restore Magicka', 'Major Intellect', 'Major Prophecy'],
    reagents: ['Corn Flower', "Lady's Smock", "Namira's Rot"],
    role: 'Magicka',
  },
  {
    id: 9024,
    name: 'Essence of Stamina',
    category: 'Sustain',
    effects: ['Restore Stamina', 'Major Endurance', 'Major Savagery'],
    reagents: ['Blessed Thistle', 'Columbine', "Namira's Rot"],
    role: 'Stamina',
  },
  {
    id: 9025,
    name: 'Heroic Tri-Stat Potion',
    category: 'Sustain',
    effects: ['Restore Health', 'Restore Magicka', 'Restore Stamina'],
    reagents: ['Bugloss', 'Columbine', 'Mountain Flower'],
    role: 'Tank / Healer',
  },

  // ── Defensive ──────────────────────────────────────────────────────────────
  {
    id: 9031,
    name: 'Essence of Armor',
    category: 'Defensive',
    effects: ['Major Resolve', 'Restore Health', 'Major Fortitude'],
    reagents: ['Beetle Scuttle', 'Bugloss', 'Iron Weed'],
    role: 'Tank',
  },
  {
    id: 9032,
    name: 'Essence of Immovability',
    category: 'Defensive',
    effects: ['Unstoppable', 'Restore Health', 'Major Fortitude'],
    reagents: ['Columbine', 'Mountain Flower', 'Wormwood'],
    role: 'Tank / PvP',
  },
  {
    id: 9033,
    name: 'Essence of Lingering Health',
    category: 'Defensive',
    effects: ['Restore Health', 'Lingering Restore Health', 'Major Fortitude'],
    reagents: ['Bugloss', 'Columbine', 'Imp Stool'],
    role: 'Tank',
  },

  // ── Utility ────────────────────────────────────────────────────────────────
  {
    id: 9041,
    name: 'Essence of Speed',
    category: 'Utility',
    effects: ['Major Expedition', 'Restore Stamina', 'Major Endurance'],
    reagents: ['Blessed Thistle', "Namira's Rot", 'Scrib Jelly'],
    role: 'Utility / Trash',
  },
  {
    id: 9042,
    name: 'Essence of Invisibility',
    category: 'Utility',
    effects: ['Invisibility', 'Restore Health', 'Major Fortitude'],
    reagents: ['Blue Entoloma', "Namira's Rot", 'Nirnroot'],
    role: 'Utility / Trash',
  },
  {
    id: 9043,
    name: 'Essence of Detection',
    category: 'Utility',
    effects: ['Detection', 'Restore Magicka', 'Major Intellect'],
    reagents: ['Corn Flower', "Lady's Smock", 'Wormwood'],
    role: 'PvP',
  },
  {
    id: 9044,
    name: 'Trash Speed Potion',
    category: 'Utility',
    effects: ['Major Expedition', 'Invisibility', 'Restore Stamina'],
    reagents: ['Blessed Thistle', "Namira's Rot", 'Blue Entoloma'],
    role: 'Trash / Skip',
  },

  // ── Ultimate ───────────────────────────────────────────────────────────────
  {
    id: 9051,
    name: 'Essence of Heroism',
    category: 'Ultimate',
    effects: ['Heroism', 'Restore Health', 'Restore Stamina'],
    reagents: ['Columbine', "Dragon's Blood", 'Mountain Flower'],
    role: 'Tank / Healer',
  },
  {
    id: 9052,
    name: 'Alliance Spell Draught',
    category: 'Ultimate',
    effects: ['Restore Magicka', 'Major Sorcery', 'Heroism'],
    reagents: ['Corn Flower', "Dragon's Blood", "Lady's Smock"],
    role: 'Magicka DPS',
  },
  {
    id: 9053,
    name: 'Alliance Weapon Draught',
    category: 'Ultimate',
    effects: ['Restore Stamina', 'Major Brutality', 'Heroism'],
    reagents: ['Blessed Thistle', "Dragon's Blood", 'Dragonthorn'],
    role: 'Stamina DPS',
  },
] as const;

export const ESO_POTION_LOOKUP: Readonly<Record<number, EsoPotion>> = Object.freeze(
  Object.fromEntries(ESO_POTIONS.map((item) => [item.id, item])),
);

export const ESO_POTION_CATEGORIES: readonly PotionCategory[] = [
  'Damage (Magicka)',
  'Damage (Stamina)',
  'Sustain',
  'Defensive',
  'Utility',
  'Ultimate',
] as const;
