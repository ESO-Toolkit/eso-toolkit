import { test, expect } from '@playwright/test';
import { setupAuthentication } from './screen-sizes/utils';
import { createEsoPage } from './utils/EsoLogAggregatorPage';
import { SKELETON_SELECTORS, skeletonHelpers } from './utils/skeleton-detector';

test.describe('Skeleton Detection Examples', () => {
  test('demonstrates skeleton detection on calculator page', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to calculator - expect skeletons during loading
    console.log('Navigating to calculator page...');
    await esoPage.goToCalculator();
    await esoPage.waitForPageLoad({
      expectSkeletons: true,
      timeout: 30000
    });
    
    // Verify no skeletons remain after loading
    await esoPage.skeletons.assertNoSkeletons();
    
    // Verify the page has loaded content
    await expect(page.locator('[data-testid="calculator-ui"]')).toBeVisible();
  });

  test('demonstrates skeleton detection on players panel', async ({ page }) => {
    await setupAuthentication(page);
    const esoPage = createEsoPage(page);
    
    // Navigate to players panel
    console.log('Navigating to players panel...');
    await esoPage.goToFightPlayers('nbKdDtT4NcZyVrvX', '117');
    
    // Check if players skeleton appears first
    const hasPlayersSkeletons = await skeletonHelpers.hasPlayers(page);
    console.log('Players skeleton detected:', hasPlayersSkeletons);
    
    // Wait for players content to load
    if (hasPlayersSkeletons) {
      console.log('Waiting for players skeleton to disappear...');
      await skeletonHelpers.waitForPlayers(page, 45000);
    } else {
      // Fallback: wait for any skeletons to disappear
      console.log('Waiting for any loading to complete...');
      await skeletonHelpers.waitForComplete(page, 45000);
    }
    
    // Verify no skeletons remain
    const finalSkeletonInfo = await skeletonHelpers.getInfo(page);
    console.log('Final skeleton state:', finalSkeletonInfo);
    
    expect(finalSkeletonInfo.hasSkeletons).toBeFalsy();
    
    // Verify content is loaded - should have at least some cards
    const cardCount = await page.locator('.MuiCard-root').count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('demonstrates waiting for loading sequence', async ({ page }) => {
    await setupAuthentication(page);
    const esoPage = createEsoPage(page);
    
    console.log('Testing loading sequence on insights panel...');
    
    // Navigate and expect the full loading sequence
    await esoPage.goToFightInsights('nbKdDtT4NcZyVrvX', '117');
    
    // Wait for the complete loading sequence: skeletons appear -> disappear
    await esoPage.skeletons.waitForLoadingSequence({
      expectSkeletons: true,
      appearTimeout: 10000,
      disappearTimeout: 45000,
      stabilityTimeout: 3000
    });
    
    // Verify final state
    const skeletonInfo = await esoPage.skeletons.getSkeletonInfo();
    expect(skeletonInfo.hasSkeletons).toBeFalsy();
  });

  test('demonstrates specific skeleton type detection', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to calculator which should show calculator skeleton
    await esoPage.goToCalculator();
    
    // Check for specific skeleton types
    const hasCalculatorSkeleton = await esoPage.skeletons.hasSkeletonType(
      SKELETON_SELECTORS.CALCULATOR
    );
    
    if (hasCalculatorSkeleton) {
      console.log('Calculator skeleton detected, waiting for it to disappear...');
      
      await esoPage.skeletons.waitForSkeletonTypeToDisappear(
        SKELETON_SELECTORS.CALCULATOR,
        { timeout: 30000 }
      );
      
      console.log('Calculator skeleton has disappeared');
    }
    
    // Verify no calculator skeletons remain
    const stillHasSkeleton = await esoPage.skeletons.hasSkeletonType(
      SKELETON_SELECTORS.CALCULATOR
    );
    expect(stillHasSkeleton).toBeFalsy();
  });

  test('demonstrates skeleton debugging information', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to a page that typically shows skeletons
    await esoPage.goToLatestReports();
    
    // Get detailed skeleton information for debugging
    const initialInfo = await esoPage.skeletons.getSkeletonInfo();
    console.log('Initial skeleton state:', JSON.stringify(initialInfo, null, 2));
    
    if (initialInfo.hasSkeletons) {
      console.log(`Found ${initialInfo.count} skeletons of types: ${initialInfo.types.join(', ')}`);
      
      // Get list of all visible skeletons for detailed debugging
      const visibleSkeletons = await esoPage.skeletons.getVisibleSkeletons();
      
      for (let i = 0; i < visibleSkeletons.length && i < 3; i++) {
        const skeleton = visibleSkeletons[i];
        const testId = await skeleton.getAttribute('data-testid');
        const tagName = await skeleton.evaluate(el => el.tagName);
        console.log(`Skeleton ${i}: ${tagName} with data-testid="${testId}"`);
      }
    }
    
    // Wait for loading to complete
    if (initialInfo.hasSkeletons) {
      await esoPage.skeletons.waitForSkeletonsToDisappear({ timeout: 30000 });
    }
    
    const finalInfo = await esoPage.skeletons.getSkeletonInfo();
    console.log('Final skeleton state:', JSON.stringify(finalInfo, null, 2));
    
    expect(finalInfo.hasSkeletons).toBeFalsy();
  });

  test('demonstrates handling pages that may not have skeletons', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to a simple page that might not show skeletons
    await esoPage.goToRoute('/');
    await esoPage.waitForPageLoad({
      expectSkeletons: false, // Don't expect skeletons on home page
      timeout: 15000
    });
    
    // Verify the page loaded correctly
    await expect(page).toHaveTitle(/ESO Log Insights/);
    
    // Check if there are any skeletons anyway (shouldn't be)
    const hasSkeletons = await skeletonHelpers.hasAny(page);
    console.log('Home page has skeletons:', hasSkeletons);
    
    // This should pass - home page shouldn't have loading skeletons
    expect(hasSkeletons).toBeFalsy();
  });
});

test.describe('Skeleton Detection Edge Cases', () => {
  test('handles timeout when skeletons never appear', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to home page (likely no skeletons)
    await esoPage.goToRoute('/');
    
    // Try to wait for skeletons with short timeout - should timeout
    let timeoutOccurred = false;
    try {
      await esoPage.skeletons.waitForSkeletons({ timeout: 2000 });
    } catch (error) {
      timeoutOccurred = true;
      console.log('Expected timeout occurred:', String(error));
    }
    
    expect(timeoutOccurred).toBeTruthy();
  });

  test('handles timeout when skeletons never disappear', async ({ page }) => {
    const esoPage = createEsoPage(page);
    
    // Navigate to a page
    await esoPage.goToCalculator();
    
    // If skeletons are present, try waiting with very short timeout
    const hasSkeletons = await esoPage.skeletons.hasSkeletons();
    
    if (hasSkeletons) {
      let timeoutOccurred = false;
      try {
        await esoPage.skeletons.waitForSkeletonsToDisappear({ timeout: 100 }); // Very short
      } catch (error) {
        timeoutOccurred = true;
        console.log('Expected timeout occurred:', String(error));
      }
      
      expect(timeoutOccurred).toBeTruthy();
    } else {
      console.log('No skeletons found, skipping timeout test');
    }
  });
});