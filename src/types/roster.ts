/**
 * Types for Roster Builder feature
 * Defines the structure for raid roster management including roles, gear sets, and assignments
 */

/**
 * Role types in a raid
 */
export enum RosterRole {
  TANK = 'tank',
  HEALER = 'healer',
  DD = 'dd', // Damage Dealer
}

/**
 * Support role ultimates that can be assigned
 */
export enum SupportUltimate {
  WARHORN = 'Aggressive Warhorn',
  COLOSSUS = 'Glacial Colossus',
  BARRIER = 'Barrier',
  ATRONACH = 'Greater Storm Atronach',
}

/**
 * Healer-specific buff assignments
 */
export enum HealerBuff {
  ENLIVENING_OVERFLOW = 'Enlivening Overflow',
  FROM_THE_BRINK = 'From the Brink',
}

/**
 * ESO Class skill lines - organized by class with all 3 skill lines
 */
export const CLASS_SKILL_LINES = [
  // Dragonknight
  'Ardent Flame',
  'Draconic Power',
  'Earthen Heart',

  // Sorcerer
  'Dark Magic',
  'Daedric Summoning',
  'Storm Calling',

  // Nightblade
  'Assassination',
  'Shadow',
  'Siphoning',

  // Templar
  'Aedric Spear',
  "Dawn's Wrath",
  'Restoring Light',

  // Warden
  'Animal Companions',
  'Green Balance',
  "Winter's Embrace",

  // Necromancer
  'Grave Lord',
  'Bone Tyrant',
  'Living Death',

  // Arcanist
  'Herald of the Tome',
  'Apocryphal Soldier',
  'Curative Runeforms',
] as const;

/**
 * Skill line configuration for a player
 */
export interface SkillLineConfig {
  line1: string;
  line2: string;
  line3: string;
  isFlex: boolean; // If true, skill lines can be flexible
  notes?: string;
}

/**
 * Player group assignment
 */
export interface PlayerGroup {
  groupName: string; // e.g., "Slayer Stack 1", "Group A", etc.
  groupNumber?: number; // Optional numeric identifier
  notes?: string;
}

/**
 * Tank gear set configuration
 */
export interface TankGearSet {
  set1: string; // First 5-piece set
  set2: string; // Second 5-piece set
  monsterSet?: string; // 2-piece monster set (head + shoulders)
  additionalSets?: string[]; // Optional additional sets (e.g., arena weapons, mythics)
  notes?: string;
}

/**
 * DPS slot configuration
 */
export interface DPSSlot {
  slotNumber: number; // 1-8
  playerName?: string;
  playerNumber?: number;
  roleNotes?: string; // e.g., "Portal L - Ele sus", "Z'en", etc.
  gearSets?: string[]; // Optional gear set tracking
  skillLines?: SkillLineConfig;
  group?: PlayerGroup;
  notes?: string;
}

/**
 * Healer configuration
 */
export interface HealerSetup {
  playerName?: string;
  playerNumber?: number; // Optional player identifier (1, 2, etc.)
  roleLabel?: string; // e.g., "H1", "H2"
  roleNotes?: string; // e.g., "TOMB HEALER", "TOMB 1B"
  set1: string; // First 5-piece set
  set2: string; // Second 5-piece set
  monsterSet?: string; // 2-piece monster set (head + shoulders)
  additionalSets?: string[]; // For mythics or special items
  skillLines: SkillLineConfig;
  healerBuff: HealerBuff | null;
  ultimate: SupportUltimate | null;
  group?: PlayerGroup;
  notes?: string;
}

/**
 * Tank configuration
 */
export interface TankSetup {
  playerName?: string;
  playerNumber?: number; // Optional player identifier (1, 2, etc.)
  roleLabel?: string; // e.g., "MT", "OT"
  roleNotes?: string; // e.g., "TOMB 1A", "TOMB 1B"
  gearSets: TankGearSet;
  skillLines: SkillLineConfig;
  ultimate: SupportUltimate | null;
  specificSkills: string[];
  group?: PlayerGroup;
  notes?: string;
}

/**
 * Damage Dealer special requirements
 */
export interface DDRequirement {
  type: 'war-machine-mk' | 'zen-alkosh';
  playerName?: string;
  playerNumber?: number; // Optional player identifier
  skillLines: SkillLineConfig;
  group?: PlayerGroup;
  notes?: string;
}

/**
 * Complete roster configuration
 */
