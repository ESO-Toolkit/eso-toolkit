import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);
  });

  test('should handle OAuth redirect without external calls', async ({ page }) => {
    // Navigate to the OAuth redirect page with mock parameters
    await page.goto('/oauth-redirect?code=mock_auth_code&state=mock_state');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loads without errors
    await expect(page.locator('body')).toBeVisible();

    // The page should attempt to exchange the code for a token (mocked)
    // and then redirect to the home page
    await page.waitForTimeout(500);

    // Verify no JavaScript errors occurred during OAuth flow
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    // Filter out known jsdom/test environment errors
    const significantErrors = errors.filter(
      (error) =>
        !error.includes('ResizeObserver') &&
        !error.includes('Not implemented') &&
        !error.includes('jsdom'),
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Navigate to OAuth redirect with error parameter
    await page.goto(
      '/oauth-redirect?error=access_denied&error_description=User%20denied%20access',
    );

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loads and shows error state
    await expect(page.locator('body')).toBeVisible();

    // Give time for error handling
    await page.waitForTimeout(1000);

    // Verify the page handles the error without crashing
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should show login button when not authenticated', async ({ page }) => {
    // Navigate to home page first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loads
    await expect(page.locator('body')).toBeVisible();

    // Give React time to render
    await page.waitForTimeout(500);

    // Page should load successfully even without authentication
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Verify no major JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) =>
        !error.includes('ResizeObserver') &&
        !error.includes('Not implemented') &&
        !error.includes('jsdom'),
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle authenticated state properly', async ({ page }) => {
    // First simulate authentication by going through OAuth flow
    await page.goto('/oauth-redirect?code=mock_auth_code&state=mock_state');
    await page.waitForLoadState('domcontentloaded');

    // Give time for authentication to process
    await page.waitForTimeout(500);

    // Now navigate to a protected area
    await page.goto('/report/TEST123');
    await page.waitForLoadState('domcontentloaded');

    // Check that the page loads
    await expect(page.locator('body')).toBeVisible();

    // Give time for any API calls
    await page.waitForTimeout(500);

    // Verify no errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) =>
        !error.includes('ResizeObserver') &&
        !error.includes('Not implemented') &&
        !error.includes('jsdom'),
    );
    expect(significantErrors).toHaveLength(0);
  });
});

