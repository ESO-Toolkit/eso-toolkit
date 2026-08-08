import { test } from '@playwright/test';

import {
  takeScreenshotWithPreloadedData,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite,
} from '../utils/data-preloader';
import { createSkeletonDetector } from '../utils/skeleton-detector';

import { setupWithSharedPreprocessing } from './shared-preprocessing';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

// Removed unused selectors - not needed for visual regression testing

/**
 * Set up authentication and caching for screen size tests with shared preprocessing
 * Uses the shared authentication state and preprocessed worker results from global setup
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);
}



// Removed validateResponsiveLayout function - not needed for visual regression

test.describe('ESO Log Aggregator - Core Panels Screen Size Validation', () => {
  // Cache warming for entire test suite - run once for all tests
  test.beforeAll(async ({ browser }) => {
    console.log('🔥 Warming cache for core panels test suite...');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await warmCacheForVisualTestSuite(page, {
        reportCode: TEST_REPORT_CODE,
        fightId: TEST_FIGHT_ID,
        tabs: ['overview', 'players', 'insights'],
        aggressiveWarmup: true,
      });
      
      console.log('✅ Cache warmed successfully - all core panel tests should be fast now');
      
    } catch (error) {
      console.warn('⚠️ Cache warming failed:', error);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('should display players panel correctly across all screen sizes', async ({ page }, _testInfo) => {
    console.log('📸 Testing players panel with preloaded data...');
    
    // Navigate using preloaded data (should be instant with cache)
    const url = `/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'players-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE,
    });
    
    console.log('✅ Players panel screenshot completed with preloaded data');
  });

  test('should display insights panel correctly across all screen sizes', async ({ page }, _testInfo) => {
    console.log('📊 Testing insights panel with preloaded data...');
    
    // Navigate to insights tab using preloaded data
    const url = `/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'insights-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE,
    });
    
    console.log('✅ Insights panel screenshot completed with preloaded data');
  });
});
