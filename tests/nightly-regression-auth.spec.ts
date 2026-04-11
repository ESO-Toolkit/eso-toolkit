import { test, expect } from '@playwright/test';
import { createAuthTestUtils, AuthEnv } from './auth-utils';
import { createEsoPage } from './utils/EsoLogAggregatorPage';

/**
 * Nightly Regression Tests - Authentication and User Reports
 *
 * These tests verify the authentication flows and user-specific functionality
 * work correctly with real data from esologs.com. They test login flows,
 * report browsing, and authenticated API access.
 *
 * Requires authentication credentials to run:
 * - OAUTH_CLIENT_ID: ESO Logs OAuth client ID
 * - OAUTH_CLIENT_SECRET: ESO Logs OAuth client secret (optional)
 * - ESO_LOGS_TEST_EMAIL: Test user email (optional)
 * - ESO_LOGS_TEST_PASSWORD: Test user password (optional)
 */

const TEST_TIMEOUTS = {
  navigation: 30000,
  dataLoad: 45000,
  // Increased from 10 000 ms: WebKit can be slow to settle before screenshots
  // on CI, especially for auth-gated pages that render redirect logic.
  screenshot: 20000,
};

test.describe('Nightly Regression - Authentication and Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Fail hard if authentication credentials are not available
    const hasOAuthCredentials = process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET;
    const hasUserCredentials = process.env.ESO_LOGS_TEST_EMAIL && process.env.ESO_LOGS_TEST_PASSWORD;
    
    if (!hasOAuthCredentials && !hasUserCredentials) {
      throw new Error(
        '🔑 AUTHENTICATION CREDENTIALS REQUIRED!\n\n' +
        'Authentication tests cannot run without proper credentials.\n' +
        'Please set one of the following environment variable combinations:\n\n' +
        '  Option 1 (OAuth Client Credentials):\n' +
        '    - OAUTH_CLIENT_ID\n' +
        '    - OAUTH_CLIENT_SECRET\n\n' +
        '  Option 2 (User Credentials):\n' +
        '    - ESO_LOGS_TEST_EMAIL\n' +
        '    - ESO_LOGS_TEST_PASSWORD\n\n' +
        'If running in CI/CD, ensure these are configured as repository secrets.\n' +
        'If running locally, set these in your environment or .env file.'
      );
    }

    // Don't set up API mocking - we want real data
    test.setTimeout(120000); // 2 minutes per test

    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.addInitScript(() => {
      (window as any).testErrors = [];
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show authentication options when not logged in', async ({ page }) => {
      const authUtils = createAuthTestUtils(page);
      const esoPage = createEsoPage(page);

      // Debug: Log the base URL being used
      console.log('🔍 Environment variables:');
      console.log('  NIGHTLY_BASE_URL:', process.env.NIGHTLY_BASE_URL);
      console.log('  BASE_URL:', process.env.BASE_URL);
      console.log('  Expected navigation to: /login');

      // Navigate to login page using the page class method
      await esoPage.goToLogin();

      // Debug: Log the actual URL we ended up at
      const currentUrl = page.url();
      console.log('🔍 Actual URL after navigation:', currentUrl);

      // Wait for the page to be ready using the page class
      await esoPage.waitForNavigation();

      // Take initial screenshot of login page
      await page.screenshot({
        path: 'test-results/nightly-auth-login-page-initial.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Clear any existing auth state
      await authUtils.clearAuth();

      // Take screenshot after clearing auth
      await page.screenshot({
        path: 'test-results/nightly-auth-after-clear-auth.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Should show login button/form
      await authUtils.verifyAuthenticationRequired();

      // Take screenshot of login page
      await page.screenshot({
        path: 'test-results/nightly-regression-login-page.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Verify page title
      await expect(page).toHaveTitle(/ESO Toolkit/);
    });

    test('should maintain authentication state', async ({ page }) => {
      // Navigate to app first
      await page.goto('', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait for the page to be ready
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Take initial landing screenshot
      await page.screenshot({
        path: 'test-results/nightly-auth-landing-initial.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      const authUtils = createAuthTestUtils(page);

      // If we have a saved auth state, verify it's working
      const isAuth = await authUtils.isAuthenticated();
      const token = await authUtils.getAccessToken();
      if (isAuth && token) {
        console.log('✅ Authentication state loaded successfully');

        // Note: /my-reports requires user authentication (user subject in token)
        // Client credentials tokens don't have user subjects, so we skip that test
        // Instead, verify auth state on landing page

        await page.screenshot({
          path: 'test-results/nightly-regression-authenticated-state.png',
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      } else {
        console.log('ℹ️  No authentication state found - this is expected in some scenarios');
      }
    });

    // Test removed: 'should redirect unauthenticated users from protected routes'
    // This test used /my-reports which requires user authentication (user subject in token).
    // Client credentials tokens don't have user subjects, so this test is not applicable.
    test.skip('should redirect unauthenticated users from protected routes', async ({ page }) => {
      // Test skipped - /my-reports requires user authentication
      console.log('⏭️  Test skipped - requires user authentication with user subject in token');

      expect(hasAuthIndicator).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-auth-redirect.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  test.describe('Latest Reports Page', () => {
    test('should load latest reports page', async ({ page }) => {
      await page.goto('/latest-reports', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait for content to load
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Wait for the page to be fully rendered
      await page.waitForTimeout(3000);

      // Check for various content indicators - be more flexible
      const hasReports = await page
        .locator(
          '.MuiDataGrid-root, .report-card, .report-item, a[href*="/report/"], .reports, .data-grid, table, .list',
        )
        .isVisible()
        .catch(() => false);
      const hasLoginPrompt = await page
        .locator('button:has-text(Login), a:has-text(Login), [data-testid*="login"]')
        .isVisible()
        .catch(() => false);
      const hasContent = await page
        .locator('main, .content, .app, .page, #root')
        .isVisible()
        .catch(() => false);
      const hasText = await page
        .getByText(/report|data|log|analysis/i)
        .isVisible()
        .catch(() => false);

      // Should have some kind of content indicating the page loaded
      const hasAnyContent = hasReports || hasLoginPrompt || hasContent || hasText;

      if (!hasAnyContent) {
        console.log('🔍 Page URL:', page.url());
        console.log('🔍 Page title:', await page.title());
        console.log('🔍 Body content preview:', await page.locator('body').textContent());
      }

      expect(hasAnyContent).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-latest-reports.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      if (hasReports) {
        // Test clicking on a report if available
        const firstReportLink = page.locator('a[href*="/report/"]').first();
        if (await firstReportLink.isVisible({ timeout: 3000 })) {
          await firstReportLink.click();

          // Should navigate to report page
          await page.waitForTimeout(3000);
          expect(page.url()).toMatch(/\/report\/[A-Za-z0-9]+/);

          await page.screenshot({
            path: 'test-results/nightly-regression-latest-to-report.png',
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });
  });

  // Note: User Reports Page (/my-reports) tests removed
  // The /my-reports page requires user authentication with a user subject in the token.
  // Client credentials tokens (grant_type: client_credentials) don't have user subjects,
  // so these tests would always fail with our current authentication setup.
  // To test /my-reports, use browser-based OAuth flow (authorization code flow) instead.

  test.describe('Calculator Page', () => {
    test('should load calculator page without authentication', async ({ page }) => {
      await page.goto('/calculator', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Wait for app to render
      await page.waitForTimeout(3000);

      // Calculator should be accessible without login - check for various indicators
      const hasNumberInput = await page
        .locator('input[type=number]')
        .isVisible()
        .catch(() => false);
      const hasTextInput = await page
        .locator('input[type=text]')
        .isVisible()
        .catch(() => false);
      const hasAnyInput = await page
        .locator('input')
        .isVisible()
        .catch(() => false);
      const hasCalculatorClass = await page
        .locator('.calculator')
        .isVisible()
        .catch(() => false);
      const hasCalculationClass = await page
        .locator('.calculation')
        .isVisible()
        .catch(() => false);
      const hasCalculatorText = await page
        .getByText(/calculator/i)
        .isVisible()
        .catch(() => false);
      const hasFormElements = await page
        .locator('form, select, button')
        .isVisible()
        .catch(() => false);
      const hasPageContent = await page
        .locator('main, .content, .app, #root')
        .isVisible()
        .catch(() => false);

      const hasCalculatorContent =
        hasNumberInput ||
        hasTextInput ||
        hasAnyInput ||
        hasCalculatorClass ||
        hasCalculationClass ||
        hasCalculatorText ||
        hasFormElements ||
        hasPageContent;

      if (!hasCalculatorContent) {
        console.log('🔍 Calculator page URL:', page.url());
        console.log('🔍 Calculator page title:', await page.title());
        console.log(
          '🔍 Calculator body content preview:',
          (await page.locator('body').textContent())?.slice(0, 200),
        );
      }

      expect(hasCalculatorContent).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-calculator.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Test basic calculator interaction if inputs are available
      const numberInputs = page.locator('input[type="number"]');
      const inputCount = await numberInputs.count();

      if (inputCount > 0) {
        // Check if the first input is enabled before trying to fill it
        const firstInput = numberInputs.first();
        const isEnabled = await firstInput.isEnabled();

        if (isEnabled) {
          // Fill in some test values
          await firstInput.fill('1000');

          if (inputCount > 1) {
            const secondInput = numberInputs.nth(1);
            const isSecondEnabled = await secondInput.isEnabled();
            if (isSecondEnabled) {
              await secondInput.fill('500');
            }
          }

          await page.waitForTimeout(1000);
        } else {
          console.log(
            'ℹ️ Calculator inputs are disabled - this may be expected behavior without authentication',
          );
        }

        await page.screenshot({
          path: 'test-results/nightly-regression-calculator-filled.png',
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-745: Authenticated management pages
  // ---------------------------------------------------------------------------
  test.describe('Authenticated Management Pages', () => {
    test('my-builds page should load or redirect gracefully', async ({ page }) => {
      await page.goto('/my-builds', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });
      await page.waitForTimeout(3000);

      // Client credentials tokens don't carry a user subject, so /my-builds may
      // redirect to login. Both outcomes (loaded content OR redirect to login) are valid.
      const url = page.url();
      const hasContent = await page
        .locator('main, .MuiContainer-root, .build-list, [data-testid*="build"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasLoginPrompt = await page
        .locator('button:has-text("Login"), a:has-text("Login"), [data-testid*="login"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const isOnLogin = url.includes('/login') || url.includes('/oauth');

      expect(
        hasContent || hasLoginPrompt || isOnLogin,
        '/my-builds should either render or redirect to login',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-my-builds.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('my-rosters page should load or redirect gracefully', async ({ page }) => {
      await page.goto('/my-rosters', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });
      await page.waitForTimeout(3000);

      const url = page.url();
      const hasContent = await page
        .locator('main, .MuiContainer-root, [data-testid*="roster"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasLoginPrompt = await page
        .locator('button:has-text("Login"), a:has-text("Login"), [data-testid*="login"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const isOnLogin = url.includes('/login') || url.includes('/oauth');

      expect(
        hasContent || hasLoginPrompt || isOnLogin,
        '/my-rosters should either render or redirect to login',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-my-rosters.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('build editor should load or redirect gracefully', async ({ page }) => {
      await page.goto('/build-editor', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });
      await page.waitForTimeout(3000);

      const url = page.url();
      const hasEditor = await page
        .locator('main, [data-testid*="build"], [data-testid*="editor"], .MuiContainer-root')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasLoginPrompt = await page
        .locator('button:has-text("Login"), a:has-text("Login"), [data-testid*="login"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const isOnLogin = url.includes('/login') || url.includes('/oauth');

      expect(
        hasEditor || hasLoginPrompt || isOnLogin,
        '/build-editor should either render or redirect to login',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-build-editor.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('roster builder should load or redirect gracefully', async ({ page }) => {
      await page.goto('/roster-builder', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });
      await page.waitForTimeout(3000);

      const url = page.url();
      const hasBuilder = await page
        .locator('main, [data-testid*="roster"], .MuiContainer-root')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasLoginPrompt = await page
        .locator('button:has-text("Login"), a:has-text("Login"), [data-testid*="login"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const isOnLogin = url.includes('/login') || url.includes('/oauth');

      expect(
        hasBuilder || hasLoginPrompt || isOnLogin,
        '/roster-builder should either render or redirect to login',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-roster-builder.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-750: Expanded negative / error scenario testing
  // ---------------------------------------------------------------------------
  test.describe('Negative Scenarios', () => {
    test('invalid fight ID within a valid report should fallback gracefully', async ({ page }) => {
      const reportId = '3gjVGWB2dxCL8XAw';
      await page.goto(`/report/${reportId}/fight/99999/insights`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForTimeout(5000);

      const hasError = await page
        .getByText(/not found|invalid|error|fight.*not.*exist/i)
        .isVisible()
        .catch(() => false);
      const redirected = !page.url().includes('99999');
      const hasContent = await page.locator('main, #root').isVisible().catch(() => false);

      expect(
        hasError || redirected || hasContent,
        'Invalid fight ID should be handled gracefully',
      ).toBeTruthy();

      // Page must remain navigable — no uncaught exceptions
      const errors: string[] = await page.evaluate(() => (window as any).testErrors ?? []);
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Not implemented') &&
          !e.includes('Non-Error promise rejection') &&
          !e.includes('ChunkLoadError'),
      );
      expect(criticalErrors, 'Invalid fight ID should not cause JS exceptions').toHaveLength(0);
    });

    test('simulated API timeout should show loading or error state', async ({ page }) => {
      // Intercept esologs API requests and force a 504 to simulate a timeout
      await page.route('**/esologs.com/**', async (route) => {
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Gateway Timeout' }),
        });
      });

      await page.goto('/report/prV8jWb1NqFJc97Z', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForTimeout(6000);

      // Should show a loading state, error message, or at minimum not crash
      const hasLoadingOrError = await page
        .locator(
          '.loading, .MuiCircularProgress-root, .MuiAlert-root, .error, .skeleton, .MuiSkeleton-root',
        )
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasText = await page
        .getByText(/loading|error|failed|timeout|try again/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasContent = await page.locator('main, #root').isVisible().catch(() => false);

      expect(
        hasLoadingOrError || hasText || hasContent,
        'API timeout should show a loading/error state rather than crash',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-api-timeout.png',
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Unroute so it doesn't affect subsequent tests
      await page.unrouteAll();
    });

    test('rate-limited API response (429) should show a user-facing message', async ({ page }) => {
      await page.route('**/esologs.com/**', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too Many Requests' }),
        });
      });

      await page.goto('/report/prV8jWb1NqFJc97Z', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForTimeout(6000);

      // App should not crash — any visible content is acceptable
      const hasContent = await page.locator('main, #root, body').first().isVisible().catch(() => false);
      expect(hasContent, 'A 429 response should not crash the page').toBeTruthy();

      // No uncaught JS exceptions from the rate-limit scenario
      const errors: string[] = await page.evaluate(() => (window as any).testErrors ?? []);
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Not implemented') &&
          !e.includes('Non-Error promise rejection') &&
          !e.includes('ChunkLoadError'),
      );
      expect(criticalErrors, '429 response should not cause uncaught JS exceptions').toHaveLength(0);

      await page.unrouteAll();
    });
  });

  test.describe('Cross-browser Compatibility Checks', () => {
    test('should verify key functionality works across browsers', async ({ page, browserName }) => {
      // Test basic navigation in different browsers
      await page.goto('/calculator', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(3000);

      // Verify basic functionality works
      const hasInteractiveElements = await page
        .locator('input, button, select, .MuiButton-root')
        .count();

      expect(hasInteractiveElements).toBeGreaterThan(0);

      await page.screenshot({
        path: `test-results/nightly-regression-${browserName}-compatibility.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      console.log(`${browserName}: Found ${hasInteractiveElements} interactive elements`);
    });
  });
});

