import { test, expect, devices } from '@playwright/test';

// Test configurations for different viewport sizes
const VIEWPORTS = [
  { name: 'Mobile Small', width: 320, height: 568 }, // iPhone 5
  { name: 'Mobile', width: 375, height: 667 }, // iPhone SE
  { name: 'Mobile Large', width: 414, height: 896 }, // iPhone 11
  { name: 'Tablet', width: 768, height: 1024 }, // iPad
  { name: 'Desktop Small', width: 1280, height: 720 },
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Desktop Large', width: 2560, height: 1440 },
];

// Mobile device tests with realistic device specs
const MOBILE_DEVICES = [
  { ...devices['Pixel 5'], name: 'Pixel 5' },
  { ...devices['iPhone 12'], name: 'iPhone 12' },
];

test.describe('Visual Regression Tests', () => {
  const testReportId = '98b3845e3c1ed2a6191e-67039068743d5eeb2855';
  const testUrl = `/r/${testReportId}`;

  // Viewport-based visual tests
  VIEWPORTS.forEach(viewport => {
    test.describe(`Visual Regression - ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('should match visual snapshot', async ({ page }) => {
        await page.goto(testUrl);

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Allow for animations to complete

        // Take a full page screenshot
        await expect(page).toHaveScreenshot(`${viewport.name.toLowerCase().replace(/\s+/g, '-')}-full-page.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });

      test('should match fight cards visual snapshot', async ({ page }) => {
        await page.goto(testUrl);

        // Wait for fight cards to load
        await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });
        await page.waitForTimeout(1000); // Allow for animations

        // Scroll to ensure all fight cards are visible
        await page.evaluate(() => {
          const fightCards = document.querySelectorAll('[data-testid="fight-card"]');
          if (fightCards.length > 0) {
            fightCards[fightCards.length - 1].scrollIntoView();
          }
        });
        await page.waitForTimeout(500);

        // Take screenshot of the fights container
        const fightsContainer = page.locator('[data-testid="fights-container"]');
        if (await fightsContainer.isVisible()) {
          await expect(fightsContainer).toHaveScreenshot(`${viewport.name.toLowerCase().replace(/\s+/g, '-')}-fight-cards.png`, {
            animations: 'disabled',
          });
        }
      });
    });
  });

  // Mobile device-specific visual tests
  test.describe('Visual Regression - Mobile Pixel 5', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should match mobile device screenshot', async ({ page }) => {
      await page.goto(testUrl);

      // Wait for the page to load completely
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Full page screenshot for mobile device
      await expect(page).toHaveScreenshot('mobile-pixel-5-full-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle mobile navigation correctly', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Test mobile navigation if it exists
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('mobile-pixel-5-nav-open.png', {
          animations: 'disabled',
        });
      }
    });
  });

  test.describe('Visual Regression - Mobile iPhone 12', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should match mobile device screenshot', async ({ page }) => {
      await page.goto(testUrl);

      // Wait for the page to load completely
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Full page screenshot for mobile device
      await expect(page).toHaveScreenshot('mobile-iphone-12-full-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle mobile navigation correctly', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Test mobile navigation if it exists
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('mobile-iphone-12-nav-open.png', {
          animations: 'disabled',
        });
      }
    });
  });

  // Component-specific visual tests
  test.describe('Component Visual Regression', () => {
    test.use({ viewport: { width: 1920, height: 1080 } }); // Use desktop for component tests

    test('should match report header visual', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Screenshot of report header
      const reportHeader = page.locator('[data-testid="report-header"]');
      if (await reportHeader.isVisible()) {
        await expect(reportHeader).toHaveScreenshot('report-header.png', {
          animations: 'disabled',
        });
      }
    });

    test('should match fight card hover states', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Test hover state on first fight card
      const firstFightCard = page.locator('[data-testid="fight-card"]').first();
      await firstFightCard.hover();
      await page.waitForTimeout(200); // Allow for hover animations

      await expect(firstFightCard).toHaveScreenshot('fight-card-hover.png', {
        animations: 'disabled',
      });
    });

    test('should match responsive grid layout', async ({ page }) => {
      // Test grid layout at different sizes
      const breakpoints = [
        { width: 375, name: 'mobile-grid' },
        { width: 768, name: 'tablet-grid' },
        { width: 1920, name: 'desktop-grid' },
      ];

      for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: 1080 });
        await page.goto(testUrl);
        await page.waitForSelector('[data-testid="fights-grid"]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        const fightsGrid = page.locator('[data-testid="fights-grid"]');
        if (await fightsGrid.isVisible()) {
          await expect(fightsGrid).toHaveScreenshot(`${breakpoint.name}.png`, {
            animations: 'disabled',
          });
        }
      }
    });
  });

  // Loading state visual tests
  test.describe('Loading State Visual Regression', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should match loading state visual', async ({ page }) => {
      // Intercept API calls to simulate loading state
      await page.route('**/api/**', route => {
        // Delay the response to show loading state
        setTimeout(() => route.continue(), 2000);
      });

      await page.goto(testUrl);

      // Take screenshot during loading (should show loading indicators)
      await expect(page).toHaveScreenshot('loading-state.png', {
        animations: 'disabled',
      });

      // Wait for loading to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    });
  });

  // Error state visual tests
  test.describe('Error State Visual Regression', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should match error state visual', async ({ page }) => {
      // Navigate to invalid report to trigger error state
      await page.goto('/r/INVALID_REPORT_ID');

      // Wait for error state to appear
      await page.waitForTimeout(2000);

      // Take screenshot of error state
      await expect(page).toHaveScreenshot('error-state.png', {
        animations: 'disabled',
      });
    });
  });

  // Responsive behavior visual tests
  test.describe('Responsive Behavior Visual Tests', () => {
    test('should handle viewport resize gracefully', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Start with desktop size
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Final mobile screenshot
      await expect(page).toHaveScreenshot('responsive-resize-final.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  // Font and accessibility visual tests
  test.describe('Accessibility Visual Tests', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should handle font size changes', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Test larger font size
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '120%';
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('large-font-size.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle high contrast mode', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});