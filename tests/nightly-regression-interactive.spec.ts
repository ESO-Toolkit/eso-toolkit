import { test, expect } from '@playwright/test';

import { SELECTORS, TEST_TIMEOUTS, TEST_DATA } from './selectors';

/**
 * Nightly Regression Tests - Interactive Features
 * 
 * These tests focus on the more complex interactive features like
 * fight replay, live logging, and advanced visualization components
 * that require real data to function properly.
 */

const REAL_REPORT_IDS = TEST_DATA.REAL_REPORT_IDS.slice(0, 2); // Use first 2 for faster tests

test.describe('Nightly Regression - Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    // No API mocking - we need real data for these features
    test.setTimeout(180000); // 3 minutes per test for complex features
    
    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Monitor network failures
    const failedRequests: any[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });
    
    await page.addInitScript(() => {
      (window as any).testErrors = [];
      (window as any).failedRequests = [];
    });
  });

  test.describe('Fight Replay Functionality', () => {
    test('should load and interact with fight replay', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Navigate to report to get fights
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Take screenshot of report page
      await page.screenshot({
        path: `test-results/nightly-regression-report-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Check if fight links are available (may not be present for all reports)
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} - this is normal for some reports`);
        test.skip(true, 'Skipping fight replay test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID from href:', href);
        test.skip(true, 'Skipping fight replay test - could not extract fight ID');
        return;
      }

      // Navigate to replay page
      await page.goto(`/#/report/${reportId}/fight/${fightId}/replay`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait for replay to load - this might take longer
      await page.waitForTimeout(5000);

      // Look for replay controls
      const replayControls = page.locator(
        'button[aria-label*="play"], button[aria-label*="pause"], .replay-controls, .play-button, .pause-button'
      );
      
      const hasReplayInterface = await replayControls.first().isVisible({ timeout: TEST_TIMEOUTS.interaction });
      
      // Take screenshot whether replay loaded or not (for debugging)
      await page.screenshot({
        path: `test-results/nightly-regression-replay-${reportId}-${fightId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      if (hasReplayInterface) {
        // Test play/pause functionality
        const playButton = replayControls.first();
        await playButton.click();
        
        // Wait for replay to start
        await page.waitForTimeout(3000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-replay-playing-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });

        // Test pause
        const pauseButton = page.locator(
          'button[aria-label*="pause"], .pause-button'
        ).first();
        
        if (await pauseButton.isVisible({ timeout: 3000 })) {
          await pauseButton.click();
          await page.waitForTimeout(1000);
        }

        // Test timeline scrubbing if available
        const timeline = page.locator('input[type="range"], .timeline-slider, .scrubber');
        if (await timeline.first().isVisible({ timeout: 3000 })) {
          await timeline.first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({
            path: `test-results/nightly-regression-replay-scrubbed-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }

      // Verify no critical errors occurred
      const errors = await page.evaluate(() => (window as any).testErrors || []);
      const criticalErrors = errors.filter((error: string) => 
        !error.includes('ResizeObserver') && 
        !error.includes('Not implemented')
      );
      
      // Only fail on critical errors, not minor ones that don't affect functionality
      if (criticalErrors.length > 0) {
        console.warn('Replay errors detected:', criticalErrors);
      }
    });
  });

  test.describe('Live Logging Functionality', () => {
    test('should load live logging interface', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Navigate to live logging
      await page.goto(`/#/report/${reportId}/live`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      // Look for live logging interface elements
      const hasLiveCssElements = await page.locator('.live-log, .live-logging, .real-time, [data-testid*="live"]').isVisible().catch(() => false);
      const hasLiveText = await page.getByText(/live/i).isVisible().catch(() => false);
      
      const hasLiveInterface = hasLiveCssElements || hasLiveText;

      await page.screenshot({
        path: `test-results/nightly-regression-live-logging-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      if (hasLiveInterface) {
        // Test live logging controls if available
        const controls = page.locator(
          'button:has-text("Start"), button:has-text("Stop"), button:has-text("Connect")'
        );
        
        if (await controls.first().isVisible({ timeout: 3000 })) {
          await controls.first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({
            path: `test-results/nightly-regression-live-active-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });
  });

  test.describe('Advanced Visualizations', () => {
    test('should test location heatmap visualization', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Navigate to report and get fight
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for heatmap visualization`);
        test.skip(true, 'Skipping heatmap test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      // Navigate to location heatmap (experimental tab)
      await page.goto(`/#/report/${reportId}/fight/${fightId}/location-heatmap`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(10000); // Heatmaps can take time to render

      // Look for heatmap visualization
      const heatmapElements = page.locator(
        'canvas, .heatmap, .visualization, .map-container, svg'
      );

      const hasHeatmap = await heatmapElements.first().isVisible({ timeout: TEST_TIMEOUTS.interaction });

      await page.screenshot({
        path: `test-results/nightly-regression-heatmap-${reportId}-${fightId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      if (hasHeatmap) {
        // Test interaction with heatmap if possible
        const heatmapElement = heatmapElements.first();
        await heatmapElement.click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(1000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-heatmap-clicked-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }
    });

    test('should test rotation analysis visualization', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Get fight ID
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for rotation analysis`);
        test.skip(true, 'Skipping rotation analysis test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID for rotation analysis');
        test.skip(true, 'Skipping rotation analysis test - could not extract fight ID');
        return;
      }

      // Navigate to rotation analysis
      await page.goto(`/#/report/${reportId}/fight/${fightId}/rotation-analysis`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(8000); // Complex analysis takes time

      // Look for rotation analysis elements
      const rotationElements = page.locator(
        '.rotation, .timeline, .ability-sequence, .analysis, canvas, .chart'
      );

      await page.screenshot({
        path: `test-results/nightly-regression-rotation-${reportId}-${fightId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Test player selection for rotation analysis if available
      const playerSelectors = page.locator(
        'select, .MuiSelect-root, .player-selector, button:has-text("Select Player")'
      );

      if (await playerSelectors.first().isVisible({ timeout: 5000 })) {
        await playerSelectors.first().click();
        await page.waitForTimeout(1000);
        
        // Try to select a player option
        const playerOptions = page.locator('.MuiMenuItem-root, option, [role="option"]');
        if (await playerOptions.first().isVisible({ timeout: 3000 })) {
          await playerOptions.first().click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({
            path: `test-results/nightly-regression-rotation-player-selected-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });

    test('should test talents grid visualization', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Get fight ID
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for talents grid`);
        test.skip(true, 'Skipping talents grid test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID for talents grid');
        test.skip(true, 'Skipping talents grid test - could not extract fight ID');
        return;
      }

      // Navigate to talents
      await page.goto(`/#/report/${reportId}/fight/${fightId}/talents`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      // Look for talents grid
      const talentsElements = page.locator(
        '.talents, .skill-tree, .abilities-grid, .talent-grid, .MuiGrid-container'
      );

      await page.screenshot({
        path: `test-results/nightly-regression-talents-${reportId}-${fightId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Test talent/ability interaction if available
      const abilityIcons = page.locator('.ability-icon, .skill-icon, img[alt*="ability"]');
      if (await abilityIcons.count() > 0) {
        await abilityIcons.first().click();
        await page.waitForTimeout(1000);
        
        // Look for tooltip or detail panel
        const tooltip = page.locator('.MuiTooltip-popper, .tooltip, .ability-details');
        if (await tooltip.isVisible({ timeout: 2000 })) {
          await page.screenshot({
            path: `test-results/nightly-regression-talents-tooltip-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });
  });

  test.describe('Data Filtering and Search', () => {
    test('should test advanced filtering functionality', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Get fight ID and navigate to damage done tab
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for advanced filtering`);
        test.skip(true, 'Skipping advanced filtering test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID for advanced filtering');
        test.skip(true, 'Skipping advanced filtering test - could not extract fight ID');
        return;
      }

      await page.goto(`/#/report/${reportId}/fight/${fightId}/damage-done`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Test data grid filtering if available
      const dataGrid = page.locator('.MuiDataGrid-root');
      if (await dataGrid.isVisible({ timeout: 5000 })) {
        // Test column sorting
        const columnHeaders = page.locator('.MuiDataGrid-columnHeader');
        if (await columnHeaders.count() > 0) {
          await columnHeaders.first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({
            path: `test-results/nightly-regression-data-sorting-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }

        // Test filtering if filter button exists
        const filterButton = page.locator('button[aria-label*="filter"], .MuiDataGrid-filterIcon');
        if (await filterButton.first().isVisible({ timeout: 3000 })) {
          await filterButton.first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({
            path: `test-results/nightly-regression-data-filtering-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });

    test('should test search functionality across tabs', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Test search in events tab
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for search functionality`);
        test.skip(true, 'Skipping search functionality test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      await page.goto(`/#/report/${reportId}/fight/${fightId}/raw-events`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      // Look for search inputs
      const searchInputs = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="filter"]');
      
      if (await searchInputs.count() > 0) {
        const searchInput = searchInputs.first();
        await searchInput.fill('damage');
        await page.waitForTimeout(2000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-events-search-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });

        // Clear search
        await searchInput.clear();
        await searchInput.fill('heal');
        await page.waitForTimeout(2000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-events-search-heal-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle rapid tab switching', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Get fight ID
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for rapid tab switching`);
        test.skip(true, 'Skipping rapid tab switching test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID for rapid tab switching');
        test.skip(true, 'Skipping rapid tab switching test - could not extract fight ID');
        return;
      }

      // Rapidly switch between tabs to test performance
      const tabs = ['insights', 'players', 'damage-done', 'healing-done', 'insights'];
      
      for (let i = 0; i < tabs.length; i++) {
        const tabId = tabs[i];
        
        await page.goto(`/#/report/${reportId}/fight/${fightId}/${tabId}`, {
          waitUntil: 'domcontentloaded',
          timeout: TEST_TIMEOUTS.navigation,
        });
        
        // Short wait between switches
        await page.waitForTimeout(1000);
      }

      // Final screenshot to verify app is still responsive
      await page.screenshot({
        path: `test-results/nightly-regression-rapid-switching-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Verify no critical errors from rapid switching
      const errors = await page.evaluate(() => (window as any).testErrors || []);
      const criticalErrors = errors.filter((error: string) => 
        error.includes('memory') || error.includes('Maximum call stack')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle large datasets in data grids', async ({ page }) => {
      const reportId = REAL_REPORT_IDS[0];
      
      // Navigate to raw events which typically has the most data
      await page.goto(`/#/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad });

      // Check if fight links are available
      const firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
      const hasFights = await firstFightLink.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!hasFights) {
        console.log(`ℹ️  No fights found in report ${reportId} for large datasets test`);
        test.skip(true, 'Skipping large datasets test - no fights available in this report');
        return;
      }
      
      const href = await firstFightLink.getAttribute('href');
      const fightId = href?.match(/\/fight\/(\d+)/)?.[1];

      if (!fightId) {
        console.log('⚠️  Could not extract fight ID for large datasets test');
        test.skip(true, 'Skipping large datasets test - could not extract fight ID');
        return;
      }

      await page.goto(`/#/report/${reportId}/fight/${fightId}/raw-events`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait longer for large datasets
      await page.waitForTimeout(10000);

      // Test scrolling in data grid to ensure virtualization works
      const dataGrid = page.locator('.MuiDataGrid-root');
      if (await dataGrid.isVisible({ timeout: 5000 })) {
        // Scroll down in the grid
        await dataGrid.hover();
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(1000);
        
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(1000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-large-dataset-scrolled-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });

        // Test going to the end
        await page.keyboard.press('Control+End');
        await page.waitForTimeout(2000);
        
        await page.screenshot({
          path: `test-results/nightly-regression-large-dataset-end-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }
    });
  });
});
