import { test, expect } from '@playwright/test';

import { waitForLoadingComplete } from '../utils/skeleton-detector';

import { setupAuthentication } from './utils';

const TEST_REPORT_CODE = process.env.SCREEN_SIZE_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.SCREEN_SIZE_FIGHT_ID ?? '5';

test.describe('Single Screen Size Test - Optimized for CI', () => {
  test('players panel loads correctly with optimized detection', async ({ page }) => {
    console.log('🚀 Starting optimized single test for CI...');

    // Simple auth setup without complex preprocessing
    await setupAuthentication(page);

    console.log('📍 Navigating directly to players panel...');
    const startTime = Date.now();

    // Navigate directly without preloading complexity
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log('⏳ Waiting for content to load with optimized detection...');

    // Use our improved loading detection with CI-friendly timeout
    await waitForLoadingComplete(page, {
      timeout: 20000, // Reasonable timeout for CI
      expectedPreloaded: false,
    });

    const loadTime = Date.now() - startTime;
    console.log(`✅ Content loaded successfully in ${loadTime}ms`);

    // Verify actual content is present
    console.log('🔍 Verifying content presence...');

    // Check for key content elements that indicate successful loading (based on diagnostic findings)
    const hasFightTitle = await page.locator('[data-testid="fight-title"]').count();
    const hasFightDetails = await page.locator('[data-testid="fight-details-loaded"]').count();
    const hasReportFightDetails = await page
      .locator('[data-testid="report-fight-details-loaded"]')
      .count();
    const hasNavigationTabs = await page
      .locator('[role="tab"], .tab, [data-testid*="tab"]')
      .count();

    console.log(`Fight title: ${hasFightTitle}`);
    console.log(`Fight details loaded: ${hasFightDetails}`);
    console.log(`Report fight details: ${hasReportFightDetails}`);
    console.log(`Navigation tabs: ${hasNavigationTabs}`);

    // Assertions to ensure content is actually loaded
    expect(hasFightTitle).toBeGreaterThan(0);
    expect(hasFightDetails + hasReportFightDetails).toBeGreaterThan(0); // At least one should be present
    expect(hasNavigationTabs).toBeGreaterThan(0);

    // Take screenshot for visual verification
    console.log('📸 Taking screenshot for verification...');
    await page.screenshot({
      path: 'test-results-screen-sizes/ci-optimized-test.png',
      fullPage: true,
    });

    console.log('🎯 Test completed successfully - content detection working in CI');
  });
});
