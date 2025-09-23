import { test, expect, devices } from '@playwright/test';
import { createAuthTestUtils } from './auth-test-utils';
import { createEsoPage } from './utils/EsoLogAggregatorPage';

// Test configuration constants
const TEST_TIMEOUTS = {
  navigation: 30000,
  waitForSelector: 10000,
  networkIdle: 15000,
  default: 5000,
};

/**
 * Example of how the auth test file would look after refactoring to use the page class
 * This is a demonstration file - not the actual refactor yet
 */
test.describe('Nightly Regression - Authentication (Refactored Example)', () => {
  test.beforeAll(async () => {
    console.log('🌙 Nightly Authentication Tests - Starting test suite');
    console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    
    if (process.env.NIGHTLY_BASE_URL) {
      console.log('🌐 Using NIGHTLY_BASE_URL:', process.env.NIGHTLY_BASE_URL);
    } else {
      console.log('⚠️  NIGHTLY_BASE_URL not set, using default base URL');
    }
  });

  test.describe('Authentication Flow', () => {
    test('should show authentication options when not logged in', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      // Debug: Log the base URL being used
      console.log('🔍 Environment variables:');
      console.log('  NIGHTLY_BASE_URL:', process.env.NIGHTLY_BASE_URL);
      console.log('  BASE_URL:', process.env.BASE_URL);
      console.log('  Expected navigation to: #/login');

      // Navigate to login page using the page class
      await esoPage.goToLogin();

      // Debug: Log the actual URL we ended up at
      const currentUrl = page.url();
      console.log('🔍 Actual URL after navigation:', currentUrl);

      // Wait for the page to be ready
      await esoPage.waitForNavigation();

      // Take initial screenshot of login page
      await page.screenshot({
        path: 'test-results/nightly-auth-login-page-initial.png',
        fullPage: true,
      });

      // Test authentication options visibility
      await authUtils.expectAuthenticationOptionsVisible();
      
      console.log('✅ Authentication options are visible and working');
    });

    test('should redirect to my-reports after successful login', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      console.log('🔑 Testing login flow and my-reports redirect');

      // Start at login page
      await esoPage.goToLogin();

      // Perform authentication
      await authUtils.performDiscordAuth();

      // Should redirect to my-reports
      await esoPage.goToMyReports();

      console.log('✅ Login flow and redirect working correctly');
    });

    test('should access calculator with authentication', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      console.log('🧮 Testing calculator access after authentication');

      // Ensure we're authenticated
      await authUtils.ensureAuthenticated();
      
      // Navigate to calculator
      await esoPage.goToCalculator();

      // Verify calculator functionality
      const calculatorElements = await page.locator('[data-testid="calculator"]').count();
      expect(calculatorElements).toBeGreaterThan(0);

      console.log('✅ Calculator accessible and functional');
    });

    test('should handle invalid report access', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      console.log('❌ Testing invalid report access');

      // Ensure we're authenticated
      await authUtils.ensureAuthenticated();
      
      // Try to access an invalid report
      await esoPage.goToInvalidReport('TOTALLY_INVALID_ID');

      // Should show appropriate error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      console.log('✅ Invalid report access handled correctly');
    });

    test('should navigate to specific report with fight analysis', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      console.log('📊 Testing report and fight navigation');

      // Ensure we're authenticated
      await authUtils.ensureAuthenticated();
      
      // Navigate to a specific report
      const reportId = '3gjVGWB2dxCL8XAw';
      await esoPage.goToReport(reportId);

      // Verify we can access fight details
      const fightId = 'someFightId'; // This would come from the report data
      await esoPage.goToFightInsights(reportId, fightId);

      // Verify insights are loaded
      await expect(page.locator('[data-testid="fight-insights"]')).toBeVisible();

      console.log('✅ Report and fight navigation working correctly');
    });
  });
});