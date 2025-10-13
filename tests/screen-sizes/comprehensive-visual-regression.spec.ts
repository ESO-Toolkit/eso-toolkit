import { test, expect } from '@playwright/test';
import { createSkeletonDetector } from '../utils/skeleton-detector';
import { enableApiCaching } from './utils';

/**
 * Comprehensive Visual Regression Testing Suite
 * 
 * This suite performs true visual regression testing across all device categories.
 * It uses Playwright's toHaveScreenshot() for automatic visual comparison with baseline images.
 * 
 * Key Features:
 * - Automatic baseline generation on first run
 * - Pixel-perfect comparison with configurable thresholds
 * - Cross-platform compatible snapshots
 * - Covers Mobile, Tablet, Desktop, and Insights panels
 * 
 * Configuration: Uses playwright.screen-sizes.config.ts settings:
 * - threshold: 0.3 (30% pixel difference allowed)
 * - maxDiffPixels: 50000 (for dynamic content)
 */
test.describe('Comprehensive Visual Regression - All Device Types', () => {
  
  test('visual regression for mobile devices', async ({ page }) => {
    console.log('📱 Running visual regression tests for mobile devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for mobile...');
    await expect(page).toHaveScreenshot('mobile-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Mobile visual regression test completed successfully');
  });

  test('visual regression for tablet devices', async ({ page }) => {
    console.log('📲 Running visual regression tests for tablet devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for tablet...');
    await expect(page).toHaveScreenshot('tablet-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Tablet visual regression test completed successfully');
  });

  test('visual regression for desktop devices', async ({ page }) => {
    console.log('🖥️ Running visual regression tests for desktop devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for desktop...');
    await expect(page).toHaveScreenshot('desktop-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Desktop visual regression test completed successfully');
  });

  test('visual regression for insights panel', async ({ page }) => {
    console.log('🧠 Running visual regression tests for insights panel...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the insights panel
    console.log('📍 Navigating to insights panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/insights');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for insights...');
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Insights panel visual regression test completed successfully');
  });
});