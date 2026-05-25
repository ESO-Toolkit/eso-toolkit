/**
 * Global test setup utilities
 * 
 * This module provides common setup functions that should be applied
 * to all Playwright tests to ensure consistent test environment.
 */

import { Page } from '@playwright/test';
import { blockAnalytics, disableAnalyticsInit } from '../utils/block-analytics';

/**
 * Setup test environment for a page
 * 
 * This should be called in test.beforeEach() to ensure:
 * - Analytics are disabled
 * - Test mode is properly flagged
 * - Tracking scripts don't pollute production data
 * 
 * @example
 * ```typescript
 * import { setupTestPage } from './setup/global-test-setup';
 * 
 * test.beforeEach(async ({ page }) => {
 *   await setupTestPage(page);
 * });
 * ```
 */
export async function setupTestPage(page: Page): Promise<void> {
  // Inject test mode flag before page loads
  await disableAnalyticsInit(page);
  
  // Block analytics network requests
  await blockAnalytics(page);
}
