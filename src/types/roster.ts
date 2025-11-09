/**
 * Types for Roster Builder feature
 * Defines the structure for raid roster management including roles, gear sets, and assignments
 */

import { KnownSetIDs } from './abilities';

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
 * Healer champion point slot selections
 */
export enum HealerChampionPoint {
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
  set1: KnownSetIDs | undefined; // First 5-piece set
  set2: KnownSetIDs | undefined; // Second 5-piece set
  monsterSet?: KnownSetIDs; // 2-piece monster set (head + shoulders)
  additionalSets?: KnownSetIDs[]; // Optional additional sets (e.g., arena weapons, mythics)
  notes?: string;
}

/**
 * Jail DD types - standard configurations for special DD requirements
 */
export type JailDDType = 'banner' | 'zenkosh' | 'wm' | 'wm-mk' | 'mk' | 'custom';

/**
 * DPS slot configuration
 */
export interface DPSSlot {
  slotNumber: number; // 1-8
  playerName?: string;
  playerNumber?: number;
  roleNotes?: string; // e.g., "Portal L - Ele sus", "Z'en", etc.
  labels?: string[]; // Multiple labels/tags for the player
  gearSets?: KnownSetIDs[]; // Optional gear set tracking
  skillLines?: SkillLineConfig;
  group?: PlayerGroup;
  notes?: string;
  jailDDType?: JailDDType; // If set, this slot is configured as a jail DD
  customDescription?: string; // For 'custom' jail DD type
}

/**
 * Healer configuration
 */
export interface HealerSetup {
  playerName?: string;
  playerNumber?: number; // Optional player identifier (1, 2, etc.)
  roleLabel?: string; // e.g., "H1", "H2"
  roleNotes?: string; // e.g., "TOMB HEALER", "TOMB 1B"
  labels?: string[]; // Multiple labels/tags for the player
  set1: KnownSetIDs | undefined; // First 5-piece set
  set2: KnownSetIDs | undefined; // Second 5-piece set
  monsterSet?: KnownSetIDs; // 2-piece monster set (head + shoulders)
  additionalSets?: KnownSetIDs[]; // For mythics or special items
  skillLines: SkillLineConfig;
  healerBuff: HealerBuff | null;
  championPoint?: HealerChampionPoint | null; // Champion point slotted
  ultimate: string | null; // Allows preset ultimates or custom text
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
  labels?: string[]; // Multiple labels/tags for the player
  gearSets: TankGearSet;
  skillLines: SkillLineConfig;
  ultimate: string | null; // Allows preset ultimates or custom text
  specificSkills: string[];
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

  // DPS Slots (1-8) - can be regular DPS or jail DDs with jailDDType set
  dpsSlots: DPSSlot[];

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
    set1: undefined,
    set2: undefined,
  },
  skillLines: defaultSkillLineConfig(),
  ultimate: null,
  specificSkills: [],
});

/**
 * Default healer setup
 */
export const defaultHealerSetup = (): HealerSetup => ({
  set1: undefined,
  set2: undefined,
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
  availableGroups: [],
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
  name: KnownSetIDs;
  category: SetCategory;
  isRecommended?: boolean; // For quick highlighting
  description?: string;
}

// ============================================================
// QUICK ASSIGNMENT CONFIGURATION
// These arrays explicitly control what appears in the Quick Assignment UI
// ============================================================

/**
 * Tank 5-piece sets for Quick Assignment
 * These appear in the blue "Tank Sets" column
 */
export const QUICK_TANK_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.LUCENT_ECHOES, // 25.8% (Tank: 45%, Healer: 9%)
  KnownSetIDs.PEARLESCENT_WARD, // 29.0% (Tank: 52%, Healer: 9%)
  KnownSetIDs.SAXHLEEL_CHAMPION, // 11.3% (Tank: 21%, Healer: 3%)
  KnownSetIDs.XORYNS_MASTERPIECE, // Tank set
  KnownSetIDs.CLAW_OF_YOLNAHKRIIN, // 17.7% (Tank: 31%, Healer: 6%)
] as const;

/**
 * Flexible 5-piece sets for Quick Assignment
 * These appear in the orange "Flexible" column (can be used by tanks or healers)
 */
export const QUICK_FLEXIBLE_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.PILLAGERS_PROFIT, // 19.4% (Tank: 24%, Healer: 15%)
  KnownSetIDs.POWERFUL_ASSAULT, // 19.4% (Tank: 3%, Healer: 33%)
] as const;

