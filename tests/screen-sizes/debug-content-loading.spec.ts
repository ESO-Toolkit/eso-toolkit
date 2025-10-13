import { test } from '@playwright/test';
import { setupAuthentication } from './utils';
import { createSkeletonDetector, waitForLoadingComplete } from '../utils/skeleton-detector';

test.describe('Debug Content Loading Detection', () => {
  test('test new content loading detection vs skeleton detection', async ({ page }) => {
    await setupAuthentication(page);
    
    console.log('🧪 Testing improved content loading detection...');
    
    // Navigate to a page that typically has the persistent skeleton issue
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    const detector = createSkeletonDetector(page);
    
    // Test 1: Check current skeleton count
    console.log('\n=== SKELETON COUNT ANALYSIS ===');
    const initialSkeletonCount = await detector.countSkeletons();
    console.log(`Initial skeleton count: ${initialSkeletonCount}`);
    
    // Test 2: Try new content detection method
    console.log('\n=== TESTING NEW CONTENT DETECTION ===');
    try {
      const startTime = Date.now();
      await detector.waitForContentLoaded({ 
        timeout: 15000, 
        expectPreloaded: false 
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Content detection succeeded in ${duration}ms`);
    } catch (error) {
      console.log(`❌ Content detection failed: ${error}`);
    }
    
    // Test 3: Check skeleton count after content loading
    const finalSkeletonCount = await detector.countSkeletons();
    console.log(`Final skeleton count: ${finalSkeletonCount}`);
    
    // Test 4: Check for actual content presence
    console.log('\n=== CONTENT VERIFICATION ===');
    
    const hasPlayerData = await page.locator('[data-testid*="player-row"], .player-card').count();
    const hasTableData = await page.locator('table tbody tr:not(.skeleton)').count();
    const hasChartData = await page.locator('canvas, [data-testid*="chart"]').count();
    
    console.log(`Player data elements: ${hasPlayerData}`);
    console.log(`Table data rows: ${hasTableData}`);
    console.log(`Chart elements: ${hasChartData}`);
    
    // Test 5: Compare with old method
    console.log('\n=== TESTING OLD SKELETON DETECTION ===');
    try {
      const startTime = Date.now();
      await detector.waitForSkeletonsToDisappear({ 
        timeout: 10000, 
        expectPreloaded: false 
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Skeleton detection succeeded in ${duration}ms`);
    } catch (error) {
      console.log(`❌ Skeleton detection failed: ${error}`);
    }
    
    // Test 6: Test the unified loading complete function
    console.log('\n=== TESTING UNIFIED LOADING COMPLETE ===');
    try {
      const startTime = Date.now();
      await waitForLoadingComplete(page, { timeout: 15000 });
      const duration = Date.now() - startTime;
      console.log(`✅ Unified loading complete succeeded in ${duration}ms`);
    } catch (error) {
      console.log(`❌ Unified loading complete failed: ${error}`);
    }
    
    console.log('\n🎯 Content loading detection test completed');
  });
});