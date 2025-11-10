import {
  calculateActiveCombatTime,
  filterDataPointsByActiveCombat,
  isTimestampInActiveCombat,
} from './activeCombatTimeUtils';
import type { DamageEvent } from '../types/combatlogEvents';

describe('activeCombatTimeUtils', () => {
  const FIGHT_START = 10000;
  const FIGHT_END = 20000;
  const PLAYER_ID = 100;
  const TARGET_ID = 200;

  const createDamageEvent = (timestamp: number, targetID: number = TARGET_ID): DamageEvent => ({
    timestamp,
    type: 'damage',
    sourceID: PLAYER_ID,
    sourceIsFriendly: true,
    targetID,
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

  describe('calculateActiveCombatTime', () => {
    it('should return zero active time when no damage events', () => {
      const result = calculateActiveCombatTime([], FIGHT_START, FIGHT_END);

      expect(result.activeCombatTimeMs).toBe(0);
      expect(result.activeCombatIntervals).toEqual([]);
    });

    it('should return zero active time when no friendly damage events', () => {
      const events: DamageEvent[] = [
        { ...createDamageEvent(FIGHT_START), sourceIsFriendly: false },
        { ...createDamageEvent(FIGHT_START + 1000), sourceIsFriendly: false },
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatTimeMs).toBe(0);
      expect(result.activeCombatIntervals).toEqual([]);
    });

    it('should return zero active time when no damage to enemy targets', () => {
      // DamageEvent type has targetIsFriendly: false as a literal type
      // So we test with events outside the fight time range instead
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START - 2000), // Before fight
        createDamageEvent(FIGHT_END + 2000), // After fight
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatTimeMs).toBe(0);
      expect(result.activeCombatIntervals).toEqual([]);
    });

    it('should calculate single continuous combat period', () => {
      // Damage every 500ms for 5 seconds (continuous combat)
      const events: DamageEvent[] = [];
      for (let time = FIGHT_START; time <= FIGHT_START + 5000; time += 500) {
        events.push(createDamageEvent(time));
      }

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatTimeMs).toBe(5000);
      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 5000,
      });
    });

    it('should split combat periods on gaps > 1 second', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START), // Period 1 start
        createDamageEvent(FIGHT_START + 500),
        createDamageEvent(FIGHT_START + 1000), // Period 1 end
        // 2 second gap (> 1 second threshold)
        createDamageEvent(FIGHT_START + 3000), // Period 2 start
        createDamageEvent(FIGHT_START + 3500), // Period 2 end
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(2);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 1000,
      });
      expect(result.activeCombatIntervals[1]).toEqual({
        start: FIGHT_START + 3000,
        end: FIGHT_START + 3500,
      });
      expect(result.activeCombatTimeMs).toBe(1500); // 1000ms + 500ms
    });

    it('should not split combat periods on gaps <= 1 second', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START),
        createDamageEvent(FIGHT_START + 1000), // Exactly 1 second gap
        createDamageEvent(FIGHT_START + 2000),
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 2000,
      });
      expect(result.activeCombatTimeMs).toBe(2000);
    });

    it('should filter events outside fight time range', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START - 1000), // Before fight
        createDamageEvent(FIGHT_START),
        createDamageEvent(FIGHT_START + 1000),
        createDamageEvent(FIGHT_END + 1000), // After fight
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 1000,
      });
    });

    it('should filter by selected target IDs', () => {
      const TARGET_ID_2 = 201;
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START, TARGET_ID), // Target 1
        createDamageEvent(FIGHT_START + 500, TARGET_ID_2), // Target 2 (not selected)
        createDamageEvent(FIGHT_START + 1000, TARGET_ID), // Target 1
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END, [TARGET_ID]);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 1000,
      });
      expect(result.activeCombatTimeMs).toBe(1000);
    });

    it('should handle multiple selected targets', () => {
      const TARGET_ID_2 = 201;
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START, TARGET_ID),
        createDamageEvent(FIGHT_START + 500, TARGET_ID_2),
        createDamageEvent(FIGHT_START + 1000, TARGET_ID),
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END, [
        TARGET_ID,
        TARGET_ID_2,
      ]);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 1000,
      });
    });

    it('should ignore zero damage events', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START),
        { ...createDamageEvent(FIGHT_START + 500), amount: 0 }, // Zero damage
        createDamageEvent(FIGHT_START + 1000),
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      // The zero damage event at 500ms creates a gap, so we get two periods
      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0].start).toBe(FIGHT_START);
      expect(result.activeCombatIntervals[0].end).toBe(FIGHT_START + 1000);
    });

    it('should handle combat at start and end of fight', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START),
        createDamageEvent(FIGHT_START + 500),
        // Gap
        createDamageEvent(FIGHT_END - 500),
        createDamageEvent(FIGHT_END),
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(2);
      expect(result.activeCombatIntervals[0].start).toBe(FIGHT_START);
      expect(result.activeCombatIntervals[1].end).toBe(FIGHT_END);
    });

    it('should handle unsorted damage events', () => {
      const events: DamageEvent[] = [
        createDamageEvent(FIGHT_START + 2000),
        createDamageEvent(FIGHT_START),
        createDamageEvent(FIGHT_START + 1000),
      ];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START,
        end: FIGHT_START + 2000,
      });
    });

    it('should handle single damage event', () => {
      const events: DamageEvent[] = [createDamageEvent(FIGHT_START + 5000)];

      const result = calculateActiveCombatTime(events, FIGHT_START, FIGHT_END);

      expect(result.activeCombatIntervals).toHaveLength(1);
      expect(result.activeCombatIntervals[0]).toEqual({
        start: FIGHT_START + 5000,
        end: FIGHT_START + 5000,
      });
      expect(result.activeCombatTimeMs).toBe(0);
    });
  });

  describe('isTimestampInActiveCombat', () => {
    const intervals = [
      { start: 1000, end: 3000 },
      { start: 5000, end: 7000 },
    ];

    it('should return true for timestamp at start of interval', () => {
      expect(isTimestampInActiveCombat(1000, intervals)).toBe(true);
      expect(isTimestampInActiveCombat(5000, intervals)).toBe(true);
    });

    it('should return true for timestamp at end of interval', () => {
      expect(isTimestampInActiveCombat(3000, intervals)).toBe(true);
      expect(isTimestampInActiveCombat(7000, intervals)).toBe(true);
    });

    it('should return true for timestamp within interval', () => {
      expect(isTimestampInActiveCombat(2000, intervals)).toBe(true);
      expect(isTimestampInActiveCombat(6000, intervals)).toBe(true);
    });

    it('should return false for timestamp before all intervals', () => {
      expect(isTimestampInActiveCombat(500, intervals)).toBe(false);
    });

    it('should return false for timestamp after all intervals', () => {
      expect(isTimestampInActiveCombat(8000, intervals)).toBe(false);
    });

    it('should return false for timestamp in gap between intervals', () => {
      expect(isTimestampInActiveCombat(4000, intervals)).toBe(false);
    });

    it('should return false for empty intervals', () => {
      expect(isTimestampInActiveCombat(1000, [])).toBe(false);
    });
  });

  describe('filterDataPointsByActiveCombat', () => {
    const intervals = [
      { start: 1000, end: 3000 },
      { start: 5000, end: 7000 },
    ];

    it('should filter data points to only include those in active intervals', () => {
      const dataPoints = [
        { timestamp: 500, value: 1 }, // Before first interval
        { timestamp: 1000, value: 2 }, // At start of first interval
        { timestamp: 2000, value: 3 }, // Within first interval
        { timestamp: 3000, value: 4 }, // At end of first interval
        { timestamp: 4000, value: 5 }, // In gap
        { timestamp: 5000, value: 6 }, // At start of second interval
        { timestamp: 6000, value: 7 }, // Within second interval
        { timestamp: 7000, value: 8 }, // At end of second interval
        { timestamp: 8000, value: 9 }, // After last interval
      ];

      const result = filterDataPointsByActiveCombat(dataPoints, intervals);

      expect(result).toHaveLength(6);
      expect(result.map((p) => p.value)).toEqual([2, 3, 4, 6, 7, 8]);
    });

    it('should return empty array when no data points in active intervals', () => {
      const dataPoints = [
        { timestamp: 500, value: 1 },
        { timestamp: 4000, value: 2 },
        { timestamp: 8000, value: 3 },
      ];

      const result = filterDataPointsByActiveCombat(dataPoints, intervals);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when intervals are empty', () => {
      const dataPoints = [
        { timestamp: 1000, value: 1 },
        { timestamp: 2000, value: 2 },
      ];

      const result = filterDataPointsByActiveCombat(dataPoints, []);

      expect(result).toHaveLength(0);
    });

    it('should handle empty data points array', () => {
      const result = filterDataPointsByActiveCombat([], intervals);

      expect(result).toHaveLength(0);
    });

    it('should preserve original data point structure', () => {
      const dataPoints = [
        { timestamp: 2000, value: 10, metadata: 'test', nested: { prop: 'value' } },
      ];

      const result = filterDataPointsByActiveCombat(dataPoints, intervals);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(dataPoints[0]);
      expect(result[0].metadata).toBe('test');
      expect(result[0].nested.prop).toBe('value');
    });
  });
});
