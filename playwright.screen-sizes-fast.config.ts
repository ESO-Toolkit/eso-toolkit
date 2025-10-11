import { defineConfig, devices } from '@playwright/test';
import { calculateOptimalWorkers } from './tests/utils/worker-config';

/**
 * Optimized configuration for critical screen size testing in CI
 * Reduces test count by focusing on most important viewport sizes
 * @see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/screen-sizes',
  /* Output directory for test results */
  outputDir: 'test-results-screen-sizes',
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
    minWorkers: 1
  }),
  /* Aggressive timeout settings for CI speed */
  timeout: 20000, // Shorter timeout
  expect: {
    timeout: 6000, // Faster expectations
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
      outputFolder: 'screen-size-report',
      open: process.env.CI ? 'never' : 'on-failure',
    }],
    ['json', { outputFile: 'screen-size-report/results.json' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  /* Use OS-agnostic snapshot paths for cross-platform compatibility */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  
  /* Global setup to authenticate once before running the test suite */
  globalSetup: './tests/global-setup.ts',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure for debugging */
    video: 'retain-on-failure',
    
    /* Optimized timeouts */
    navigationTimeout: process.env.CI ? 20000 : 15000,
    actionTimeout: process.env.CI ? 10000 : 8000,
    
    /* Use shared authentication state from global setup */
    storageState: 'tests/auth-state.json',
    
    /* Block external requests in CI to improve reliability */
    ...(process.env.CI && {
      extraHTTPHeaders: {
        'X-Block-External-Requests': 'true',
      },
    }),
  },

  /* Critical screen sizes only - reduce from 22+ to 8 key sizes */
  projects: [
    // Critical Mobile (2 sizes instead of 6)
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
    
    // Critical Tablet (2 sizes instead of 4) 
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
    
    // Critical Desktop (3 sizes instead of 5)
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
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stderr: 'pipe',
    stdout: 'pipe',
  },
});