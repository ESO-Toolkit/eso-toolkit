import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for nightly regression tests
 *
 * This configuration is optimized for running against real ESO Logs data
 * and includes longer timeouts, retry logic, comprehensive reporting, and authentication.
 *
 * Run with: npx playwright test --config=playwright.nightly.config.ts
 *
 * Environment Variables for Authentication:
 * - OAUTH_CLIENT_ID: ESO Logs OAuth client ID
 * - OAUTH_CLIENT_SECRET: ESO Logs OAuth client secret (optional)
 * - ESO_LOGS_TEST_EMAIL: Test user email for browser-based auth (optional)
 * - ESO_LOGS_TEST_PASSWORD: Test user password for browser-based auth (optional)
 * - NIGHTLY_BASE_URL: Base URL for testing (defaults to http://localhost:3000)
 */
export default defineConfig({
  testDir: './tests',

  /* Global setup for authentication */
  globalSetup: require.resolve('./tests/global-setup.ts'),

  /* Only run nightly regression tests */
  testMatch: '**/nightly-regression*.spec.ts',

  /* Run tests in files in parallel, but limit workers to avoid overloading APIs */
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4, // Fewer workers to be respectful to APIs

  /* Retry failed tests */
  retries: process.env.CI ? 2 : 1,

  /* Extended timeouts for real data loading */
  timeout: 180000, // 3 minutes per test
  expect: {
    timeout: 30000, // 30s for assertions
  },

  /* Comprehensive reporting for nightly runs */
  reporter: [
    [
      'html',
      {
        outputFolder: 'playwright-report-nightly',
        open: process.env.CI ? 'never' : 'on-failure',
      },
    ],
    ['json', { outputFile: 'test-results/nightly-results.json' }],
    ['junit', { outputFile: 'test-results/nightly-junit.xml' }],
    ['line'],
  ],

  /* Base URL - use environment variable or default */
  use: {
    /* Base URL - should point to dev server or staging */
    baseURL: process.env.NIGHTLY_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',

    /* Extended navigation timeout for real API calls */
    navigationTimeout: 60000,
    actionTimeout: 30000,

    /* Always record traces for nightly runs */
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* Use saved authentication state if available */
    storageState: process.env.CI ? undefined : 'tests/auth-state.json',

    /* Real network requests - MSW service worker removed from public folder to prevent interference */
    extraHTTPHeaders: {
      'X-Playwright-Nightly': 'true',
    },
  },

  /* Web server configuration - let Playwright manage the server lifecycle */
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI, // Reuse existing server in CI
    timeout: 120000, // 2 minutes to start
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Test projects for different browsers and authentication scenarios */
  projects: [
    /* Authenticated Desktop Tests */
    {
      name: 'chromium-desktop-auth',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json',
      },
      testMatch: '**/nightly-regression-auth.spec.ts',
    },
    {
      name: 'firefox-desktop-auth',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json',
      },
      testMatch: '**/nightly-regression-auth.spec.ts',
    },

    /* Authenticated Desktop Tests */
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: undefined, // No auth state
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: undefined, // No auth state
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },

    /* Mobile Tests (typically unauthenticated) */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: undefined, // No auth state for mobile
      },
      testMatch: ['**/nightly-regression.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: undefined, // No auth state for mobile
      },
      testMatch: ['**/nightly-regression.spec.ts'],
    },

    /* Tablet testing */
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        storageState: undefined, // No auth state for tablet
      },
      testMatch: ['**/nightly-regression.spec.ts'],
    },
  ],

  /* Output directories */
  outputDir: 'test-results-nightly/',

  /* Global timeout for the entire test run */
  globalTimeout: process.env.CI ? 7200000 : 3600000, // 2 hours in CI, 1 hour locally

  /* Fail fast in development, but complete all tests in CI */
  maxFailures: process.env.CI ? undefined : 5,
});
