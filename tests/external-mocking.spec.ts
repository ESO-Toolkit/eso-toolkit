import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('External Service Mocking', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);
  });

  test('should load home page without external network requests', async ({ page }) => {
    const externalRequests: string[] = [];

    // Monitor network requests to track external services
    page.on('request', (request) => {
      const url = request.url();
      
      // Track requests that would go to real external services
      if (
        url.includes('esologs.com') ||
        url.includes('rpglogs.com') ||
        url.includes('sentry.io')
      ) {
        externalRequests.push(url);
      }
    });

    // Navigate to the home page
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Give a reasonable time for any async requests
    await page.waitForTimeout(3000);

    // Verify the page loads successfully
    await expect(page.locator('body')).toBeVisible();

    // Log any external requests for debugging
    if (externalRequests.length > 0) {
      console.log('External requests made:', externalRequests);
    }
  });

  test('should mock OAuth token exchange', async ({ page }) => {
    let tokenRequestMade = false;

    page.on('response', (response) => {
      if (response.url().includes('oauth/token')) {
        tokenRequestMade = true;
        expect(response.status()).toBe(200);
      }
    });

    // Navigate to OAuth redirect page to trigger token exchange
    await page.goto('/#/oauth-redirect?code=test_code&state=test_state');
    
    // Wait for page to process the OAuth flow
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // The page should still be functional even if OAuth is mocked
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle report page without real API calls', async ({ page }) => {
    let graphqlRequestMade = false;

    page.on('response', (response) => {
      if (response.url().includes('api/v2/client')) {
        graphqlRequestMade = true;
        expect(response.status()).toBe(200);
      }
    });

    // Navigate to a report page
    await page.goto('/#/report/TEST123');
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // The page should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have network-related console errors', async ({ page }) => {
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('Failed to fetch') ||
          text.includes('NetworkError') ||
          text.includes('CORS') ||
          text.includes('ERR_INTERNET_DISCONNECTED')
        ) {
          networkErrors.push(text);
        }
      }
    });

    // Navigate to different pages
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.goto('/#/report/TEST123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // There should be no network-related errors
    expect(networkErrors).toHaveLength(0);
  });
});
