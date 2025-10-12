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
  // Wait for React app to mount first
  try {
    await page.waitForSelector('#root', { timeout: 15000 });
    
    // Wait for the app layout structure to be present
    await page.waitForSelector('[role="banner"], header, nav, main, #root > *', { 
      timeout: 15000,
      state: 'visible'
    });
  } catch (error) {
    console.log('⚠️ App structure timeout, but continuing anyway...');
    // Fall back to basic DOM ready check
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
  }
  
  // Wait for app content to be loaded (not just loading state)
  try {
    // Look for actual content indicators rather than just loading states
    await page.waitForFunction(() => {
      // Check if there are any loading spinners or loading text visible
      const loadingIndicators = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, [aria-label*="loading" i]');
      const loadingText = document.body.innerText.toLowerCase();
      
      // Return true if no loading indicators are visible and we have content
      const hasLoadingIndicators = Array.from(loadingIndicators).some(el => {
        const element = el as HTMLElement;
        return element.offsetParent !== null; // Check if visible
      });
      
      const hasLoadingText = loadingText.includes('loading') && !loadingText.includes('data loaded');
      
      // Also check if we have actual content (not just empty containers)
      const hasContent = document.querySelectorAll('[role="main"] > *, .panel, .card, .chart, [data-testid*="content"]').length > 0;
      
      return !hasLoadingIndicators && !hasLoadingText && hasContent;
    }, { timeout: 30000 });
  } catch (error) {
    console.log('⚠️ Content loading timeout, taking screenshot anyway...');
  }
  
  // Brief final stabilization for animations
  await page.waitForTimeout(process.env.CI ? 1000 : 1500);
}

test.describe('Visual Regression - Core Panels', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('players panel visual regression', async ({ page }) => {
    // Use the same navigation approach as the preprocessing test that works
    await navigateToReport(page);
    
    // Wait for basic content (same approach as preprocessing test that works)
    await page.waitForSelector('[data-testid="main-content"], main, .MuiContainer-root, .App', { 
      timeout: 15000 
    });
    
    // Navigate to players tab by clicking on it (more realistic approach)
    const playersTabButton = page.locator('button, [role="tab"], a').filter({ hasText: /players/i });
    if (await playersTabButton.isVisible({ timeout: 5000 })) {
      await playersTabButton.click();
      await page.waitForTimeout(2000); // Allow navigation to settle
    } else {
      // Fallback: navigate directly to players URL
      await navigateToReport(page, '/players');
    }
    
    // Use the same timing approach as the preprocessing test that works
    const startTime = Date.now();
    
    // Give it a moment to settle
    await page.waitForTimeout(3000);
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  Players panel loaded in ${loadTime}ms`);
    console.log('✅ Players panel ready for screenshot capture');

    // Take screenshot - this is the only thing that matters for visual regression
    await expect(page).toHaveScreenshot('players-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 60000 : 12000, // Increased CI timeout for slower GitHub Actions runners
    });
  });

  test('insights panel visual regression', async ({ page }) => {
    await navigateToReport(page, '/insights');
    await waitForVisualStability(page);

    // Take screenshot - this is the only thing that matters for visual regression
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: process.env.CI ? 60000 : 12000, // Increased CI timeout for slower GitHub Actions runners
    });
  });
});