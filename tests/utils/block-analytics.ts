/**
 * Utility to block analytics and tracking requests in Playwright tests
 * 
 * This prevents test traffic from polluting production analytics data.
 */

import { Page, Route } from '@playwright/test';

/**
 * List of analytics and tracking domains to block in tests
 */
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'www.google-analytics.com',
  'ssl.google-analytics.com',
  'doubleclick.net',
  'stats.g.doubleclick.net',
  // Add other analytics services as needed
  'sentry.io',
  'browser.sentry-cdn.com',
];

/**
 * Block analytics and tracking requests
 * 
 * Call this in test setup to prevent analytics from being sent during tests.
 * 
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await blockAnalytics(page);
 *   await page.goto('/');
 * });
 * ```
 */
export async function blockAnalytics(page: Page): Promise<void> {
  await page.route('**/*', (route: Route) => {
    const url = route.request().url();
    
    // Check if URL matches any blocked domain
    const shouldBlock = BLOCKED_DOMAINS.some(domain => url.includes(domain));
    
    if (shouldBlock) {
      // Silently abort analytics requests
      route.abort('blockedbyclient');
    } else {
      // Allow all other requests to continue
      route.continue();
    }
  });
}

/**
 * Disable analytics initialization via script injection
 * 
 * This injects a script before page load that prevents analytics from initializing.
 * Use this in addition to or instead of blockAnalytics() for complete coverage.
 */
export async function disableAnalyticsInit(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Stub out Google Analytics gtag
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = function() {
      // No-op - do nothing
    };
    (window as Window & { dataLayer?: unknown[] }).dataLayer = [];
    
    // Stub out ReactGA if it gets loaded
    (window as Window & { ReactGA?: Record<string, () => void> }).ReactGA = {
      initialize: () => {},
      send: () => {},
      event: () => {},
      gtag: () => {},
    };
    
    // Set a flag to indicate we're in test mode
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__ = true;
  });
}
