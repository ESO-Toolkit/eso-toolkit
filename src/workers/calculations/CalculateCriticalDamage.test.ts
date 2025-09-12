import { calculateCriticalDamageData } from './CalculateCriticalDamage';
import { KnownAbilities } from '../../types/abilities';
import {
  createMockCombatantInfoEvent,
  createMockBuffEvent,
  createMockDebuffEvent,
} from '../../test/utils/combatLogMockFactories';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';

describe('CalculateCriticalDamage', () => {
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

  describe('calculateCriticalDamageData', () => {
    it('should return empty result when no players provided', () => {
      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players: {},
        combatantInfoEvents: {},
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result.playerDataMap).toEqual({});
    });

    it('should skip players without combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents: {}, // No combatant info for player
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result.playerDataMap).toEqual({});
    });

    it('should calculate basic critical damage with combatant info', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(result.playerDataMap[PLAYER_ID]).toBeDefined();
      expect(result.playerDataMap[PLAYER_ID].playerId).toBe(PLAYER_ID);
      expect(result.playerDataMap[PLAYER_ID].playerName).toBe('Test Player');
      expect(result.playerDataMap[PLAYER_ID].dataPoints).toHaveLength(11); // 10 second fight + initial point
      expect(result.playerDataMap[PLAYER_ID].staticCriticalDamage).toBeGreaterThanOrEqual(50);
    });

    it('should calculate critical damage data points over time', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(11);

      // Check first and last data points
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
      expect(playerData.dataPoints[0].relativeTime).toBe(0);
      expect(playerData.dataPoints[10].timestamp).toBe(FIGHT_END);
      expect(playerData.dataPoints[10].relativeTime).toBe(10);

      // All data points should have reasonable critical damage values
      playerData.dataPoints.forEach((point) => {
        expect(point.criticalDamage).toBeGreaterThanOrEqual(50);
        expect(point.criticalDamage).toBeLessThanOrEqual(200);
      });
    });

    it('should handle buff-based critical damage increases', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a friendly buff that increases critical damage
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MINOR_FORCE.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: PLAYER_ID },
        ],
      });

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];

      // Critical damage should be higher during buff period
      const beforeBuff = playerData.dataPoints[1].criticalDamage; // t+1s
      const duringBuff = playerData.dataPoints[5].criticalDamage; // t+5s (during buff)
      const afterBuff = playerData.dataPoints[9].criticalDamage; // t+9s (after buff)

      expect(duringBuff).toBeGreaterThan(beforeBuff);
      expect(afterBuff).toBeLessThanOrEqual(duringBuff);
    });

    it('should handle debuff-based critical damage increases', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add a debuff on target that increases critical damage
      const debuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MINOR_VULNERABILITY.toString()]: [
          { start: FIGHT_START + 2000, end: FIGHT_START + 8000, targetID: TARGET_ID },
        ],
      });

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup,
      });

      const playerData = result.playerDataMap[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(11);

      // All points should have valid critical damage values
      playerData.dataPoints.forEach((point) => {
        expect(point.criticalDamage).toBeGreaterThanOrEqual(50);
      });
    });

    it('should calculate maximum critical damage correctly', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      // Add multiple buffs that stack
      const friendlyBuffsLookup = createMockBuffLookupData({
        [KnownAbilities.MINOR_FORCE.toString()]: [
          { start: FIGHT_START, end: FIGHT_END, targetID: PLAYER_ID },
        ],
        [KnownAbilities.MAJOR_FORCE.toString()]: [
          { start: FIGHT_START + 5000, end: FIGHT_END, targetID: PLAYER_ID },
        ],
      });

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup,
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];

      // Maximum should be greater than or equal to any individual data point
      const maxFromDataPoints = Math.max(...playerData.dataPoints.map((p) => p.criticalDamage));
      expect(playerData.maximumCriticalDamage).toBeGreaterThanOrEqual(maxFromDataPoints);
    });

    it('should calculate effective critical damage as average', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];

      // Calculate expected average
      const totalCritDamage = playerData.dataPoints.reduce(
        (sum, point) => sum + point.criticalDamage,
        0,
      );
      const expectedAverage = totalCritDamage / playerData.dataPoints.length;

      expect(playerData.effectiveCriticalDamage).toBeCloseTo(expectedAverage, 1);
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

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];

      // Count how many points are at or above 125%
      const pointsAtCap = playerData.dataPoints.filter((p) => p.criticalDamage >= 125).length;
      const expectedPercentage = (pointsAtCap / playerData.dataPoints.length) * 100;

      expect(playerData.timeAtCapPercentage).toBeCloseTo(expectedPercentage, 1);
    });

    it('should handle multiple players', () => {
      const PLAYER_ID_2 = 101;
      const players = {
        [PLAYER_ID]: createMockPlayer({ id: PLAYER_ID, name: 'Player 1' }),
        [PLAYER_ID_2]: createMockPlayer({ id: PLAYER_ID_2, name: 'Player 2' }),
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

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      expect(Object.keys(result.playerDataMap)).toHaveLength(2);
      expect(result.playerDataMap[PLAYER_ID]).toBeDefined();
      expect(result.playerDataMap[PLAYER_ID_2]).toBeDefined();
      expect(result.playerDataMap[PLAYER_ID].playerName).toBe('Player 1');
      expect(result.playerDataMap[PLAYER_ID_2].playerName).toBe('Player 2');
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

      calculateCriticalDamageData(
        {
          fight: { startTime: FIGHT_START, endTime: FIGHT_END },
          players,
          combatantInfoEvents,
          friendlyBuffsLookup: createMockBuffLookupData({}),
          debuffsLookup: createMockBuffLookupData({}),
        },
        onProgress,
      );

      expect(onProgress).toHaveBeenCalledWith(0);
      expect(onProgress).toHaveBeenCalledWith(1);
      expect(onProgress.mock.calls.length).toBeGreaterThan(2);
    });

    it('should include critical damage sources information', () => {
      const players = {
        [PLAYER_ID]: createMockPlayer(),
      };

      const combatantInfoEvents = {
        [PLAYER_ID]: createMockCombatantInfoEvent({
          sourceID: PLAYER_ID,
          timestamp: FIGHT_START,
        }),
      };

      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_END },
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];
      expect(playerData.criticalDamageSources).toBeDefined();
      expect(Array.isArray(playerData.criticalDamageSources)).toBe(true);
    });

    it('should handle edge case with fight end time boundary', () => {
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
      const result = calculateCriticalDamageData({
        fight: { startTime: FIGHT_START, endTime: FIGHT_START + 500 }, // 0.5 second fight
        players,
        combatantInfoEvents,
        friendlyBuffsLookup: createMockBuffLookupData({}),
        debuffsLookup: createMockBuffLookupData({}),
      });

      const playerData = result.playerDataMap[PLAYER_ID];
      expect(playerData.dataPoints).toHaveLength(1); // Only initial point
      expect(playerData.dataPoints[0].timestamp).toBe(FIGHT_START);
    });
  });
});
