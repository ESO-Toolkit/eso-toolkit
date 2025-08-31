import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { CombatantInfoEvent } from '../../types/combatlogEvents';
import {
  WeaponType,
  GearTrait,
  PlayerGear,
  ArmorType,
  PlayerTalent,
  CombatantInfo,
} from '../../types/playerDetails';

/**
 * Factory functions for creating mock player and combatant data
 */

/**
 * Creates a mock CombatantInfoEvent with customizable gear
 * Used primarily in gear utility tests
 */
export const createMockCombatantInfo = (
  gearOverrides: Partial<Record<number, PlayerGear>> = {}
): CombatantInfoEvent => {
  // Create a default empty gear array with 14 slots (based on GearSlot enum)
  const defaultGear: PlayerGear[] = [];
  for (let i = 0; i < 14; i++) {
    defaultGear[i] = {
      id: 0, // id = 0 means no gear in that slot
      slot: i,
      quality: 0,
      icon: '',
      name: '',
      championPoints: 0,
      trait: GearTrait.SHARPENED,
      enchantType: 0,
      enchantQuality: 0,
      setID: 0,
      type: WeaponType.SWORD,
    };
  }

  // Apply overrides
  Object.entries(gearOverrides).forEach(([slot, gear]) => {
    if (gear) {
      defaultGear[Number(slot)] = gear;
    }
  });

  return {
    timestamp: 1000,
    type: 'combatantinfo',
    sourceID: 1,
    fight: 1,
    gear: defaultGear,
    auras: [],
  };
};

/**
 * Creates a mock PlayerDetailsWithRole for testing critical damage calculations
 */
export const createMockPlayerData = (
  overrides: Partial<PlayerDetailsWithRole> = {}
): PlayerDetailsWithRole => ({
  name: 'Test Player',
  id: 1,
  guid: 12345,
  type: 'Warrior',
  server: 'Test Server',
  displayName: 'TestPlayer#1234',
  anonymous: false,
  icon: 'test-icon.png',
  specs: [],
  potionUse: 0,
  healthstoneUse: 0,
  combatantInfo: {
    stats: [100, 200, 300],
    talents: [],
    gear: [],
  },
  role: 'dps' as const,
  ...overrides,
});

/**
 * Creates a mock gear item with customizable properties
 */
export const createGearItem = (
  type: WeaponType | ArmorType,
  trait: GearTrait = GearTrait.SHARPENED,
  slot = 0
): PlayerGear => ({
  id: 12345,
  slot,
  quality: 5,
  icon: 'icon',
  name: 'Test Weapon',
  championPoints: 160,
  trait,
  enchantType: 0,
  enchantQuality: 0,
  setID: 0,
  type,
});

/**
 * Creates a mock PlayerTalent with required properties
 */
export const createMockPlayerTalent = (overrides: Partial<PlayerTalent> = {}): PlayerTalent => ({
  name: 'Test Talent',
  guid: 12345,
  type: 1,
  abilityIcon: 'test-icon.png',
  flags: 0,
  ...overrides,
});

/**
 * Creates a mock CombatantInfo structure (different from CombatantInfoEvent)
 */
export const createMockCombatantInfoStructure = (
  overrides: Partial<CombatantInfo> = {}
): CombatantInfo => ({
  stats: [100, 200, 300],
  talents: [],
  gear: [],
  ...overrides,
});
