const path = require('path');

/**
 * Test config for the `roster-hub-api` Cloudflare Worker.
 *
 * Deliberately NOT extending ../jest.config.cjs: that config is jsdom-based and
 * maps every import path containing a `workers` segment to a frontend web-worker
 * mock, which would intercept this package's own modules. This Worker is plain
 * Node-compatible TS.
 *
 * Scoped to pure, network-free modules (parsers, signature extraction, query
 * builders). Anything needing real D1 or workerd belongs in a miniflare/vitest
 * setup, which this intentionally does not attempt.
 */
/** @type {import('jest').Config} */
module.exports = {
  // Forward slashes are required: this repo is checked out under a `.claude/`
  // worktree path on Windows, and a backslash before `.claude` reads as a glob
  // escape, silently matching zero test files.
  rootDir: path.resolve(__dirname, '..').replace(/\\/g, '/'),
  displayName: 'worker',
  testEnvironment: 'node',

  // Scope via `roots` and keep testMatch relative. An absolute <rootDir> glob does
  // not match here: the checkout lives under a dot-directory (`.claude/worktrees/`)
  // and micromatch will not match a leading-dot path segment by default.
  roots: ['<rootDir>/roster-hub-api/src'],
  testMatch: ['**/*.{test,spec}.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // An explicit file, not an inline object: ts-jest merges inline options
        // with the nearest tsconfig.json, and the repo root sets
        // "ignoreDeprecations": "6.0" which TypeScript 5.9 rejects (TS5103).
        tsconfig: path.resolve(__dirname, '../roster-hub-api/tsconfig.test.json'),
      },
    ],
  },

  moduleFileExtensions: ['ts', 'js', 'json'],
  // Plain regexes, not <rootDir> tokens — an absolute Windows path expands into a
  // regex full of unescaped backslashes.
  testPathIgnorePatterns: ['/node_modules/', '/roster-hub-api/dist/'],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
};
