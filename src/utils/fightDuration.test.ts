/**
 * Tests for fightDuration utility
 * Tests duration formatting and timestamp conversion functions
 */

import { formatDuration, formatTimestamp } from './fightDuration';

describe('fightDuration', () => {
  describe('formatDuration', () => {
    describe('basic duration formatting', () => {
      it('should format seconds only for durations under 1 minute', () => {
        expect(formatDuration(1000)).toBe('1s');
        expect(formatDuration(30000)).toBe('30s');
        expect(formatDuration(59000)).toBe('59s');
      });

      it('should format minutes and seconds for durations under 1 hour', () => {
        expect(formatDuration(60000)).toBe('1m 0s');
        expect(formatDuration(90000)).toBe('1m 30s');
        expect(formatDuration(150000)).toBe('2m 30s');
        expect(formatDuration(3540000)).toBe('59m 0s');
      });

      it('should format hours and minutes for durations over 1 hour', () => {
        expect(formatDuration(3600000)).toBe('1h 0m');
        expect(formatDuration(3900000)).toBe('1h 5m');
        expect(formatDuration(7200000)).toBe('2h 0m');
        expect(formatDuration(9000000)).toBe('2h 30m');
      });
    });

    describe('edge cases', () => {
      it('should handle zero duration', () => {
        expect(formatDuration(0)).toBe('0s');
      });

      it('should handle negative durations by returning "0s"', () => {
        expect(formatDuration(-1000)).toBe('0s');
        expect(formatDuration(-60000)).toBe('0s');
      });

      it('should handle very small positive durations', () => {
        expect(formatDuration(1)).toBe('0s');
        expect(formatDuration(999)).toBe('0s');
      });

      it('should handle very large durations', () => {
        expect(formatDuration(36000000)).toBe('10h 0m'); // 10 hours
        expect(formatDuration(90061000)).toBe('25h 1m'); // 25 hours 1 minute
      });
    });

    describe('precision and rounding', () => {
      it('should floor milliseconds to nearest second', () => {
        expect(formatDuration(1999)).toBe('1s');
        expect(formatDuration(2001)).toBe('2s');
        expect(formatDuration(59999)).toBe('59s');
      });

      it('should handle fractional milliseconds', () => {
        expect(formatDuration(1000.7)).toBe('1s');
        expect(formatDuration(60000.9)).toBe('1m 0s');
      });
    });

    describe('specific time boundaries', () => {
      it('should handle exact minute boundaries', () => {
        expect(formatDuration(60000)).toBe('1m 0s'); // Exactly 1 minute
        expect(formatDuration(120000)).toBe('2m 0s'); // Exactly 2 minutes
      });

      it('should handle exact hour boundaries', () => {
        expect(formatDuration(3600000)).toBe('1h 0m'); // Exactly 1 hour
        expect(formatDuration(7200000)).toBe('2h 0m'); // Exactly 2 hours
      });

      it('should handle hour + minute boundaries', () => {
        expect(formatDuration(3660000)).toBe('1h 1m'); // 1 hour 1 minute
        expect(formatDuration(7260000)).toBe('2h 1m'); // 2 hours 1 minute
      });
    });

    describe('real-world examples', () => {
      it('should format typical fight durations correctly', () => {
        expect(formatDuration(45000)).toBe('45s'); // Short fight
        expect(formatDuration(180000)).toBe('3m 0s'); // Medium fight
        expect(formatDuration(600000)).toBe('10m 0s'); // Long fight
        expect(formatDuration(750000)).toBe('12m 30s'); // Extended fight
      });

      it('should format raid encounter durations', () => {
        expect(formatDuration(420000)).toBe('7m 0s'); // 7 minute boss fight
        expect(formatDuration(1080000)).toBe('18m 0s'); // 18 minute trial
      });
    });
  });

  describe('formatTimestamp', () => {
    describe('basic timestamp formatting', () => {
      it('should calculate duration from fight start correctly', () => {
        const fightStart = 1000000;
        expect(formatTimestamp(1030000, fightStart)).toBe('30s');
        expect(formatTimestamp(1060000, fightStart)).toBe('1m 0s');
        expect(formatTimestamp(1150000, fightStart)).toBe('2m 30s');
      });

      it('should handle timestamps before fight start', () => {
        const fightStart = 1000000;
        expect(formatTimestamp(990000, fightStart)).toBe('0s');
        expect(formatTimestamp(950000, fightStart)).toBe('0s');
      });

      it('should handle timestamp equal to fight start', () => {
        const fightStart = 1000000;
        expect(formatTimestamp(1000000, fightStart)).toBe('0s');
      });
    });

    describe('real-world timestamp scenarios', () => {
      it('should work with realistic ESO log timestamps', () => {
        const fightStart = 1693920000000; // Example Unix timestamp
        const thirtySecondsLater = fightStart + 30000;
        const twoMinutesLater = fightStart + 120000;

        expect(formatTimestamp(thirtySecondsLater, fightStart)).toBe('30s');
        expect(formatTimestamp(twoMinutesLater, fightStart)).toBe('2m 0s');
      });

      it('should handle large timestamp differences', () => {
        const fightStart = 1693920000000;
        const oneHourLater = fightStart + 3600000;

        expect(formatTimestamp(oneHourLater, fightStart)).toBe('1h 0m');
      });
    });

    describe('edge cases', () => {
      it('should handle zero timestamps', () => {
        expect(formatTimestamp(0, 0)).toBe('0s');
        expect(formatTimestamp(30000, 0)).toBe('30s');
      });

      it('should handle negative fight start times', () => {
        expect(formatTimestamp(0, -1000)).toBe('1s');
        expect(formatTimestamp(1000, -1000)).toBe('2s');
      });

      it('should handle floating point timestamps', () => {
        const fightStart = 1000000.5;
        expect(formatTimestamp(1030000.7, fightStart)).toBe('30s');
      });
    });

    describe('consistency with formatDuration', () => {
      it('should produce same results as formatDuration for calculated differences', () => {
        const fightStart = 1000000;
        const timestamp = 1090000; // 90 seconds later
        const difference = timestamp - fightStart;

        expect(formatTimestamp(timestamp, fightStart)).toBe(formatDuration(difference));
      });

      it('should handle various durations consistently', () => {
        const fightStart = 5000000;
        const testDurations = [1000, 30000, 60000, 90000, 3600000];

        testDurations.forEach((duration) => {
          const timestamp = fightStart + duration;
          expect(formatTimestamp(timestamp, fightStart)).toBe(formatDuration(duration));
        });
      });
    });
  });
});
