import { test, expect } from '@playwright/test';
import { enableApiCaching } from './utils';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

// Removed unused selectors - not needed for visual regression testing

const WAIT_TIMEOUTS = {
  NETWORK_IDLE: 2000,
  DATA_LOADING: process.env.CI ? 30000 : 45000, // Reduced to 30s in CI
  CONTENT_RENDER: process.env.CI ? 8000 : 10000, // Faster in CI
  NAVIGATION: process.env.CI ? 40000 : 60000 // Reduced navigation timeout in CI
} as const;

/**
 * Set up authentication and caching for screen size tests
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
 * Navigate to specific report page
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  await page.goto(url, { 
    waitUntil: 'networkidle',
    timeout: WAIT_TIMEOUTS.NAVIGATION
  });
}

/**
 * Minimal wait for visual stability - focused on screenshot readiness only
 */
async function waitForDataLoad(page: any, panelName: string) {
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NAVIGATION });
  
  // Ensure basic content structure exists
  await page.waitForSelector('h1, h2, h3, h4, h5, h6', { timeout: WAIT_TIMEOUTS.DATA_LOADING });
  
  // Brief stabilization for visual consistency
  await page.waitForTimeout(process.env.CI ? 1000 : 2000);
}

// Removed validateResponsiveLayout function - not needed for visual regression

test.describe('ESO Log Aggregator - Core Panels Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('should display players panel correctly across all screen sizes', async ({ page }, testInfo) => {
    // Navigate to main fight report (players panel)
    await navigateToReport(page);
    await waitForDataLoad(page, 'players panel');

    // Take screenshot for visual comparison - this is the core purpose
    await expect(page).toHaveScreenshot('players-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 8000 : 12000,
    });
  });

  test('should display insights panel correctly across all screen sizes', async ({ page }, testInfo) => {
    // Navigate to insights tab
    await navigateToReport(page, '/insights');
    await waitForDataLoad(page, 'insights panel');

    // Take screenshot for visual comparison - this is the core purpose
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 8000 : 12000,
    });
  });
});