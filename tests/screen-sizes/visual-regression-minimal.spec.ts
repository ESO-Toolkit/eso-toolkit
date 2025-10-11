import { test, expect } from '@playwright/test';
import { enableApiCaching } from './utils';

// Test configuration - focused on visual regression only
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

/**
 * Set up test environment for visual regression tests
 * Uses the shared authentication state from global setup
 */
async function setupTestEnvironment(page: any) {
  await enableApiCaching(page);
  
  // The authentication is already handled by the storageState configuration
  // Just ensure the authenticated state is properly set for the app
  await page.addInitScript(() => {
    if (localStorage.getItem('access_token')) {
      localStorage.setItem('authenticated', 'true');
    }
  });
}

/**
 * Navigate to report page - simplified
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
}

/**
 * Minimal wait for content - just enough for visual stability
 */
async function waitForVisualStability(page: any) {
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  
  // Brief stabilization for animations/loading
  await page.waitForTimeout(process.env.CI ? 1000 : 2000);
  
  // Ensure basic page structure is ready (minimal check)
  await page.waitForSelector('body', { timeout: 10000 });
}

test.describe('Visual Regression - Core Panels', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('players panel visual regression', async ({ page }) => {
    await navigateToReport(page);
    await waitForVisualStability(page);

    // Take screenshot - this is the only thing that matters for visual regression
    await expect(page).toHaveScreenshot('players-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 8000 : 12000,
    });
  });

  test('insights panel visual regression', async ({ page }) => {
    await navigateToReport(page, '/insights');
    await waitForVisualStability(page);

    // Take screenshot - this is the only thing that matters for visual regression
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 8000 : 12000,
    });
  });
});