/** @type {import('jest').Config} */
//
// Dedicated project for roster-hub-api (the Cloudflare Worker package).
//
// It deliberately does NOT share the root jest.config.cjs environment: the root
// config is jsdom + frontend aliases + src/setupTests.ts, while the Worker code
// is pure Node with @cloudflare/workers-types. Merging it into the root
// `roots` would run Worker tests under the wrong environment and setup files.
// Instead this config runs them with ts-jest against
// roster-hub-api/tsconfig.test.json (CommonJS + node/jest types), which is the
// same contract its own typecheck uses.
//
// Run via: npm run test:roster-hub   (root)  or  npm test  (inside roster-hub-api/)
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  roots: ['<rootDir>/roster-hub-api/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/roster-hub-api/tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // clearMocks only clears call history. Deliberately NOT resetMocks/
  // restoreMocks: the Worker tests install their mock implementations once in
  // each suite's jest.mock factory, and resetting would strip them mid-suite.
  clearMocks: true,
};
