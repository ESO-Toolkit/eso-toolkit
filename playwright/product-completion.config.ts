import { defineConfig, devices } from '@playwright/test';

const requestedProductCompletionBaseUrl =
  process.env.PRODUCT_COMPLETION_BASE_URL ?? process.env.BASE_URL;
const rawProductCompletionPort = process.env.PRODUCT_COMPLETION_PORT ?? '3014';
const parsedProductCompletionPort = Number.parseInt(rawProductCompletionPort, 10);
const productCompletionPort = Number.isFinite(parsedProductCompletionPort)
  ? parsedProductCompletionPort
  : 3014;
const productCompletionBaseUrl =
  requestedProductCompletionBaseUrl ?? `http://localhost:${productCompletionPort}`;

/** Deterministic, isolated route contract for the product-completion workflow shell. */
export const productCompletionConfig = defineConfig({
  testDir: '../tests',
  testMatch: 'product-completion-workflow.spec.ts',
  outputDir: '../test-results/product-completion',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['html', { outputFolder: '../playwright-report/product-completion', open: 'never' }],
    ['json', { outputFile: '../test-results/product-completion/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: productCompletionBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: requestedProductCompletionBaseUrl
    ? undefined
    : {
        command: 'npm run dev',
        url: productCompletionBaseUrl,
        env: { PORT: productCompletionPort.toString() },
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
        timeout: 120000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});

// eslint-disable-next-line import/no-default-export -- Playwright loads config modules by default export.
export default productCompletionConfig;
