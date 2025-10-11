import { test, expect } from '@playwright/test';
import { setupWithSharedPreprocessing } from './shared-preprocessing';

// Test configuration - focused on visual regression only
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

/**
 * Set up test environment for visual regression tests with shared preprocessing
 * Uses the shared authentication state and preprocessed worker results from global setup
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);
}

/**
 * Navigate to report page - simplified
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  // Use config timeout and domcontentloaded since we have comprehensive preprocessing
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

/**
 * Minimal wait for content - just enough for visual stability
 */
async function waitForVisualStability(page: any) {
  try {
    // Wait for network to settle with increased timeout
    await page.waitForLoadState('networkidle', { timeout: 45000 });
  } catch (error) {
    console.log('⚠️ Network idle timeout, but continuing with visual stability checks...');
    // Continue anyway - the page may still be usable
  }
  
  // Brief stabilization for animations/loading
  await page.waitForTimeout(process.env.CI ? 2000 : 3000);
  
  // Wait for React app to mount and render the main structure
  // This is more reliable than just waiting for body which always exists
  try {
    await page.waitForSelector('#root', { timeout: 15000 });
    
    // Wait for the app layout structure (HeaderBar and Container) to be present
    // This ensures the React app has actually rendered
    await page.waitForSelector('[role="banner"], header, nav, main, #root > *', { 
      timeout: 15000,
      state: 'visible'
    });
  } catch (error) {
    console.log('⚠️ App structure timeout, but continuing anyway...');
    // Fall back to basic DOM ready check if app structure isn't available
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
  }
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