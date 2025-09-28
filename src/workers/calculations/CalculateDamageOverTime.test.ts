import {
  calculateDamageOverTimeData,
  DamageOverTimeCalculationTask,
} from './CalculateDamageOverTime';
import { createMockDamageEvent } from '../../test/utils/combatLogMockFactories';

describe('CalculateDamageOverTime', () => {
  const FIGHT_START = 1000000;
  const FIGHT_END = 1030000; // 30 seconds
  const PLAYER_ID_1 = 123;
  const PLAYER_ID_2 = 456;
  const TARGET_ID_1 = 789;
  const TARGET_ID_2 = 999;

  const mockPlayers = {
    [PLAYER_ID_1]: { id: PLAYER_ID_1, name: 'Player 1' } as any,
    [PLAYER_ID_2]: { id: PLAYER_ID_2, name: 'Player 2' } as any,
  };

  const mockFight = {
    startTime: FIGHT_START,
    endTime: FIGHT_END,
  };

  it('should calculate damage over time for multiple players and targets', () => {
    const damageEvents = [
      // Player 1 damage to Target 1
      createMockDamageEvent({
        timestamp: FIGHT_START + 1000, // 1 second in
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 1000,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
      createMockDamageEvent({
        timestamp: FIGHT_START + 2500, // 2.5 seconds in
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 1500,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
      // Player 1 damage to Target 2
      createMockDamageEvent({
        timestamp: FIGHT_START + 5000, // 5 seconds in
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_2,
        amount: 800,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
      // Player 2 damage to Target 1
      createMockDamageEvent({
        timestamp: FIGHT_START + 3000, // 3 seconds in
        sourceID: PLAYER_ID_2,
        targetID: TARGET_ID_1,
        amount: 1200,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
    ];

    const task: DamageOverTimeCalculationTask = {
      fight: mockFight,
      players: mockPlayers,
      damageEvents,
      bucketSizeMs: 1000, // 1 second buckets
    };

    const result = calculateDamageOverTimeData(task);

    // Verify basic structure
    expect(result).toBeDefined();
    expect(result.fightStartTime).toBe(FIGHT_START);
    expect(result.fightEndTime).toBe(FIGHT_END);
    expect(result.fightDuration).toBe(30000); // 30 seconds
    expect(result.bucketSizeMs).toBe(1000);

    // Verify target-specific data
    expect(result.byTarget[TARGET_ID_1]).toBeDefined();
    expect(result.byTarget[TARGET_ID_2]).toBeDefined();

    // Check Player 1's damage to Target 1
    const player1Target1 = result.byTarget[TARGET_ID_1][PLAYER_ID_1];
    expect(player1Target1).toBeDefined();
    expect(player1Target1.playerId).toBe(PLAYER_ID_1);
    expect(player1Target1.playerName).toBe('Player 1');
    expect(player1Target1.targetId).toBe(TARGET_ID_1);
    expect(player1Target1.totalDamage).toBe(2500); // 1000 + 1500
    expect(player1Target1.totalEvents).toBe(2);

    // Check that data points are correctly bucketed
    const buckets = player1Target1.dataPoints;
    expect(buckets).toHaveLength(30); // 30 second fight with 1 second buckets

    // First bucket (0-1s) should have 0 damage (event at 1000ms is in second bucket)
    expect(buckets[0].damage).toBe(0);
    // Second bucket (1-2s) should have 1000 damage
    expect(buckets[1].damage).toBe(1000);
    // Third bucket (2-3s) should have 1500 damage
    expect(buckets[2].damage).toBe(1500);

    // Verify all targets combined data
    const player1AllTargets = result.allTargets[PLAYER_ID_1];
    expect(player1AllTargets.totalDamage).toBe(3300); // 1000 + 1500 + 800
    expect(player1AllTargets.totalEvents).toBe(3);

    const player2AllTargets = result.allTargets[PLAYER_ID_2];
    expect(player2AllTargets.totalDamage).toBe(1200);
    expect(player2AllTargets.totalEvents).toBe(1);
  });

  it('should handle empty damage events', () => {
    const task: DamageOverTimeCalculationTask = {
      fight: mockFight,
      players: mockPlayers,
      damageEvents: [],
      bucketSizeMs: 1000,
    };

    const result = calculateDamageOverTimeData(task);

    expect(result).toBeDefined();
    expect(Object.keys(result.byTarget)).toHaveLength(0);
    expect(Object.keys(result.allTargets)).toHaveLength(0);
  });

  it('should filter out friendly fire damage', () => {
    const friendlyFireEvent = createMockDamageEvent({
      timestamp: FIGHT_START + 1000,
      sourceID: PLAYER_ID_1,
      targetID: PLAYER_ID_2,
      amount: 1000,
      sourceIsFriendly: true,
      targetIsFriendly: false, // We'll modify this manually
    });
    // Manually set targetIsFriendly to true to simulate friendly fire
    (friendlyFireEvent as any).targetIsFriendly = true;

    const damageEvents = [
      friendlyFireEvent,
      // Friendly player damaging enemy
      createMockDamageEvent({
        timestamp: FIGHT_START + 2000,
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 1500,
        sourceIsFriendly: true,
        targetIsFriendly: false, // This should be included
      }),
    ];

    const task: DamageOverTimeCalculationTask = {
      fight: mockFight,
      players: mockPlayers,
      damageEvents,
      bucketSizeMs: 1000,
    };

    const result = calculateDamageOverTimeData(task);

    // Should only have one target (TARGET_ID_1) and no friendly fire
    expect(Object.keys(result.byTarget)).toHaveLength(1);
    expect(result.byTarget[TARGET_ID_1]).toBeDefined();
    expect(result.allTargets[PLAYER_ID_1].totalDamage).toBe(1500); // Only the enemy damage
  });

  it('should calculate correct DPS values', () => {
    const damageEvents = [
      createMockDamageEvent({
        timestamp: FIGHT_START + 500, // 0.5 seconds in
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 2000,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
    ];

    const task: DamageOverTimeCalculationTask = {
      fight: mockFight,
      players: mockPlayers,
      damageEvents,
      bucketSizeMs: 1000,
    };

    const result = calculateDamageOverTimeData(task);

    const playerData = result.allTargets[PLAYER_ID_1];

    // Average DPS over the whole fight
    const expectedAverageDps = 2000 / 30; // 2000 damage over 30 seconds
    expect(playerData.averageDps).toBeCloseTo(expectedAverageDps, 2);

    // Max DPS should be 2000 (2000 damage in a 1-second bucket)
    expect(playerData.maxDps).toBe(2000);
  });
});
