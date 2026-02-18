const baseConfig = require('../jest.config.cjs');
const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  
  // Set root directory to project root (parent of jest/ directory)
  rootDir: path.resolve(__dirname, '..'),
  
  // Override test patterns to only run smoke tests
  testMatch: [
    // Critical utility tests - core functionality
    '<rootDir>/src/utils/classNameUtils.test.ts',
    '<rootDir>/src/utils/resolveActorName.test.ts',
    '<rootDir>/src/utils/roleColors.test.ts',
    '<rootDir>/src/utils/NestedError.test.ts',

    // Core ESO logs client functionality
    '<rootDir>/src/esologsClient.test.ts',

    // Any test files marked as smoke tests
    '<rootDir>/src/**/*.smoke.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(smoke).{js,jsx,ts,tsx}',
  ],

  // Disable coverage for smoke tests to speed up execution
  collectCoverage: false,

  // Faster execution settings
  maxWorkers: 2,
  cache: true,

  // Reduce timeout for faster feedback
  testTimeout: 10000,
};
