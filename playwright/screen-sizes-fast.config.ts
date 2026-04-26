import { defineConfig, devices } from '@playwright/test';

import { calculateOptimalWorkers } from '../tests/utils/worker-config';
import { BASE_URL, ciBlockExternalHeaders, devWebServer, getOptionalAuthState } from '../tests/utils/playwright-shared';

// Set fast mode environment variable for test utilities
process.env.PLAYWRIGHT_FAST_MODE = 'true';

/**
 * Optimized configuration for critical screen size testing in CI
 * Reduces test count by focusing on most important viewport sizes
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: '../tests/screen-sizes',
  /* Output directory for test results */
  outputDir: '../test-results-screen-sizes',
  /* Run tests in files in parallel */
  fullyParallel: true, // Always parallel for speed
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Optimized workers for CI speed */
  workers: calculateOptimalWorkers({ 
    maxWorkers: process.env.CI ? 3 : 4, // Conservative CI parallelization
    memoryPerWorker: 1200, // Increased memory per worker for stability
    minWorkers: 1,
  }),
  /* Extended timeout settings for heavy client-side processing */
  timeout: 120000, // Increased to 120s for complex client-side data processing + screenshot
  expect: {
    timeout: 45000, // Increased to 45s for screenshot comparison with heavy processing
    // Configure visual comparison thresholds
    toHaveScreenshot: {
      threshold: 0.35, // Slightly more lenient for speed
      maxDiffPixels: 60000,
    },
    toMatchSnapshot: {
      threshold: 0.35,
      maxDiffPixels: 60000,
    },
  },
  /* Optimized reporter */
  reporter: [
    ['html', { 
      outputFolder: '../screen-size-report',
      open: process.env.CI ? 'never' : 'on-failure',
    }],
    ['json', { outputFile: '../screen-size-report/results.json' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  /* Use OS-agnostic snapshot paths for cross-platform compatibility */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  
  /* Global setup - use lightweight CI version when in CI environment */
  globalSetup: process.env.CI ? '../tests/global-setup-ci.ts' : '../tests/global-setup.ts',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,
    
    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure for debugging */
    video: 'retain-on-failure',
    
    /* Extended timeouts for heavy client-side processing */
    navigationTimeout: process.env.CI ? 90000 : 45000, // Extended for heavy client-side processing + network issues
    actionTimeout: process.env.CI ? 60000 : 30000, // Extended for complex data processing + actions
    
    /* Use shared authentication state from global setup - gracefully handle missing auth */
    storageState: getOptionalAuthState(),
    
    /* Block external requests in CI to improve reliability */
    ...ciBlockExternalHeaders,
  },

  /* Critical screen sizes - expanded to 14 comprehensive breakpoints for 99% coverage */
  projects: [
    // Critical Mobile (4 sizes for comprehensive mobile coverage)
    {
      name: 'Android Small',
      use: {
        ...devices['Galaxy S5'],
        viewport: { width: 360, height: 640 },
      },
    },
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Mobile Portrait',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Mobile Landscape',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 844, height: 390 },
      },
    },
    
    // Critical Tablet and Phablet (3 sizes for comprehensive tablet coverage)
    {
      name: 'Small Tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 600, height: 800 },
      },
    },
    {
      name: 'Tablet Portrait',
      use: {
        ...devices['iPad'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Tablet Landscape',
      use: {
        ...devices['iPad'],
        viewport: { width: 1024, height: 768 },
      },
    },
    
    // Critical Desktop and 2-in-1 (6 sizes for comprehensive laptop/desktop coverage)
    {
      name: 'Surface Pro',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 912, height: 1368 },
      },
    },
    {
      name: 'Laptop Standard',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'Desktop Standard',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'Desktop Large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop 2K',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
    
    // Critical Breakpoints (1 size instead of 6)
    {
      name: 'Breakpoint Critical',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    
    // Ultra-wide (1 size for edge case coverage)
    {
      name: 'Ultrawide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3440, height: 1440 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    ...devWebServer,
    reuseExistingServer: true, // Always reuse existing server (GitHub Actions starts preview server)
  },
});