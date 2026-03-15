/**
 * ESO Champion Point Passive Stars (per-tree node allocations).
 * These are separate from the slottable active perks in CHAMPION_POINT_ABILITIES.
 * Max points per node follows the in-game cap (mostly 10).
 */

export interface CPPassive {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
}

export const WARFARE_PASSIVES: CPPassive[] = [
  {
    id: 'battle-mastery',
    name: 'Battle Mastery',
    description: 'Increases your chance to apply a Martial status effect by 30% per stage.',
    maxPoints: 10,
  },
  {
    id: 'blessed',
    name: 'Blessed',
    description: 'Increases your Healing Done by 1% per stage.',
    maxPoints: 10,
  },
  {
    id: 'eldritch-insight',
    name: 'Eldritch Insight',
    description: 'Grants 260 Max Magicka per stage.',
    maxPoints: 10,
  },
  {
    id: 'elemental-aegis',
    name: 'Elemental Aegis',
    description: 'Reduces damage from Magical attacks by 1% per stage.',
    maxPoints: 10,
  },
  {
    id: 'flawless-ritual',
    name: 'Flawless Ritual',
    description: 'Increases your chance to apply a Magical status effect by 30% per stage.',
    maxPoints: 10,
  },
  {
    id: 'hardy',
    name: 'Hardy',
    description: 'Reduces damage from Martial attacks by 1% per stage.',
    maxPoints: 10,
  },
  {
    id: 'mighty',
    name: 'Mighty',
    description: 'Grants 100 Weapon and Spell Damage to Martial attacks per stage.',
    maxPoints: 10,
  },
  {
    id: 'piercing',
    name: 'Piercing',
    description: 'Grants 350 Offensive Penetration per stage.',
    maxPoints: 10,
  },
  {
    id: 'precision',
    name: 'Precision',
    description: 'Grants 160 Critical Chance per stage.',
    maxPoints: 10,
  },
  {
    id: 'preparation',
    name: 'Preparation',
    description: 'Reduces damage taken from non-player attacks by 5% per stage.',
    maxPoints: 10,
  },
  {
    id: 'quick-recovery',
    name: 'Quick Recovery',
    description: 'Increases your healing received by 1% per stage.',
    maxPoints: 10,
  },
  {
    id: 'tireless-discipline',
    name: 'Tireless Discipline',
    description: 'Grants 260 Max Stamina per stage.',
    maxPoints: 10,
  },
  {
    id: 'war-mage',
    name: 'War Mage',
    description: 'Grants 100 Weapon and Spell Damage to Magical attacks per stage.',
    maxPoints: 10,
  },
];

export const FITNESS_PASSIVES: CPPassive[] = [
  {
    id: 'bashing-brutality',
    name: 'Bashing Brutality',
    description: 'Increases your Bash damage by 60 per stage.',
    maxPoints: 10,
  },
  {
    id: 'defiance',
    name: 'Defiance',
    description: 'Reduces the cost of Break Free by 110 Stamina per stage.',
    maxPoints: 10,
  },
  {
    id: 'fortification',
    name: 'Fortification',
    description: 'Increases the amount of damage you can block by 2% per stage.',
    maxPoints: 10,
  },
  {
    id: 'hasty',
    name: 'Hasty',
    description: 'Increases Movement Speed while Sprinting by 2% per stage.',
    maxPoints: 10,
  },
  {
    id: 'heros-vigor',
    name: "Hero's Vigor",
    description: 'Grants 280 Max Health per stage.',
    maxPoints: 10,
  },
  {
    id: 'mystic-tenacity',
    name: 'Mystic Tenacity',
    description: 'Reduces the duration of Elemental Status Effects by 5% per stage.',
    maxPoints: 10,
  },
  {
    id: 'nimble-protector',
    name: 'Nimble Protector',
    description: 'Increases Movement Speed while Bracing by 3% per stage.',
    maxPoints: 10,
  },
  {
    id: 'piercing-gaze',
    name: 'Piercing Gaze',
    description: 'Increases Stealth Detection by 1 meter per stage.',
    maxPoints: 10,
  },
  {
    id: 'savage-defense',
    name: 'Savage Defense',
    description: 'Reduces the cost of Bash by 45 Stamina per stage.',
    maxPoints: 10,
  },
  {
    id: 'sprinter',
    name: 'Sprinter',
    description: 'Reduces the cost of Sprint by 20 Stamina per stage.',
    maxPoints: 10,
  },
  {
    id: 'tempered-soul',
    name: 'Tempered Soul',
    description: 'Return to life after resurrection with 5% more resources per stage.',
    maxPoints: 10,
  },
  {
    id: 'tireless-guardian',
    name: 'Tireless Guardian',
    description: 'Reduces the cost of Block by 20 Stamina per stage.',
    maxPoints: 10,
  },
  {
    id: 'tumbling',
    name: 'Tumbling',
    description: 'Reduces the cost of Roll Dodge by 120 Stamina per stage.',
    maxPoints: 10,
  },
];

