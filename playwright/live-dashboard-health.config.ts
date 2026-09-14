/* eslint-disable import/no-default-export -- Playwright requires a default config export. */
import { defineConfig, devices } from '@playwright/test';

const requestedBaseUrl = process.env.LIVE_HEALTH_BASE_URL ?? process.env.FULL_BASE_URL;
const baseUrl = requestedBaseUrl ?? 'http://127.0.0.1:3016';
const port = new URL(baseUrl).port || '3016';

export default defineConfig({
  testDir: '../tests',
  testMatch: '**/live-dashboard-health.spec.ts',
  outputDir: '../test-results-live-dashboard-health',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['line'],
    ['html', { outputFolder: '../playwright-report/live-dashboard-health', open: 'never' }],
    ['json', { outputFile: '../playwright-report-live-dashboard-health/results.json' }],
  ],
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: requestedBaseUrl
    ? undefined
    : {
        command: 'npm run dev',
        url: baseUrl,
        env: { PORT: port },
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
