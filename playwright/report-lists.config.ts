/* eslint-disable import/no-default-export -- Playwright requires a default config export. */
import { defineConfig, devices } from '@playwright/test';

import { ciBlockExternalHeaders } from '../tests/utils/playwright-shared';

const requestedBaseUrl = process.env.REPORT_LISTS_BASE_URL;
const rawPort = process.env.REPORT_LISTS_PORT ?? '3018';
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 3018;
const baseUrl = requestedBaseUrl ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: '../tests',
  testMatch: '**/report-lists-enhanced.spec.ts',
  outputDir: '../test-results/report-lists',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['html', { outputFolder: '../playwright-report/report-lists', open: 'never' }], ['github']]
    : 'line',
  use: {
    baseURL: baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...ciBlockExternalHeaders,
  },
  projects: [
    { name: 'chromium-report-lists', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-report-lists', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-report-lists', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: requestedBaseUrl
    ? undefined
    : {
        command: 'npm run dev',
        url: baseUrl,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: { PORT: port.toString() },
      },
});
