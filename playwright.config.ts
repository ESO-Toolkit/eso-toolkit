import { defineConfig, devices } from '@playwright/test';

/**
 * Default Playwright configuration
 * 
 * This configuration is used when running tests without specifying a specific config file.
 * For specialized test runs, use one of the specific config files:
 * - playwright.smoke.config.ts - Fast smoke tests for PR checks
 * - playwright.nightly.config.ts - Comprehensive nightly regression tests
 * - playwright.screen-sizes.config.ts - Visual regression across screen sizes
 * - playwright.debug.config.ts - Debug tests with headed mode
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Block analytics and tracking scripts in tests */
    extraHTTPHeaders: {
      'DNT': '1', // Do Not Track
    },
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
