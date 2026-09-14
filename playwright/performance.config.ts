/* eslint-disable import/no-default-export -- Playwright requires a default config export. */
import { defineConfig, devices } from '@playwright/test';

import { getDevServerPort } from '../tests/utils/playwright-shared';

const rawPerformancePort = process.env.PERFORMANCE_PORT || process.env.PORT || '3008';
const parsedPerformancePort = Number.parseInt(rawPerformancePort, 10);
const performancePort = Number.isFinite(parsedPerformancePort) ? parsedPerformancePort : 3008;
const performanceBaseUrl = process.env.BASE_URL || `http://localhost:${performancePort}`;
const performanceServerPort = getDevServerPort(performanceBaseUrl);
const rawWorkerPort = process.env.PERFORMANCE_WORKER_PORT || '3010';
const parsedWorkerPort = Number.parseInt(rawWorkerPort, 10);
const workerPort = Number.isFinite(parsedWorkerPort) ? parsedWorkerPort : 3010;
const workerBaseUrl = process.env.PERFORMANCE_WORKER_BASE_URL || `http://localhost:${workerPort}`;
const workerServerPort = getDevServerPort(workerBaseUrl);

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
    [
      'html',
      {
        outputFolder: '../playwright-report-performance',
        open: 'never',
      },
    ],
    ['json', { outputFile: '../playwright-report-performance/results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: performanceBaseUrl,

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
          args: ['--disable-cache', '--enable-precise-memory-info'],
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
        // Keep Web Vitals collection on Chromium; cross-browser behavior is covered by E2E matrices.
        browserName: 'chromium',
        // Disable browser cache for consistent measurements
        launchOptions: {
          args: ['--disable-cache'],
        },
      },
    },
  ],

  /*
   * Measure page metrics against a production build while keeping a separate Vite
   * origin for the benchmark that intentionally imports a source worker module.
   */
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${performanceServerPort} --strictPort`,
      url: performanceBaseUrl,
      reuseExistingServer: false,
      timeout: 180000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: workerBaseUrl,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        PORT: workerServerPort,
        STRICT_PORT: 'true',
      },
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
