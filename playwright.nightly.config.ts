import { defineConfig, devices } from '@playwright/test';
import { calculateOptimalWorkers } from './tests/utils/worker-config';

/**
 * Playwright configuration specifically for nightly regression tests
 *
 * This configuration is optimized for running against the production website
 * and includes longer timeouts, retry logic, comprehensive reporting, and authentication.
 *
 * Run with: npx playwright test --config=playwright.nightly.config.ts
 *
 * Production Testing:
 * - Tests run against https://bkrupa.github.io/eso-log-aggregator/ by default
 * - No local web server is started - tests use the live production site
 * - To test against a local development server, set NIGHTLY_BASE_URL=http://localhost:3000
 *
 * Sharding Support:
 * - Run with shards: npm run test:nightly:sharded (3 parallel shards)
 * - Individual shard: SHARD_INDEX=1 SHARD_TOTAL=3 npx playwright test --config=playwright.nightly.config.ts
 * - Custom shard count: SHARD_TOTAL=4 npm run test:nightly:sharded
 *
 * Environment Variables for Authentication:
 * - OAUTH_CLIENT_ID: ESO Logs OAuth client ID
 * - OAUTH_CLIENT_SECRET: ESO Logs OAuth client secret (optional)
 * - ESO_LOGS_TEST_EMAIL: Test user email for browser-based auth (optional)
 * - ESO_LOGS_TEST_PASSWORD: Test user password for browser-based auth (optional)
 * - NIGHTLY_BASE_URL: Override base URL (defaults to production: https://bkrupa.github.io/eso-log-aggregator/)
 */
export default defineConfig({
  testDir: './tests',

  /* Global setup for authentication */
  globalSetup: './tests/global-setup.ts',

  /* Only run nightly regression tests */
  testMatch: '**/nightly-regression*.spec.ts',

  /* Run tests in files in parallel, but limit workers to avoid overloading APIs */
  fullyParallel: true,
  workers: process.env.CI ? calculateOptimalWorkers({ 
    maxWorkers: 3, // Slightly more aggressive for nightly tests
    memoryPerWorker: 900, // Lower memory per worker since tests are optimized
    minWorkers: 2 // Ensure reasonable parallelization
  }) : 4, // Fewer workers to be respectful to APIs

  /* Enable sharding for faster parallel execution */
  shard:
    process.env.SHARD_INDEX && process.env.SHARD_TOTAL
      ? { current: parseInt(process.env.SHARD_INDEX), total: parseInt(process.env.SHARD_TOTAL) }
      : undefined,

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

  /* Base URL - use environment variable or default to production */
  use: {
    /* Base URL - now points to production website */
    baseURL: process.env.NIGHTLY_BASE_URL || process.env.BASE_URL || 'https://bkrupa.github.io/eso-log-aggregator/',

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

  /* No web server needed - testing against production website */

  /* Test projects for different browsers and authentication scenarios */
  projects: [
    /* Authenticated Desktop Tests - Primary test suite */
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        launchOptions: {
          firefoxUserPrefs: {
            'dom.security.https_only_mode': false,
            'security.tls.insecure_fallback_hosts': 'localhost',
            'network.stricttransportsecurity.preloadlist': false,
            'security.fileuri.strict_origin_policy': false,
          },
        },
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        // WebKit doesn't support the same launch args as Chromium, keep minimal config
      },
      testMatch: ['**/nightly-regression.spec.ts', '**/nightly-regression-interactive.spec.ts'],
    },

    /* Additional Authenticated Tests for specific auth scenarios */
    {
      name: 'chromium-desktop-auth',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
      testMatch: '**/nightly-regression-auth.spec.ts',
    },
    {
      name: 'firefox-desktop-auth',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        launchOptions: {
          firefoxUserPrefs: {
            'dom.security.https_only_mode': false,
            'security.tls.insecure_fallback_hosts': 'localhost',
            'network.stricttransportsecurity.preloadlist': false,
            'security.fileuri.strict_origin_policy': false,
          },
        },
      },
      testMatch: '**/nightly-regression-auth.spec.ts',
    },
    {
      name: 'webkit-desktop-auth',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'tests/auth-state.json', // Use auth state for report access
        // WebKit doesn't support the same launch args as Chromium, keep minimal config
      },
      testMatch: '**/nightly-regression-auth.spec.ts',
    },

    /* Mobile Tests (typically unauthenticated) */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: undefined, // No auth state for mobile
        launchOptions: {
          args: ['--disable-web-security', '--no-sandbox', '--disable-dev-shm-usage'],
        },
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
