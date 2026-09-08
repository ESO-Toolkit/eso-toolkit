import { createMockDamageEvent } from '../../test/utils/combatLogMockFactories';

import { calculateDamageOverTimeData } from './CalculateDamageOverTime';
import type { DamageOverTimeCalculationTask } from './CalculateDamageOverTime';

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
    expect(result.status).toBe('ok');
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
    expect(result.status).toBe('ok');
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

  it('buckets boundary events correctly and excludes out-of-window events', () => {
    const damageEvents = [
      // Exactly on a bucket boundary -> belongs to bucket 10 (10s in)
      createMockDamageEvent({
        timestamp: FIGHT_START + 10000,
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 500,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
      // Before the fight window -> excluded from buckets, groups, and event counts
      createMockDamageEvent({
        timestamp: FIGHT_START - 5,
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_1,
        amount: 999,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
      // Exactly at fight end -> excluded (last bucket end is exclusive), including its target group
      createMockDamageEvent({
        timestamp: FIGHT_END,
        sourceID: PLAYER_ID_1,
        targetID: TARGET_ID_2,
        amount: 777,
        sourceIsFriendly: true,
        targetIsFriendly: false,
      }),
    ];

    const result = calculateDamageOverTimeData({
      fight: mockFight,
      players: mockPlayers,
      damageEvents,
      bucketSizeMs: 1000,
    });

    const p1t1 = result.byTarget[TARGET_ID_1][PLAYER_ID_1];
    // Only the boundary event lands in a bucket; out-of-window events are dropped.
    expect(p1t1.dataPoints[10].damage).toBe(500);
    expect(p1t1.dataPoints[10].eventCount).toBe(1);
    expect(p1t1.totalDamage).toBe(500);
    expect(p1t1.totalEvents).toBe(1);
    expect(result.byTarget[TARGET_ID_2]).toBeUndefined();
    expect(result.allTargets[PLAYER_ID_1].totalEvents).toBe(1);

    // Player 2 has no events but is in the players record -> all-zero buckets.
    const p2t1 = result.byTarget[TARGET_ID_1][PLAYER_ID_2];
    expect(p2t1.totalDamage).toBe(0);
    expect(p2t1.dataPoints).toHaveLength(30);
    expect(p2t1.dataPoints.every((d) => d.damage === 0 && d.eventCount === 0)).toBe(true);
  });

  it('accepts timestamp zero and treats the fight end as exclusive', () => {
    const result = calculateDamageOverTimeData({
      fight: { startTime: 0, endTime: 2000 },
      players: mockPlayers,
      damageEvents: [
        createMockDamageEvent({
          timestamp: 0,
          sourceID: PLAYER_ID_1,
          targetID: TARGET_ID_1,
          amount: 100,
          sourceIsFriendly: true,
          targetIsFriendly: false,
        }),
        createMockDamageEvent({
          timestamp: 2000,
          sourceID: PLAYER_ID_1,
          targetID: TARGET_ID_1,
          amount: 999,
          sourceIsFriendly: true,
          targetIsFriendly: false,
        }),
      ],
      bucketSizeMs: 1000,
    });

    expect(result.byTarget[TARGET_ID_1][PLAYER_ID_1].dataPoints).toEqual([
      expect.objectContaining({ timestamp: 0, damage: 100, eventCount: 1 }),
      expect.objectContaining({ timestamp: 1000, damage: 0, eventCount: 0 }),
    ]);
    expect(result.allTargets[PLAYER_ID_1].totalDamage).toBe(100);
  });

  it.each([
    ['start', { startTime: -0, endTime: 1000 }],
    ['end', { startTime: -1000, endTime: -0 }],
  ])('normalizes a valid negative-zero fight %s endpoint', (_endpoint, fight) => {
    const result = calculateDamageOverTimeData({
      fight,
      players: mockPlayers,
      damageEvents: [],
      bucketSizeMs: 1000,
    });

    expect(result.status).toBe('ok');
    expect(Object.is(result.fightStartTime, -0)).toBe(false);
    expect(Object.is(result.fightEndTime, -0)).toBe(false);
    expect(result.fightDuration).toBe(1000);
  });

  it.each([
    ['zero duration', { startTime: 0, endTime: 0 }, 1000, 'invalid-fight-window'],
    ['negative-zero metadata', { startTime: -0, endTime: -0 }, 1000, 'invalid-fight-window'],
    ['negative duration', { startTime: 1000, endTime: 0 }, 1000, 'invalid-fight-window'],
    ['non-finite start', { startTime: Number.NaN, endTime: 1000 }, 1000, 'non-finite-fight-start'],
    [
      'non-finite end',
      { startTime: 0, endTime: Number.POSITIVE_INFINITY },
      1000,
      'non-finite-fight-end',
    ],
    [
      'huge bucket count',
      { startTime: 0, endTime: Number.MAX_SAFE_INTEGER },
      1,
      'bucket-count-exceeded',
    ],
    ['zero bucket size', mockFight, 0, 'invalid-bucket-size'],
    ['negative-zero bucket size', mockFight, -0, 'invalid-bucket-size'],
    ['negative bucket size', mockFight, -1, 'invalid-bucket-size'],
    ['sub-millisecond bucket size', mockFight, Number.MIN_VALUE, 'invalid-bucket-size'],
    [
      'sub-millisecond fight duration',
      { startTime: 0, endTime: Number.MIN_VALUE },
      1,
      'invalid-fight-window',
    ],
    ['non-finite bucket size', mockFight, Number.NaN, 'non-finite-bucket-size'],
  ])('returns explicit no-data for %s', (_description, fight, bucketSizeMs, reason) => {
    const onProgress = jest.fn();
    const result = calculateDamageOverTimeData(
      {
        fight,
        players: mockPlayers,
        damageEvents: [],
        bucketSizeMs,
      },
      onProgress,
    );

    expect(result.status).toBe('no-data');
    if (result.status !== 'no-data') throw new Error('Expected no-data result');
    expect(result.reason).toBe(reason);
    expect(result.byTarget).toEqual({});
    expect(result.allTargets).toEqual({});
    expect(result.fightDuration).toBe(0);
    expect(Number.isFinite(result.fightStartTime)).toBe(true);
    expect(Number.isFinite(result.fightEndTime)).toBe(true);
    expect(Number.isFinite(result.bucketSizeMs)).toBe(true);
    expect(Object.is(result.fightStartTime, -0)).toBe(false);
    expect(Object.is(result.fightEndTime, -0)).toBe(false);
    expect(Object.is(result.bucketSizeMs, -0)).toBe(false);
    expect(onProgress).toHaveBeenNthCalledWith(1, 0);
    expect(onProgress).toHaveBeenNthCalledWith(2, 1);
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

  it('returns typed no-data instead of non-finite damage totals after numeric overflow', () => {
    const result = calculateDamageOverTimeData({
      fight: { startTime: 0, endTime: 2000 },
      players: mockPlayers,
      damageEvents: [
        createMockDamageEvent({
          timestamp: 0,
          sourceID: PLAYER_ID_1,
          targetID: TARGET_ID_1,
          amount: Number.MAX_VALUE,
          sourceIsFriendly: true,
          targetIsFriendly: false,
        }),
        createMockDamageEvent({
          timestamp: 1000,
          sourceID: PLAYER_ID_1,
          targetID: TARGET_ID_1,
          amount: Number.MAX_VALUE,
          sourceIsFriendly: true,
          targetIsFriendly: false,
        }),
      ],
      bucketSizeMs: 1000,
    });

    expect(result).toMatchObject({ status: 'no-data', reason: 'non-finite-damage-output' });
    expect(result.byTarget).toEqual({});
    expect(result.allTargets).toEqual({});
  });
});
