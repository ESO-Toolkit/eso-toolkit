const baseConfig = require('./jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'scribing-e2e',
  testMatch: [
    '<rootDir>/src/**/*.scribing-e2e.test.{ts,tsx}',
    '<rootDir>/src/**/*.scribing-e2e.spec.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.scribing-e2e.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.scribing-e2e.spec.{ts,tsx}',
  ],
  testPathIgnorePatterns: [],
  maxWorkers: 1,
  collectCoverage: false,
  logHeapUsage: true,
};
