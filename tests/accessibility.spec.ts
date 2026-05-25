import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { setupApiMocking } from './utils/api-mocking';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
  });

  test.describe('Automated axe-core scans', () => {
    const routes = [
      { path: '/', name: 'Landing page' },
      { path: '/calculator', name: 'Calculator' },
      { path: '/text-editor', name: 'Text Editor' },
      { path: '/logs', name: 'Log Analyzer' },
      { path: '/login', name: 'Login' },
      { path: '/nonexistent-page-404', name: '404 page' },
    ];

    for (const route of routes) {
      test(`${route.name} (${route.path}) has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState('domcontentloaded');

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();

        expect(results.violations).toEqual([]);
      });
    }
  });

  test.describe('Landmark structure', () => {
    test('AppLayout pages have exactly one main landmark', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      const mainLandmarks = await page.locator('main').count();
      expect(mainLandmarks).toBe(1);
    });

    test('Landing page has exactly one main landmark', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const mainLandmarks = await page.locator('main').count();
      expect(mainLandmarks).toBe(1);
    });

    test('Page has nav landmark', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const navLandmarks = await page.locator('nav').count();
      expect(navLandmarks).toBeGreaterThanOrEqual(1);
    });

    test('Footer has footer landmark', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      const footerLandmarks = await page.locator('footer').count();
      expect(footerLandmarks).toBe(1);
    });
  });

  test.describe('Skip navigation', () => {
    test('Skip link exists and is visible on focus', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();

      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();
    });

    test('Skip link moves focus to main content', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      const skipLink = page.locator('a[href="#main-content"]');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    });
  });

  test.describe('Keyboard navigation', () => {
    test('Mobile menu opens and closes with keyboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
      await hamburger.focus();
      await page.keyboard.press('Enter');

      const dialog = page.locator('[role="dialog"][aria-label="Navigation menu"]');
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('Focus management', () => {
    test('Page title updates on navigation', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveTitle(/Calculator.*ESO Toolkit/);
    });
  });

  test.describe('Heading hierarchy', () => {
    test('Landing page has exactly one h1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('Calculator page has exactly one h1', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('domcontentloaded');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });
  });

  test.describe('Reduced motion', () => {
    test('Animations are suppressed with prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const animatedElement = page.locator('body');
      const styles = await animatedElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration,
        };
      });

      expect(
        styles.animationDuration === '0s' ||
          styles.animationDuration === '0.01ms' ||
          styles.animationDuration === '0ms',
      ).toBeTruthy();
    });
  });
});
