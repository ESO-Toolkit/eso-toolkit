import { calculateDamageReductionData } from './CalculateDamageReduction';
import { KnownAbilities } from '../../types/abilities';
import {
  createMockCombatantInfoEvent,
  createMockBuffEvent,
  createMockDebuffEvent,
} from '../../test/utils/combatLogMockFactories';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';

describe('CalculateDamageReduction', () => {
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
    role: 'tank' as const, // Tank role for damage reduction
    ...overrides,
  });

  const createMockBuffLookupData = (
    intervals: Record<string, Array<{ start: number; end: number; targetID: number }>>,
  ) => ({
    buffIntervals: intervals,
  });

  describe('calculateDamageReductionData', () => {
    it('should return empty result when no players provided', () => {
      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players: {},
        combatantInfoRecord: {},
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result).toEqual({});
    });

    it('should skip players without combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord: {}, // No combatant info for player
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result).toEqual({});
    });

    it('should calculate basic damage reduction with combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result[PLAYER_ID]).toBeDefined();
      expect(result[PLAYER_ID].playerId).toBe(PLAYER_ID);
      expect(result[PLAYER_ID].playerName).toBe('Test Player');
      expect(result[PLAYER_ID].dataPoints).toHaveLength(11); // 10 second fight + initial point
      expect(result[PLAYER_ID].staticResistance).toBeGreaterThanOrEqual(0);
    });

    it('should calculate damage reduction data points over time', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(11);

      // Check first and last data points
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
      expect(playerData.dataPoints[0].relativeTime).toBe(0);
      expect(playerData.dataPoints[10].timestamp).toBe(FIGHT_END);
      expect(playerData.dataPoints[10].relativeTime).toBe(10);

      // All data points should have valid damage reduction values
      playerData.dataPoints.forEach((point: any) => {
        expect(point.damageReduction).toBeGreaterThanOrEqual(0);
        expect(point.damageReduction).toBeLessThanOrEqual(100);
        expect(point.totalResistance).toBeGreaterThanOrEqual(0);
        expect(point.staticResistance).toBeGreaterThanOrEqual(0);
        expect(point.dynamicResistance).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle buff-based damage reduction increases', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a friendly buff that increases damage reduction
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_RESOLVE.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: PLAYER_ID },
        ],
      });

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];

      // Damage reduction should be higher during buff period
      const beforeBuff = playerData.dataPoints[1].damageReduction; // t+1s
      const duringBuff = playerData.dataPoints[5].damageReduction; // t+5s (during buff)
      const afterBuff = playerData.dataPoints[9].damageReduction; // t+9s (after buff)

      expect(duringBuff).toBeGreaterThanOrEqual(beforeBuff);
      expect(afterBuff).toBeLessThanOrEqual(duringBuff);
    });

    it('should calculate maximum dynamic resistance correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add multiple buffs that provide resistance
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_RESOLVE.toString()]: [
          { start: FIGHT_START, end: FIGHT_END, targetID: PLAYER_ID },
        ],
        [KnownAbilities.MINOR_RESOLVE.toString()]: [
          { start: FIGHT_START + 5000, end: FIGHT_END, targetID: PLAYER_ID },
        ],
      });

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];

      // Maximum should be greater than or equal to any individual data point
      const maxFromDataPoints = Math.max(
        ...playerData.dataPoints.map((p: any) => p.dynamicResistance),
      );
      expect(playerData.maxDynamicResistance).toBeGreaterThanOrEqual(maxFromDataPoints);
    });

    it('should calculate average dynamic resistance correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];

      // Calculate expected average
      const totalDynamicResistance = playerData.dataPoints.reduce(
        (sum: number, point: any) => sum + point.dynamicResistance,
        0,
      );
      const expectedAverage = totalDynamicResistance / playerData.dataPoints.length;

      expect(playerData.averageDynamicResistance).toBeCloseTo(expectedAverage, 1);
    });

    it('should include damage reduction sources information', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];
      expect(playerData.damageReductionSources).toBeDefined();
      expect(Array.isArray(playerData.damageReductionSources)).toBe(true);
    });

    it('should handle multiple players', () => {
      const PLAYER_ID_2 = 101;
      const players = {
        [PLAYER_ID]: createMockPlayer({ id: PLAYER_ID, name: 'Tank 1' }),
        [PLAYER_ID_2]: createMockPlayer({ id: PLAYER_ID_2, name: 'Tank 2' }),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
        [PLAYER_ID_2]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID_2,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(Object.keys(result)).toHaveLength(2);
      expect(result[PLAYER_ID]).toBeDefined();
      expect(result[PLAYER_ID_2]).toBeDefined();
      expect(result[PLAYER_ID].playerName).toBe('Tank 1');
      expect(result[PLAYER_ID_2].playerName).toBe('Tank 2');
    });

    it('should call progress callback if provided', () => {
      const onProgress = jest.fn();
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      calculateDamageReductionData(
        {
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoRecord,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
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

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Very short fight
      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_START + 500 }, // 0.5 second fight
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(2); // Short fight still has multiple points
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
    });

    it('should handle resistance-to-damage-reduction conversion correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result[PLAYER_ID];

      // All damage reduction values should be between 0 and 100
      playerData.dataPoints.forEach((point: any) => {
        expect(point.damageReduction).toBeGreaterThanOrEqual(0);
        expect(point.damageReduction).toBeLessThanOrEqual(100);

        // Total resistance should equal static + dynamic
        expect(point.totalResistance).toBeCloseTo(
          point.staticResistance + point.dynamicResistance,
          1,
        );
      });
    });

    it('should handle debuff-based resistance reductions', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoRecord = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a debuff that reduces resistance
      const debuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MAJOR_BREACH.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: PLAYER_ID },
        ],
      });

      const result = calculateDamageReductionData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoRecord,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup,
      });

      const playerData = result[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(11);

      // All points should have valid damage reduction values
      playerData.dataPoints.forEach((point: any) => {
        expect(point.damageReduction).toBeGreaterThanOrEqual(0);
        expect(point.damageReduction).toBeLessThanOrEqual(100);
      });
    });
  });
});
