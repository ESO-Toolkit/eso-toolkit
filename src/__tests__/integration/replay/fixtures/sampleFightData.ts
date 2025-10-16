import { DamageEvent, HealEvent, CastEvent, Resources } from '../../../../types/combatlogEvents';

/**
 * Sample combat log events for integration testing
 * Simulates a simplified fight with 2 players and 1 enemy
 */

/**
 * Helper to create complete Resources object
 */
const createResources = (
  hp: number,
  maxHp: number,
  mag: number,
  maxMag: number,
  stam: number,
  maxStam: number,
  x = 0,
  y = 0,
  facing = 0,
): Resources => ({
  hitPoints: hp,
  maxHitPoints: maxHp,
  magicka: mag,
  maxMagicka: maxMag,
  stamina: stam,
  maxStamina: maxStam,
  ultimate: 0,
  maxUltimate: 500,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 0,
  x,
  y,
  facing,
});

export const sampleFightData = {
  fightId: 1,
  startTime: 1000000,
  endTime: 1010000,
  duration: 10000, // 10 seconds
  actors: [
    {
      id: 1,
      name: 'TestPlayer1',
      type: 'player',
      isFriendly: true,
      class: 'Dragonknight',
    },
    {
      id: 2,
      name: 'TestPlayer2',
      type: 'player',
      isFriendly: true,
      class: 'Templar',
    },
    {
      id: 3,
      name: 'TestEnemy',
      type: 'npc',
      isFriendly: false,
      class: 'Unknown',
    },
  ],
};

/**
 * Sample damage events
 */
export const sampleDamageEvents: DamageEvent[] = [
  {
    timestamp: 1000500,
    type: 'damage',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 3,
    targetIsFriendly: false,
    abilityGameID: 20668, // Flame Lash
    fight: 1,
    hitType: 1, // Normal
    amount: 5000,
    castTrackID: 1,
    sourceResources: createResources(30000, 35000, 20000, 25000, 15000, 20000),
    targetResources: createResources(45000, 50000, 10000, 15000, 8000, 10000),
  },
  {
    timestamp: 1002000,
    type: 'damage',
    sourceID: 2,
    sourceIsFriendly: true,
    targetID: 3,
    targetIsFriendly: false,
    abilityGameID: 26797, // Puncturing Strikes
    fight: 1,
    hitType: 2, // Critical
    amount: 7500,
    castTrackID: 2,
    sourceResources: createResources(32000, 33000, 18000, 22000, 16000, 19000),
    targetResources: createResources(37500, 50000, 10000, 15000, 8000, 10000),
  },
];

/**
 * Sample heal events
 */
export const sampleHealEvents: HealEvent[] = [
  {
    timestamp: 1003000,
    type: 'heal',
    sourceID: 2,
    sourceIsFriendly: true,
    targetID: 1,
    targetIsFriendly: true,
    abilityGameID: 22265, // Honor the Dead
    fight: 1,
    hitType: 1,
    amount: 3000,
    overheal: 500,
    castTrackID: 3,
    sourceResources: createResources(32000, 33000, 15000, 22000, 16000, 19000),
    targetResources: createResources(32500, 35000, 20000, 25000, 15000, 20000),
  },
];

/**
 * Sample cast events
 */
export const sampleCastEvents: CastEvent[] = [
  {
    timestamp: 1000450,
    type: 'cast',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 3,
    targetIsFriendly: false,
    abilityGameID: 20668,
    fight: 1,
  },
];

/**
 * Sample position data for actors
 */
export const samplePositionData = {
  1: [
    // TestPlayer1
    { timestamp: 1000000, x: 10, y: 0, z: 10, rotation: 0 },
    { timestamp: 1005000, x: 15, y: 0, z: 12, rotation: 0.5 },
    { timestamp: 1010000, x: 20, y: 0, z: 15, rotation: 1.0 },
  ],
  2: [
    // TestPlayer2
    { timestamp: 1000000, x: 12, y: 0, z: 8, rotation: 0 },
    { timestamp: 1005000, x: 14, y: 0, z: 10, rotation: 0.3 },
    { timestamp: 1010000, x: 16, y: 0, z: 12, rotation: 0.7 },
  ],
  3: [
    // TestEnemy
    { timestamp: 1000000, x: 25, y: 0, z: 20, rotation: 3.14 },
    { timestamp: 1005000, x: 22, y: 0, z: 18, rotation: 2.8 },
    { timestamp: 1010000, x: 18, y: 0, z: 15, rotation: 2.5 },
  ],
};

/**
 * Combined fixture for easy test setup
 */
export const sampleReplayFixture = {
  fight: sampleFightData,
  events: {
    damage: sampleDamageEvents,
    heal: sampleHealEvents,
    cast: sampleCastEvents,
  },
  positions: samplePositionData,
};
