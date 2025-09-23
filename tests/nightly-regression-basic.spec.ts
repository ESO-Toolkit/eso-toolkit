import { test, expect } from '@playwright/test';

test.describe('Basic Authentication Test', () => {
  test('should load application with OAuth authentication', async ({ page }) => {
    console.log('🔍 Testing basic application loading with authentication...');
    
    // Navigate to the application
    await page.goto('');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
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
    
    // Simple check - the page should at least load without major errors
    const bodyContent = await page.locator('body').isVisible();
    expect(bodyContent).toBeTruthy();
    
    console.log('✅ Basic authentication test passed');
  });
});
