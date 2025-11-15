/**
 * Types for Loadout Manager feature
 * Based on Elder Scrolls Online Wizard's Wardrobe addon structure
 */

/**
 * Individual skill bar (front or back)
 */
export interface SkillBar {
  [slotIndex: number]: number; // Slot index (3-8) mapped to ability ID
}

/**
 * Skills configuration for both bars
 */
export interface SkillsConfig {
  0: SkillBar; // Front bar (slots 3-8: 5 abilities + 1 ultimate at slot 8)
  1: SkillBar; // Back bar (slots 3-8: 5 abilities + 1 ultimate at slot 8)
}

/**
 * Champion Points configuration
 * Slots 1-12 representing different CP choices across the three trees
 */
export interface ChampionPointsConfig {
  [slotIndex: number]: number; // CP slot mapped to CP ID
}

/**
 * Food/Drink configuration
 */
export interface FoodConfig {
  link?: string; // ESO item link format
  id?: number; // Item ID
}

/**
 * Gear piece configuration
 */
export interface GearPiece {
  link?: string; // ESO item link format
  id?: string; // Item ID as string
}

/**
 * Full gear configuration
 * Slot indices follow ESO's equipment slot system:
 * 0: Head, 1: Neck, 2: Chest, 3: Shoulders, 4: Main Hand
 * 5: (unused), 6: Belt, 8: Legs, 9: Feet, 10: (unused)
 * 11: Ring 1, 12: Ring 2, 13-14: (unused), 16: Boots
 * 20: Back Bar Weapon, 21: (unused)
 */
export interface GearConfig {
  [slotIndex: number]: GearPiece;
  mythic?: number; // Slot index of mythic item
}

/**
 * Condition for when a setup should be used
 */
export interface SetupCondition {
  boss?: string; // Boss name (e.g., "Lokkestiiz", "Substitute Boss")
  trash?: number; // Trash pack number (-1 for all trash, or specific pack number)
}

/**
 * Individual loadout setup for a specific fight
 */
export interface LoadoutSetup {
  name: string; // Display name for the setup
  disabled: boolean; // Whether this setup is active
  condition: SetupCondition; // When to use this setup
  skills: SkillsConfig; // Skill bar configuration
  cp: ChampionPointsConfig; // Champion Points
  food: FoodConfig; // Food/Drink buff
  gear: GearConfig; // Equipment
  code?: string; // Optional code/notes
}

/**
 * Trial/Dungeon boss configuration
 */
export interface BossConfig {
  name: string; // Boss display name
  trashPacksBefore: number; // Number of trash packs before this boss
}

/**
 * Trial/Dungeon configuration
 */
export interface TrialConfig {
  id: string; // Unique identifier (e.g., 'SS', 'DSR', 'GEN', 'SUB')
  name: string; // Display name (e.g., 'Sunspire', 'Dreadsail Reef', 'General')
  type: 'trial' | 'dungeon' | 'arena' | 'general' | 'substitute';
  bosses: BossConfig[];
}

/**
 * Page of setups for a specific trial
 */
export interface SetupPage {
  name: string; // Page name (e.g., "Main Tank", "DPS Setup")
  setups: LoadoutSetup[]; // Array of setups on this page
}

/**
 * ESO Class Skill Lines
 */
export type ClassSkillLine =
  | 'Dragonknight_Ardent Flame'
  | 'Dragonknight_Draconic Power'
  | 'Dragonknight_Earthen Heart'
  | 'Sorcerer_Dark Magic'
  | 'Sorcerer_Daedric Summoning'
  | 'Sorcerer_Storm Calling'
  | 'Nightblade_Assassination'
  | 'Nightblade_Shadow'
  | 'Nightblade_Siphoning'
  | 'Templar_Aedric Spear'
  | 'Templar_Dawn\'s Wrath'
  | 'Templar_Restoring Light'
  | 'Warden_Animal Companions'
  | 'Warden_Green Balance'
  | 'Warden_Winter\'s Embrace'
  | 'Necromancer_Grave Lord'
  | 'Necromancer_Bone Tyrant'
  | 'Necromancer_Living Death'
  | 'Arcanist_Herald of the Tome'
  | 'Arcanist_Soldier of Apocrypha'
  | 'Arcanist_Curative Runeforms';

/**
 * Character information
 */
export interface CharacterInfo {
  id: string; // Unique identifier (e.g., character name)
  name: string; // Display name
  skillLines?: ClassSkillLine[]; // Up to 3 class skill lines
  role?: string; // Role (e.g., 'Tank', 'DPS', 'Healer')
}

/**
 * Complete loadout state for the application
 */
export interface LoadoutState {
  currentCharacter: string | null; // Currently selected character ID
  characters: CharacterInfo[]; // List of available characters
  currentTrial: string | null; // Currently selected trial ID
  currentPage: number; // Currently active page index
  mode: 'basic' | 'advanced'; // Basic (bosses only) or Advanced (includes trash)
  pages: {
    [characterId: string]: {
      [trialId: string]: SetupPage[];
    };
  };
}

/**
 * Wizard's Wardrobe export format
 * This matches the structure from the ESO addon
 */
export interface WizardWardrobeExport {
  setups: {
    [trialId: string]: Array<{
      [setupIndex: number]: LoadoutSetup;
    }>;
  };
  pages?: {
    [trialId: string]: Array<{
      name?: string;
      selected?: number;
      [key: number]: any; // Can contain setup data on some page indices
    }>;
  };
  version: number;
  selectedZoneTag: string;
  $LastCharacterName?: string;
  autoEquipSetups?: boolean;
  prebuffs?: Record<number, unknown>;
}

/**
 * Clipboard data format for copy/paste
 */
export interface ClipboardSetup {
  version: 1;
  timestamp: number;
  setup: LoadoutSetup;
  sourceTrialId?: string;
  sourceBossName?: string;
}
