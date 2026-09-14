/* eslint-disable import/no-default-export -- Playwright requires a default config export. */
import { defineConfig, devices } from '@playwright/test';

import { ciBlockExternalHeaders } from '../tests/utils/playwright-shared';

// Keep this suite on the dedicated Analyzer test port. Reusing an arbitrary
// process on the main worktree port can make the route appear healthy while
// serving an unrelated application.
const rawPort = process.env.REPORT_CONTROLS_A11Y_PORT || process.env.PORT || '3006';
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isNaN(parsedPort) ? 3006 : parsedPort;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: '../tests',
  testMatch: '**/report-controls-accessibility.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: '../playwright-report/report-controls-a11y', open: 'never' }],
        ['github'],
      ]
    : 'html',
  use: {
    baseURL: baseUrl,
    trace: 'retain-on-failure',
    navigationTimeout: process.env.CI ? 60000 : 30000,
    actionTimeout: process.env.CI ? 30000 : 15000,
    ...ciBlockExternalHeaders,
  },
  projects: [
    { name: 'chromium-report-controls-a11y', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-report-controls-a11y', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-report-controls-a11y', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm start',
    url: baseUrl,
    // Never reuse an existing server: a stale or unrelated process must fail
    // the harness instead of turning the populated-state test into a false
    // 404/skeleton result.
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
