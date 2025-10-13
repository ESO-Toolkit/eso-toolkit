import { test, expect } from '@playwright/test';
import { setupAuthentication } from './utils';
import { createSkeletonDetector } from '../utils/skeleton-detector';

test.describe('Diagnostic Test - Content Detection Analysis', () => {
  test('analyze what content detection is actually finding', async ({ page }) => {
    console.log('🔬 Starting diagnostic analysis...');
    
    await setupAuthentication(page);
    
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait a moment for page to settle
    await page.waitForTimeout(3000);
    
    console.log('🔍 Analyzing page content...');
    
    // Check what our content detection logic is actually finding
    const contentAnalysis = await page.evaluate(() => {
      // These are the exact selectors from our content detection
      const hasPlayerData = document.querySelector('[data-testid*="player-row"], .player-card, [data-testid="players-table"] tbody tr:not(.skeleton)');
      const hasInsightsData = document.querySelector('[data-testid*="chart"], [data-testid*="insights-"], .chart-container canvas, [data-testid="insights-content"] *:not(.skeleton)');
      const hasTableData = document.querySelector('table tbody tr:not(.skeleton):not([data-testid*="skeleton"]), .data-row, [data-loaded="true"]');
      
      // Check for loading states
      const hasActiveLoading = document.querySelector('[data-testid*="loading"]:not([style*="display: none"]), .loading-spinner:not([style*="display: none"])');
      const hasSkeletons = document.querySelector('[data-testid*="skeleton"]:not([data-permanent]):not([style*="display: none"])');
      
      // Get more details about what's actually on the page
      const allTestIds = Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'));
      const allTables = document.querySelectorAll('table').length;
      const allTableRows = document.querySelectorAll('table tr').length;
      const allDivs = document.querySelectorAll('div').length;
      
      return {
        hasPlayerData: !!hasPlayerData,
        hasInsightsData: !!hasInsightsData,
        hasTableData: !!hasTableData,
        hasActiveLoading: !!hasActiveLoading,
        hasSkeletons: !!hasSkeletons,
        allTestIds: allTestIds.slice(0, 20), // First 20 test ids
        allTables,
        allTableRows,
        allDivs,
        playerDataElement: hasPlayerData ? hasPlayerData.tagName + '.' + hasPlayerData.className : null,
        tableDataElement: hasTableData ? hasTableData.tagName + '.' + hasTableData.className : null,
        insightsDataElement: hasInsightsData ? hasInsightsData.tagName + '.' + hasInsightsData.className : null
      };
    });
    
    console.log('=== CONTENT DETECTION ANALYSIS ===');
    console.log('hasPlayerData:', contentAnalysis.hasPlayerData, contentAnalysis.playerDataElement);
    console.log('hasInsightsData:', contentAnalysis.hasInsightsData, contentAnalysis.insightsDataElement);
    console.log('hasTableData:', contentAnalysis.hasTableData, contentAnalysis.tableDataElement);
    console.log('hasActiveLoading:', contentAnalysis.hasActiveLoading);
    console.log('hasSkeletons:', contentAnalysis.hasSkeletons);
    console.log('Total tables:', contentAnalysis.allTables);
    console.log('Total table rows:', contentAnalysis.allTableRows);
    console.log('Total divs:', contentAnalysis.allDivs);
    console.log('Test IDs found:', contentAnalysis.allTestIds);
    
    // Check skeleton detection separately
    const detector = createSkeletonDetector(page);
    const skeletonCount = await detector.countSkeletons();
    console.log('Skeleton detector count:', skeletonCount);
    
    // Check our verification selectors
    console.log('=== VERIFICATION SELECTOR ANALYSIS ===');
    const reportTitleCount = await page.locator('[data-testid="report-title"], h1, .report-header').count();
    const playerContentCount = await page.locator('table tbody tr, .player-card, [data-testid*="player"]').count();
    const navigationTabsCount = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    
    console.log('Report title elements:', reportTitleCount);
    console.log('Player content elements:', playerContentCount);
    console.log('Navigation tabs:', navigationTabsCount);
    
    // Get actual page title and URL for context
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log('Page title:', pageTitle);
    console.log('Page URL:', pageUrl);
    
    // Take screenshot for manual inspection
    await page.screenshot({ 
      path: 'test-results-screen-sizes/diagnostic-analysis.png',
      fullPage: true 
    });
    
    console.log('📸 Diagnostic screenshot saved');
    console.log('🔬 Analysis complete');
  });
});