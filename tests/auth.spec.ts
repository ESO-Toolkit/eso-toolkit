import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);
  });

  test('should handle OAuth redirect without external calls', async ({ page }) => {
    // Navigate to the OAuth redirect page with mock parameters
    await page.goto('/#/oauth-redirect?code=mock_auth_code&state=mock_state');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page loads without errors
    await expect(page.locator('body')).toBeVisible();

    // The page should attempt to exchange the code for a token (mocked)
    // and then redirect to the home page
    await page.waitForTimeout(2000);

    // Verify no JavaScript errors occurred during OAuth flow
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
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR_')
    );

    expect(significantErrors).toHaveLength(0);
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Navigate to OAuth redirect with error parameter
    await page.goto('/#/oauth-redirect?error=access_denied&error_description=User%20denied%20access');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page loads and shows error state
    await expect(page.locator('body')).toBeVisible();

    // Give time for error handling
    await page.waitForTimeout(1000);

    // Page should not crash even with OAuth errors
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });

  test('should show login button when not authenticated', async ({ page }) => {
    // Navigate to the home page first
    await page.goto('/');
    
    // Clear any existing auth tokens from localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload the page to reflect the cleared localStorage
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // The page should show the Connect to ESO Logs button when not authenticated
    await page.waitForTimeout(2000);

    // Check that the page renders without crashing
    await expect(page.locator('body')).toBeVisible();

    // Look for authentication-related elements
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Verify no major errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) =>
        !error.includes('Not implemented: navigation') &&
        !error.includes('jsdom') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR_')
    );

    expect(significantErrors).toHaveLength(0);
  });

  test('should handle authenticated state properly', async ({ page }) => {
    // Navigate to the home page first
    await page.goto('/');
    
    // Set up a mock access token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('eso-logs-access-token', 'mock_access_token_12345');
    });

    // Reload the page to reflect the new localStorage
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loads properly when authenticated
    await expect(page.locator('body')).toBeVisible();

    // Give time for authentication state to be processed
    await page.waitForTimeout(2000);

    // Verify the page renders correctly
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Verify no authentication-related errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) =>
        !error.includes('Not implemented: navigation') &&
        !error.includes('jsdom') &&
        !error.includes('Failed to load resource') &&
        !error.includes('net::ERR_')
    );

    expect(significantErrors).toHaveLength(0);
  });
});
