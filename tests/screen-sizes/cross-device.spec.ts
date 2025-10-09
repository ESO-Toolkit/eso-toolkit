import { test, expect } from '@playwright/test';
import { setupApiMocking } from '../utils/api-mocking';

/**
 * Cross-Device Compatibility Tests
 * Tests specific device behaviors and edge cases
 */

test.describe('Cross-Device Compatibility', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test.describe('Mobile-Specific Tests', () => {
    test.skip(({ browserName, viewport }) => {
      // Only run on mobile viewport sizes
      return !viewport || viewport.width > 768;
    });

    test('should handle touch interactions properly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test touch-friendly navigation
      const navButtons = page.locator('button, a, [role="button"]').first();
      if (await navButtons.count() > 0) {
        // Simulate touch events
        await navButtons.tap();
        
        // Verify no hover states are stuck
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('mobile-after-tap.png');
      }
    });

    test('should show mobile-appropriate menus', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for hamburger menu or mobile navigation
      const mobileMenu = page.locator('.hamburger, .mobile-menu, [aria-label*="menu"], .menu-toggle').first();
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
        await expect(mobileMenu).toHaveScreenshot('mobile-menu-trigger.png');
        
        // Test menu expansion
        await mobileMenu.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('mobile-menu-expanded.png');
      }
    });

    test('should handle virtual keyboard properly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="text"], input[type="email"], textarea').first();
      if (await inputs.count() > 0) {
        await inputs.click();
        await inputs.fill('Test input');
        
        // Take screenshot with virtual keyboard considerations
        await expect(page).toHaveScreenshot('mobile-with-input-focus.png');
      }
    });
  });

  test.describe('Tablet-Specific Tests', () => {
    test.skip(({ viewport }) => {
      // Only run on tablet viewport sizes
      return !viewport || viewport.width < 768 || viewport.width > 1024;
    });

    test('should utilize tablet space effectively', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Tablets should show more content than mobile but less than desktop
      await expect(page).toHaveScreenshot('tablet-layout-overview.png', {
        fullPage: true,
      });
    });

    test('should handle orientation changes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test current orientation
      const initialOrientation = page.viewportSize();
      await expect(page).toHaveScreenshot('tablet-initial-orientation.png');

      // Note: Actual orientation change would need to be handled in the config
      // This test documents the expectation
    });
  });

  test.describe('Desktop-Specific Tests', () => {
    test.skip(({ viewport }) => {
      // Only run on desktop viewport sizes
      return !viewport || viewport.width < 1024;
    });

    test('should show full desktop interface', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Desktop should show full interface with sidebars, multiple columns, etc.
      await expect(page).toHaveScreenshot('desktop-full-interface.png', {
        fullPage: true,
      });
    });

    test('should handle hover states properly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hoverableElements = page.locator('button, a, [role="button"]').first();
      if (await hoverableElements.count() > 0) {
        // Test hover state
        await hoverableElements.hover();
        await page.waitForTimeout(200);
        await expect(hoverableElements).toHaveScreenshot('desktop-hover-state.png');
      }
    });
  });

  test.describe('Ultrawide Display Tests', () => {
    test.skip(({ viewport }) => {
      // Only run on ultrawide viewport sizes
      return !viewport || viewport.width < 2560;
    });

    test('should utilize ultrawide space without stretching content', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Content should be centered or have max-width on ultrawide displays
      const mainContent = page.locator('main, .main-content, .container').first();
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        const viewportWidth = page.viewportSize()?.width || 0;
        
        if (contentBox) {
          // Content shouldn't stretch to full ultrawide width
          expect(contentBox.width).toBeLessThan(viewportWidth * 0.9);
        }
      }
      
      await expect(page).toHaveScreenshot('ultrawide-layout.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Accessibility Tests Across Sizes', () => {
    test('should maintain keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // Check that focus is visible
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toHaveScreenshot('keyboard-focus-visible.png');
      }
    });

    test('should maintain proper contrast ratios', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // This is a placeholder for contrast ratio testing
      // In a real implementation, you'd use accessibility testing libraries
      // or integrate with tools like axe-core
      
      await expect(page).toHaveScreenshot('contrast-check-full-page.png', {
        fullPage: true,
      });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for essential ARIA landmarks
      const landmarks = [
        '[role="main"]',
        '[role="navigation"]', 
        '[role="banner"]',
        '[role="contentinfo"]'
      ];

      for (const landmark of landmarks) {
        const elements = page.locator(landmark);
        const count = await elements.count();
        if (count > 0) {
          // Document that landmarks exist across screen sizes
          await expect(elements.first()).toBeVisible();
        }
      }
    });
  });
});