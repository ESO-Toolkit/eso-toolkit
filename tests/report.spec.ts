import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Report Page', () => {
  const testReportId = 'TEST123';

  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);
  });

  test('should load a single report page successfully', async ({ page }) => {
    // Navigate to a specific report page
    await page.goto(`/#/report/${testReportId}`);

    // Wait for the page title to be set
    await expect(page).toHaveTitle(/ESO Log Insights by NotaGuild/);

    // Wait for the page to load and network requests to complete
    await page.waitForLoadState('networkidle');

    // Check that the main content is visible
    await expect(page.locator('body')).toBeVisible();

    // Verify that we're on the correct route
    expect(page.url()).toContain(`/report/${testReportId}`);

    // Give the app time to make API calls and render
    await page.waitForTimeout(2000);

    // Verify no major JavaScript errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    // Filter out known test environment errors
    const significantErrors = errors.filter(
      (error) =>
        !error.includes('Not implemented: navigation') &&
        !error.includes('jsdom') &&
        !error.includes('Failed to load resource')
    );

    expect(significantErrors).toHaveLength(0);
  });

  test('should handle report data loading', async ({ page }) => {
    // Navigate to the report page
    await page.goto(`/#/report/${testReportId}`);

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // The page should not show any obvious error states
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Verify the page doesn't crash
    await expect(page.locator('body')).toBeVisible();

    // Give time for React components to render
    await page.waitForTimeout(1000);

    // Check that React app has loaded
    const hasReactContent = (await page.locator('#root, [data-reactroot], .App').count()) > 0;
    expect(hasReactContent).toBeTruthy();
  });

  test('should handle report with fight details', async ({ page }) => {
    const fightId = 1;

    // Navigate to a specific fight within the report
    await page.goto(`/#/report/${testReportId}/fight/${fightId}`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify we're on the correct route
    expect(page.url()).toContain(`/report/${testReportId}/fight/${fightId}`);

    // Check that the page renders without crashing
    await expect(page.locator('body')).toBeVisible();

    // Give the app time to load and render
    await page.waitForTimeout(2000);

    // Verify no major errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // Filter out expected test environment errors
    const significantErrors = consoleErrors.filter(
      (error) =>
        !error.includes('Not implemented: navigation') &&
        !error.includes('jsdom') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR_')
    );

    expect(significantErrors).toHaveLength(0);
  });

  test('should handle invalid report gracefully', async ({ page }) => {
    // Test with an invalid report ID
    await page.goto('/#/report/INVALID_REPORT');

    // Wait for the page to attempt loading
    await page.waitForLoadState('networkidle');

    // The page should still render (error boundary should catch issues)
    await expect(page.locator('body')).toBeVisible();

    // Give time for error handling
    await page.waitForTimeout(1000);

    // Page should not completely crash
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // App should still be functional even with invalid data
    const hasReactContent = (await page.locator('#root, [data-reactroot], .App').count()) > 0;
    expect(hasReactContent).toBeTruthy();
  });
});
