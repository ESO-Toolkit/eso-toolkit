import {
  BuffInterval,
  BuffLookup,
  BuffUptimeCalculatorOptions,
  computeBuffUptimes,
} from './buffUptimeCalculator';

describe('buffUptimeCalculator', () => {
  // Mock constants for testing
  const MOCK_ABILITY_ID_1 = 12345;
  const MOCK_ABILITY_ID_2 = 67890;
  const MOCK_TARGET_ID_1 = 111;
  const MOCK_TARGET_ID_2 = 222;
  const MOCK_SOURCE_ID_1 = 333;
  const MOCK_SOURCE_ID_2 = 444;

  const FIGHT_START = 1000;
  const FIGHT_END = 11000;
  const FIGHT_DURATION = FIGHT_END - FIGHT_START; // 10 seconds

  // Helper function to create mock buff intervals
  const createBuffInterval = (
    start: number,
    end: number,
    targetID: number,
    sourceID?: number
  ): BuffInterval => ({
    start,
    end,
    targetID,
    sourceID,
  });

  // Helper function to create mock buff lookup
  const createBuffLookup = (intervals: Map<number, BuffInterval[]>): BuffLookup => ({
    buffIntervals: intervals,
  });

  // Mock abilities lookup
  const mockAbilitiesById = {
    [MOCK_ABILITY_ID_1]: { name: 'Test Ability 1', icon: 'icon1.png' },
    [MOCK_ABILITY_ID_2]: { name: 'Test Ability 2', icon: 'icon2.png' },
  };

  // Base options for testing
  const baseOptions: BuffUptimeCalculatorOptions = {
    abilityIds: new Set([MOCK_ABILITY_ID_1, MOCK_ABILITY_ID_2]),
    fightStartTime: FIGHT_START,
    fightEndTime: FIGHT_END,
    fightDuration: FIGHT_DURATION,
    abilitiesById: mockAbilitiesById,
    isDebuff: false,
    hostilityType: 1,
  };

  describe('computeBuffUptimes', () => {
    it('should return empty array for null buff lookup', () => {
      const result = computeBuffUptimes(null, baseOptions);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined buff lookup', () => {
      const result = computeBuffUptimes(undefined, baseOptions);
      expect(result).toEqual([]);
    });

    it('should return empty array for zero fight duration', () => {
      const buffLookup = createBuffLookup(new Map());
      const result = computeBuffUptimes(buffLookup, { ...baseOptions, fightDuration: 0 });
      expect(result).toEqual([]);
    });

    it('should calculate uptime for a single buff on single target', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [createBuffInterval(FIGHT_START + 2000, FIGHT_START + 7000, MOCK_TARGET_ID_1)], // 5 seconds
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        abilityGameID: String(MOCK_ABILITY_ID_1),
        abilityName: 'Test Ability 1',
        icon: 'icon1.png',
        totalDuration: 5000, // 5 seconds
        uptime: 5, // 5 seconds
        uptimePercentage: 50, // 50% of 10-second fight
        applications: 1,
        isDebuff: false,
        hostilityType: 1,
      });
    });

    it('should calculate uptime for multiple intervals on same target', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 3000, MOCK_TARGET_ID_1), // 2 seconds
            createBuffInterval(FIGHT_START + 5000, FIGHT_START + 8000, MOCK_TARGET_ID_1), // 3 seconds
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        abilityGameID: String(MOCK_ABILITY_ID_1),
        abilityName: 'Test Ability 1',
        icon: 'icon1.png',
        totalDuration: 5000, // 2 + 3 = 5 seconds total
        uptime: 5,
        uptimePercentage: 50, // 50% of fight
        applications: 2,
        isDebuff: false,
        hostilityType: 1,
      });
    });

    it('should calculate average uptime across multiple targets', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1), // 5 seconds on target 1 (50%)
            createBuffInterval(FIGHT_START + 2000, FIGHT_START + 5000, MOCK_TARGET_ID_2), // 3 seconds on target 2 (30%)
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      // Should average: (50% + 30%) / 2 = 40%
      expect(result[0].uptimePercentage).toBeCloseTo(40, 1);
      expect(result[0].applications).toBe(1); // Average of 1 + 1 = 1
    });

    it('should clip intervals to fight bounds', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            // Interval starts before fight and ends after fight
            createBuffInterval(FIGHT_START - 1000, FIGHT_END + 1000, MOCK_TARGET_ID_1),
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(100); // Should be clipped to full fight duration
      expect(result[0].totalDuration).toBe(FIGHT_DURATION);
    });

    it('should filter by target IDs when specified', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1), // Should be included
            createBuffInterval(FIGHT_START + 2000, FIGHT_START + 7000, MOCK_TARGET_ID_2), // Should be excluded
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        targetIds: new Set([MOCK_TARGET_ID_1]),
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(50); // Only first interval counted
    });

    it('should filter by source IDs when specified', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            createBuffInterval(
              FIGHT_START + 1000,
              FIGHT_START + 6000,
              MOCK_TARGET_ID_1,
              MOCK_SOURCE_ID_1
            ), // Should be included
            createBuffInterval(
              FIGHT_START + 2000,
              FIGHT_START + 7000,
              MOCK_TARGET_ID_1,
              MOCK_SOURCE_ID_2
            ), // Should be excluded
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        sourceIds: new Set([MOCK_SOURCE_ID_1]),
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(50); // Only first interval counted
    });

    it('should filter by ability IDs', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1)],
        ],
        [
          MOCK_ABILITY_ID_2,
          [createBuffInterval(FIGHT_START + 2000, FIGHT_START + 7000, MOCK_TARGET_ID_1)],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        abilityIds: new Set([MOCK_ABILITY_ID_1]), // Only include first ability
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].abilityGameID).toBe(String(MOCK_ABILITY_ID_1));
      expect(result[0].abilityName).toBe('Test Ability 1');
    });

    it('should handle unknown abilities gracefully', () => {
      const unknownAbilityId = 99999;
      const intervals = new Map([
        [
          unknownAbilityId,
          [createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1)],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        abilityIds: new Set([unknownAbilityId]),
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].abilityName).toBe(`Unknown (${unknownAbilityId})`);
      expect(result[0].icon).toBeUndefined();
    });

    it('should sort results by uptime percentage descending', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [createBuffInterval(FIGHT_START + 1000, FIGHT_START + 4000, MOCK_TARGET_ID_1)],
        ], // 30%
        [
          MOCK_ABILITY_ID_2,
          [createBuffInterval(FIGHT_START + 2000, FIGHT_START + 7000, MOCK_TARGET_ID_1)],
        ], // 50%
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(2);
      expect(result[0].abilityGameID).toBe(String(MOCK_ABILITY_ID_2)); // Higher uptime first
      expect(result[0].uptimePercentage).toBe(50);
      expect(result[1].abilityGameID).toBe(String(MOCK_ABILITY_ID_1)); // Lower uptime second
      expect(result[1].uptimePercentage).toBe(30);
    });

    it('should handle debuff flags correctly', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1)],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options: BuffUptimeCalculatorOptions = {
        ...baseOptions,
        isDebuff: true,
        hostilityType: 0,
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].isDebuff).toBe(true);
      expect(result[0].hostilityType).toBe(0);
    });

    it('should ignore intervals with zero or negative duration', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            createBuffInterval(FIGHT_START + 5000, FIGHT_START + 5000, MOCK_TARGET_ID_1), // Zero duration
            createBuffInterval(FIGHT_START + 6000, FIGHT_START + 5000, MOCK_TARGET_ID_1), // Negative duration
            createBuffInterval(FIGHT_START + 7000, FIGHT_START + 9000, MOCK_TARGET_ID_1), // Valid duration
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const result = computeBuffUptimes(buffLookup, baseOptions);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(20); // Only the 2-second valid interval
      expect(result[0].applications).toBe(1); // Only one valid application
    });

    it('should handle complex filtering scenarios', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            // Target 1, Source 1 - should be included
            createBuffInterval(
              FIGHT_START + 1000,
              FIGHT_START + 3000,
              MOCK_TARGET_ID_1,
              MOCK_SOURCE_ID_1
            ),
            // Target 2, Source 1 - should be excluded (wrong target)
            createBuffInterval(
              FIGHT_START + 2000,
              FIGHT_START + 4000,
              MOCK_TARGET_ID_2,
              MOCK_SOURCE_ID_1
            ),
            // Target 1, Source 2 - should be excluded (wrong source)
            createBuffInterval(
              FIGHT_START + 5000,
              FIGHT_START + 7000,
              MOCK_TARGET_ID_1,
              MOCK_SOURCE_ID_2
            ),
            // Target 1, Source 1 - should be included
            createBuffInterval(
              FIGHT_START + 7000,
              FIGHT_START + 9000,
              MOCK_TARGET_ID_1,
              MOCK_SOURCE_ID_1
            ),
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        targetIds: new Set([MOCK_TARGET_ID_1]),
        sourceIds: new Set([MOCK_SOURCE_ID_1]),
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      expect(result[0].uptimePercentage).toBe(40); // 2 + 2 = 4 seconds out of 10
      expect(result[0].applications).toBe(2); // Two valid applications
    });

    it('should handle averaging when target count differs from actual targets with data', () => {
      const intervals = new Map([
        [
          MOCK_ABILITY_ID_1,
          [
            // Only target 1 has buff data, but we specify both targets should be considered
            createBuffInterval(FIGHT_START + 1000, FIGHT_START + 6000, MOCK_TARGET_ID_1), // 50% on target 1
          ],
        ],
      ]);
      const buffLookup = createBuffLookup(intervals);

      const options = {
        ...baseOptions,
        targetIds: new Set([MOCK_TARGET_ID_1, MOCK_TARGET_ID_2]), // Specify 2 targets
      };

      const result = computeBuffUptimes(buffLookup, options);

      expect(result).toHaveLength(1);
      // Should average across specified target count: 50% / 2 = 25%
      expect(result[0].uptimePercentage).toBe(25);
    });
  });
});
