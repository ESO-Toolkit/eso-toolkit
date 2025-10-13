import { test, expect } from '@playwright/test';
import { createSkeletonDetector, skeletonHelpers, SKELETON_SELECTORS } from './utils/skeleton-detector';

test.describe('Skeleton Detection Smoke Tests', () => {
  test('can detect and wait for skeletons on calculator page', async ({ page }) => {
    console.log('Navigating to calculator page...');
    
    // Navigate directly to calculator
    await page.goto('/#/calculator');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Check initial skeleton state
    const initialSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log('Initial skeleton info:', JSON.stringify(initialSkeletonInfo, null, 2));
    
    // If skeletons are present, wait for them to disappear
    if (initialSkeletonInfo.hasSkeletons) {
      console.log(`Found ${initialSkeletonInfo.count} skeletons, waiting for them to disappear...`);
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30000 });
      console.log('✓ All skeletons have disappeared');
    } else {
      console.log('No skeletons detected on calculator page');
    }
    
    // Verify final state - should have no skeletons
    const finalSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log('Final skeleton info:', JSON.stringify(finalSkeletonInfo, null, 2));
    
    expect(finalSkeletonInfo.hasSkeletons).toBeFalsy();
    
    // Verify the calculator page loaded
    await expect(page).toHaveTitle(/ESO Log Insights/);
  });

  test('can use skeleton helper functions', async ({ page }) => {
    console.log('Testing skeleton helper functions...');
    
    // Navigate to home page
    await page.goto('/');
    
    // Test basic skeleton detection
    const hasAnySkeletons = await skeletonHelpers.hasAny(page);
    console.log('Home page has skeletons:', hasAnySkeletons);
    
    // Test skeleton counting
    const skeletonCount = await skeletonHelpers.count(page);
    console.log('Skeleton count:', skeletonCount);
    
    // Test skeleton info
    const skeletonInfo = await skeletonHelpers.getInfo(page);
    console.log('Skeleton info:', JSON.stringify(skeletonInfo, null, 2));
    
    // If there are skeletons, wait for them to disappear
    if (hasAnySkeletons) {
      await skeletonHelpers.waitForComplete(page, 30000);
    }
    
    // Verify final state
    const finalHasSkeletons = await skeletonHelpers.hasAny(page);
    expect(finalHasSkeletons).toBeFalsy();
    
    // Verify page loaded
    await expect(page).toHaveTitle(/ESO Log Insights/);
  });

  test('can detect specific skeleton types', async ({ page }) => {
    console.log('Testing specific skeleton type detection...');
    
    // Navigate to calculator which might show calculator-specific skeletons
    await page.goto('/#/calculator');
    
    const skeletonDetector = createSkeletonDetector(page);
    
    // Check for calculator-specific skeleton
    const hasCalculatorSkeleton = await skeletonDetector.hasSkeletonType(
      SKELETON_SELECTORS.CALCULATOR
    );
    
    console.log('Calculator skeleton detected:', hasCalculatorSkeleton);
    
    if (hasCalculatorSkeleton) {
      console.log('Waiting for calculator skeleton to disappear...');
      await skeletonDetector.waitForSkeletonTypeToDisappear(
        SKELETON_SELECTORS.CALCULATOR,
        { timeout: 30000 }
      );
    }
    
    // Verify calculator skeleton is gone
    const stillHasCalculatorSkeleton = await skeletonDetector.hasSkeletonType(
      SKELETON_SELECTORS.CALCULATOR
    );
    expect(stillHasCalculatorSkeleton).toBeFalsy();
    
    console.log('✓ Calculator skeleton test completed');
  });

  test('can handle pages without skeletons', async ({ page }) => {
    console.log('Testing page without skeletons...');
    
    // Navigate to home page (typically no skeletons)
    await page.goto('/');
    
    // Wait a moment for any initial loading
    await page.waitForTimeout(2000);
    
    // Check for skeletons
    const hasSkeletons = await skeletonHelpers.hasAny(page);
    console.log('Home page has skeletons after initial load:', hasSkeletons);
    
    // Even if there were initial skeletons, wait for loading to complete
    if (hasSkeletons) {
      await skeletonHelpers.waitForComplete(page, 15000);
    }
    
    // Final check - should have no skeletons
    const finalHasSkeletons = await skeletonHelpers.hasAny(page);
    expect(finalHasSkeletons).toBeFalsy();
    
    console.log('✓ No skeletons remaining on home page');
  });
});