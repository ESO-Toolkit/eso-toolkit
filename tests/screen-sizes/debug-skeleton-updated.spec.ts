import { test } from '@playwright/test';
import { SkeletonDetector, SKELETON_SELECTORS } from '../utils/skeleton-detector';

test.describe('Debug Updated Skeleton Detection', () => {
  test('test updated skeleton detection logic', async ({ page }) => {
    await page.goto('/reports/FGb7FMWcTRAL3C4kJD2fgw/1');
    await page.waitForLoadState('networkidle');

    const detector = new SkeletonDetector(page);
    
    console.log('\n=== UPDATED SKELETON DETECTION ANALYSIS ===');
    
    // Check our updated ANY_SKELETON selector
    const anySkeletonCount = await page.locator(SKELETON_SELECTORS.ANY_SKELETON).count();
    console.log(`Updated ANY_SKELETON selector: ${anySkeletonCount} elements`);
    
    // Check MUI skeletons (old way vs new way)
    const allMuiCount = await page.locator('.MuiSkeleton-root').count();
    const pulsingMuiCount = await page.locator('.MuiSkeleton-root.MuiSkeleton-pulse:visible').count();
    console.log(`All MUI skeletons (.MuiSkeleton-root): ${allMuiCount}`);
    console.log(`Pulsing MUI skeletons (.MuiSkeleton-root.MuiSkeleton-pulse:visible): ${pulsingMuiCount}`);
    
    // Check individual selector types
    console.log('\n=== INDIVIDUAL SELECTOR ANALYSIS ===');
    const testIdSkeletons = await page.locator('[data-testid*="skeleton"]').count();
    const testIdLoading = await page.locator('[data-testid*="loading"]').count();
    
    console.log(`TestID Skeletons ([data-testid*="skeleton"]): ${testIdSkeletons}`);
    console.log(`TestID Loading ([data-testid*="loading"]): ${testIdLoading}`);
    
    // Check specific skeleton selectors
    console.log('\n=== SPECIFIC SKELETON SELECTORS ===');
    for (const [name, selector] of Object.entries(SKELETON_SELECTORS)) {
      if (name === 'ANY_SKELETON') continue;
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`${name}: ${count} elements`);
      }
    }

    // Check loading elements details
    console.log('\n=== LOADING ELEMENTS DETAILS ===');
    const loadingElements = page.locator('[data-testid*="loading"]');
    const loadingCount = await loadingElements.count();
    
    if (loadingCount > 0) {
      console.log(`Found ${loadingCount} loading elements:`);
      const sampleCount = Math.min(loadingCount, 5);
      for (let i = 0; i < sampleCount; i++) {
        const element = loadingElements.nth(i);
        const tagName = await element.evaluate(el => el.tagName);
        const testId = await element.getAttribute('data-testid');
        const isVisible = await element.isVisible();
        
        console.log(`  [${i}]: ${tagName} data-testid="${testId}" visible: ${isVisible}`);
      }
    }

    // Get overall skeleton info using our new logic
    console.log('\n=== UPDATED SKELETON INFO ===');
    const skeletonInfo = await detector.getSkeletonInfo();
    console.log(`Total detected (new logic): ${skeletonInfo.count}`);
    console.log(`Types found: [${skeletonInfo.types.join(', ')}]`);
    console.log(`Has skeletons: ${skeletonInfo.hasSkeletons}`);

    // Test our wait method with shorter timeout to see if it works now
    console.log('\n=== TESTING WAIT FUNCTIONALITY ===');
    try {
      await detector.waitForSkeletonsToDisappear({ timeout: 5000 }); // 5 second timeout
      console.log('✅ waitForSkeletonsToDisappear completed successfully');
    } catch (error) {
      console.log(`❌ waitForSkeletonsToDisappear failed: ${(error as Error).message}`);
    }
  });
});