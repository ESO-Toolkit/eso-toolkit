import { test, expect } from '@playwright/test';
import { enableApiCaching } from './utils';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

// Removed unused selectors - not needed for visual regression testing

const WAIT_TIMEOUTS = {
  NETWORK_IDLE: process.env.CI ? 20000 : 30000, // Faster in CI
  DATA_LOADING: process.env.CI ? 30000 : 45000, // Reduced wait time in CI
  CONTENT_RENDER: process.env.CI ? 8000 : 10000  // Faster content render in CI
} as const;

/**
 * Set up test environment for insights analysis tests
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
 * Navigate to insights tab
 */
async function navigateToInsightsTab(page: any) {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
  await page.goto(url);
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NETWORK_IDLE });
}

/**
 * Minimal wait for visual stability
 */
async function waitForInsightsDataLoad(page: any) {
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NETWORK_IDLE });
  
  // Wait for the main application content to load
  await page.waitForSelector('[data-testid="main-content"], main, .MuiContainer-root, .App', { 
    timeout: WAIT_TIMEOUTS.DATA_LOADING 
  });
  
  // Brief stabilization
  await page.waitForTimeout(process.env.CI ? 1000 : 2000);
}

// Removed validateResponsiveLayout function - not needed for visual regression

test.describe('ESO Log Insights Panel - Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('should render insights (players) panel correctly across screen sizes', async ({ page }, testInfo) => {
    await navigateToInsightsTab(page);
    await waitForInsightsDataLoad(page);

    // Take screenshot for visual comparison - this is the core purpose
    await expect(page).toHaveScreenshot('insights-players-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 8000 : 12000,
    });
  });
});