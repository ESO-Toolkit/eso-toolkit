import { test, expect, devices } from '@playwright/test';

// Mobile device configurations
const MOBILE_DEVICES = [
  { ...devices['Pixel 5'], name: 'Pixel 5' },
  { ...devices['iPhone 12'], name: 'iPhone 12' },
];

// Tablet device configuration
const TABLET_DEVICE = { ...devices['iPad Pro'], name: 'iPad Pro' };

// Desktop breakpoints to test
const DESKTOP_BREAKPOINTS = [
  { width: 1280, height: 720, name: 'Desktop Small' },
  { width: 1920, height: 1080, name: 'Desktop Large' },
];

test.describe('Report Page Responsiveness', () => {
  const testReportId = '98b3845e3c1ed2a6191e-67039068743d5eeb2855';
  const testUrl = `/r/${testReportId}`;

  // Test mobile devices - separate test files for each device
  test.describe('Mobile - Pixel 5', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should display properly without horizontal overflow', async ({ page }) => {
      await page.goto(testUrl);

      // Wait for page to load
      await page.waitForSelector('[data-testid="report-title"]', { timeout: 10000 });

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should display fight cards in responsive grid', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check that fight cards are visible and properly sized
      const fightCards = page.locator('[data-testid="fight-card"]');
      await expect(fightCards.first()).toBeVisible();

      // Verify cards are in a grid layout
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeLessThan(200); // Mobile cards should be smaller
    });

    test('should have mobile-optimized spacing', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fights-container"]', { timeout: 10000 });

      // Check that container uses full width on mobile
      const container = page.locator('[data-testid="fights-container"]');
      const containerBox = await container.boundingBox();
      expect(containerBox).toBeTruthy();
      expect(containerBox!.width).toBeGreaterThan(300); // Should use most of mobile screen
    });

    test('should be able to scroll vertically', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check if page is scrollable (has content beyond viewport)
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      if (documentHeight > viewportHeight) {
        // Test vertical scrolling
        const initialScrollY = await page.evaluate(() => window.scrollY);
        await page.evaluate(() => window.scrollTo(0, 200));
        const newScrollY = await page.evaluate(() => window.scrollY);
        expect(newScrollY).toBeGreaterThan(initialScrollY);
      }
    });
  });

  test.describe('Mobile - iPhone 12', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should display properly without horizontal overflow', async ({ page }) => {
      await page.goto(testUrl);

      // Wait for page to load
      await page.waitForSelector('[data-testid="report-title"]', { timeout: 10000 });

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should display fight cards in responsive grid', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check that fight cards are visible and properly sized
      const fightCards = page.locator('[data-testid="fight-card"]');
      await expect(fightCards.first()).toBeVisible();

      // Verify cards are in a grid layout
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeLessThan(200); // Mobile cards should be smaller
    });
  });

  // Test tablet
  test.describe('Tablet - iPad Pro', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should display optimized layout for tablet', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check that fight cards are sized appropriately for tablet
      const fightCards = page.locator('[data-testid="fight-card"]');
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(150); // Tablet cards can be larger than mobile
    });

    test('should maintain proper grid layout', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fights-grid"]', { timeout: 10000 });

      // Verify grid layout is working
      const grid = page.locator('[data-testid="fights-grid"]');
      await expect(grid).toBeVisible();

      // Check grid gap properties
      const gridGap = await grid.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.gap || style.columnGap;
      });
      expect(gridGap).toBeTruthy();
    });
  });

  // Test desktop breakpoints
  test.describe('Desktop - Small', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should display optimized layout for desktop', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check that fight cards are sized appropriately for desktop
      const fightCards = page.locator('[data-testid="fight-card"]');
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(180); // Desktop cards can be larger
    });

    test('should utilize screen space efficiently', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fights-container"]', { timeout: 10000 });

      // Check that container uses appropriate width on desktop
      const container = page.locator('[data-testid="fights-container"]');
      const containerBox = await container.boundingBox();
      expect(containerBox).toBeTruthy();
      expect(containerBox!.width).toBeGreaterThan(800); // Should use significant desktop space
    });
  });

  test.describe('Desktop - Large', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display optimized layout for desktop', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Check that fight cards are sized appropriately for desktop
      const fightCards = page.locator('[data-testid="fight-card"]');
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(180); // Desktop cards can be larger
    });
  });

  // Cross-device consistency tests
  test.describe('Cross-Device Consistency', () => {
    const testDeviceConfigs = [
      { ...devices['Pixel 5'], name: 'Mobile' },
      { ...devices['iPad Pro'], name: 'Tablet' },
      { viewport: { width: 1920, height: 1080 }, name: 'Desktop' },
    ];

    testDeviceConfigs.forEach((deviceConfig, index) => {
      test.describe(`Consistency - ${deviceConfig.name}`, () => {
        test.use({ ...deviceConfig });

        test('should display consistent content', async ({ page }) => {
          await page.goto(testUrl);
          await page.waitForSelector('[data-testid="report-title"]', { timeout: 10000 });

          // Check that report title is consistent
          const title = page.locator('[data-testid="report-title"]');
          await expect(title).toBeVisible();

          // Check that fight cards exist on all devices
          const fightCards = page.locator('[data-testid="fight-card"]');
          const cardCount = await fightCards.count();
          expect(cardCount).toBeGreaterThan(0);

          // Check that all cards are visible
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            await expect(fightCards.nth(i)).toBeVisible();
          }
        });
      });
    });
  });

  // Performance tests for responsive layout
  test.describe('Responsive Performance', () => {
    test('should load quickly on mobile', async ({ page }) => {
      test.use({ ...devices['Pixel 5'] });

      const startTime = Date.now();
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time on mobile (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should not cause layout shifts', async ({ page }) => {
      test.use({ ...devices['Pixel 5'] });

      await page.goto(testUrl);

      // Wait for initial layout
      await page.waitForLoadState('networkidle');

      // Check for cumulative layout shift
      const clsScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => resolve(cls), 3000);
        });
      });

      // CLS should be minimal (adjust threshold as needed)
      expect(clsScore).toBeLessThan(0.1);
    });
  });
});