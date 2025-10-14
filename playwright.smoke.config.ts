import { defineConfig, devices } from '@playwright/test';
import { calculateOptimalWorkers } from './tests/utils/worker-config';

/**
 * Playwright configuration for smoke tests - minimal, fast e2e tests for PR checks
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  // Only run smoke test files
  testMatch: ['**/home.spec.ts', '**/*.smoke.spec.ts'],

  // Exclude scribing detection tests from PR smoke tests (run in nightly instead)
  testIgnore: [
    '**/shattering-knife-simple.smoke.spec.ts',
    '**/scribing-regression.smoke.spec.ts',
  ],

  /* Run tests in files in parallel */
  fullyParallel: false, // Keep sequential for faster CI

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* No retries for smoke tests - fail fast */
  retries: 0,

  /* Conservative worker count for smoke tests - prioritize fast startup */
  workers: process.env.CI ? calculateOptimalWorkers({ 
    maxWorkers: 2, 
    minWorkers: 1,
    memoryPerWorker: 800 // Lower since smoke tests are lighter
  }) : 1,

  /* Increased timeout for smoke tests to handle slower CI environments */
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['github']] : 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',

    /* Collect trace only on failure for smoke tests */
    trace: 'retain-on-failure',

    /* Increased navigation timeout for CI environments */
    navigationTimeout: process.env.CI ? 60000 : 30000, // 1 minute in CI, 30 seconds locally

    /* Increased action timeout for CI environments */
    actionTimeout: process.env.CI ? 30000 : 15000, // 30 seconds in CI, 15 seconds locally

    /* Block external requests in CI environment */
    ...(process.env.CI && {
      extraHTTPHeaders: {
        'X-Block-External-Requests': 'true',
      },
    }),
  },

  /* Configure projects for smoke tests - only Chromium for speed */
  projects: [
    {
      name: 'chromium-smoke',
      use: {
        ...devices['Desktop Chrome'],
        // Additional optimizations for speed
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 300000, // 5 minutes timeout for server startup
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Optimize dev server for testing
      NODE_ENV: 'development', // Use development instead of test
      BROWSER: 'none',
      // Disable source maps for faster builds
      GENERATE_SOURCEMAP: 'false',
      // Set the port for Vite
      PORT: '3001',
    },
    // Additional options for better server startup detection
    cwd: process.cwd(),
  },
});
