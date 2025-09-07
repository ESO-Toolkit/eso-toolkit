import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { BuffInterval } from '../../utils/buffUptimeCalculator';
import { TEST_CONSTANTS, TEST_ABILITY_IDS } from '../constants/testConstants';

/**
 * General purpose test utility functions and constants
 */

// Re-export common constants for backward compatibility
export const MOCK_CONSTANTS = TEST_CONSTANTS;

/**
 * Test constants for ability IDs - these are ESO Logs ability IDs
 * Updated to match actual abilities.json data
 */
export const MOCK_ABILITY_IDS = TEST_ABILITY_IDS;

/**
 * Helper function to create mock buff intervals for testing buff calculations
 */
export const createBuffInterval = (
  start: number,
  end: number,
  targetID: number,
  sourceID?: number,
): BuffInterval => ({
  start,
  end,
  targetID,
  sourceID,
});

/**
 * Helper function to create mock buff lookup data
 */
export const createBuffLookup = (intervals: { [key: string]: BuffInterval[] }): BuffLookupData => ({
  buffIntervals: intervals,
});

/**
 * Creates a mock abilities lookup for testing
 */
export const createMockAbilitiesById = (
  abilityIds: number[],
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
