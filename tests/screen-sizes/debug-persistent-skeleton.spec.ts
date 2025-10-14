import { test } from '@playwright/test';
import { SkeletonDetector, SKELETON_SELECTORS } from '../utils/skeleton-detector';

test.describe('Debug Persistent Skeleton', () => {
  test('identify the persistent skeleton element', async ({ page }) => {
    await page.goto('/reports/FGb7FMWcTRAL3C4kJD2fgw/1');
    await page.waitForLoadState('networkidle');

    // Wait for the page to be stable
    await page.waitForTimeout(5000);

    const detector = new SkeletonDetector(page);
    
    console.log('\n=== INVESTIGATING PERSISTENT SKELETON ===');
    
    // Check our selectors
    const anySkeletonCount = await page.locator(SKELETON_SELECTORS.ANY_SKELETON).count();
    console.log(`Total skeleton elements found: ${anySkeletonCount}`);
    
    if (anySkeletonCount > 0) {
      console.log('\n=== ANALYZING PERSISTENT SKELETON ELEMENTS ===');
      
      const elements = page.locator(SKELETON_SELECTORS.ANY_SKELETON);
      
      for (let i = 0; i < anySkeletonCount; i++) {
        const element = elements.nth(i);
        
        // Get element details
        const tagName = await element.evaluate(el => el.tagName);
        const testId = await element.getAttribute('data-testid');
        const isVisible = await element.isVisible();
        const className = await element.getAttribute('class');
        const textContent = await element.textContent();
        const outerHTML = await element.evaluate(el => el.outerHTML.substring(0, 200) + '...');
        
        // Get parent information
        const parentElement = element.locator('xpath=..');
        const parentTagName = await parentElement.evaluate(el => el.tagName).catch(() => 'N/A');
        const parentTestId = await parentElement.getAttribute('data-testid').catch(() => null);
        const parentClass = await parentElement.getAttribute('class').catch(() => 'N/A');
        
        console.log(`\nElement [${i}]:`);
        console.log(`  Tag: ${tagName}`);
        console.log(`  Data-testid: ${testId}`);
        console.log(`  Visible: ${isVisible}`);
        console.log(`  Classes: ${className}`);
        console.log(`  Text content: "${textContent}"`);
        console.log(`  HTML preview: ${outerHTML}`);
        console.log(`  Parent tag: ${parentTagName}`);
        console.log(`  Parent testid: ${parentTestId}`);
        console.log(`  Parent classes: ${parentClass}`);
        
        // Check if it matches specific patterns
        if (testId) {
          console.log(`  Matches testid pattern: ${testId}`);
          if (testId.includes('skeleton')) {
            console.log(`  🔍 This is a skeleton component: ${testId}`);
          }
          if (testId.includes('loading')) {
            console.log(`  🔍 This is a loading component: ${testId}`);
          }
        }
      }
    }

    // Navigate to players panel specifically
    console.log('\n=== CHECKING PLAYERS PANEL SPECIFICALLY ===');
    await page.click('[data-testid="Players"]');
    await page.waitForTimeout(2000);
    
    const playersSkeletonCount = await page.locator(SKELETON_SELECTORS.ANY_SKELETON).count();
    console.log(`Skeleton elements in players panel: ${playersSkeletonCount}`);
    
    if (playersSkeletonCount > 0) {
      console.log('\n=== PLAYERS PANEL SKELETON DETAILS ===');
      const elements = page.locator(SKELETON_SELECTORS.ANY_SKELETON);
      
      for (let i = 0; i < playersSkeletonCount; i++) {
        const element = elements.nth(i);
        const testId = await element.getAttribute('data-testid');
        const isVisible = await element.isVisible();
        const bounds = await element.boundingBox();
        
        console.log(`  Player skeleton [${i}]: testid="${testId}", visible=${isVisible}, bounds=${JSON.stringify(bounds)}`);
      }
    }

    // Check insights panel too
    console.log('\n=== CHECKING INSIGHTS PANEL SPECIFICALLY ===');
    await page.click('[data-testid="Insights"]');
    await page.waitForTimeout(2000);
    
    const insightsSkeletonCount = await page.locator(SKELETON_SELECTORS.ANY_SKELETON).count();
    console.log(`Skeleton elements in insights panel: ${insightsSkeletonCount}`);
    
    if (insightsSkeletonCount > 0) {
      console.log('\n=== INSIGHTS PANEL SKELETON DETAILS ===');
      const elements = page.locator(SKELETON_SELECTORS.ANY_SKELETON);
      
      for (let i = 0; i < insightsSkeletonCount; i++) {
        const element = elements.nth(i);
        const testId = await element.getAttribute('data-testid');
        const isVisible = await element.isVisible();
        const bounds = await element.boundingBox();
        
        console.log(`  Insights skeleton [${i}]: testid="${testId}", visible=${isVisible}, bounds=${JSON.stringify(bounds)}`);
      }
    }
  });
});