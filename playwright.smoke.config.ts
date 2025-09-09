import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for smoke tests - minimal, fast e2e tests for PR checks
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  // Only run smoke test files
  testMatch: ['**/home.spec.ts', '**/*.smoke.spec.ts'],

  /* Run tests in files in parallel */
  fullyParallel: false, // Keep sequential for faster CI

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* No retries for smoke tests - fail fast */
  retries: 0,

  /* Single worker for faster startup */
  workers: 1,

  /* Reduced timeout for smoke tests */
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['github']] : 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace only on failure for smoke tests */
    trace: 'retain-on-failure',

    /* Reduced navigation timeout */
    navigationTimeout: 15000,

    /* Reduced action timeout */
    actionTimeout: 10000,

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
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Optimize dev server for testing
      NODE_ENV: 'test',
      BROWSER: 'none',
      // Disable source maps for faster builds
      GENERATE_SOURCEMAP: 'false',
    },
  },
});
