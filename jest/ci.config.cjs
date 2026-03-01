const path = require("path");
const baseConfig = require("../jest.config.cjs");

module.exports = {
  ...baseConfig,

  rootDir: __dirname,

  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],

  testMatch: [
    "<rootDir>/tests/**/*.(spec|test).{js,jsx,ts,tsx}",
    "<rootDir>/src/**/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}",
  ],

  maxWorkers: 1,
  testTimeout: 30000,

  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,

  verbose: false,
  silent: false,

  collectCoverage: true,
  coverageReporters: ["text", "lcov", "json"],
  resolver: undefined,
  watchman: false,
};