/**
 * Healer 5-piece sets for Quick Assignment
 * These appear in the purple "Healer Sets" column
 */
export const QUICK_HEALER_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.JORVULDS_GUIDANCE, // 11.3% (Tank: 0%, Healer: 21%)
  KnownSetIDs.ROARING_OPPORTUNIST, // 11.3% (Tank: 0%, Healer: 21%)
  KnownSetIDs.SPELL_POWER_CURE, // 17.7% (Tank: 0%, Healer: 33%)
] as const;

/**
 * All recommended 5-piece sets combined (for backwards compatibility)
 */
export const RECOMMENDED_5PIECE_SETS: readonly KnownSetIDs[] = [
  ...QUICK_TANK_5PIECE_SETS,
  ...QUICK_FLEXIBLE_5PIECE_SETS,
  ...QUICK_HEALER_5PIECE_SETS,
] as const;

/**
 * Tank monster sets for Quick Assignment
 * These appear in the blue "Tank Sets" column (monster section)
 */
export const QUICK_TANK_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.ARCHDRUID_DEVYRIC,
  KnownSetIDs.BARON_ZAUDRUS, // 3.2% (Tank: 7%, Healer: 0%)
] as const;

/**
 * Flexible monster sets for Quick Assignment
 * These appear in the orange "Flexible" column (monster section)
 */
export const QUICK_FLEXIBLE_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.NAZARAY, // 22.6% (Tank: 38%, Healer: 9%)
  KnownSetIDs.NUNATAK, // Flexible support set
  KnownSetIDs.SPAULDER_OF_RUIN, // Flexible support set
] as const;

/**
 * Healer monster sets for Quick Assignment
 * These appear in the purple "Healer Sets" column (monster section)
 */
export const QUICK_HEALER_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.OZEZAN,
  KnownSetIDs.SYMPHONY_OF_BLADES, // 14.5% (Tank: 0%, Healer: 27%)
  KnownSetIDs.THE_BLIND,
] as const;

/**
 * All recommended monster sets combined (for backwards compatibility)
 */
export const RECOMMENDED_2PIECE_SETS: readonly KnownSetIDs[] = [
  ...QUICK_TANK_MONSTER_SETS,
  ...QUICK_FLEXIBLE_MONSTER_SETS,
  ...QUICK_HEALER_MONSTER_SETS,
] as const;

/**
 * Flexible mythic items for Quick Assignment
 * These appear in the orange "Flexible" column (mythic section)
 */
export const QUICK_FLEXIBLE_MYTHICS: readonly KnownSetIDs[] = [
  KnownSetIDs.CRYPTCANON_VESTMENTS,
] as const;

/**
 * Healer mythic items for Quick Assignment
 * These appear in the purple "Healer Sets" column (mythic section)
 */
export const QUICK_HEALER_MYTHICS: readonly KnownSetIDs[] = [
  KnownSetIDs.PEARLS_OF_EHLNOFEY, // 17.7% (Tank: 0%, Healer: 33%)
] as const;

/**
 * All recommended mythic items combined (for backwards compatibility)
 */
export const RECOMMENDED_1PIECE_SETS: readonly KnownSetIDs[] = [
  ...QUICK_FLEXIBLE_MYTHICS,
  ...QUICK_HEALER_MYTHICS,
] as const;

/**
 * Compatibility rule types for set and ultimate validation
 */
export enum CompatibilityRuleType {
  REQUIRED_ULTIMATE = 'required_ultimate', // Set requires specific ultimate
  EXCLUSIVE_SETS = 'exclusive_sets', // Sets that cannot be used together
  REQUIRED_SET = 'required_set', // Set requires another set to be equipped
}

/**
 * Compatibility rule definition
 */
export interface CompatibilityRule {
  type: CompatibilityRuleType;
  setName: string;
  requirement?: string | string[]; // Required ultimate(s) or set(s)
  exclusions?: string[]; // Sets that cannot be paired with this set
  message: string; // User-friendly warning message
}

/**
 * Set and ultimate compatibility rules
 * Defines which combinations are valid or invalid
 */
