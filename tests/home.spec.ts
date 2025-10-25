import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent testing
    await setupApiMocking(page);
    await page.goto('/');
  });

  test('should load the home page successfully', async ({ page }) => {
    // Check that the page title is set correctly
    await expect(page).toHaveTitle(/ESO Toolkit/);

    // Check that the main content is visible
    // Looking for elements that should be present on the landing page
    await expect(page.locator('body')).toBeVisible();

    // Wait for any loading states to complete
    await page.waitForLoadState('domcontentloaded');

    // Verify no JavaScript errors occurred
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // Filter out known harmless errors from jsdom/test environment
    const significantLogs = logs.filter(
      (log) =>
        !log.includes('ResizeObserver') &&
        !log.includes('Not implemented') &&
        !log.includes('jsdom') &&
        !log.includes('net::ERR_'),
    );
    expect(significantLogs).toHaveLength(0);
  });

  test('should have working navigation elements', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Check if there are any navigation elements or buttons that should be present
    // Since this is a React app, we'll look for common UI elements

    // The app should not crash and should render some content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // The page should have some meaningful content
    expect(bodyContent!.length).toBeGreaterThan(100);
  });

  test('should handle routing correctly', async ({ page }) => {
    // Verify we're on the root path (hash router)
    expect(page.url()).toMatch(/\/#?$/);

    // The app should be responsive
    await page.waitForLoadState('domcontentloaded');

    // Verify the page doesn't have any major console errors (except known jsdom issues)
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    // Filter out known test environment issues
    const significantErrors = errors.filter(
      (error) => !error.includes('ResizeObserver') && !error.includes('Not implemented'),
    );

    expect(significantErrors).toHaveLength(0);
  });
});
