import { HitType, DamageEvent, ResourceChangeEvent, Resources } from '../../types/combatlogEvents';

import {
  calculatePlayerTravelDistances,
  PlayerTravelDistanceTaskInput,
} from './CalculatePlayerTravelDistances';

const createResources = (x: number, y: number): Resources => ({
  hitPoints: 0,
  maxHitPoints: 0,
  magicka: 0,
  maxMagicka: 0,
  stamina: 0,
  maxStamina: 0,
  ultimate: 0,
  maxUltimate: 0,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 0,
  x,
  y,
  facing: 0,
});

const baseFight = {
  id: 1,
  startTime: 0,
  endTime: 60_000,
};

describe('calculatePlayerTravelDistances', () => {
  it('returns empty results when no players are provided', () => {
    const input: PlayerTravelDistanceTaskInput = {
      fight: baseFight,
      playerIds: [],
      events: {
        damage: [],
        heal: [],
        death: [],
        resource: [],
        cast: [],
      },
    };

    const result = calculatePlayerTravelDistances(input);

    expect(result.distancesByPlayerId).toEqual({});
    expect(result.processedEventCount).toBe(0);
  });

  it('calculates distance using source position samples for a single player', () => {
    const playerId = 42;
    const damageEvent: DamageEvent = {
      timestamp: 1_000,
      type: 'damage',
      sourceID: playerId,
      sourceIsFriendly: true,
      targetID: 99,
      targetIsFriendly: false,
      abilityGameID: 123,
      fight: baseFight.id,
      hitType: HitType.Normal,
      amount: 1000,
      castTrackID: 1,
      sourceResources: createResources(5_000, 5_000),
      targetResources: createResources(4_800, 4_950),
    };

    const resourceEvent: ResourceChangeEvent = {
      timestamp: 3_000,
      type: 'resourcechange',
      sourceID: playerId,
      sourceIsFriendly: true,
      targetID: playerId,
      targetIsFriendly: false,
      abilityGameID: 456,
      fight: baseFight.id,
      resourceChange: 0,
      resourceChangeType: 0,
      otherResourceChange: 0,
      maxResourceAmount: 0,
      waste: 0,
      castTrackID: 2,
      sourceResources: createResources(6_000, 5_000),
      targetResources: createResources(6_000, 5_000),
    };

    const input: PlayerTravelDistanceTaskInput = {
      fight: baseFight,
      playerIds: [playerId],
      events: {
        damage: [damageEvent],
        heal: [],
        death: [],
        resource: [resourceEvent],
        cast: [],
      },
    };

    const result = calculatePlayerTravelDistances(input);
    const summary = result.distancesByPlayerId[playerId];

    expect(summary).toBeDefined();
    expect(summary.samples).toBe(2);
    // Converted coordinates flip X and divide by 100, resulting in a 1-unit change along X.
    expect(summary.totalDistance).toBeCloseTo(1, 5);
    expect(summary.averageSpeed).toBeGreaterThan(0);
  });

  it('aggregates source and target samples for multiple players', () => {
    const playerOne = 1;
    const playerTwo = 2;

    const damageEvent: DamageEvent = {
      timestamp: 2_000,
      type: 'damage',
      sourceID: playerOne,
      sourceIsFriendly: true,
      targetID: playerTwo,
      targetIsFriendly: false,
      abilityGameID: 321,
      fight: baseFight.id,
      hitType: HitType.Critical,
      amount: 500,
      castTrackID: 5,
      sourceResources: createResources(5_100, 5_100),
      targetResources: createResources(5_300, 5_100),
    };

    const resourceEvent: ResourceChangeEvent = {
      timestamp: 4_000,
      type: 'resourcechange',
      sourceID: playerTwo,
      sourceIsFriendly: true,
      targetID: playerTwo,
      targetIsFriendly: true,
      abilityGameID: 654,
      fight: baseFight.id,
      resourceChange: 0,
      resourceChangeType: 0,
      otherResourceChange: 0,
      maxResourceAmount: 0,
      waste: 0,
      castTrackID: 6,
      sourceResources: createResources(5_500, 5_100),
      targetResources: createResources(5_500, 5_100),
    };

    const input: PlayerTravelDistanceTaskInput = {
      fight: baseFight,
      playerIds: [playerOne, playerTwo],
      events: {
        damage: [damageEvent],
        heal: [],
        death: [],
        resource: [resourceEvent],
        cast: [],
      },
    };

    const result = calculatePlayerTravelDistances(input);

    expect(result.distancesByPlayerId[playerOne]).toBeDefined();
    expect(result.distancesByPlayerId[playerTwo]).toBeDefined();

    expect(result.distancesByPlayerId[playerOne].samples).toBe(1);
    expect(result.distancesByPlayerId[playerTwo].samples).toBe(2);

    // Player two should have movement between target (event 1) and source (event 2)
    expect(result.distancesByPlayerId[playerTwo].totalDistance).toBeGreaterThan(0);
  });
});
