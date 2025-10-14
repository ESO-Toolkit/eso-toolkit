import { test, expect } from '@playwright/test';
import { setupAuthentication } from './screen-sizes/utils';
import { createSkeletonDetector } from './utils/skeleton-detector';

test.describe('HTML Content Analysis', () => {
  test('capture HTML snapshots to debug loading state', async ({ page }) => {
    console.log('Setting up authentication for real API testing...');
    await setupAuthentication(page);
    
    console.log('Navigating to players tab...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/players', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Wait for page title to update
    await expect(page).toHaveTitle(/ESO Log Insights/, { timeout: 45000 });
    
    console.log('=== INITIAL PAGE STATE ===');
    console.log('Current URL:', page.url());
    
    // Take immediate screenshot and HTML
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });
    
    const initialHTML = await page.content();
    console.log('Initial page HTML length:', initialHTML.length);
    
    // Check for loading indicators using skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    const skeletonInfo = await skeletonDetector.getSkeletonInfo();
    
    console.log('=== SKELETON DETECTION ===');
    console.log('Has skeletons:', skeletonInfo.hasSkeletons);
    console.log('Skeleton count:', skeletonInfo.count);
    console.log('Skeleton types:', skeletonInfo.types);
    
    if (skeletonInfo.hasSkeletons) {
      console.log('=== VISIBLE SKELETONS ===');
      const visibleSkeletons = await skeletonDetector.getVisibleSkeletons();
      for (let i = 0; i < visibleSkeletons.length && i < 5; i++) {
        const skeleton = visibleSkeletons[i];
        const testId = await skeleton.getAttribute('data-testid').catch(() => null);
        const classes = await skeleton.getAttribute('class').catch(() => '');
        console.log(`Skeleton ${i}: testid="${testId}", classes="${(classes || '').slice(0, 50)}..."`);
      }
    }
    
    // Wait for network idle and additional time for React rendering
    console.log('=== WAITING FOR DATA LOADING ===');
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      console.log('✓ Network idle achieved');
    } catch (error) {
      console.log('⚠ Network idle timeout');
    }
    
    // Wait for skeletons to disappear using our detector
    console.log('=== WAITING FOR SKELETONS TO DISAPPEAR ===');
    try {
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30000 });
      console.log('✓ All skeletons have disappeared');
    } catch (error) {
      console.log('⚠ Skeletons still present after timeout');
    }
    
    // Check final loading state
    console.log('=== POST-WAIT STATE ===');
    const finalSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log('Final skeleton count:', finalSkeletonInfo.count);
    console.log('Final skeleton types:', finalSkeletonInfo.types);
    
    // Look for actual player content
    const playerSelectors = [
      '[data-testid^="player-card-"]',
      '[data-testid="players-panel-loaded"]', 
      '[data-testid="players-panel-view"]',
      '.MuiCard-root',
      '[class*="player"]'
    ];
    
    console.log('=== PLAYER CONTENT SEARCH ===');
    for (const selector of playerSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      console.log(`${selector}: ${count} elements`);
      
      if (count > 0) {
        const firstElement = elements.first();
        const isVisible = await firstElement.isVisible().catch(() => false);
        const textContent = await firstElement.textContent().catch(() => '') || '';
        console.log(`  First element visible: ${isVisible}`);
        console.log(`  Text content: ${textContent.substring(0, 150)}${textContent.length > 150 ? '...' : ''}`);
        
        // Check if it contains skeleton classes
        const elementHTML = await firstElement.evaluate(el => el.outerHTML.substring(0, 300));
        const hasSkeleton = elementHTML.includes('Skeleton');
        console.log(`  Contains skeleton: ${hasSkeleton}`);
      }
    }
    
    // Get current tab information
    console.log('=== TAB INFORMATION ===');
    const tabs = page.locator('[role="tab"], .MuiTab-root');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} tabs`);
    
    if (tabCount > 0) {
      for (let i = 0; i < Math.min(tabCount, 6); i++) {
        const tab = tabs.nth(i);
        const tabText = await tab.textContent().catch(() => 'N/A');
        const isSelected = await tab.getAttribute('aria-selected').catch(() => null);
        const classes = await tab.getAttribute('class').catch(() => '') || '';
        console.log(`  Tab ${i}: "${tabText?.trim()}" (selected: ${isSelected}) classes: ${classes.substring(0, 50)}...`);
      }
    }
    
    // Get page structure
    console.log('=== PAGE STRUCTURE ===');
    const mainContent = await page.locator('main, [role="main"], #root > *').first().innerHTML().catch(() => '');
    console.log('Main content length:', mainContent.length);
    
    // Look for error messages
    const errorSelectors = [
      '.error', '.alert', '[class*="error"]', '[class*="alert"]',
      '[role="alert"]', '.MuiAlert-root'
    ];
    
    for (const selector of errorSelectors) {
      const errors = page.locator(selector);
      const errorCount = await errors.count();
      if (errorCount > 0) {
        console.log(`Found ${errorCount} error elements with selector: ${selector}`);
        for (let i = 0; i < Math.min(errorCount, 3); i++) {
          const errorText = await errors.nth(i).textContent().catch(() => '');
          console.log(`  Error ${i}: ${errorText}`);
        }
      }
    }
    
    // Take final screenshots
    await page.screenshot({ path: 'debug-final.png', fullPage: true });
    
    // Save HTML snapshots
    const finalHTML = await page.content();
    console.log('Final HTML length:', finalHTML.length);
    
    // Write HTML to files for inspection
    const fs = require('fs');
    fs.writeFileSync('debug-initial.html', initialHTML);
    fs.writeFileSync('debug-final.html', finalHTML);
    
    console.log('✓ Debug files saved:');
    console.log('  - debug-initial.png/html (page load)');
    console.log('  - debug-final.png/html (after waiting)');
    
    // Try to determine what state we're in
    if (finalSkeletonInfo.count > 0) {
      console.log('🔄 DIAGNOSIS: Still showing loading skeletons - data not loaded');
      console.log('   Remaining skeleton types:', finalSkeletonInfo.types);
    } else {
      const cardCount = await page.locator('.MuiCard-root').count();
      if (cardCount > 0) {
        console.log('✅ DIAGNOSIS: Cards present, skeletons gone - content loaded');
      } else {
        console.log('❌ DIAGNOSIS: No skeletons, no cards - possible error or empty state');
      }
    }
  });
});