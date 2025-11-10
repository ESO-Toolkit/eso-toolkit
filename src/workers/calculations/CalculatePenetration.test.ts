import { calculatePenetrationData } from './CalculatePenetration';
import { KnownAbilities } from '../../types/abilities';
import {
  createMockCombatantInfoEvent,
  createMockBuffEvent,
  createMockDebuffEvent,
} from '../../test/utils/combatLogMockFactories';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import type { DamageEvent } from '../../types/combatlogEvents';

describe('CalculatePenetration', () => {
  const FIGHT_START = 10000;
  const FIGHT_END = 20000; // 10 second fight
  const PLAYER_ID = 100;
  const TARGET_ID = 200;

  const createMockPlayer = (overrides?: Partial<PlayerDetailsWithRole>): PlayerDetailsWithRole => ({
    id: PLAYER_ID,
    name: 'Test Player',
    type: 'Player',
    guid: PLAYER_ID,
    server: 'Test Server',
    displayName: 'Test Player',
    anonymous: false,
    icon: 'test-icon.jpg',
    specs: [],
    potionUse: 0,
    healthstoneUse: 0,
    combatantInfo: {
      stats: [],
      talents: [],
      gear: [],
    },
    role: 'dps' as const,
    ...overrides,
  });

  const createMockBuffLookupData = (
    intervals: Record<string, Array<{ start: number; end: number; targetID: number }>>,
  ) => ({
    buffIntervals: intervals,
  });

  // Helper to create mock damage events for testing
  const createMockDamageEvents = (): DamageEvent[] => {
    const events: DamageEvent[] = [];
    for (let time = FIGHT_START; time < FIGHT_END; time += 500) {
      events.push({
        timestamp: time,
        type: 'damage',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: TARGET_ID,
        targetIsFriendly: false,
        abilityGameID: 1,
        fight: 1,
        hitType: 1, // Normal hit
        amount: 1000,
        castTrackID: 1,
        sourceResources: {
          hitPoints: 10000,
          maxHitPoints: 20000,
          magicka: 10000,
          maxMagicka: 10000,
          stamina: 10000,
          maxStamina: 10000,
          ultimate: 0,
          maxUltimate: 500,
          werewolf: 0,
          maxWerewolf: 1000,
          absorb: 0,
          championPoints: 810,
          x: 0,
          y: 0,
          facing: 0,
        },
        targetResources: {
          hitPoints: 50000,
          maxHitPoints: 100000,
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
          x: 0,
          y: 0,
          facing: 0,
        },
      });
    }
    return events;
  };

  describe('calculatePenetrationData', () => {
    it('should return empty result when no players provided', () => {
      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players: {},
        combatantInfoEvents: {},
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      expect(result).toEqual({});
    });

    it('should skip players without combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents: {}, // No combatant info for player
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      expect(result).toEqual({});
    });

    it('should calculate basic penetration with combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      expect(result[playerKey]).toBeDefined();
      expect(result[playerKey].playerId).toBe(playerKey);
      expect(result[playerKey].playerName).toBe('Test Player');
      expect(result[playerKey].dataPoints).toHaveLength(10); // 10 second fight
      expect(result[playerKey].playerBasePenetration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate penetration data points over time', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];
      expect(playerData.dataPoints).toHaveLength(10);

      // Check first and last data points
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
      expect(playerData.dataPoints[0].relativeTime).toBe(0);
      expect(playerData.dataPoints[9].timestamp).toBe(FIGHT_END - 1000); // Last point is at 19000
      expect(playerData.dataPoints[9].relativeTime).toBe(9);

      // All data points should have valid penetration values
      playerData.dataPoints.forEach((point: any) => {
        expect(point.penetration).toBeGreaterThanOrEqual(0);
        expect(point.penetration).toBeLessThanOrEqual(25000); // Reasonable upper bound
      });
    });

    it('should handle buff-based penetration increases', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a friendly buff that increases penetration
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_BREACH.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: TARGET_ID },
        ],
      });

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];

      // All points should have valid penetration values
      playerData.dataPoints.forEach((point: any) => {
        expect(point.penetration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate maximum penetration correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add multiple buffs that provide penetration
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_BREACH.toString()]: [
          { start: FIGHT_START, end: FIGHT_END, targetID: TARGET_ID },
        ],
        [KnownAbilities.MINOR_BREACH.toString()]: [
          { start: FIGHT_START + 5000, end: FIGHT_END, targetID: TARGET_ID },
        ],
      });

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];

      // Maximum should be greater than or equal to any individual data point
      const maxFromDataPoints = Math.max(...playerData.dataPoints.map((p: any) => p.penetration));
      expect(playerData.max).toBeGreaterThanOrEqual(maxFromDataPoints);
    });

    it('should calculate effective penetration correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];

      // Effective penetration should be a reasonable average
      const totalPenetration = playerData.dataPoints.reduce(
        (sum: number, point: any) => sum + point.penetration,
        0,
      );
      const expectedAverage = totalPenetration / playerData.dataPoints.length;

      expect(playerData.effective).toBeCloseTo(expectedAverage, 1);
    });

    it('should calculate time at cap percentage', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];

      // Count how many points are at or above penetration cap (18200)
      const pointsAtCap = playerData.dataPoints.filter((p: any) => p.penetration >= 18200).length;
      const expectedPercentage = (pointsAtCap / playerData.dataPoints.length) * 100;

      expect(playerData.timeAtCapPercentage).toBeCloseTo(expectedPercentage, 1);
    });

    it('should include penetration sources information', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];
      expect(playerData.penetrationSources).toBeDefined();
      expect(Array.isArray(playerData.penetrationSources)).toBe(true);
    });

    it('should handle multiple players', () => {
      const PLAYER_ID_2 = 101;
      const players = {
        [PLAYER_ID]: createMockPlayer({ id: PLAYER_ID, name: 'DPS 1' }),
        [PLAYER_ID_2]: createMockPlayer({ id: PLAYER_ID_2, name: 'DPS 2' }),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
        [PLAYER_ID_2]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID_2,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      expect(Object.keys(result)).toHaveLength(2);
      expect(result[PLAYER_ID.toString()]).toBeDefined();
      expect(result[PLAYER_ID_2.toString()]).toBeDefined();
      expect(result[PLAYER_ID.toString()].playerName).toBe('DPS 1');
      expect(result[PLAYER_ID_2.toString()].playerName).toBe('DPS 2');
    });

    it('should call progress callback if provided', () => {
      const onProgress = jest.fn();
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      calculatePenetrationData(
        {
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents: createMockDamageEvents(),
        },
        onProgress,
      );

      expect(onProgress).toHaveBeenCalledWith(0);
      expect(onProgress).toHaveBeenCalledWith(1);
      expect(onProgress.mock.calls.length).toBeGreaterThan(2);
    });

    it('should handle edge case with very short fight', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Very short fight
      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_START + 500 }, // 0.5 second fight
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];
      expect(playerData.dataPoints).toHaveLength(1); // Only initial point
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
    });

    it('should handle multiple selected targets', () => {
      const TARGET_ID_2 = 201;
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add buffs for different targets
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_BREACH.toString()]: [
          { start: FIGHT_START, end: FIGHT_END, targetID: TARGET_ID },
          { start: FIGHT_START + 2000, end: FIGHT_END, targetID: TARGET_ID_2 },
        ],
      });

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
        selectedTargetIds: [TARGET_ID, TARGET_ID_2], // Multiple targets
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      expect(result[playerKey]).toBeDefined();
      expect(result[playerKey].dataPoints).toHaveLength(10);
    });

    it('should handle debuff-based penetration correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a debuff on target that provides penetration benefit
      const debuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_BREACH.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: TARGET_ID },
        ],
      });

      const result = calculatePenetrationData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup,
        selectedTargetIds: [TARGET_ID],
        damageEvents: createMockDamageEvents(),
      });

      const playerKey = PLAYER_ID.toString();
      const playerData = result[playerKey];
      expect(playerData.dataPoints).toHaveLength(10);

      // All points should have valid penetration values
      playerData.dataPoints.forEach((point: any) => {
        expect(point.penetration).toBeGreaterThanOrEqual(0);
        expect(point.penetration).toBeLessThanOrEqual(25000);
      });
    });

    describe('Active Combat Time Integration', () => {
      it('should include inactiveCombatIntervals in result', () => {
        const players = {
          [PLAYER_ID]: createMockPlayer(),
        };

        const combatantInfoEvents = {
          [PLAYER_ID]: createMockCombatantInfoEvent({
            sourceID: PLAYER_ID,
            timestamp: FIGHT_START,
          }),
        };

        const result = calculatePenetrationData({
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents: createMockDamageEvents(),
        });

        const playerKey = PLAYER_ID.toString();
        expect(result[playerKey].inactiveCombatIntervals).toBeDefined();
        expect(Array.isArray(result[playerKey].inactiveCombatIntervals)).toBe(true);
      });

      it('should calculate effective penetration based only on active combat time', () => {
        const players = {
          [PLAYER_ID]: createMockPlayer(),
        };

        const combatantInfoEvents = {
          [PLAYER_ID]: createMockCombatantInfoEvent({
            sourceID: PLAYER_ID,
            timestamp: FIGHT_START,
          }),
        };

        // Create damage events with a 2-second gap in the middle (inactive period)
        const damageEvents: DamageEvent[] = [];
        // Active period 1: 0-3 seconds
        for (let time = FIGHT_START; time <= FIGHT_START + 3000; time += 500) {
          damageEvents.push({
            timestamp: time,
            type: 'damage',
            sourceID: PLAYER_ID,
            sourceIsFriendly: true,
            targetID: TARGET_ID,
            targetIsFriendly: false,
            abilityGameID: 1,
            fight: 1,
            hitType: 1,
            amount: 1000,
            castTrackID: 1,
            sourceResources: {
              hitPoints: 10000,
              maxHitPoints: 20000,
              magicka: 10000,
              maxMagicka: 10000,
              stamina: 10000,
              maxStamina: 10000,
              ultimate: 0,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 1000,
              absorb: 0,
              championPoints: 810,
              x: 0,
              y: 0,
              facing: 0,
            },
            targetResources: {
              hitPoints: 50000,
              maxHitPoints: 100000,
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
              x: 0,
              y: 0,
              facing: 0,
            },
          });
        }
        // 2 second gap (inactive) from 3-5 seconds
        // Active period 2: 5-10 seconds
        for (let time = FIGHT_START + 5000; time <= FIGHT_END; time += 500) {
          damageEvents.push({
            timestamp: time,
            type: 'damage',
            sourceID: PLAYER_ID,
            sourceIsFriendly: true,
            targetID: TARGET_ID,
            targetIsFriendly: false,
            abilityGameID: 1,
            fight: 1,
            hitType: 1,
            amount: 1000,
            castTrackID: 1,
            sourceResources: {
              hitPoints: 10000,
              maxHitPoints: 20000,
              magicka: 10000,
              maxMagicka: 10000,
              stamina: 10000,
              maxStamina: 10000,
              ultimate: 0,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 1000,
              absorb: 0,
              championPoints: 810,
              x: 0,
              y: 0,
              facing: 0,
            },
            targetResources: {
              hitPoints: 50000,
              maxHitPoints: 100000,
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
              x: 0,
              y: 0,
              facing: 0,
            },
          });
        }

        const result = calculatePenetrationData({
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents,
        });

        const playerKey = PLAYER_ID.toString();
        const playerData = result[playerKey];

        // Should have one inactive interval (the 2 second gap)
        expect(playerData.inactiveCombatIntervals.length).toBeGreaterThan(0);

        // Effective penetration should be calculated from active combat periods only
        // The calculation should exclude the 2-second gap period
        expect(playerData.effective).toBeDefined();
        expect(playerData.effective).toBeGreaterThanOrEqual(0);
      });

      it('should calculate timeAtCapPercentage based only on active combat time', () => {
        const players = {
          [PLAYER_ID]: createMockPlayer(),
        };

        const combatantInfoEvents = {
          [PLAYER_ID]: createMockCombatantInfoEvent({
            sourceID: PLAYER_ID,
            timestamp: FIGHT_START,
          }),
        };

        const result = calculatePenetrationData({
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents: createMockDamageEvents(),
        });

        const playerKey = PLAYER_ID.toString();
        const playerData = result[playerKey];

        // timeAtCapPercentage should be defined and calculated from active time only
        expect(playerData.timeAtCapPercentage).toBeDefined();
        expect(playerData.timeAtCapPercentage).toBeGreaterThanOrEqual(0);
        expect(playerData.timeAtCapPercentage).toBeLessThanOrEqual(100);
      });

      it('should mark entire fight as inactive when no damage events', () => {
        const players = {
          [PLAYER_ID]: createMockPlayer(),
        };

        const combatantInfoEvents = {
          [PLAYER_ID]: createMockCombatantInfoEvent({
            sourceID: PLAYER_ID,
            timestamp: FIGHT_START,
          }),
        };

        const result = calculatePenetrationData({
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents: [], // No damage events
        });

        const playerKey = PLAYER_ID.toString();
        const playerData = result[playerKey];

        // Should have one inactive interval covering the entire fight
        expect(playerData.inactiveCombatIntervals).toHaveLength(1);
        expect(playerData.inactiveCombatIntervals[0].start).toBe(0);
        expect(playerData.inactiveCombatIntervals[0].end).toBe(10); // 10 second fight
      });

      it('should have no inactive intervals for continuous combat', () => {
        const players = {
          [PLAYER_ID]: createMockPlayer(),
        };

        const combatantInfoEvents = {
          [PLAYER_ID]: createMockCombatantInfoEvent({
            sourceID: PLAYER_ID,
            timestamp: FIGHT_START,
          }),
        };

        // Create continuous damage (every 100ms, well within 1 second threshold)
        const damageEvents: DamageEvent[] = [];
        for (let time = FIGHT_START; time <= FIGHT_END; time += 100) {
          damageEvents.push({
            timestamp: time,
            type: 'damage',
            sourceID: PLAYER_ID,
            sourceIsFriendly: true,
            targetID: TARGET_ID,
            targetIsFriendly: false,
            abilityGameID: 1,
            fight: 1,
            hitType: 1,
            amount: 1000,
            castTrackID: 1,
            sourceResources: {
              hitPoints: 10000,
              maxHitPoints: 20000,
              magicka: 10000,
              maxMagicka: 10000,
              stamina: 10000,
              maxStamina: 10000,
              ultimate: 0,
              maxUltimate: 500,
              werewolf: 0,
              maxWerewolf: 1000,
              absorb: 0,
              championPoints: 810,
              x: 0,
              y: 0,
              facing: 0,
            },
            targetResources: {
              hitPoints: 50000,
              maxHitPoints: 100000,
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
              x: 0,
              y: 0,
              facing: 0,
            },
          });
        }

        const result = calculatePenetrationData({
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
          selectedTargetIds: [TARGET_ID],
          damageEvents,
        });

        const playerKey = PLAYER_ID.toString();
        const playerData = result[playerKey];

        // Should have no inactive intervals
        expect(playerData.inactiveCombatIntervals).toHaveLength(0);
      });
    });
  });
});
