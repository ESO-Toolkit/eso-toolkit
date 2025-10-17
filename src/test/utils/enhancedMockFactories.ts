/**
 * Enhanced mock factories for complex testing scenarios
 * Consolidates commonly used mock data creation patterns
 */

import { FightFragment, ReportActorFragment } from '../../graphql/gql/graphql';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { Resources, DamageEvent } from '../../types/combatlogEvents';
import { TEST_CONSTANTS } from '../constants/testConstants';

/**
 * Creates a mock fight with sensible defaults (enhanced version for complex scenarios)
 */
export const createEnhancedMockFight = (overrides: Partial<FightFragment> = {}): FightFragment =>
  ({
    id: TEST_CONSTANTS.FIGHT_ID,
    startTime: TEST_CONSTANTS.FIGHT_START_TIME,
    endTime: TEST_CONSTANTS.FIGHT_END_TIME,
    fightPercentage: 100,
    kill: null,
    friendlyPlayers: [101, 102],
    enemyNPCs: [
      { id: 201, gameID: 1 }, // Boss
      { id: 202, gameID: 0 }, // Regular enemy
    ],
    friendlyNPCs: [{ id: 301 }],
    // Add a bounding box centered around the default test coordinates
    // This ensures tests get consistent coordinate conversion behavior
    boundingBox: {
      __typename: 'ReportMapBoundingBox',
      minX: TEST_CONSTANTS.DEFAULT_X - 100, // 5135
      maxX: TEST_CONSTANTS.DEFAULT_X + 100, // 5335
      minY: TEST_CONSTANTS.DEFAULT_Y - 100, // 5310
      maxY: TEST_CONSTANTS.DEFAULT_Y + 100, // 5510
    },
    ...overrides,
  }) as FightFragment;

/**
 * Creates mock resources with position data (enhanced version)
 */
export const createEnhancedMockResources = (
  x: number = TEST_CONSTANTS.DEFAULT_X,
  y: number = TEST_CONSTANTS.DEFAULT_Y,
  facing: number = TEST_CONSTANTS.DEFAULT_FACING,
  overrides?: Partial<Resources>,
): Resources => ({
  hitPoints: 30000,
  maxHitPoints: 30000,
  magicka: 15000,
  maxMagicka: 15000,
  stamina: 12000,
  maxStamina: 12000,
  ultimate: 50,
  maxUltimate: 500,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 810,
  x,
  y,
  facing,
  ...overrides,
});

/**
 * Creates a mock damage event with position data
 */
export const createMockPositionalDamageEvent = (
  timestamp: number,
  sourceID: number,
  targetID: number,
  sourceResources?: Resources,
  targetResources?: Resources,
  overrides?: Partial<DamageEvent>,
): DamageEvent => ({
  timestamp,
  type: 'damage',
  sourceID,
  sourceIsFriendly: true,
  targetID,
  targetIsFriendly: false,
  abilityGameID: 12345,
  amount: TEST_CONSTANTS.DAMAGE_AMOUNT,
  hitType: 1,
  castTrackID: 1,
  sourceResources: sourceResources || createEnhancedMockResources(),
  targetResources: targetResources || createEnhancedMockResources(),
  fight: TEST_CONSTANTS.FIGHT_ID,
  ...overrides,
});

/**
 * Creates a mock player with role information
 */
export const createMockPlayerWithRole = (
  id: number,
  name: string,
  role: 'tank' | 'dps' | 'healer',
  overrides?: Partial<PlayerDetailsWithRole>,
): PlayerDetailsWithRole => ({
  id,
  name,
  guid: 123456 + id,
  type: role === 'tank' ? 'Tank' : role === 'dps' ? 'DPS' : 'Healer',
  role,
  server: 'TestServer',
  displayName: `${name}Display`,
  anonymous: false,
  icon: `icon${id}.png`,
  specs: [],
  potionUse: 0,
  healthstoneUse: 0,
  combatantInfo: {
    stats: [],
    talents: [],
    gear: [],
  },
  ...overrides,
});

/**
 * Creates a collection of mock players by ID
 */
export const createMockPlayersById = (
  playerConfigs: Array<{ id: number; name: string; role: 'tank' | 'dps' | 'healer' }> = [
    { id: 101, name: 'Player1', role: 'tank' },
    { id: 102, name: 'Player2', role: 'dps' },
  ],
): Record<number, PlayerDetailsWithRole> => {
  const players: Record<number, PlayerDetailsWithRole> = {};

  playerConfigs.forEach(({ id, name, role }) => {
    players[id] = createMockPlayerWithRole(id, name, role);
  });

  return players;
};

/**
 * Creates a mock actor with type information
 */
export const createMockActor = (
  id: number,
  name: string,
  type: 'Player' | 'NPC' | 'Pet',
  subType?: string,
): ReportActorFragment => ({
  id,
  name,
  type,
  subType,
});

/**
 * Creates a collection of mock actors by ID
 */
export const createMockActorsById = (
  actorConfigs: Array<{
    id: number;
    name: string;
    type: 'Player' | 'NPC' | 'Pet';
    subType?: string;
  }> = [
    { id: 101, name: 'Player1', type: 'Player' },
    { id: 102, name: 'Player2', type: 'Player' },
    { id: 201, name: 'Boss Enemy', type: 'NPC', subType: 'Boss' },
    { id: 202, name: 'Regular Enemy', type: 'NPC', subType: 'NPC' },
    { id: 301, name: 'Friendly NPC', type: 'NPC', subType: 'NPC' },
    { id: 401, name: 'Player Pet', type: 'Pet', subType: 'Pet' },
  ],
): Record<number, ReportActorFragment> => {
  const actors: Record<number, ReportActorFragment> = {};

  actorConfigs.forEach(({ id, name, type, subType }) => {
    actors[id] = createMockActor(id, name, type, subType);
  });

  return actors;
};

/**
 * Utility for generating arrays of mock data
 */
export const generateMockArray = <T>(length: number, factory: (index: number) => T): T[] => {
  return Array.from({ length }, (_, index) => factory(index));
};

/**
 * Random data generation utilities for performance testing
 */
export const createRandomTestData = {
  timestamp: (start: number, end: number): number =>
    Math.floor(Math.random() * (end - start)) + start,

  abilityId: (abilityIds: number[]): number =>
    abilityIds[Math.floor(Math.random() * abilityIds.length)],

  damage: (min: number, max: number): number => Math.floor(Math.random() * (max - min)) + min,

  isCritical: (critRate: number): boolean => Math.random() < critRate,

  coordinates: (minX: number, maxX: number, minY: number, maxY: number) => ({
    x: Math.floor(Math.random() * (maxX - minX)) + minX,
    y: Math.floor(Math.random() * (maxY - minY)) + minY,
    facing: Math.floor(Math.random() * 360),
  }),
};
