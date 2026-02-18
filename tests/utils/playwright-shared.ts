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
 * Returns the path to the Playwright auth-state file when it exists locally,
 * or `undefined` in CI (where auth is handled differently) or when the file
 * has not yet been generated.
 *
 * Use this wherever a `storageState` option accepts `string | undefined`.
 */
export function getOptionalAuthState(): string | undefined {
  if (process.env.CI) return undefined;
  try {
    const authStatePath = 'tests/auth-state.json';
    return fs.existsSync(authStatePath) ? authStatePath : undefined;
  } catch {
    return undefined;
  }
}
