import { test, expect } from '@playwright/test';

import { TEST_TIMEOUTS, waitForAppMount } from './selectors';

test.describe('Basic Authentication Test', () => {
  test('should load application with OAuth authentication', async ({ page }) => {
    console.log('🔍 Testing basic application loading with authentication...');

    // Navigate to the application
    await page.goto('');

    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await waitForAppMount(page);

    // Basic checks that the app loaded
    await expect(page).toHaveTitle(/ESO/i);

    // Just verify we can navigate and the page loads
    console.log('✅ Page loaded successfully');
    console.log('✅ Page URL:', page.url());
    console.log('✅ Page title:', await page.title());

    // Take a screenshot for debugging
    await page.screenshot({
      path: 'test-results/auth-basic-test.png',
      fullPage: true,
    });

    // The body element is present even for a blank shell or a failed SPA mount.
    // Require the landing-page report analyzer so this test proves the app loaded.
    await expect(page.locator('form[aria-label="Analyze an ESO Logs report"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.dataLoad,
    });

    console.log('✅ Basic authentication test passed');
  });
});