export const COMPATIBILITY_RULES: readonly CompatibilityRule[] = [
  {
    type: CompatibilityRuleType.REQUIRED_ULTIMATE,
    setName: 'Nazaray',
    requirement: [SupportUltimate.WARHORN, SupportUltimate.ATRONACH],
    message: `Nazaray should only be paired with ${SupportUltimate.WARHORN} or ${SupportUltimate.ATRONACH} ultimate`,
  },
  {
    type: CompatibilityRuleType.EXCLUSIVE_SETS,
    setName: 'Saxhleel Champion',
    exclusions: ['Nazaray'],
    message: 'Saxhleel Champion cannot be paired with Nazaray',
  },
  {
    type: CompatibilityRuleType.EXCLUSIVE_SETS,
    setName: 'Nazaray',
    exclusions: ['Saxhleel Champion'],
    message: 'Nazaray cannot be paired with Saxhleel Champion',
  },
] as const;

/**
 * Helper function to validate gear and ultimate compatibility
 * Returns array of warning messages for any rule violations
 */
export function validateCompatibility(
  sets: (string | undefined | null)[],
  ultimate?: string | null,
): string[] {
  const warnings: string[] = [];
  const activeSets = sets.filter((set): set is string => !!set);

  // Check each active set against compatibility rules
  activeSets.forEach((activeSet) => {
    COMPATIBILITY_RULES.forEach((rule) => {
      if (rule.setName !== activeSet) return;

      switch (rule.type) {
        case CompatibilityRuleType.REQUIRED_ULTIMATE:
          if (ultimate && rule.requirement) {
            const requiredUltimates = Array.isArray(rule.requirement)
              ? rule.requirement
              : [rule.requirement];
            if (!requiredUltimates.includes(ultimate)) {
              warnings.push(rule.message);
            }
          }
          break;

        case CompatibilityRuleType.EXCLUSIVE_SETS:
          if (rule.exclusions) {
            const conflictingSets = activeSets.filter((set) => rule.exclusions?.includes(set));
            if (conflictingSets.length > 0) {
              warnings.push(rule.message);
            }
          }
          break;

        case CompatibilityRuleType.REQUIRED_SET:
          if (rule.requirement) {
            const requiredSets = Array.isArray(rule.requirement)
              ? rule.requirement
              : [rule.requirement];
            const hasRequired = requiredSets.some((reqSet) => activeSets.includes(reqSet));
            if (!hasRequired) {
              warnings.push(rule.message);
            }
          }
          break;
      }
    });
  });

  return warnings;
}

/**
 * All recommended sets combined
 * TOP 14 sets to meet typical 12+ support set requirements
 * Note: 9 five-piece sets + 4 two-piece monster sets + 1 one-piece mythic = 14 total support sets
 */
export const RECOMMENDED_SETS: readonly KnownSetIDs[] = [
  ...RECOMMENDED_5PIECE_SETS,
  ...RECOMMENDED_2PIECE_SETS,
  ...RECOMMENDED_1PIECE_SETS,
] as const;

/**
 * Slot type restrictions for set assignment
 * Defines which sets can be assigned to which slots
 */
export interface SetSlotRestrictions {
  fivePieceSets: readonly KnownSetIDs[]; // Can only go in set1/set2
  monsterSets: readonly KnownSetIDs[]; // Can only go in monsterSet (includes 2-piece and 1-piece)
  flexibleSets: readonly KnownSetIDs[]; // Can go in additionalSets
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
export const canAssignToFivePieceSlot = (setId: KnownSetIDs): boolean => {
  return SET_SLOT_RESTRICTIONS.fivePieceSets.includes(setId);
};

/**
 * Helper function to check if a set can be assigned to monster set slot
 * Accepts both 2-piece monster sets and 1-piece mythic sets
 */
export const canAssignToMonsterSlot = (setId: KnownSetIDs): boolean => {
  return SET_SLOT_RESTRICTIONS.monsterSets.includes(setId);
};

/**
 * Helper function to check if a set is a 5-piece set (for filtering autocomplete options)
 */
export const isFivePieceSet = (setId: KnownSetIDs): boolean => {
  return canAssignToFivePieceSlot(setId);
};

/**
 * Helper function to check if a set is a monster set (for filtering autocomplete options)
 */
export const isMonsterSet = (setId: KnownSetIDs): boolean => {
  return canAssignToMonsterSlot(setId);
};

/**
 * Tank-specific 5-piece support sets
 * Alphabetically sorted
 * Can only be assigned to set1/set2 slots
 */
export const TANK_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
  KnownSetIDs.DRAKES_RUSH,
  KnownSetIDs.LUCENT_ECHOES, // 25.8% occurrence (Tank: 45%, Healer: 9%)
  KnownSetIDs.PEARLESCENT_WARD, // 1.5% occurrence (3% of tanks)
  KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION,
  KnownSetIDs.WAR_MACHINE, // 4.4% occurrence (6% of tanks)
  KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE, // Xoryn's Masterpiece
] as const;

