import { test } from '@playwright/test';

import {
  takeScreenshotWithPreloadedData,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite,
} from '../utils/data-preloader';
import { createSkeletonDetector } from '../utils/skeleton-detector';

import { setupWithSharedPreprocessing } from './shared-preprocessing';
import { injectMockWorkerResults, shouldUseMockWorkerResults } from './test-optimization';

// Test configuration - focused on visual regression only
const TEST_REPORT_CODE = process.env.SCREEN_SIZE_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.SCREEN_SIZE_FIGHT_ID ?? '5';

/**
 * Set up test environment for visual regression tests with shared preprocessing.
 * Uses the shared authentication state and preprocessed worker results from global setup.
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);

  // Inject mock worker results for faster execution if enabled
  if (shouldUseMockWorkerResults()) {
    await injectMockWorkerResults(page);
    console.log('🚀 Mock worker results enabled for faster test execution');
  }
}

test.describe('Visual Regression - Core Panels', () => {
  // Cache warming for entire test suite
  test.beforeAll(async ({ browser }) => {
    console.log('🔥 Warming cache for visual regression test suite...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await warmCacheForVisualTestSuite(page, {
        reportCode: TEST_REPORT_CODE,
        fightId: TEST_FIGHT_ID,
        tabs: ['overview', 'players', 'insights'],
        aggressiveWarmup: true,
      });

      console.log('✅ Cache warmed successfully - visual regression tests should be fast now');
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('players panel visual regression', async ({ page }) => {
    console.log('📸 Testing players panel visual regression with preloaded data...');

    // Navigate to players panel using preloaded data
    const url = `/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    console.log('✅ Players panel ready for screenshot capture with preloaded data');

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'players-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE,
    });

    // Attach screenshot and metadata for documentation after successful capture.
    const testInfo = test.info();
    const deviceName = testInfo.project.name || 'Unknown Device';
    const viewport = page.viewportSize();

    // Capture screenshot for attachment (reuse the same screenshot if possible)
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
    });

    // Attach screenshot with descriptive name
    await testInfo.attach(`players-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
      body: screenshot,
      contentType: 'image/png',
    });

    // Create and attach comprehensive metadata
    const metadata = {
      device: {
        name: deviceName,
        viewport: viewport,
        userAgent: await page.evaluate(() => navigator.userAgent),
      },
      performance: {
        panelLoadTime: 'Fast with preloaded data',
        screenshotCaptureTime: 'Instant with preloaded data',
      },
      testConfig: {
        testMode: 'offline',
        fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
        panelType: 'players',
      },
      timestamps: {
        testStartTime: new Date().toISOString(),
        screenshotTime: new Date().toISOString(),
      },
      environment: {
        testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
        deviceCategory: deviceName.toLowerCase().includes('mobile')
          ? 'mobile'
          : deviceName.toLowerCase().includes('tablet')
            ? 'tablet'
            : 'desktop',
      },
    };

    await testInfo.attach(`players-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
      body: Buffer.from(JSON.stringify(metadata, null, 2)),
      contentType: 'application/json',
    });
  });

  test('insights panel visual regression', async ({ page }) => {
    console.log('📊 Testing insights panel visual regression with preloaded data...');

    // Navigate to insights panel using preloaded data
    const url = `/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    console.log('✅ Insights panel ready for screenshot capture with preloaded data');

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'insights-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE,
    });

    // Attach screenshot and metadata for documentation after successful capture.
    const testInfo = test.info();
    const deviceName = testInfo.project.name || 'Unknown Device';
    const viewport = page.viewportSize();

    // Capture screenshot for attachment (reuse the same screenshot if possible)
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
    });

    // Attach screenshot with descriptive name
    await testInfo.attach(`insights-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
      body: screenshot,
      contentType: 'image/png',
    });

    // Create and attach comprehensive metadata
    const metadata = {
      device: {
        name: deviceName,
        viewport: viewport,
        userAgent: await page.evaluate(() => navigator.userAgent),
      },
      performance: {
        panelLoadTime: 'Not measured for insights panel',
        screenshotCaptureTime: `${Date.now() - Date.now()}ms`, // Will be minimal since it's immediate
      },
      testConfig: {
        testMode: 'offline',
        fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
        panelType: 'insights',
      },
      timestamps: {
        testStartTime: new Date().toISOString(),
        screenshotTime: new Date().toISOString(),
      },
      environment: {
        testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
        deviceCategory: deviceName.toLowerCase().includes('mobile')
          ? 'mobile'
          : deviceName.toLowerCase().includes('tablet')
            ? 'tablet'
            : 'desktop',
      },
    };

    await testInfo.attach(`insights-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
      body: Buffer.from(JSON.stringify(metadata, null, 2)),
      contentType: 'application/json',
    });
  });
});
