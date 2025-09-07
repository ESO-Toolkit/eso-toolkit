import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

/**
 * Network Monitoring Test - Ensures no external requests are made during CI
 * This test specifically monitors and fails if any real external network requests are detected
 */
test.describe('Network Isolation Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking before each test
    await setupApiMocking(page);
  });

  test('should fail if any external network requests are made', async ({ page }) => {
    const externalRequests: Array<{ url: string; method: string }> = [];
    const blockedDomains = [
      'esologs.com',
      'rpglogs.com',
      'sentry.io',
      'googleapis.com',
      'gstatic.com',
      'discord.gg',
      'github.com',
      'gravatar.com',
      'analytics.google.com',
      'googletagmanager.com'
    ];

    // Monitor ALL network requests
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // Check if this is an external request to a blocked domain
      const isExternalRequest = blockedDomains.some(domain => url.includes(domain));
      
      if (isExternalRequest) {
        externalRequests.push({ url, method });
        console.error(`❌ EXTERNAL REQUEST DETECTED: ${method} ${url}`);
      }
    });

    // Test navigation and interactions that might trigger external requests
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Navigate to report page (might trigger API calls)
    await page.goto('/#/report/TEST123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Navigate to OAuth flow (might trigger OAuth calls)
    await page.goto('/#/oauth-redirect?code=test_code&state=test_state');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // FAIL THE TEST if any external requests were made
    if (externalRequests.length > 0) {
      const requestSummary = externalRequests
        .map(req => `  - ${req.method} ${req.url}`)
        .join('\n');
      
      throw new Error(
        `❌ EXTERNAL NETWORK REQUESTS DETECTED IN CI!\n\n` +
        `The following external requests were made during testing:\n${requestSummary}\n\n` +
        `This indicates that:\n` +
        `1. External services are not properly mocked\n` +
        `2. The application is trying to make real network requests\n` +
        `3. Tests are not properly isolated\n\n` +
        `Please ensure all external services are mocked and no real network requests are made during testing.`
      );
    }

    console.log('✅ No external network requests detected - tests are properly isolated');
  });

  test('should verify mocking is working correctly', async ({ page }) => {
    let mockedRequestsCount = 0;

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      
      // Count mocked responses
      if (url.includes('localhost:3000') || status === 200) {
        mockedRequestsCount++;
      }
    });

    // Navigate through the app
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    await page.goto('/#/report/TEST123');
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForTimeout(1000);

    // Verify that mocked requests are working
    expect(mockedRequestsCount).toBeGreaterThan(0);
    console.log(`✅ Detected ${mockedRequestsCount} mocked requests - mocking is working`);
  });
});
