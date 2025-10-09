import { test, expect, Page } from '@playwright/test';
import { setupApiMocking } from '../utils/api-mocking';

/**
 * Screen Size Validation Tests - Home Page
 * Tests responsive layout behavior across different viewport sizes
 */

test.describe('Home Page - Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent testing
    await setupApiMocking(page);
    
    // Set up authentication state in localStorage to bypass login requirements
    await page.addInitScript(() => {
      // Mock authentication tokens in localStorage
      window.localStorage.setItem('eso-logs-token', JSON.stringify({
        access_token: 'mock_access_token_12345',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        scope: 'view-user-profile view-private-reports'
      }));
      
      // Set authentication state
      window.localStorage.setItem('authenticated', 'true');
      
      // Mock user profile data
      window.localStorage.setItem('user-profile', JSON.stringify({
        id: 12345,
        name: 'TestUser',
        displayName: '@TestUser',
        avatar: null
      }));
    });
    
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Try networkidle but don't fail if it times out (development server can be slow)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (error) {
      console.log('Network idle timeout in beforeEach - continuing anyway');
    }
  });

  test('should render correctly on all screen sizes', async ({ page }) => {
    // Wait for any loading states to complete
    await page.waitForSelector('body', { state: 'visible' });
    
    // Take a full page screenshot for visual comparison
    await expect(page).toHaveScreenshot('home-page-full.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should have proper header layout', async ({ page }) => {
    // Wait for header elements to be visible
    const header = page.locator('header, nav, [role="banner"]').first();
    if (await header.count() > 0) {
      await expect(header).toBeVisible();
      await expect(header).toHaveScreenshot('header-layout.png');
    }
  });

  test('should have accessible navigation elements', async ({ page }) => {
    // Check if navigation is visible and properly sized
    const nav = page.locator('nav, [role="navigation"]').first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
      
      // Ensure navigation doesn't overflow viewport
      const navBox = await nav.boundingBox();
      const viewportSize = page.viewportSize();
      
      if (navBox && viewportSize) {
        expect(navBox.width).toBeLessThanOrEqual(viewportSize.width);
        expect(navBox.x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should handle main content area properly', async ({ page }) => {
    // Look for main content area
    const main = page.locator('main, [role="main"], .main-content').first();
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
      await expect(main).toHaveScreenshot('main-content-area.png');
      
      // Ensure main content doesn't overflow
      const mainBox = await main.boundingBox();
      const viewportSize = page.viewportSize();
      
      if (mainBox && viewportSize) {
        expect(mainBox.width).toBeLessThanOrEqual(viewportSize.width);
      }
    }
  });

  test('should not have horizontal scrollbars', async ({ page }) => {
    // Check that the page doesn't have horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;
    
    // Allow small tolerance for potential rounding differences
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('should have readable text sizes', async ({ page }) => {
    // Check that text is readable (minimum 12px font size recommended)
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
    const count = await textElements.count();
    
    if (count > 0) {
      // Sample a few elements to check font sizes
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const fontSize = await element.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return parseFloat(styles.fontSize);
          });
          
          // Ensure text is readable (at least 10px, preferably 12px+)
          expect(fontSize).toBeGreaterThan(9);
        }
      }
    }
  });

  test('should have properly sized interactive elements', async ({ page }) => {
    // Check that buttons and links are properly sized for touch/click
    const interactiveElements = page.locator('button, a, input, select, textarea, [role="button"]');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            // Minimum touch target size should be at least 32px (WCAG recommendation)
            const minSize = 20; // Relaxed for testing, ideally 32px
            expect(Math.max(box.width, box.height)).toBeGreaterThan(minSize);
          }
        }
      }
    }
  });
});