export interface RaidRoster {
  rosterName: string;
  createdAt: string;
  updatedAt: string;

  // 2 Tanks
  tank1: TankSetup;
  tank2: TankSetup;

  // 2 Healers
  healer1: HealerSetup;
  healer2: HealerSetup;

  // DPS Slots (1-8)
  dpsSlots: DPSSlot[];

  // DD Requirements (legacy/special roles)
  ddRequirements: DDRequirement[];

  // Available player groups (for organizing players)
  availableGroups: string[]; // e.g., ["Left Stack", "Right Stack", "Slayer Stack 1"]

  // General notes
  notes?: string;
}

/**
 * Default skill line configuration
 */
export const defaultSkillLineConfig = (): SkillLineConfig => ({
  line1: '',
  line2: '',
  line3: '',
  isFlex: false,
});

/**
 * Default tank setup
 */
export const defaultTankSetup = (): TankSetup => ({
  gearSets: {
    set1: '',
    set2: '',
  },
  skillLines: defaultSkillLineConfig(),
  ultimate: null,
  specificSkills: [],
});

/**
 * Default healer setup
 */
export const defaultHealerSetup = (): HealerSetup => ({
  set1: '',
  set2: '',
  skillLines: defaultSkillLineConfig(),
  healerBuff: null,
  ultimate: null,
});

/**
 * Create default DPS slots (1-8)
 */
export const createDefaultDPSSlots = (): DPSSlot[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    slotNumber: i + 1,
  }));
};

/**
 * Default roster
 */
export const createDefaultRoster = (): RaidRoster => ({
  rosterName: 'New Roster',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tank1: defaultTankSetup(),
  tank2: defaultTankSetup(),
  healer1: defaultHealerSetup(),
  healer2: defaultHealerSetup(),
  dpsSlots: createDefaultDPSSlots(),
  ddRequirements: [],
  availableGroups: ['Left Stack', 'Right Stack'],
});

/**
 * Set categories for organized management
 */
export enum SetCategory {
  RECOMMENDED = 'Recommended', // Always-run sets
  TANK = 'Tank Sets',
  HEALER = 'Healer Sets',
  FLEXIBLE = 'Flexible (Tank/Healer)',
  MONSTER = 'Monster Sets',
  DD_SPECIAL = 'DD Special Sets',
}

/**
 * Support set configuration
 */
export interface SupportSet {
  name: string;
  category: SetCategory;
  isRecommended?: boolean; // For quick highlighting
  description?: string;
}

/**
 * Recommended 5-piece sets that should always be run
 * Based on data analysis from boss fights (November 2025)
 * Perfected and non-perfected versions combined into single entries
 * Alphabetically sorted
 *
 * Configuration: These can ONLY be assigned to set1/set2 slots
 */
export const RECOMMENDED_5PIECE_SETS: readonly string[] = [
  'Claw of Yolnahkriin', // 17.7% (Tank: 31%, Healer: 6%)
  "Jorvuld's Guidance", // 11.3% (Tank: 0%, Healer: 21%)
  'Lucent Echoes', // 25.8% (Tank: 45%, Healer: 9%)
  'Pearlescent Ward', // 29.0% (Tank: 52%, Healer: 9%)
  "Pillager's Profit", // 19.4% (Tank: 24%, Healer: 15%)
  'Powerful Assault', // 19.4% (Tank: 3%, Healer: 33%)
  'Roaring Opportunist', // 11.3% (Tank: 0%, Healer: 21%)
  'Saxhleel Champion', // 11.3% (Tank: 21%, Healer: 3%)
  'Spell Power Cure', // 17.7% (Tank: 0%, Healer: 33%)
] as const;

/**
 * Recommended 2-piece monster sets
 * Based on data analysis from boss fights (November 2025)
 * Alphabetically sorted
 *
 * Configuration: These can ONLY be assigned to monsterSet slot
 */
export const RECOMMENDED_2PIECE_SETS: readonly string[] = [
  'Baron Zaudrus', //  3.2% (Tank: 7%, Healer: 0%)
  'Nazaray', // 22.6% (Tank: 38%, Healer: 9%)
  'Symphony of Blades', // 14.5% (Tank: 0%, Healer: 27%)
  'Tremorscale', //  1.6% (Tank: 3%, Healer: 0%)
] as const;

