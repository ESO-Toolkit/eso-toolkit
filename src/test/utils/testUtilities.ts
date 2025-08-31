import { BuffInterval, BuffLookup } from '../../utils/buffUptimeCalculator';

/**
 * General purpose test utility functions and constants
 */

// Common mock constants for consistent testing
export const MOCK_CONSTANTS = {
  ABILITIES: {
    TEST_ABILITY_1: 12345,
    TEST_ABILITY_2: 67890,
  },
  TARGETS: {
    TARGET_1: 111,
    TARGET_2: 222,
  },
  SOURCES: {
    SOURCE_1: 333,
    SOURCE_2: 444,
  },
  FIGHT: {
    START: 1000,
    END: 11000,
    DURATION: 10000, // 10 seconds
  },
};

/**
 * Helper function to create mock buff intervals for testing buff calculations
 */
export const createBuffInterval = (
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

/**
 * Helper function to create mock buff lookup data
 */
export const createBuffLookup = (intervals: Map<number, BuffInterval[]>): BuffLookup => ({
  buffIntervals: intervals,
});

/**
 * Creates a mock abilities lookup for testing
 */
export const createMockAbilitiesById = (
  abilityIds: number[]
): Record<number, { name: string; icon: string }> => {
  const abilities: Record<number, { name: string; icon: string }> = {};
  abilityIds.forEach((id, index) => {
    abilities[id] = {
      name: `Test Ability ${index + 1}`,
      icon: `icon${index + 1}.png`,
    };
  });
  return abilities;
};

/**
 * Helper to generate arrays of mock data for performance testing
 */
export const generateMockArray = <T>(length: number, factory: (index: number) => T): T[] => {
  return Array.from({ length }, (_, i) => factory(i));
};

/**
 * Creates random test data for performance and stress testing
 */
export const createRandomTestData = {
  /**
   * Generates random timestamps within a fight duration
   */
  timestamp: (fightStart: number, fightEnd: number): number => {
    return Math.floor(Math.random() * (fightEnd - fightStart)) + fightStart;
  },

  /**
   * Generates random ability ID from a predefined set
   */
  abilityId: (abilityIds: number[]): number => {
    return abilityIds[Math.floor(Math.random() * abilityIds.length)];
  },

  /**
   * Generates random damage amount within a range
   */
  damage: (min = 500, max = 2500): number => {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  /**
   * Determines if an event should be critical based on probability
   */
  isCritical: (critRate = 0.3): boolean => {
    return Math.random() < critRate;
  },
};
