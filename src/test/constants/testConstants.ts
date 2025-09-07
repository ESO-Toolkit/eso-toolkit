/**
 * Test constants and mock data values
 * Centralized constants to avoid duplication and magic numbers in tests
 */

/**
 * Common mock constants for testing
 * Centralized constants to avoid duplication across test files
 */
export const TEST_CONSTANTS = {
  // Standard test IDs
  PLAYER_ID: 123,
  TARGET_ID: 456,
  SOURCE_ID: 789,
  FIGHT_ID: 1,

  // Standard timestamps
  FIGHT_START_TIME: 1000000,
  FIGHT_END_TIME: 1060000,

  // Standard test values
  DAMAGE_AMOUNT: 1500,
  HEAL_AMOUNT: 2000,

  // Default coordinates
  DEFAULT_X: 5235,
  DEFAULT_Y: 5410,
  DEFAULT_FACING: 100,
} as const;

/**
 * Common ability IDs used in tests
 */
export const TEST_ABILITY_IDS = {
  MAJOR_FORCE: 61747,
  MAJOR_BRUTALITY: 36894,
  MAJOR_SORCERY: 61687,
  EMPOWER: 61737,
  MAJOR_SAVAGERY: 61667,
  MINOR_FORCE: 61749,
} as const;
