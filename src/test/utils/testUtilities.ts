import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { BuffInterval } from '../../utils/buffUptimeCalculator';

/**
 * General purpose test utility functions and constants
 */

// Common mock constants for consistent testing
// This file contains test utilities and mock data

/**
 * Test constants for ability IDs - these are ESO Logs ability IDs
 * Updated to match actual abilities.json data
 */
export const MOCK_ABILITY_IDS = {
  MAJOR_FORCE: 61747,
  MAJOR_BRUTALITY: 36894, // Corrected: was 61687 which is actually Major Sorcery
  MAJOR_SORCERY: 61687, // Corrected: was 61685 which is actually Minor Sorcery
  EMPOWER: 61737,
  MAJOR_SAVAGERY: 61667, // Corrected: was 61686 which doesn't exist as major savagery
  MINOR_FORCE: 61749,
} as const;

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
