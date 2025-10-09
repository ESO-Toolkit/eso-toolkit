import { defineConfig, devices } from '@playwright/test';
import { calculateOptimalWorkers } from './tests/utils/worker-config';

/**
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: !process.env.CI, // Disable parallel in CI to reduce memory usage
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0, // Reduce retries to save memory
  /* Optimize worker count for CI environment */
  workers: process.env.CI ? calculateOptimalWorkers({ 
    maxWorkers: 2, // Conservative for standard tests
    memoryPerWorker: 1200 // Higher memory per worker for safety
  }) : undefined,
  /* Timeout settings */
  timeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
  expect: {
    timeout: process.env.CI ? 10000 : 5000, // 10s in CI, 5s locally
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Navigation timeout for page.goto() calls */
    navigationTimeout: process.env.CI ? 30000 : 15000,

    /* Action timeout for all Playwright actions */
    actionTimeout: process.env.CI ? 15000 : 10000,

    /* Block external requests in CI environment */
    ...(process.env.CI && {
      extraHTTPHeaders: {
        'X-Block-External-Requests': 'true',
      },
    }),
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: process.env.CI
            ? [
                '--memory-pressure-off',
                '--max_old_space_size=2048',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-sandbox',
              ]
            : ['--memory-pressure-off'],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: process.env.CI
            ? {
                'memory.max': 2147483648, // 2GB limit
                'dom.max_script_run_time': 30,
              }
            : {},
        },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          args: process.env.CI ? ['--memory-pressure-off'] : [],
        },
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 120000 : 60000, // 2 minutes in CI, 1 minute locally
    stderr: 'pipe',
    stdout: 'pipe',
  },
});