export const CRAFT_PASSIVES: CPPassive[] = [
  {
    id: 'breakfall',
    name: 'Breakfall',
    description: 'Reduces your fall damage taken by 7% per stage.',
    maxPoints: 10,
  },
  {
    id: 'cutpurses-art',
    name: "Cutpurse's Art",
    description: 'Increases chance to get higher-quality loot when pickpocketing.',
    maxPoints: 10,
  },
  {
    id: 'discipline-artisan',
    name: 'Discipline Artisan',
    description: 'Increases experience gain for active skill lines by 3% per stage.',
    maxPoints: 10,
  },
  {
    id: 'fleet-phantom',
    name: 'Fleet Phantom',
    description: 'Reduces Movement Speed penalty of Sneak by 5% per stage.',
    maxPoints: 10,
  },
  {
    id: 'fortunes-favor',
    name: "Fortune's Favor",
    description: 'Increases gold found in treasure chests by 10% per stage.',
    maxPoints: 10,
  },
  {
    id: 'gilded-fingers',
    name: 'Gilded Fingers',
    description: 'Increases your gold gained by 2% per stage.',
    maxPoints: 10,
  },
  {
    id: 'homemaker',
    name: 'Homemaker',
    description: '10% chance to find a second furnishing plan.',
    maxPoints: 1,
  },
  {
    id: 'infamous',
    name: 'Infamous',
    description: 'Increases the value of fenced items by 25%.',
    maxPoints: 10,
  },
  {
    id: 'inspiration-boost',
    name: 'Inspiration Boost',
    description: 'Increases crafting inspiration by 10% per stage.',
    maxPoints: 10,
  },
  {
    id: 'liquid-efficiency',
    name: 'Liquid Efficiency',
    description: '10% chance to not consume a potion or poison.',
    maxPoints: 1,
  },
  {
    id: 'meticulous-disassembly',
    name: 'Meticulous Disassembly',
    description: 'Improves extraction of crafting ingredients.',
    maxPoints: 10,
  },
  {
    id: 'out-of-sight',
    name: 'Out of Sight',
    description: 'Reduces detection radius while Sneaking by 1 meter per stage.',
    maxPoints: 10,
  },
  {
    id: 'plentiful-harvest',
    name: 'Plentiful Harvest',
    description: '10% chance for double yield from resource nodes per stage.',
    maxPoints: 10,
  },
  {
    id: 'professional-upkeep',
    name: 'Professional Upkeep',
    description: 'Reduces cost of repairing armor by 1% per stage.',
    maxPoints: 10,
  },
  {
    id: 'rationer',
    name: 'Rationer',
    description: 'Adds 10 minutes to food/drink duration per stage.',
    maxPoints: 10,
  },
  {
    id: 'soul-reservoir',
    name: 'Soul Reservoir',
    description: '33% chance to not consume a Soul Gem on resurrection.',
    maxPoints: 1,
  },
  {
    id: 'steadfast-enchantment',
    name: 'Steadfast Enchantment',
    description: '10% chance to not consume a Weapon Enchantment charge per stage.',
    maxPoints: 10,
  },
  {
    id: 'treasure-hunter',
    name: 'Treasure Hunter',
    description: 'Increases quality of items found in treasure chests.',
    maxPoints: 1,
  },
  {
    id: 'wanderer',
    name: 'Wanderer',
    description: 'Reduces cost of Wayshrine usage by 10% per stage.',
    maxPoints: 10,
  },
];

export const CP_PASSIVES_BY_TREE = {
  warfare: WARFARE_PASSIVES,
  fitness: FITNESS_PASSIVES,
  craft: CRAFT_PASSIVES,
} as const;
