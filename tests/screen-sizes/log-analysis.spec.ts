import { test, expect, Page } from '@playwright/test';
import { setupApiMocking } from '../utils/api-mocking';
import { setupAuthentication } from './utils';

/**
 * Screen Size Validation Tests - Real Fight Report Analysis
 * Tests responsive layout behavior using real ESO combat log data from Kyne's Aegis report
 */

test.describe('Real Fight Report Analysis - Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking with real report data from data-downloads
    await setupApiMocking(page);
    
    // Set up authentication state in localStorage to bypass login requirements
    await setupAuthentication(page);
    
    // Navigate to real Kyne's Aegis report for authentic fight analysis UI
    await page.goto('/report?code=7zj1ma8kD9xn4cTq&fight=1');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Try to wait for network idle but don't fail if timeout (development can be slow)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (error) {
      console.log('Network idle timeout in fight report tests - continuing anyway');
    }
  });

  test('should render fight report interface correctly', async ({ page }) => {
    // Wait for main report interface to load
    await page.waitForSelector('body', { state: 'visible' });
    
    // Look for fight report specific elements
    const reportTitle = page.locator('h1, h2, h3, [data-testid*="report"], [class*="report"], [class*="title"]').first();
    await reportTitle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('Report title not found - continuing with screenshot');
    });
    
    // Take full page screenshot for visual comparison
    await expect(page).toHaveScreenshot('fight-report-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should display fight data tables responsively', async ({ page }) => {
    // Look for damage/healing tables, player panels, or fight data grids
    const fightDataTables = page.locator([
      'table, [role="grid"], [role="table"]', 
      '.data-table, .MuiDataGrid-root',
      '[class*="damage"], [class*="healing"], [class*="player"]',
      '[data-testid*="damage"], [data-testid*="healing"], [data-testid*="fight"]'
    ].join(', '));
    
    const count = await fightDataTables.count();
    
    if (count > 0) {
      const table = fightDataTables.first();
      await expect(table).toBeVisible();
      
      // Take screenshot of the fight data table
      await expect(table).toHaveScreenshot('fight-data-table-responsive.png');
      
      // Check if table has horizontal scroll when needed on smaller screens
      const tableBox = await table.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 0;
      
      if (tableBox && viewportWidth < 768) {
        // On mobile/tablet, tables should handle overflow gracefully
        const hasOverflow = tableBox.width > viewportWidth;
        if (hasOverflow) {
          // Check if table container has overflow handling
          const overflowX = await table.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return styles.overflowX;
          });
          expect(['auto', 'scroll'].includes(overflowX)).toBeTruthy();
        }
      }
    }
  });

  test('should handle fight selection interface responsively', async ({ page }) => {
    // Look for fight selection elements (dropdowns, tabs, navigation)
    const fightSelectors = page.locator([
      'select, [role="combobox"], .MuiSelect-root',
      '[class*="fight"], [class*="boss"], [class*="encounter"]',
      '[data-testid*="fight"], [data-testid*="boss"], [data-testid*="encounter"]',
      'nav, .navigation, [class*="nav"]'
    ].join(', '));
    
    const count = await fightSelectors.count();
    
    if (count > 0) {
      const selector = fightSelectors.first();
      await expect(selector).toBeVisible();
      
      // Take screenshot of fight selection interface
      await expect(selector).toHaveScreenshot('fight-selection-responsive.png');
      
      // On mobile screens, ensure selector is accessible and not cut off
      const viewportWidth = page.viewportSize()?.width || 0;
      if (viewportWidth < 768) {
        const selectorBox = await selector.boundingBox();
        if (selectorBox) {
          // Should be within viewport bounds
          expect(selectorBox.x).toBeGreaterThanOrEqual(0);
          expect(selectorBox.x + selectorBox.width).toBeLessThanOrEqual(viewportWidth + 10);
        }
      }
    }
  });

  test('should display damage/healing charts responsively', async ({ page }) => {
    // Look for combat-related chart containers (damage meters, healing charts, DPS graphs)
    const charts = page.locator([
      'canvas, .chart, .chart-container, [class*="chart"], svg[class*="chart"]',
      '[class*="damage"], [class*="healing"], [class*="dps"]',
      '[data-testid*="chart"], [data-testid*="damage"], [data-testid*="healing"]'
    ].join(', '));
    const count = await charts.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const chart = charts.nth(i);
        if (await chart.isVisible()) {
          await expect(chart).toHaveScreenshot(`chart-${i}-responsive.png`);
          
          // Ensure chart doesn't overflow container
          const chartBox = await chart.boundingBox();
          const viewportWidth = page.viewportSize()?.width || 0;
          
          if (chartBox) {
            expect(chartBox.x + chartBox.width).toBeLessThanOrEqual(viewportWidth + 10);
          }
        }
      }
    }
  });

  test('should display player panels and character information responsively', async ({ page }, testInfo) => {
    // Take a full page screenshot showing the player panels
    const screenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    await testInfo.attach('player-panels-full-page', { 
      body: screenshot, 
      contentType: 'image/png' 
    });
    
    // Look for player information panels, character cards, or roster displays
    const playerPanels = page.locator([
      '[class*="player"], [class*="character"], [class*="roster"]',
      '[data-testid*="player"], [data-testid*="character"]',
      '.card, .panel, [class*="card"], [class*="panel"]',
      '[class*="member"], [class*="participant"]'
    ].join(', '));
    
    const count = await playerPanels.count();
    
    if (count > 0) {
      // Take screenshot of all player panels together
      const allPanelsScreenshot = await playerPanels.first().screenshot();
      await testInfo.attach('player-panels-section', { 
        body: allPanelsScreenshot, 
        contentType: 'image/png' 
      });
      
      // Test first few player panels
      for (let i = 0; i < Math.min(count, 3); i++) {
        const panel = playerPanels.nth(i);
        if (await panel.isVisible()) {
          // Take screenshot of individual player panel
          const panelScreenshot = await panel.screenshot();
          await testInfo.attach(`player-panel-${i}`, { 
            body: panelScreenshot, 
            contentType: 'image/png' 
          });
          
          // Ensure player panels stack properly on mobile
          const viewportWidth = page.viewportSize()?.width || 0;
          if (viewportWidth < 768) {
            const panelBox = await panel.boundingBox();
            if (panelBox) {
              // Panel should not be wider than viewport
              expect(panelBox.width).toBeLessThanOrEqual(viewportWidth + 10);
            }
          }
        }
      }
    }
  });

  test('should display insights panel responsively across all screen sizes', async ({ page }, testInfo) => {
    // Take a full page screenshot showing the insights panel
    const screenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    await testInfo.attach('insights-panel-full-page', { 
      body: screenshot, 
      contentType: 'image/png' 
    });
    
    // Look for insights panel, tabs, or analysis sections
    const insightsPanels = page.locator([
      '[class*="insight"], [class*="analysis"], [class*="summary"]',
      '[data-testid*="insight"], [data-testid*="analysis"]', 
      '.tab, .tabs, [role="tab"], [role="tablist"]',
      '[class*="metric"], [class*="stat"], [class*="performance"]'
    ].join(', '));
    
    const count = await insightsPanels.count();
    
    if (count > 0) {
      // Focus on first insights panel and take a targeted screenshot
      const insights = insightsPanels.first();
      await expect(insights).toBeVisible();
      
      // Take screenshot of just the insights panel element
      const insightsScreenshot = await insights.screenshot();
      await testInfo.attach('insights-panel-element', { 
        body: insightsScreenshot, 
        contentType: 'image/png' 
      });
      
      // Validate insights panel adapts to screen size
      const viewportWidth = page.viewportSize()?.width || 0;
      const insightsBox = await insights.boundingBox();
      
      if (insightsBox) {
        // On mobile, insights should stack vertically and not overflow
        if (viewportWidth < 768) {
          expect(insightsBox.width).toBeLessThanOrEqual(viewportWidth + 20);
        }
        
        // On desktop, insights should use available space effectively
        if (viewportWidth >= 1024) {
          expect(insightsBox.width).toBeGreaterThan(300); // Should have reasonable width
        }
      }
    } else {
      // If no specific insights panel found, still take a screenshot of what's visible
      const bodyScreenshot = await page.locator('body').screenshot();
      await testInfo.attach('page-body-no-insights', { 
        body: bodyScreenshot, 
        contentType: 'image/png' 
      });
    }
    
    // Also capture full page to see insights in context
    await expect(page).toHaveScreenshot('fight-analysis-with-insights.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should handle fight navigation and sidebar layouts properly', async ({ page }) => {
    // Look for sidebar or drawer components
    const sidebars = page.locator('.sidebar, .drawer, [role="complementary"], .MuiDrawer-root, nav[class*="sidebar"]');
    const count = await sidebars.count();
    
    if (count > 0) {
      const sidebar = sidebars.first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot('sidebar-layout.png');
        
        // Check that sidebar doesn't break layout on mobile
        const viewportWidth = page.viewportSize()?.width || 0;
        const sidebarBox = await sidebar.boundingBox();
        
        if (sidebarBox && viewportWidth < 768) { // Mobile breakpoint
          // On mobile, sidebar should either be hidden or not take full width
          expect(sidebarBox.width).toBeLessThan(viewportWidth * 0.9);
        }
      }
    }
  });

  test('should handle modal dialogs responsively', async ({ page }) => {
    // Look for any modal triggers and test modal behavior
    const modalTriggers = page.locator('button:has-text("Settings"), button:has-text("Options"), button:has-text("Filter"), [data-testid*="modal"], [aria-haspopup="dialog"]');
    const count = await modalTriggers.count();
    
    if (count > 0) {
      const trigger = modalTriggers.first();
      if (await trigger.isVisible()) {
        await trigger.click();
        
        // Wait for modal to appear
        const modal = page.locator('[role="dialog"], .modal, .MuiDialog-root').first();
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          await expect(modal).toHaveScreenshot('modal-responsive.png');
          
          // Check modal fits in viewport
          const modalBox = await modal.boundingBox();
          const viewportSize = page.viewportSize();
          
          if (modalBox && viewportSize) {
            expect(modalBox.width).toBeLessThanOrEqual(viewportSize.width);
            expect(modalBox.height).toBeLessThanOrEqual(viewportSize.height);
          }
          
          // Close modal
          const closeButton = page.locator('[aria-label="close"], .close, button:has-text("Cancel")').first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
    }
  });

  test('should handle form elements responsively', async ({ page }) => {
    // Look for form elements
    const forms = page.locator('form, .form, [role="form"]');
    const inputs = page.locator('input, select, textarea');
    
    // Test form layout if forms exist
    const formCount = await forms.count();
    if (formCount > 0) {
      const form = forms.first();
      await expect(form).toHaveScreenshot('form-layout.png');
    }
    
    // Test input field sizing
    const inputCount = await inputs.count();
    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const inputBox = await input.boundingBox();
          const viewportWidth = page.viewportSize()?.width || 0;
          
          if (inputBox) {
            // Input shouldn't overflow container
            expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(viewportWidth);
            
            // Input should have reasonable minimum size
            expect(inputBox.width).toBeGreaterThan(50);
          }
        }
      }
    }
  });

  test('should handle loading states properly', async ({ page }) => {
    // Check for loading indicators and spinners
    const loadingElements = page.locator('.loading, .spinner, .skeleton, [role="progressbar"], .MuiCircularProgress-root');
    const count = await loadingElements.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 2); i++) {
        const loader = loadingElements.nth(i);
        if (await loader.isVisible()) {
          await expect(loader).toHaveScreenshot(`loading-indicator-${i}.png`);
        }
      }
    }
  });
});