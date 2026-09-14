/* eslint-disable import/no-default-export -- Playwright requires a default config export. */
import { defineConfig, devices } from '@playwright/test';

import { ciBlockExternalHeaders } from '../tests/utils/playwright-shared';
import { calculateOptimalWorkers } from '../tests/utils/worker-config';

const externalBaseUrl = process.env.ANALYZER_ROUTE_BASE_URL || process.env.SMOKE_BASE_URL;
const rawPort = process.env.ANALYZER_ROUTE_PORT || process.env.PORT || '3006';
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 3006;
const baseURL = externalBaseUrl || `http://localhost:${port}`;

/**
 * Cross-browser coverage for the deterministic populated Analyzer history route.
 * Keep this separate from the broad smoke matrix so mobile coverage does not
 * multiply every smoke test.
 */
export default defineConfig({
  testDir: '../tests',
  testMatch: ['**/analyzer-route.smoke.spec.ts', '**/analyzer-route.accessibility.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI
    ? calculateOptimalWorkers({ maxWorkers: 2, minWorkers: 1, memoryPerWorker: 800 })
    : 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: process.env.CI
    ? [['html', { outputFolder: '../playwright-report/analyzer-route', open: 'never' }], ['github']]
    : 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: process.env.CI ? 60000 : 30000,
    actionTimeout: process.env.CI ? 30000 : 15000,
    ...ciBlockExternalHeaders,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile-chromium-390x844',
      use: { ...devices['iPhone 12'], browserName: 'chromium' },
    },
    {
      name: 'mobile-firefox-390x844',
      use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'mobile-webkit-390x844',
      use: { ...devices['Desktop Safari'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm start',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          NODE_ENV: 'development',
          BROWSER: 'none',
          GENERATE_SOURCEMAP: 'false',
          PORT: port.toString(),
        },
        cwd: process.cwd(),
      },
});
