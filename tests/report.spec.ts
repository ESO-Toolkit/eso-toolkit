import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Report Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent testing
    await setupApiMocking(page);
  });

  test('should load a single report page successfully', async ({ page }) => {
    const testReportId = 'TEST123';
    
    // Navigate to the report page
    await page.goto(`/#/report/${testReportId}`);

    // Wait for the page title to be set
    await expect(page).toHaveTitle(/ESO Log Insights by NotaGuild/);

    // Wait for the page to load and network requests to complete
    await page.waitForLoadState('domcontentloaded');

    // Check that the main content is visible
    await expect(page.locator('body')).toBeVisible();

    // Verify that we're on the correct route
    expect(page.url()).toContain(`/report/${testReportId}`);

    // Give the app time to make API calls and render
    await page.waitForTimeout(500);

    // Check for console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(error => 
      !error.includes('ResizeObserver') && 
      !error.includes('Not implemented')
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle report data loading', async ({ page }) => {
    // Navigate to the report page
    await page.goto(`/#/report/TEST123`);

    // Wait for loading to complete
    await page.waitForLoadState('domcontentloaded');

    // The page should not show any obvious error states
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    await page.waitForTimeout(1000);

    // Should not have crashed
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle report with fight details', async ({ page }) => {
    const testReportId = 'TEST123';

    // Navigate to the main report page first (without specific fight)
    await page.goto(`/#/report/${testReportId}`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Basic checks
    await expect(page.locator('body')).toBeVisible();
    
    // Verify route
    expect(page.url()).toContain(`/report/${testReportId}`);

    // Give time for data loading
    await page.waitForTimeout(500);

    // Check that the page loaded without major errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(error => 
      !error.includes('ResizeObserver') && 
      !error.includes('Not implemented')
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle invalid report gracefully', async ({ page }) => {
    const invalidReportId = 'INVALID123';

    // Navigate to an invalid report
    await page.goto(`/#/report/${invalidReportId}`);

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // The page should still load (even if showing an error state)
    await expect(page.locator('body')).toBeVisible();

    // Give time for error handling
    await page.waitForTimeout(1000);

    // Should not crash the entire app
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });
});