/**
 * Tank-specific monster sets
 * Alphabetically sorted
 * Can only be assigned to monsterSet slot
 */
export const TANK_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.ARCHDRUID_DEVYRIC,
  KnownSetIDs.BARON_ZAUDRUS, // 2.9% occurrence (6% of tanks)
  KnownSetIDs.ENCRATIS_BEHEMOTH,
  KnownSetIDs.SPAULDER_OF_RUIN, // 1-piece mythic for tank support
  KnownSetIDs.STONE_HUSK,
] as const;

/**
 * All tank sets combined (for backwards compatibility)
 */
export const TANK_SETS: readonly KnownSetIDs[] = [
  ...TANK_5PIECE_SETS,
  ...TANK_MONSTER_SETS,
] as const;

/**
 * Healer-specific 5-piece support setsasass
 * Alphabetically sorted
 * Can only be assigned to set1/set2 slots
 */
export const HEALER_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.COMBAT_PHYSICIAN, // 1.5% occurrence (3% of healers)
  KnownSetIDs.JORVULDS_GUIDANCE, // 11.8% occurrence (23% of healers)
  KnownSetIDs.MASTER_ARCHITECT, // 4.4% occurrence (9% of healers)
  KnownSetIDs.ROARING_OPPORTUNIST, // 4.4% occurrence (9% of healers)
  KnownSetIDs.SPELL_POWER_CURE, // 17.6% occurrence (34% of healers)
  KnownSetIDs.VESTMENT_OF_OLORIME,
  KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE,
  KnownSetIDs.ZENS_REDRESS,
] as const;

/**
 * Healer-specific monster sets
 * Alphabetically sorted
 * Can only be assigned to monsterSet slot
 */
export const HEALER_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.ENGINE_GUARDIAN,
  KnownSetIDs.NUNATAK, // Healer monster set
  KnownSetIDs.OZEZAN,
  KnownSetIDs.PEARLS_OF_EHLNOFEY, // 17.7% (Tank: 0%, Healer: 33%) - 1-piece mythic
  KnownSetIDs.SYMPHONY_OF_BLADES, // 13.2% occurrence (26% of healers)
  KnownSetIDs.THE_BLIND,
] as const;

/**
 * All healer sets combined (for backwards compatibility)
 */
export const HEALER_SETS: readonly KnownSetIDs[] = [
  ...HEALER_5PIECE_SETS,
  ...HEALER_MONSTER_SETS,
] as const;

/**
 * 5-piece sets that can be run on either tanks or healers
 * Alphabetically sorted
 * Can only be assigned to set1/set2 slots
 */
export const FLEXIBLE_5PIECE_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.COMBAT_PHYSICIAN, // Can be used by both roles
  KnownSetIDs.PILLAGERS_PROFIT, // 19.4% (Tank: 24%, Healer: 15%)
  KnownSetIDs.POWERFUL_ASSAULT, // 19.4% (Tank: 3%, Healer: 33%)
  KnownSetIDs.WAR_MACHINE, // Primarily tank, some healer usage
] as const;

/**
 * Monster sets that can be run on either tanks or healers
 * Can only be assigned to monsterSet slot
 */
export const FLEXIBLE_MONSTER_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.SPAULDER_OF_RUIN, // Spaulder of Ruin - Flexible support set
] as const;

/**
 * All flexible sets combined (for backwards compatibility)
 */
export const FLEXIBLE_SETS: readonly KnownSetIDs[] = [
  ...FLEXIBLE_5PIECE_SETS,
  ...FLEXIBLE_MONSTER_SETS,
] as const;

/**
 * All monster sets (2-piece) and mythic sets (1-piece)
 * Can only be assigned to monsterSet slot
 */
export const MONSTER_SETS: readonly KnownSetIDs[] = [
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
export const ALL_5PIECE_SETS: readonly KnownSetIDs[] = [
  ...RECOMMENDED_5PIECE_SETS,
  ...TANK_5PIECE_SETS,
  ...HEALER_5PIECE_SETS,
  ...FLEXIBLE_5PIECE_SETS,
] as const;

/**
 * DD special role sets
 * Alphabetically sorted
 */
export const DD_SPECIAL_SETS: readonly KnownSetIDs[] = [
  KnownSetIDs.ROAR_OF_ALKOSH,
  KnownSetIDs.WAR_MACHINE,
  KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE,
  KnownSetIDs.ZENS_REDRESS,
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
