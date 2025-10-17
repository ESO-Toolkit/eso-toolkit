/**
 * Tests for fightTimeUtils
 * Tests fight time conversion utilities and time range validation
 */

import {
  fightTimeToTimestamp,
  timestampToFightTime,
  getFightDuration,
  isTimestampInFight,
  clampFightTime,
} from './fightTimeUtils';
import { FightFragment } from '../graphql/gql/graphql';

// Mock fight data helper
const createMockFight = (startTime: number, endTime: number): FightFragment => ({
  id: 1,
  startTime,
  endTime,
  name: 'Test Fight',
  difficulty: 0,
  bossPercentage: 100,
  fightPercentage: 100,
  kill: true,
  partial: false,
  standardComposition: true,
  hasEcho: false,
  keystoneLevel: 0,
  keystoneAffixes: [],
});

describe('fightTimeUtils', () => {
  describe('fightTimeToTimestamp', () => {
    it('should convert fight time 0 to fight start time', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = fightTimeToTimestamp(0, fight);
      expect(result).toBe(1000000);
    });

    it('should convert positive fight time correctly', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = fightTimeToTimestamp(30000, fight);
      expect(result).toBe(1030000);
    });

    it('should handle large fight times', () => {
      const fight = createMockFight(1000000, 1600000);
      const result = fightTimeToTimestamp(600000, fight);
      expect(result).toBe(1600000);
    });

    it('should handle negative fight times', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = fightTimeToTimestamp(-5000, fight);
      expect(result).toBe(995000);
    });

    it('should work with zero start time', () => {
      const fight = createMockFight(0, 60000);
      const result = fightTimeToTimestamp(30000, fight);
      expect(result).toBe(30000);
    });

    it('should handle fractional milliseconds', () => {
      const fight = createMockFight(1000000.5, 1060000.5);
      const result = fightTimeToTimestamp(30000.3, fight);
      expect(result).toBeCloseTo(1030000.8);
    });
  });

  describe('timestampToFightTime', () => {
    it('should convert fight start timestamp to 0', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = timestampToFightTime(1000000, fight);
      expect(result).toBe(0);
    });

    it('should convert timestamps within fight correctly', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = timestampToFightTime(1045000, fight);
      expect(result).toBe(45000);
    });

    it('should handle timestamps before fight start', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = timestampToFightTime(995000, fight);
      expect(result).toBe(-5000);
    });

    it('should handle timestamps after fight end', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = timestampToFightTime(1070000, fight);
      expect(result).toBe(70000);
    });

    it('should be inverse of fightTimeToTimestamp', () => {
      const fight = createMockFight(1500000, 1800000);
      const originalFightTime = 120000;

      const timestamp = fightTimeToTimestamp(originalFightTime, fight);
      const backToFightTime = timestampToFightTime(timestamp, fight);

      expect(backToFightTime).toBe(originalFightTime);
    });

    it('should handle fractional milliseconds', () => {
      const fight = createMockFight(1000000.7, 1060000.7);
      const result = timestampToFightTime(1030000.2, fight);
      expect(result).toBeCloseTo(29999.5);
    });
  });

  describe('getFightDuration', () => {
    it('should calculate duration correctly', () => {
      const fight = createMockFight(1000000, 1060000);
      const result = getFightDuration(fight);
      expect(result).toBe(60000);
    });

    it('should handle zero duration fights', () => {
      const fight = createMockFight(1000000, 1000000);
      const result = getFightDuration(fight);
      expect(result).toBe(0);
    });

    it('should handle very short fights', () => {
      const fight = createMockFight(1000000, 1000001);
      const result = getFightDuration(fight);
      expect(result).toBe(1);
    });

    it('should handle very long fights', () => {
      const fight = createMockFight(0, 3600000); // 1 hour
      const result = getFightDuration(fight);
      expect(result).toBe(3600000);
    });

    it('should handle fractional durations', () => {
      const fight = createMockFight(1000000.3, 1060000.8);
      const result = getFightDuration(fight);
      expect(result).toBeCloseTo(60000.5);
    });

    it('should work with large timestamp values', () => {
      const startTime = 1693920000000; // Unix timestamp in milliseconds
      const endTime = startTime + 300000; // 5 minutes later
      const fight = createMockFight(startTime, endTime);
      const result = getFightDuration(fight);
      expect(result).toBe(300000);
    });
  });

  describe('isTimestampInFight', () => {
    const fight = createMockFight(1000000, 1060000);

    it('should return true for timestamp at fight start', () => {
      const result = isTimestampInFight(1000000, fight);
      expect(result).toBe(true);
    });

    it('should return true for timestamp at fight end', () => {
      const result = isTimestampInFight(1060000, fight);
      expect(result).toBe(true);
    });

    it('should return true for timestamp within fight', () => {
      const result = isTimestampInFight(1030000, fight);
      expect(result).toBe(true);
    });

    it('should return false for timestamp before fight', () => {
      const result = isTimestampInFight(999999, fight);
      expect(result).toBe(false);
    });

    it('should return false for timestamp after fight', () => {
      const result = isTimestampInFight(1060001, fight);
      expect(result).toBe(false);
    });

    it('should handle edge cases with very close timestamps', () => {
      expect(isTimestampInFight(999999.9, fight)).toBe(false);
      expect(isTimestampInFight(1000000.1, fight)).toBe(true);
      expect(isTimestampInFight(1059999.9, fight)).toBe(true);
      expect(isTimestampInFight(1060000.1, fight)).toBe(false);
    });

    it('should work with zero-duration fights', () => {
      const instantFight = createMockFight(1000000, 1000000);
      expect(isTimestampInFight(1000000, instantFight)).toBe(true);
      expect(isTimestampInFight(999999, instantFight)).toBe(false);
      expect(isTimestampInFight(1000001, instantFight)).toBe(false);
    });
  });

  describe('clampFightTime', () => {
    const fight = createMockFight(1000000, 1060000); // 60 second fight

    it('should return 0 for negative fight times', () => {
      expect(clampFightTime(-1000, fight)).toBe(0);
      expect(clampFightTime(-0.1, fight)).toBe(0);
    });

    it('should return fight time unchanged when within bounds', () => {
      expect(clampFightTime(0, fight)).toBe(0);
      expect(clampFightTime(30000, fight)).toBe(30000);
      expect(clampFightTime(60000, fight)).toBe(60000);
    });

    it('should clamp to fight duration when exceeding bounds', () => {
      expect(clampFightTime(70000, fight)).toBe(60000);
      expect(clampFightTime(120000, fight)).toBe(60000);
    });

    it('should handle zero-duration fights', () => {
      const instantFight = createMockFight(1000000, 1000000);
      expect(clampFightTime(-1000, instantFight)).toBe(0);
      expect(clampFightTime(0, instantFight)).toBe(0);
      expect(clampFightTime(1000, instantFight)).toBe(0);
    });

    it('should handle fractional fight times', () => {
      expect(clampFightTime(30000.5, fight)).toBe(30000.5);
      expect(clampFightTime(-0.5, fight)).toBe(0);
      expect(clampFightTime(60000.5, fight)).toBe(60000);
    });

    it('should work with very long fights', () => {
      const longFight = createMockFight(0, 3600000); // 1 hour
      expect(clampFightTime(-1000, longFight)).toBe(0);
      expect(clampFightTime(1800000, longFight)).toBe(1800000); // 30 minutes
      expect(clampFightTime(4000000, longFight)).toBe(3600000); // Clamped to 1 hour
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency across all functions', () => {
      const fight = createMockFight(1500000, 1800000); // 5 minute fight
      const fightTime = 150000; // 2.5 minutes

      // Convert to timestamp and back
      const timestamp = fightTimeToTimestamp(fightTime, fight);
      const backToFightTime = timestampToFightTime(timestamp, fight);

      expect(backToFightTime).toBe(fightTime);
      expect(isTimestampInFight(timestamp, fight)).toBe(true);
      expect(clampFightTime(fightTime, fight)).toBe(fightTime);
    });

    it('should handle boundary conditions correctly', () => {
      const fight = createMockFight(1000000, 1120000); // 2 minute fight

      // Test start boundary
      expect(timestampToFightTime(1000000, fight)).toBe(0);
      expect(fightTimeToTimestamp(0, fight)).toBe(1000000);
      expect(isTimestampInFight(1000000, fight)).toBe(true);

      // Test end boundary
      expect(timestampToFightTime(1120000, fight)).toBe(120000);
      expect(fightTimeToTimestamp(120000, fight)).toBe(1120000);
      expect(isTimestampInFight(1120000, fight)).toBe(true);

      // Test clamping
      expect(clampFightTime(120000, fight)).toBe(120000);
      expect(clampFightTime(150000, fight)).toBe(120000);
    });

    it('should work with realistic ESO combat log timestamps', () => {
      // Realistic Unix timestamp from 2023
      const startTime = 1693920000000;
      const endTime = startTime + 480000; // 8 minute fight
      const fight = createMockFight(startTime, endTime);

      const midFightTime = 240000; // 4 minutes
      const timestamp = fightTimeToTimestamp(midFightTime, fight);

      expect(timestamp).toBe(startTime + 240000);
      expect(timestampToFightTime(timestamp, fight)).toBe(midFightTime);
      expect(isTimestampInFight(timestamp, fight)).toBe(true);
      expect(getFightDuration(fight)).toBe(480000);
    });
  });
});
