import { test, expect, devices } from '@playwright/test';
import { createEsoPage } from './utils/EsoLogAggregatorPage';

// Test configuration constants
const TEST_TIMEOUTS = {
  navigation: 30000,
  dataLoad: 45000,
  waitForSelector: 10000,
  networkIdle: 15000,
  default: 5000,
};

// Real report IDs for testing
const REAL_REPORT_IDS = [
  '3gjVGWB2dxCL8XAw',
  'ABC123DEF',
  'baJFfYC8trPhHMQp',
  // ... other report IDs
];

/**
 * Example of how the main regression test file would look after refactoring
 * This demonstrates the cleaner, more maintainable approach with the page class
 */
test.describe('Nightly Regression - Core Functionality (Refactored Example)', () => {
  test.beforeEach(async ({ page }) => {
    // Add error tracking
    await page.addInitScript(() => {
      (window as any).testErrors = [];
    });
  });

  test.describe('Report Landing Pages', () => {
    REAL_REPORT_IDS.forEach((reportId) => {
      test(`should load report ${reportId} landing page`, async ({ page }, testInfo) => {
        const esoPage = createEsoPage(page);
        
        // Navigate to report using page class
        await esoPage.goToReport(reportId);

        // Wait for page title to update
        await expect(page).toHaveTitle(/ESO Log Insights/, {
          timeout: TEST_TIMEOUTS.dataLoad,
        });

        // Wait for page to be fully loaded
        await esoPage.waitForNavigation();

        // Additional wait for WebKit to ensure JavaScript has fully executed
        if (testInfo.project.name.includes('webkit')) {
          await page.waitForTimeout(3000);
        }

        // Check what actually loaded
        const currentUrl = page.url();
        console.log(`🔍 Current URL: ${currentUrl}`);
        
        // Verify we're on the correct route
        const currentRoute = await esoPage.getCurrentRoute();
        expect(currentRoute).toContain(`#/report/${reportId}`);

        console.log(`✅ Report ${reportId} landing page loaded successfully`);
      });
    });
  });

  test.describe('Fight Navigation and Analysis', () => {
    test('should navigate through fight tabs systematically', async ({ page }) => {
      const esoPage = createEsoPage(page);
      const reportId = REAL_REPORT_IDS[0];
      
      console.log(`📊 Testing fight navigation for report ${reportId}`);

      // Start at the report page
      await esoPage.goToReport(reportId);

      // Get available fights (this would be extracted from the page)
      const fightElements = await page.locator('[data-testid="fight-selector"] option').count();
      if (fightElements > 1) {
        // Get the first fight ID from the page
        const firstFightId = await page.locator('[data-testid="fight-selector"] option').nth(1).getAttribute('value');
        
        if (firstFightId) {
          console.log(`🥊 Testing fight ${firstFightId}`);
          
          // Test different tabs
          const tabs = ['insights', 'players', 'damage-done', 'replay'];
          
          for (const tab of tabs) {
            console.log(`📄 Testing ${tab} tab`);
            
            // Navigate to the specific tab
            await esoPage.goToFightTab(reportId, firstFightId, tab);
            
            // Verify we're on the correct route
            const currentRoute = await esoPage.getCurrentRoute();
            expect(currentRoute).toContain(`#/report/${reportId}/fight/${firstFightId}/${tab}`);
            
            // Wait for tab content to load
            await esoPage.waitForNavigation();
            
            console.log(`✅ ${tab} tab loaded successfully`);
          }
        }
      }
    });

    test('should handle insights tab with performance data', async ({ page }) => {
      const esoPage = createEsoPage(page);
      const reportId = REAL_REPORT_IDS[0];
      
      // Navigate directly to insights tab of first fight
      await esoPage.goToReport(reportId);
      
      // Get first available fight and navigate to insights
      const firstFightId = await page.locator('[data-testid="fight-selector"] option').nth(1).getAttribute('value');
      if (firstFightId) {
        await esoPage.goToFightInsights(reportId, firstFightId);
        
        // Verify insights content is present
        await expect(page.locator('[data-testid="insights-panel"]')).toBeVisible({
          timeout: TEST_TIMEOUTS.dataLoad,
        });
        
        console.log('✅ Fight insights loaded and displayed correctly');
      }
    });

    test('should access live report functionality', async ({ page }) => {
      const esoPage = createEsoPage(page);
      const reportId = REAL_REPORT_IDS[0];
      
      console.log(`📡 Testing live report functionality for ${reportId}`);
      
      // Navigate to live view
      await esoPage.goToReportLive(reportId);
      
      // Verify we're on the live page
      const currentRoute = await esoPage.getCurrentRoute();
      expect(currentRoute).toBe(`#/report/${reportId}/live`);
      
      // Check for live functionality elements
      const liveElements = await page.locator('[data-testid="live-view"]').count();
      if (liveElements > 0) {
        console.log('✅ Live view functionality available');
      } else {
        console.log('ℹ️  Live view not active for this report');
      }
    });
  });

  test.describe('Cross-Browser Navigation Consistency', () => {
    test('should maintain consistent navigation across browser types', async ({ page }, testInfo) => {
      const esoPage = createEsoPage(page);
      const reportId = REAL_REPORT_IDS[0];
      
      console.log(`🌐 Testing navigation consistency in ${testInfo.project.name}`);
      
      // Test a sequence of navigation actions
      const navigationSequence = [
        () => esoPage.goToReport(reportId),
        () => esoPage.goToReportLive(reportId),
        () => esoPage.goToReport(reportId),
      ];
      
      for (let i = 0; i < navigationSequence.length; i++) {
        console.log(`🔄 Navigation step ${i + 1}`);
        await navigationSequence[i]();
        await esoPage.waitForNavigation();
        
        // Verify navigation worked
        const currentUrl = page.url();
        expect(currentUrl).toContain('#/report');
        
        console.log(`✅ Navigation step ${i + 1} successful`);
      }
    });
  });
});