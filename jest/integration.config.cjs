const baseConfig = require('../jest.config.cjs');
const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  
  // Set root directory to project root (parent of jest/ directory)
  rootDir: path.resolve(__dirname, '..'),
  
  displayName: 'integration',
  testMatch: [
    '<rootDir>/src/**/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.integration.test.{js,jsx,ts,tsx}',
  ],
  // Integration tests may need longer timeout for complex scenarios
  testTimeout: 10000,
  // Override coverage settings for integration tests
  collectCoverage: false,
  coverageThreshold: undefined,
};