/**
 * Recommended 1-piece sets (mythic items)
 * Based on data analysis from boss fights (November 2025)
 * Alphabetically sorted
 *
 * Configuration: These can be assigned to additionalSets
 */
export const RECOMMENDED_1PIECE_SETS: readonly string[] = [
  'Pearls of Ehlnofey', // 17.7% (Tank: 0%, Healer: 33%)
] as const;

/**
 * All recommended sets combined
 * TOP 14 sets to meet typical 12+ support set requirements
 * Note: 9 five-piece sets + 4 two-piece monster sets + 1 one-piece mythic = 14 total support sets
 */
export const RECOMMENDED_SETS: readonly string[] = [
  ...RECOMMENDED_5PIECE_SETS,
  ...RECOMMENDED_2PIECE_SETS,
  ...RECOMMENDED_1PIECE_SETS,
] as const;

/**
 * Slot type restrictions for set assignment
 * Defines which sets can be assigned to which slots
 */
export interface SetSlotRestrictions {
  fivePieceSets: readonly string[]; // Can only go in set1/set2
  monsterSets: readonly string[]; // Can only go in monsterSet (includes 2-piece and 1-piece)
  flexibleSets: readonly string[]; // Can go in additionalSets
}

/**
 * Set slot restrictions configuration
 * Easy to update for future changes
 * Note: Monster slot accepts both 2-piece monster sets and 1-piece mythic sets
 */
export const SET_SLOT_RESTRICTIONS: SetSlotRestrictions = {
  fivePieceSets: RECOMMENDED_5PIECE_SETS,
  monsterSets: [...RECOMMENDED_2PIECE_SETS, ...RECOMMENDED_1PIECE_SETS],
  flexibleSets: RECOMMENDED_1PIECE_SETS,
};

/**
 * Helper function to check if a set can be assigned to set1/set2 slots
 */
export const canAssignToFivePieceSlot = (setName: string): boolean => {
  return (SET_SLOT_RESTRICTIONS.fivePieceSets as readonly string[]).includes(setName);
};

/**
 * Helper function to check if a set can be assigned to monster set slot
 * Accepts both 2-piece monster sets and 1-piece mythic sets
 */
export const canAssignToMonsterSlot = (setName: string): boolean => {
  return (SET_SLOT_RESTRICTIONS.monsterSets as readonly string[]).includes(setName);
};

/**
 * Helper function to check if a set is a 5-piece set (for filtering autocomplete options)
 */
export const isFivePieceSet = (setName: string): boolean => {
  return canAssignToFivePieceSlot(setName);
};

/**
 * Helper function to check if a set is a monster set (for filtering autocomplete options)
 */
export const isMonsterSet = (setName: string): boolean => {
  return canAssignToMonsterSlot(setName);
};

/**
 * Tank-specific 5-piece support sets
 * Ordered by frequency in actual usage data
 * Can only be assigned to set1/set2 slots
 */
export const TANK_5PIECE_SETS: readonly string[] = [
  "Pillager's Profit", // 8.8% occurrence (15% of tanks)
  'Turning Tide', // 8.8% occurrence (9% of tanks, also used by healers)
  'War Machine', // 4.4% occurrence (6% of tanks)
  'Pearlescent Ward', // 1.5% occurrence (3% of tanks)
  // Less common but still viable options:
  'Yolnahkriin',
  'Alkosh',
  'Saxhleel Champion',
  "Drake's Rush",
  'Crimson Oath',
  'Encratis',
] as const;

/**
 * Tank-specific monster sets
 * Can only be assigned to monsterSet slot
 */
export const TANK_MONSTER_SETS: readonly string[] = [
  'Tremorscale', // 4.4% occurrence (9% of tanks)
  'Baron Zaudrus', // 2.9% occurrence (6% of tanks)
  'Sentinel of Rkugamz',
  'Stone Husk',
  'Bloodspawn',
  'Lord Warden',
] as const;

/**
 * All tank sets combined (for backwards compatibility)
 */
export const TANK_SETS: readonly string[] = [...TANK_5PIECE_SETS, ...TANK_MONSTER_SETS] as const;

/**
 * Healer-specific 5-piece support sets
 * Ordered by frequency in actual usage data
 * Can only be assigned to set1/set2 slots
 */
