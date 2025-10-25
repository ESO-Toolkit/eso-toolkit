import { test, expect } from '@playwright/test';
import { createSkeletonDetector } from './utils/skeleton-detector';

/**
 * ✅ CORRECT TEMPLATE: Visual Regression Test with Skeleton Detection
 * 
 * This template demonstrates the proper way to write Playwright visual tests
 * for the ESO Log Aggregator. Copy this pattern for all visual tests.
 * 
 * KEY POINTS:
 * 1. Always import createSkeletonDetector
 * 2. Always wait for skeletons to disappear before screenshots
 * 3. Use generous timeouts (45s) for complex pages
 * 4. Add safety waits for animations to settle
 * 
 * For detailed documentation including anti-patterns to avoid, see:
 * @see ./VISUAL_TEST_PATTERNS.md
 */

test.describe('Visual Regression - Correct Pattern Template', () => {
  // Test 1: Simple page screenshot
  test('should take full page screenshot after skeletons disappear', async ({ page }) => {
    console.log('🔍 Starting visual test with skeleton detection...');
    
    // Step 1: Navigate to page
    await page.goto('/report/98b3845e3c1ed2a6191e-67039068743d5eeb2855/fight/117/players');
    
    // Step 2: Wait for basic page load (title check)
    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    
    // Step 3: CRITICAL - Create skeleton detector and wait for skeletons to disappear
    console.log('⏳ Waiting for loading skeletons to disappear...');
    const skeletonDetector = createSkeletonDetector(page);
    
    // Check initial skeleton state (optional but helpful for debugging)
    const initialSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log(`Initial skeleton count: ${initialSkeletonInfo.count}`);
    
    // Wait for ALL skeletons to disappear
    await skeletonDetector.waitForSkeletonsToDisappear({ 
      timeout: 45000, // Generous timeout for complex data loading
      stabilityTimeout: 1000 // Wait 1s after skeletons disappear for stability
    });
    
    console.log('✅ All skeletons have disappeared - UI is ready');
    
    // Step 4: Safety wait for animations to settle
    await page.waitForTimeout(1000);
    
    // Step 5: Verify no skeletons remain (optional verification)
    const finalSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    if (finalSkeletonInfo.hasSkeletons) {
      console.warn(`⚠️ Warning: ${finalSkeletonInfo.count} skeletons still present`);
    }
    
    // Step 6: NOW it's safe to take the screenshot
    await expect(page).toHaveScreenshot('players-page-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('📸 Screenshot captured successfully');
  });
  
  // Test 2: Component-specific screenshot
  test('should take component screenshot after content loads', async ({ page }) => {
    // Step 1: Navigate
    await page.goto('/report/98b3845e3c1ed2a6191e-67039068743d5eeb2855/fight/117/damage');
    
    // Step 2: Wait for skeletons to disappear
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    
    // Step 3: Wait for specific content to be visible
    const damageTable = page.locator('[data-testid="damage-done-table"]');
    await expect(damageTable).toBeVisible({ timeout: 15000 });
    
    // Step 4: Safety wait
    await page.waitForTimeout(1000);
    
    // Step 5: Screenshot specific component
    await expect(damageTable).toHaveScreenshot('damage-table.png');
  });
  
  // Test 3: Multi-step workflow with navigation
  test('should handle navigation between tabs correctly', async ({ page }) => {
    // Navigate to main report page
    await page.goto('/report/98b3845e3c1ed2a6191e-67039068743d5eeb2855');
    
    const skeletonDetector = createSkeletonDetector(page);
    
    // Step 1: Wait for initial page load
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('report-overview.png');
    
    // Step 2: Navigate to players tab
    await page.click('[data-testid="players-tab"]');
    
    // Step 3: Wait for players data to load
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('players-tab.png');
    
    // Step 4: Navigate to damage tab
    await page.click('[data-testid="damage-tab"]');
    
    // Step 5: Wait for damage data to load
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('damage-tab.png');
  });
  
  // Test 4: Debug pattern when tests fail
  test('should demonstrate debugging when skeletons persist', async ({ page }) => {
    await page.goto('/calculator');
    
    const skeletonDetector = createSkeletonDetector(page);
    
    // Take debug screenshot BEFORE waiting
    await page.screenshot({ path: 'debug-before-wait.png', fullPage: true });
    
    try {
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });
    } catch (error) {
      // If skeletons persist, get detailed debugging info
      console.log('🐛 Debugging skeleton persistence...');
      
      const skeletonInfo = await skeletonDetector.getSkeletonInfo();
      console.log(`Remaining skeleton count: ${skeletonInfo.count}`);
      console.log(`Skeleton types: ${skeletonInfo.types.join(', ')}`);
      
      // Take debug screenshot showing current state
      await page.screenshot({ path: 'debug-skeleton-persist.png', fullPage: true });
      
      // Get details about each remaining skeleton
      const visibleSkeletons = await skeletonDetector.getVisibleSkeletons();
      for (let i = 0; i < Math.min(visibleSkeletons.length, 5); i++) {
        const testId = await visibleSkeletons[i].getAttribute('data-testid');
        console.log(`Skeleton ${i}: ${testId}`);
      }
      
      // Re-throw the error after logging debug info
      throw error;
    }
    
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('calculator-loaded.png');
  });
});