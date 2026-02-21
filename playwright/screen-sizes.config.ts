import { defineConfig, devices } from '@playwright/test';

import { calculateOptimalWorkers } from '../tests/utils/worker-config';
import { BASE_URL, ciBlockExternalHeaders, devWebServer, getOptionalAuthState } from '../tests/utils/playwright-shared';

/**
 * Configuration for screen size validation testing
 * This config focuses on testing responsive layouts across various screen sizes
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: '../tests/screen-sizes',
  /* Output directory for test results */
  outputDir: '../test-results-screen-sizes',
  /* Run tests in files in parallel */
  fullyParallel: !process.env.CI,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Limit workers to prevent OAuth rate limiting - ESO Logs API has rate limits */
  workers: calculateOptimalWorkers({ 
    maxWorkers: process.env.CI ? 3 : 3, // Conservative CI workers to prevent API rate limiting
    memoryPerWorker: 1500, // Increase memory per worker for stability
    minWorkers: 1,
  }),
  /* Timeout settings - increased for heavy client-side processing */
  timeout: process.env.CI ? 120000 : 90000, // Extended for complex client-side data processing
  expect: {
    timeout: process.env.CI ? 45000 : 30000, // Extended for heavy processing + screenshot comparison
    // Configure visual comparison thresholds - more lenient for dynamic content
    toHaveScreenshot: {
      threshold: 0.3, // Allow 30% pixel difference for dynamic content
      maxDiffPixels: 50000, // Higher threshold for content height changes
    },
    toMatchSnapshot: {
      threshold: 0.3,
      maxDiffPixels: 50000,
    },
  },
  /* Enhanced reporter for screen size validation */
  reporter: [
    ['html', { 
      outputFolder: '../screen-size-report',
      open: process.env.CI ? 'never' : 'on-failure',
      host: '0.0.0.0',
      port: 9323,
    }],
    ['json', { outputFile: '../screen-size-report/results.json' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  /* Use OS-agnostic snapshot paths for cross-platform compatibility */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  
  /* Global setup to authenticate once before running the test suite */
  globalSetup: '../tests/global-setup.ts',
  
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
    
    /* Navigation timeout - extended for heavy client-side processing */
    navigationTimeout: process.env.CI ? 90000 : 45000,
    
    /* Action timeout - extended for complex data processing + actions */
    actionTimeout: process.env.CI ? 75000 : 35000,
    
    /* Use shared authentication state from global setup - gracefully handle missing auth */
    storageState: getOptionalAuthState(),
    
    /* Block external requests in CI to improve reliability */
    ...ciBlockExternalHeaders,
  },

  /* Configure projects for different screen sizes and devices */
  projects: [
    // Mobile Devices
    {
      name: 'Mobile Portrait Small',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Mobile Portrait Standard',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Mobile Portrait Large',
      use: {
        ...devices['iPhone 12 Pro Max'],
        viewport: { width: 428, height: 926 },
      },
    },
    {
      name: 'Mobile Landscape',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 844, height: 390 },
      },
    },
    
    // Android Devices
    {
      name: 'Android Portrait',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'Android Landscape',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 851, height: 393 },
      },
    },
    
    // Tablet Devices
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
    {
      name: 'Tablet Pro Portrait',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
    {
      name: 'Tablet Pro Landscape',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1366, height: 1024 },
      },
    },
    
    // Desktop Sizes
    {
      name: 'Desktop Small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
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
      name: 'Desktop XL',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
    {
      name: 'Desktop 4K',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
      },
    },
    
    // Ultrawide Displays
    {
      name: 'Ultrawide QHD',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3440, height: 1440 },
      },
    },
    
    // Common breakpoints for responsive design
    {
      name: 'Breakpoint XS',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 480, height: 854 },
      },
    },
    {
      name: 'Breakpoint SM',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 640, height: 480 },
      },
    },
    {
      name: 'Breakpoint MD',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 576 },
      },
    },
    {
      name: 'Breakpoint LG',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'Breakpoint XL',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 960 },
      },
    },
    {
      name: 'Breakpoint 2XL',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 864 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: devWebServer,
});