const path = require('path');
const baseConfig = require('../jest.config.cjs');

module.exports = {
  ...baseConfig,

  rootDir: path.resolve(__dirname, '..'),
  // Remove tests directory from roots - it contains Playwright tests, not Jest tests
  roots: ['<rootDir>/src'],

  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  testMatch: [
    // Patterns relative to each root directory (roots: ['<rootDir>/src'])
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**/*.spec.{js,jsx,ts,tsx}',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/*.spec.{js,jsx,ts,tsx}',
  ],

  // Explicitly inherit testPathIgnorePatterns for clarity
  testPathIgnorePatterns: baseConfig.testPathIgnorePatterns,

  maxWorkers: 1,
  testTimeout: 30000,

  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,

  verbose: false,
  silent: false,

  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json'],
  resolver: undefined,
  watchman: false,
};