export const HEALER_5PIECE_SETS: readonly string[] = [
  'Powerful Assault', // 17.6% occurrence (31% of healers)
  'Spell Power Cure', // 17.6% occurrence (34% of healers)
  "Jorvuld's Guidance", // 11.8% occurrence (23% of healers)
  'Master Architect', // 4.4% occurrence (9% of healers)
  'Roaring Opportunist', // 4.4% occurrence (9% of healers)
  'Combat Physician', // 1.5% occurrence (3% of healers)
  // Less common but still viable options:
  "Pillager's Profit",
  "Worm's Raiment",
  'Olorime',
  'Martial Knowledge',
  "Zen's Redress",
] as const;

/**
 * Healer-specific monster sets
 * Can only be assigned to monsterSet slot
 */
export const HEALER_MONSTER_SETS: readonly string[] = [
  'Symphony of Blades', // 13.2% occurrence (26% of healers)
  'Sentinel of Rkugamz',
  'Encratis',
  'Engine Guardian',
] as const;

/**
 * All healer sets combined (for backwards compatibility)
 */
export const HEALER_SETS: readonly string[] = [
  ...HEALER_5PIECE_SETS,
  ...HEALER_MONSTER_SETS,
] as const;

/**
 * 5-piece sets that can be run on either tanks or healers
 * Based on actual cross-role usage patterns
 * Can only be assigned to set1/set2 slots
 */
export const FLEXIBLE_5PIECE_SETS: readonly string[] = [
  'Turning Tide', // Used by both roles (3 tanks, 3 healers)
  'War Machine', // Primarily tank, some healer usage
  'Pearlescent Ward', // Historically flexible, low current usage
  'Combat Physician', // Can be used by both roles
] as const;

/**
 * Monster sets that can be run on either tanks or healers
 * Can only be assigned to monsterSet slot
 */
export const FLEXIBLE_MONSTER_SETS: readonly string[] = [
  'Sentinel of Rkugamz',
  'Encratis',
] as const;

/**
 * All flexible sets combined (for backwards compatibility)
 */
export const FLEXIBLE_SETS: readonly string[] = [
  ...FLEXIBLE_5PIECE_SETS,
  ...FLEXIBLE_MONSTER_SETS,
] as const;

/**
 * All monster sets (2-piece) and mythic sets (1-piece)
 * Can only be assigned to monsterSet slot
 */
export const MONSTER_SETS: readonly string[] = [
  ...RECOMMENDED_2PIECE_SETS,
  ...RECOMMENDED_1PIECE_SETS,
  ...TANK_MONSTER_SETS,
  ...HEALER_MONSTER_SETS,
  ...FLEXIBLE_MONSTER_SETS,
] as const;

/**
 * All 5-piece sets
 * Can only be assigned to set1/set2 slots
 */
export const ALL_5PIECE_SETS: readonly string[] = [
  ...RECOMMENDED_5PIECE_SETS,
  ...TANK_5PIECE_SETS,
  ...HEALER_5PIECE_SETS,
  ...FLEXIBLE_5PIECE_SETS,
] as const;

/**
 * DD special role sets
 */
export const DD_SPECIAL_SETS: readonly string[] = [
  'War Machine',
  'Martial Knowledge',
  "Zen's Redress",
  'Alkosh',
] as const;

/**
 * All support sets organized by category
 */
export const ALL_SUPPORT_SETS: readonly SupportSet[] = [
  // Recommended sets (always visible)
  ...RECOMMENDED_SETS.map((name) => ({
    name,
    category: SetCategory.RECOMMENDED,
    isRecommended: true,
  })),

  // Tank sets
  ...TANK_SETS.filter((s) => !RECOMMENDED_SETS.includes(s)).map((name) => ({
    name,
    category: SetCategory.TANK,
  })),

  // Healer sets
  ...HEALER_SETS.filter((s) => !RECOMMENDED_SETS.includes(s)).map((name) => ({
    name,
    category: SetCategory.HEALER,
  })),

  // Flexible sets
  ...FLEXIBLE_SETS.filter((s) => !RECOMMENDED_SETS.includes(s)).map((name) => ({
    name,
    category: SetCategory.FLEXIBLE,
  })),

  // Monster sets
  ...MONSTER_SETS.map((name) => ({
    name,
    category: SetCategory.MONSTER,
  })),
] as const;

/**
 * Legacy exports for backward compatibility
 */
export const COMMON_TANK_SETS = TANK_SETS;
export const COMMON_HEALER_SETS = HEALER_SETS;
export const COMMON_DD_SPECIAL_SETS = DD_SPECIAL_SETS;
