import { test } from '@playwright/test';
import { setupAuthentication } from './utils';
import { waitForLoadingComplete } from '../utils/skeleton-detector';

test.describe('Fixed Content Loading Tests', () => {
  test('verify loading detection works without preloading system', async ({ page }) => {
    await setupAuthentication(page);
    
    console.log('🧪 Testing basic loading detection without complex preloading...');
    
    // Navigate to players panel without preloading complexity
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Use our improved loading detection
    console.log('⏳ Waiting for content to load...');
    const startTime = Date.now();
    
    try {
      await waitForLoadingComplete(page, { 
        timeout: 30000,
        expectedPreloaded: false 
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Content loading succeeded in ${duration}ms`);
      
      // Take a screenshot to verify content is actually loaded
      await page.screenshot({ 
        path: 'test-results-screen-sizes/fixed-loading-verification.png',
        fullPage: true 
      });
      console.log('📸 Screenshot taken for verification');
      
    } catch (error) {
      console.log(`❌ Content loading failed: ${error}`);
      
      // Take screenshot of failed state for debugging
      await page.screenshot({ 
        path: 'test-results-screen-sizes/failed-loading-debug.png',
        fullPage: true 
      });
      
      throw error;
    }
  });
  
  test('test insights panel loading detection', async ({ page }) => {
    await setupAuthentication(page);
    
    console.log('🧪 Testing insights panel loading detection...');
    
    // Navigate to insights panel
    console.log('📊 Navigating to insights panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/insights', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Use our improved loading detection
    console.log('⏳ Waiting for insights content to load...');
    const startTime = Date.now();
    
    try {
      await waitForLoadingComplete(page, { 
        timeout: 30000,
        expectedPreloaded: false 
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Insights content loading succeeded in ${duration}ms`);
      
      // Take a screenshot to verify content is actually loaded
      await page.screenshot({ 
        path: 'test-results-screen-sizes/fixed-insights-verification.png',
        fullPage: true 
      });
      console.log('📸 Insights screenshot taken for verification');
      
    } catch (error) {
      console.log(`❌ Insights content loading failed: ${error}`);
      
      // Take screenshot of failed state for debugging
      await page.screenshot({ 
        path: 'test-results-screen-sizes/failed-insights-debug.png',
        fullPage: true 
      });
      
      throw error;
    }
  });
});