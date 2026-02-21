import { defineConfig, devices } from '@playwright/test';

import { BASE_URL, devWebServer } from '../tests/utils/playwright-shared';

/**
 * Playwright configuration for performance testing
 * 
 * This configuration runs performance benchmarking tests that measure:
 * - Core Web Vitals (FCP, LCP, CLS, FID, INP)
 * - Time to Interactive (TTI)
 * - Total Blocking Time (TBT)
 * - Performance across different device types
 * 
 * When to use:
 * - ✅ Weekly performance monitoring
 * - ✅ Before releases to catch performance regressions
 * - ✅ After performance optimization work
 * - ✅ Comparing performance across branches
 * - ❌ NOT in CI/PR checks (inconsistent results, too slow)
 * 
 * Run with: npm run test:performance
 * View report: npm run test:performance:report
 */
export default defineConfig({
  testDir: '../tests',
  
  /* Only run performance tests */
  testMatch: '**/performance.spec.ts',
  
  /* Output directory for test results */
  outputDir: '../test-results-performance',
  
  /* Performance tests need clean, sequential runs for accurate measurements */
  fullyParallel: false,
  
  /* No retries for performance tests - we want consistent measurements */
  retries: 0,
  
  /* Single worker to avoid resource contention affecting measurements */
  workers: 1,
  
  /* Longer timeout for performance tests */
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000, // 30 seconds for performance assertions
  },
  
  /* Reporter to use */
  reporter: [
    ['html', { 
      outputFolder: '../playwright-report-performance',
      open: 'never',
    }],
    ['json', { outputFile: '../playwright-report-performance/results.json' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,
    
    /* Collect trace for performance analysis */
    trace: 'on',
    
    /* No screenshots for performance tests */
    screenshot: 'off',
    
    /* No video for performance tests */
    video: 'off',
  },
  
  /* Configure projects for different device types */
  projects: [
    {
      name: 'desktop-performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable browser cache for consistent measurements
        launchOptions: {
          args: ['--disable-cache'],
        },
      },
    },
    {
      name: 'mobile-performance',
      use: { 
        ...devices['Pixel 5'],
        // Disable browser cache for consistent measurements
        launchOptions: {
          args: ['--disable-cache'],
        },
      },
    },
    {
      name: 'tablet-performance',
      use: { 
        ...devices['iPad (gen 7)'],
        // Disable browser cache for consistent measurements
        launchOptions: {
          args: ['--disable-cache'],
        },
      },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  webServer: {
    ...devWebServer,
    stdout: 'ignore', // suppress noisy output during performance benchmarks
  },
});
