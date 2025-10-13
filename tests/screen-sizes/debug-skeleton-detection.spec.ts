import { test } from '@playwright/test';
import { setupAuthentication } from './utils';
import { createSkeletonDetector, SKELETON_SELECTORS } from '../utils/skeleton-detector';

test.describe('Debug Skeleton Detection', () => {
  test('investigate what skeleton selectors are matching', async ({ page }) => {
    await setupAuthentication(page);
    
    console.log('Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/players', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Wait for initial page load
    await page.waitForTimeout(5000);
    
    const skeletonDetector = createSkeletonDetector(page);
    
    // Check each selector individually
    console.log('=== INDIVIDUAL SELECTOR ANALYSIS ===');
    
    // Check MUI Skeleton components
    const muiSkeletons = await page.locator('.MuiSkeleton-root').count();
    console.log('MUI Skeletons (.MuiSkeleton-root):', muiSkeletons);
    
    // Check data-testid skeleton selectors
    const testIdSkeletons = await page.locator('[data-testid*="skeleton"]').count();
    console.log('TestID Skeletons ([data-testid*="skeleton"]):', testIdSkeletons);
    
    // Check data-testid loading selectors
    const testIdLoading = await page.locator('[data-testid*="loading"]').count();
    console.log('TestID Loading ([data-testid*="loading"]):', testIdLoading);
    
    // Check specific skeleton selectors
    console.log('=== SPECIFIC SKELETON SELECTORS ===');
    for (const [name, selector] of Object.entries(SKELETON_SELECTORS)) {
      if (name === 'ANY_SKELETON') continue;
      
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`${name}: ${count} elements`);
        
        // Get details of first few elements
        const elements = page.locator(selector);
        const elementCount = Math.min(count, 3);
        for (let i = 0; i < elementCount; i++) {
          const element = elements.nth(i);
          const isVisible = await element.isVisible().catch(() => false);
          const tagName = await element.evaluate(el => el.tagName).catch(() => 'unknown');
          const classes = await element.getAttribute('class').catch(() => '');
          console.log(`  [${i}]: ${tagName}, visible: ${isVisible}, classes: ${(classes || '').slice(0, 100)}`);
        }
      }
    }
    
    // Analyze the broad loading selector in detail
    console.log('=== LOADING SELECTOR ANALYSIS ===');
    const loadingElements = page.locator('[data-testid*="loading"]');
    const loadingCount = await loadingElements.count();
    
    console.log(`Total loading elements: ${loadingCount}`);
    
    if (loadingCount > 0) {
      console.log('Sample loading elements:');
      for (let i = 0; i < Math.min(loadingCount, 10); i++) {
        const element = loadingElements.nth(i);
        const testId = await element.getAttribute('data-testid').catch(() => '');
        const isVisible = await element.isVisible().catch(() => false);
        const tagName = await element.evaluate(el => el.tagName).catch(() => 'unknown');
        console.log(`  [${i}]: ${tagName} data-testid="${testId}" visible: ${isVisible}`);
      }
    }
    
    // Get overall skeleton info
    const skeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log('=== OVERALL SKELETON INFO ===');
    console.log('Total detected:', skeletonInfo.count);
    console.log('Types found:', skeletonInfo.types);
  });
});