const path = require("path");
const baseConfig = require("../jest.config.cjs");

const rootDirForward = path.resolve(__dirname, "..").replace(/\\/g, '/');

module.exports = {
  ...baseConfig,

  rootDir: rootDirForward,
  roots: [`${rootDirForward}/src`, `${rootDirForward}/tests`],

  setupFilesAfterEnv: [`${rootDirForward}/src/setupTests.ts`],

  testMatch: [
    `${rootDirForward}/tests/**/*.(spec|test).{js,jsx,ts,tsx}`,
    `${rootDirForward}/src/**/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}`,
    `${rootDirForward}/src/**/*.(test|spec).{js,jsx,ts,tsx}`,
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
