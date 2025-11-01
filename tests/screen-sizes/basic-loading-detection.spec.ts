import { test, expect } from '@playwright/test';
import { setupAuthentication } from './utils';
import { createSkeletonDetector } from '../utils/skeleton-detector';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

test.describe('ESO Log Aggregator - Simplified Screen Size Tests', () => {

  test('players panel - simplified loading detection', async ({ page }) => {
    console.log('📸 Testing players panel with simplified approach...');
    
    // Set up authentication
    await setupAuthentication(page);

    // Navigate directly to the page
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content to be fully loaded using our improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 30000 });

    // Verify content is actually loaded
    const fightTitleCount = await page.locator('[data-testid="fight-title"], h1').count();
    const fightDetailsLoadedCount = await page.locator('[data-testid="fight-details-loaded"], [data-testid="report-details-loaded"]').count();
    const reportFightDetailsCount = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabsCount = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    
    console.log(`✅ Content verification - Fight title: ${fightTitleCount}, Fight details loaded: ${fightDetailsLoadedCount}, Report fight details: ${reportFightDetailsCount}, Navigation tabs: ${navigationTabsCount}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results-screen-sizes/players-panel-simplified.png',
      fullPage: true 
    });
    
    console.log('✅ Players panel simplified screenshot completed');
  });

  test('insights panel - simplified loading detection', async ({ page }) => {
    console.log('📊 Testing insights panel with simplified approach...');
    
    // Set up authentication
    await setupAuthentication(page);

    // Navigate directly to the insights page
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content to be fully loaded using our improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 30000 });

    // Verify content is actually loaded
    const fightTitleCount = await page.locator('[data-testid="fight-title"], h1').count();
    const fightDetailsLoadedCount = await page.locator('[data-testid="fight-details-loaded"], [data-testid="report-details-loaded"]').count();
    const reportFightDetailsCount = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabsCount = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    
    console.log(`✅ Content verification - Fight title: ${fightTitleCount}, Fight details loaded: ${fightDetailsLoadedCount}, Report fight details: ${reportFightDetailsCount}, Navigation tabs: ${navigationTabsCount}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results-screen-sizes/insights-panel-simplified.png',
      fullPage: true 
    });
    
    console.log('✅ Insights panel simplified screenshot completed');
  });
});
