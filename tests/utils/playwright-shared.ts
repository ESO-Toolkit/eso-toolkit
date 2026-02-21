/**
 * Shared Playwright configuration helpers
 *
 * Centralizes constants and config fragments reused across multiple
 * playwright.*.config.ts files to avoid copy-paste drift.
 */
import * as fs from 'fs';

/** Base URL for the local dev server, overridable via environment variable. */
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Standard dev-server web server config.
 * Used by performance, screen-sizes, and screen-sizes-fast configs.
 * Individual configs may spread and override `reuseExistingServer` or `stdout`.
 */
export const devWebServer = {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000, // 2 minutes to start
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
};

/**
 * Spread into `use: {}` to block external requests in CI environments.
 * Improves test reliability by preventing calls to third-party services.
 *
 * @example
 * use: {
 *   ...ciBlockExternalHeaders,
 * }
 */
export const ciBlockExternalHeaders = process.env.CI
  ? { extraHTTPHeaders: { 'X-Block-External-Requests': 'true' } }
  : {};

/**
 * Returns the path to the Playwright auth-state file when it exists,
 * or `undefined` when the file has not yet been generated (e.g. auth failed
 * or credentials are not available).
 *
 * Works in both CI and local environments: if global-setup successfully
 * obtained an OAuth token the file will be present; if auth failed global-setup
 * writes an empty fallback and this returns the path to that file so tests can
 * run in unauthenticated mode rather than crashing with ENOENT.
 *
 * Use this wherever a `storageState` option accepts `string | undefined`.
 */
export function getOptionalAuthState(): string | undefined {
  try {
    const authStatePath = 'tests/auth-state.json';
    return fs.existsSync(authStatePath) ? authStatePath : undefined;
  } catch {
    return undefined;
  }
}
