/**
 * Playwright configuration for mobile UX regression tests.
 *
 * Covers the acceptance criteria from the Build Editor Mobile UX Audit
 * (documentation/features/BUILD_EDITOR_MOBILE_UX_AUDIT_2026-06-12.md):
 *
 *  - Phase 4 mobile project: 390×844, touch, mobile UA (iPhone-class)
 *  - Perf-tier matrix: data-perf='low' + data-perf='high' screenshot snapshots
 *  - Touch-target audit (≥24px bounding boxes on interactive elements)
 *
 * Run with: npx playwright test --config=playwright/mobile.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

const rawPort = process.env.PORT || '3000';
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: '../tests',
  testMatch: ['**/build-editor-mobile.spec.ts'],

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  timeout: 60000,
  expect: {
    timeout: 15000,
    toHaveScreenshot: {
      // Allow minor anti-aliasing differences across platforms
      maxDiffPixelRatio: 0.02,
    },
  },

  reporter: process.env.CI ? [['html'], ['github']] : 'html',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['iPhone 14'],
        // Explicitly set to match the audit's test device: 390×844 @3x, touch, mobile UA
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
    // Perf-tier low — same viewport, data-perf forced to 'low' via custom fixture
    {
      name: 'mobile-chrome-perf-low',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],

  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'development',
      BROWSER: 'none',
      GENERATE_SOURCEMAP: 'false',
      PORT: port.toString(),
    },
  },
});
