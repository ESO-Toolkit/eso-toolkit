import { KnownAbilities } from '../../../types/abilities';
import {
  computeBuffUptimes,
  BuffInterval,
  BuffUptimeCalculatorOptions,
} from '../../../utils/buffUptimeCalculator';
import { BuffLookupData } from '../../../utils/BuffLookupUtils';

/**
 * Tests for Aggressive Horn buff tracking (ESO-607).
 *
 * Validates that Aggressive Horn (ability 40224) is correctly handled
 * by the buff uptime calculator as a tracked buff with uptime percentage.
 */

// Constants matching ESO game data
const AGGRESSIVE_HORN_BUFF_ID = KnownAbilities.AGGRESSIVE_HORN_BUFF; // 40224

describe('Aggressive Horn Buff Tracking (ESO-607)', () => {
  const FIGHT_START = 1000;
  const FIGHT_END = 11000;
  const FIGHT_DURATION = FIGHT_END - FIGHT_START; // 10 seconds
  const PLAYER_ID_1 = 101;
  const PLAYER_ID_2 = 102;

  const createBuffInterval = (
    start: number,
    end: number,
    targetID: number,
    sourceID?: number,
  ): BuffInterval => ({
    start,
    end,
    targetID,
    sourceID: sourceID ?? 0,
  });

  const createBuffLookup = (intervals: Map<number, BuffInterval[]>): BuffLookupData => {
    const buffIntervalsObj: { [key: string]: BuffInterval[] } = {};
    for (const [abilityGameID, intervalArray] of intervals.entries()) {
      buffIntervalsObj[abilityGameID.toString()] = intervalArray;
    }
    return { buffIntervals: buffIntervalsObj };
  };

  const baseOptions: BuffUptimeCalculatorOptions = {
    abilityIds: new Set([AGGRESSIVE_HORN_BUFF_ID]),
    fightStartTime: FIGHT_START,
    fightEndTime: FIGHT_END,
    fightDuration: FIGHT_DURATION,
    abilitiesById: {
      [AGGRESSIVE_HORN_BUFF_ID]: { name: 'Aggressive Horn', icon: 'ability_ava_003_a' },
    },
    isDebuff: false,
    hostilityType: 0,
  };

  describe('KnownAbilities enum', () => {
    it('should have AGGRESSIVE_HORN_BUFF mapped to ability ID 40224', () => {
      expect(KnownAbilities.AGGRESSIVE_HORN_BUFF).toBe(40224);
    });

    it('should keep AGGRESSIVE_HORN cast ID (40223) separate from buff ID (40224)', () => {
      expect(KnownAbilities.AGGRESSIVE_HORN).toBe(40223);
      expect(KnownAbilities.AGGRESSIVE_HORN_BUFF).toBe(40224);
      expect(KnownAbilities.AGGRESSIVE_HORN).not.toBe(KnownAbilities.AGGRESSIVE_HORN_BUFF);
    });
  });

  describe('Buff uptime calculation', () => {
    it('should calculate Aggressive Horn uptime for a single target', () => {
      const intervals = new Map([
        [
          AGGRESSIVE_HORN_BUFF_ID,
          [
            // Horn buff active for 4.29 seconds out of 10
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 5290, PLAYER_ID_1),
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0].abilityGameID).toBe(String(AGGRESSIVE_HORN_BUFF_ID));
      expect(result[0].abilityName).toBe('Aggressive Horn');
      expect(result[0].uptimePercentage).toBeCloseTo(42.9, 0);
      expect(result[0].isDebuff).toBe(false);
    });

    it('should calculate average uptime across multiple targets', () => {
      const intervals = new Map([
        [
          AGGRESSIVE_HORN_BUFF_ID,
          [
            // Player 1: 5 seconds of horn
            createBuffInterval(FIGHT_START, FIGHT_START + 5000, PLAYER_ID_1),
            // Player 2: 3 seconds of horn
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 4000, PLAYER_ID_2),
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        targetIds: new Set([PLAYER_ID_1, PLAYER_ID_2]),
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      // Average: (50% + 30%) / 2 = 40%
      expect(result[0].uptimePercentage).toBe(40);
    });

    it('should handle multiple Horn applications during a fight', () => {
      const intervals = new Map([
        [
          AGGRESSIVE_HORN_BUFF_ID,
          [
            // First horn cast: 3 seconds
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 4000, PLAYER_ID_1),
            // Second horn cast: 3 seconds
            createBuffInterval(FIGHT_START + 6000, FIGHT_START + 9000, PLAYER_ID_1),
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(60); // 6 seconds / 10 seconds
      expect(result[0].applications).toBe(2);
    });

    it('should return empty results when Horn was never applied', () => {
      const intervals = new Map<number, BuffInterval[]>([
        [AGGRESSIVE_HORN_BUFF_ID, []],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      // Calculator filters out abilities with no interval data
      expect(result).toHaveLength(0);
    });

    it('should use hostilityType 0 for Horn (friendly buff)', () => {
      const intervals = new Map([
        [
          AGGRESSIVE_HORN_BUFF_ID,
          [createBuffInterval(FIGHT_START, FIGHT_END, PLAYER_ID_1)],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, {
        ...baseOptions,
        hostilityType: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].hostilityType).toBe(0);
      expect(result[0].uptimePercentage).toBe(100);
    });
  });
});
