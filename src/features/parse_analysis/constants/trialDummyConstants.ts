/**
 * Trial Dummy (Target Iron Atronach) Constants
 *
 * These are the buffs and debuffs that the trial dummy provides to simulate
 * group support in a raid environment.
 *
 * DATA SOURCE: Extracted from ESO Logs report 7j2pF6fwCmJv4zdt, Fight 2
 * Generated on: October 24, 2025
 *
 * The trial dummy (Target Iron Atronach - typically 21M or 51M HP versions) provides
 * all major group support buffs that would normally come from other players in a trial.
 * This allows players to practice rotations and test DPS in a realistic environment.
 *
 * IMPORTANT: These buff IDs are hardcoded based on actual combat log data.
 * Multiple ability IDs may represent the same buff due to different sources or morphs.
 */

/**
 * Buffs provided by the Target Iron Atronach trial dummy.
 * These simulate group support buffs that would be provided by other players in a trial.
 */
export const TRIAL_DUMMY_BUFF_IDS = new Set<number>([
  // Major Buffs
  61747, // Major Force
  93109, // Major Slayer
  109966, // Major Courage
  120013, // Major Force (alternate)
  120015, // Major Courage (alternate)
  177886, // Major Slayer (alternate)

  // Minor Buffs
  61662, // Minor Brutality
  61666, // Minor Savagery
  61685, // Minor Sorcery
  61691, // Minor Prophecy
  61708, // Minor Heroism
  61744, // Minor Berserk
  120008, // Minor Berserk (alternate)
  120017, // Minor Sorcery (alternate)
  120023, // Minor Brutality (alternate)
  120028, // Minor Prophecy (alternate)
  120029, // Minor Savagery (alternate)
  147417, // Minor Courage
  177885, // Minor Courage (alternate)

  // Support Abilities
  121572, // Spear Shards
  121630, // Spear Shards (alternate)
  120021, // Aggressive Horn (alternate)
  120024, // Worm's Raiment
  120025, // Aggressive Horn
  120026, // Hircine's Veneer
]);

/**
 * Debuffs that the Target Iron Atronach applies to itself.
 * These are mechanics that the dummy has to allow certain player interactions.
 */
export const TRIAL_DUMMY_SELF_DEBUFF_IDS = new Set<number>([
  88401, // Minor Magickasteal
  120014, // Off Balance
  134599, // Off Balance Immunity
  149012, // Minor Magickasteal (alternate)
]);

/**
 * Human-readable names for trial dummy buffs.
 * Used for displaying which buffs are active/missing in parse analysis.
 */
export const TRIAL_DUMMY_BUFF_NAMES: Record<number, string> = {
  // Major Buffs
  61747: 'Major Force',
  93109: 'Major Slayer',
  109966: 'Major Courage',
  120013: 'Major Force',
  120015: 'Major Courage',
  177886: 'Major Slayer',

  // Minor Buffs
  61662: 'Minor Brutality',
  61666: 'Minor Savagery',
  61685: 'Minor Sorcery',
  61691: 'Minor Prophecy',
  61708: 'Minor Heroism',
  61744: 'Minor Berserk',
  120008: 'Minor Berserk',
  120017: 'Minor Sorcery',
  120023: 'Minor Brutality',
  120028: 'Minor Prophecy',
  120029: 'Minor Savagery',
  147417: 'Minor Courage',
  177885: 'Minor Courage',

  // Support Abilities
  121572: 'Spear Shards',
  121630: 'Spear Shards',
  120021: 'Aggressive Horn',
  120024: "Worm's Raiment",
  120025: 'Aggressive Horn',
  120026: "Hircine's Veneer",
};

/**
 * Human-readable names for trial dummy self-debuffs.
 */
export const TRIAL_DUMMY_SELF_DEBUFF_NAMES: Record<number, string> = {
  88401: 'Minor Magickasteal',
  120014: 'Off Balance',
  134599: 'Off Balance Immunity',
  149012: 'Minor Magickasteal',
};

/**
 * Categorized list of trial dummy buffs for better organization.
 */
export const TRIAL_DUMMY_BUFF_CATEGORIES = {
  majorBuffs: [61747, 93109, 109966, 120013, 120015, 177886],
  minorBuffs: [
    61662, 61666, 61685, 61691, 61708, 61744, 120008, 120017, 120023, 120028, 120029, 147417,
    177885,
  ],
  supportAbilities: [121572, 121630, 120021, 120024, 120025, 120026],
} as const;

/**
 * Key trial dummy buffs that significantly impact DPS.
 * Used for highlighting critical missing buffs in parse analysis.
 */
export const CRITICAL_TRIAL_DUMMY_BUFFS = new Set<number>([
  93109, // Major Slayer - Essential for parse DPS
  177886, // Major Slayer (alternate)
  61747, // Major Force - Increases critical damage
  120013, // Major Force (alternate)
  109966, // Major Courage - Significant spell/weapon damage boost
  120015, // Major Courage (alternate)
  61744, // Minor Berserk - Damage increase
  120008, // Minor Berserk (alternate)
]);

/**
 * Valid trial dummy target names.
 * These are the only enemy targets that qualify as trial dummies for parse analysis.
 */
export const TRIAL_DUMMY_TARGET_NAMES = [
  'Target Iron Atronach',
  'Target Harrowing Reaper, Raid',
] as const;
