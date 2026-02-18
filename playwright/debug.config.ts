import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for debug test suites
 * 
 * Features:
 * - Runs in headed mode (visible browser)
 * - Slow motion for easier observation
 * - Long timeouts for manual inspection
 * - Video and screenshot capture
 * - Single worker for sequential execution
 */
export default defineConfig({
  testDir: '../tests',
  testMatch: '**/debug-*.spec.ts',
  
  /* Run global setup to handle authentication */
  globalSetup: '../tests/global-setup.ts',
  
  /* Run tests in headed mode */
  use: {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    
    /* Collect trace/video/screenshot for debugging */
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    
    /* Increase timeouts for manual inspection */
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    /* Browser launch options */
    launchOptions: {
      slowMo: 500, // Slow down actions by 500ms for visibility
    },
  },

  /* Long timeout for manual inspection */
  timeout: 600000, // 10 minutes

  /* Fail the build on CI if you accidentally left debug tests */
  forbidOnly: !!process.env.CI,

  /* Single worker - run tests sequentially */
  workers: 1,
  
  /* Don't retry debug tests */
  retries: 0,

  /* Reporter config */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  /* Project for debugging */
  projects: [
    {
      name: 'chromium-debug',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* No web server - uses real esologs.com */
  webServer: undefined,
});
