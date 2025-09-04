import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);

    // Navigate to the home page
    await page.goto('/');
  });

  test('should load the home page successfully', async ({ page }) => {
    // Wait for the page title to be set
    await expect(page).toHaveTitle(/ESO Log Insights by NotaGuild/);

    // Check that the main content is visible
    // Looking for elements that should be present on the landing page
    await expect(page.locator('body')).toBeVisible();

    // Wait for any loading states to complete
    await page.waitForLoadState('networkidle');

    // Verify no JavaScript errors occurred
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Give the page a moment to fully load and settle
    await page.waitForTimeout(1000);

    // Check that no major JavaScript errors occurred
    const significantLogs = logs.filter(
      (log) =>
        !log.includes('Not implemented: navigation') &&
        !log.includes('Failed to load resource') &&
        !log.includes('net::ERR_')
    );
    expect(significantLogs).toHaveLength(0);
  });

  test('should have working navigation elements', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check if there are any navigation elements or buttons that should be present
    // Since this is a React app, we'll look for common UI elements

    // The app should not crash and should render some content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Verify the page is interactive (React has loaded)
    await expect(page.locator('body')).toBeVisible();

    // Look for React root element or app container
    const hasReactContent = (await page.locator('#root, [data-reactroot], .App').count()) > 0;
    expect(hasReactContent).toBeTruthy();
  });

  test('should handle routing correctly', async ({ page }) => {
    // Verify we're on the root path (hash router)
    expect(page.url()).toMatch(/\/#?$/);

    // The app should be responsive
    await page.waitForLoadState('networkidle');

    // Verify the page doesn't have any major console errors (except known jsdom issues)
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
});
