import { test } from '@playwright/test';

import {
  takeScreenshotWithPreloadedData,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite,
} from '../utils/data-preloader';
import { createSkeletonDetector } from '../utils/skeleton-detector';

import { setupWithSharedPreprocessing } from './shared-preprocessing';

// Test configuration
const TEST_REPORT_CODE = process.env.SCREEN_SIZE_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.SCREEN_SIZE_FIGHT_ID ?? '5';

// Removed unused selectors - not needed for visual regression testing

/**
 * Set up test environment for insights analysis tests with shared preprocessing
 * Uses the shared authentication state and preprocessed worker results from global setup
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);
}

// Removed validateResponsiveLayout function - not needed for visual regression

test.describe('ESO Toolkit Insights Panel - Screen Size Validation', () => {
  // Cache warming for entire test suite
  test.beforeAll(async ({ browser }) => {
    console.log('🔥 Warming cache for insights analysis test suite...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await warmCacheForVisualTestSuite(page, {
        reportCode: TEST_REPORT_CODE,
        fightId: TEST_FIGHT_ID,
        tabs: ['insights'],
        aggressiveWarmup: true,
      });

      console.log('✅ Cache warmed successfully - insights tests should be fast now');
    } catch (error) {
      console.warn('⚠️ Cache warming failed:', error);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('should render insights (players) panel correctly across screen sizes', async ({
    page,
  }, _testInfo) => {
    console.log('📊 Testing insights players panel with preloaded data...');

    // Navigate to insights tab using preloaded data
    const url = `/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'insights-players-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE,
    });

    console.log('✅ Insights players panel screenshot completed with preloaded data');
  });
});
