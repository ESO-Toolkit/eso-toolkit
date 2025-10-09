import { test, expect } from '@playwright/test';
import { setupApiMocking } from '../utils/api-mocking';

/**
 * Visual Regression Tests
 * Comprehensive screenshot comparison tests across all screen sizes
 * These tests create a baseline of how the app should look on different devices
 */

test.describe('Visual Regression - Key Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
  });

  const keyPages = [
    { path: '/', name: 'home' },
    { path: '/report', name: 'report' },
    // Add more key pages as needed
  ];

  for (const { path, name } of keyPages) {
    test(`${name} page visual regression`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Hide any dynamic elements that might cause test flakiness
      await page.addStyleTag({
        content: `
          /* Hide potentially dynamic elements */
          .timestamp, .time, [class*="time"], [id*="time"] {
            visibility: hidden !important;
          }
          
          /* Disable animations for consistent screenshots */
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
          
          /* Hide loading spinners */
          .loading, .spinner, [role="progressbar"] {
            display: none !important;
          }
        `
      });

      // Wait a bit for styles to apply
      await page.waitForTimeout(500);

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`${name}-page-full.png`, {
        fullPage: true,
        animations: 'disabled',
      });

      // Take viewport screenshot (above-the-fold content)
      await expect(page).toHaveScreenshot(`${name}-page-viewport.png`, {
        fullPage: false,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Visual Regression - Component Focus', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('header component visual regression', async ({ page }) => {
    const header = page.locator('header, nav, [role="banner"]').first();
    if (await header.count() > 0) {
      await expect(header).toHaveScreenshot('header-component.png', {
        animations: 'disabled',
      });
    }
  });

  test('main navigation visual regression', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]');
    const count = await nav.count();
    
    for (let i = 0; i < Math.min(count, 2); i++) {
      const navElement = nav.nth(i);
      if (await navElement.isVisible()) {
        await expect(navElement).toHaveScreenshot(`navigation-${i}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  test('footer component visual regression', async ({ page }) => {
    const footer = page.locator('footer, [role="contentinfo"]').first();
    if (await footer.count() > 0) {
      await expect(footer).toHaveScreenshot('footer-component.png', {
        animations: 'disabled',
      });
    }
  });

  test('sidebar component visual regression', async ({ page }) => {
    const sidebar = page.locator('.sidebar, .drawer, [role="complementary"]').first();
    if (await sidebar.count() > 0 && await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('sidebar-component.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('button states visual regression', async ({ page }) => {
    const buttons = page.locator('button').first();
    if (await buttons.count() > 0) {
      // Normal state
      await expect(buttons).toHaveScreenshot('button-normal.png');
      
      // Hover state (for desktop viewports)
      const viewport = page.viewportSize();
      if (viewport && viewport.width >= 1024) {
        await buttons.hover();
        await page.waitForTimeout(200);
        await expect(buttons).toHaveScreenshot('button-hover.png');
      }
      
      // Focus state
      await buttons.focus();
      await page.waitForTimeout(200);
      await expect(buttons).toHaveScreenshot('button-focus.png');
    }
  });

  test('form elements visual regression', async ({ page }) => {
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        // Normal state
        await expect(input).toHaveScreenshot(`form-element-${i}-normal.png`);
        
        // Focus state
        await input.focus();
        await page.waitForTimeout(200);
        await expect(input).toHaveScreenshot(`form-element-${i}-focus.png`);
        
        // With content
        if (await input.getAttribute('type') !== 'file') {
          await input.fill('Sample content');
          await expect(input).toHaveScreenshot(`form-element-${i}-filled.png`);
          await input.clear();
        }
      }
    }
  });

  test('modal dialog visual regression', async ({ page }) => {
    // Look for modal triggers
    const modalTriggers = page.locator('button:has-text("Settings"), button:has-text("Options"), [data-testid*="modal"]');
    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      
      const modal = page.locator('[role="dialog"], .modal').first();
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        await expect(modal).toHaveScreenshot('modal-dialog.png', {
          animations: 'disabled',
        });
        
        // Test modal backdrop
        const backdrop = page.locator('.backdrop, .overlay, [data-testid="backdrop"]').first();
        if (await backdrop.count() > 0) {
          await expect(page).toHaveScreenshot('modal-with-backdrop.png', {
            animations: 'disabled',
          });
        }
      }
    }
  });
});

test.describe('Visual Regression - Data Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
    await page.goto('/report');
    await page.waitForLoadState('networkidle');
    
    // Wait for any charts or data to load
    await page.waitForTimeout(2000);
  });

  test('data tables visual regression', async ({ page }) => {
    const tables = page.locator('table, [role="grid"], .data-table');
    const count = await tables.count();
    
    for (let i = 0; i < Math.min(count, 2); i++) {
      const table = tables.nth(i);
      if (await table.isVisible()) {
        await expect(table).toHaveScreenshot(`data-table-${i}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  test('charts visual regression', async ({ page }) => {
    const charts = page.locator('canvas, svg[class*="chart"], .chart');
    const count = await charts.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const chart = charts.nth(i);
      if (await chart.isVisible()) {
        // Wait for chart to fully render
        await page.waitForTimeout(1000);
        await expect(chart).toHaveScreenshot(`chart-${i}.png`, {
          animations: 'disabled',
        });
      }
    }
  });

  test('loading states visual regression', async ({ page }) => {
    // Capture any visible loading states
    const loadingElements = page.locator('.loading, .spinner, .skeleton, [role="progressbar"]');
    const count = await loadingElements.count();
    
    for (let i = 0; i < Math.min(count, 2); i++) {
      const loader = loadingElements.nth(i);
      if (await loader.isVisible()) {
        await expect(loader).toHaveScreenshot(`loading-state-${i}.png`, {
          animations: 'disabled',
        });
      }
    }
  });
});

test.describe('Visual Regression - Error States', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
  });

  test('404 page visual regression', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/non-existent-page');
    
    if (response?.status() === 404) {
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('404-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('error boundary visual regression', async ({ page }) => {
    // This would need to be implemented based on your error boundary implementation
    // For now, just document the pattern
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for any error states that might be visible
    const errorElements = page.locator('.error, [role="alert"], .error-message');
    const count = await errorElements.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const error = errorElements.nth(i);
        if (await error.isVisible()) {
          await expect(error).toHaveScreenshot(`error-state-${i}.png`);
        }
      }
    }
  });
});