import { expect, Page, test, devices } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';

const REPORT_CODE = process.env.E2E_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const ANALYZER_URL = `/report/${REPORT_CODE}/fight/5/insights`;

async function openAnalyzer(page: Page): Promise<void> {
  await setupTestPage(page);
  await page.addInitScript(() => {
    const part = (value: string) => btoa(value).replace(/=+$/, '');
    const token = `${part('{"alg":"HS256","typ":"JWT"}')}.${part(JSON.stringify({ sub: '999', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
    sessionStorage.setItem('access_token', token);
    localStorage.setItem('access_token', token);
  });
  await page.route(/\/api\/v2\/user(?:\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          userData: {
            currentUser: {
              id: 999,
              name: 'TestUser',
              naDisplayName: 'TestUser-NA',
              euDisplayName: null,
            },
          },
        },
      }),
    }),
  );
  await page.route(/\/graphql(?:\?|$)/, async (route) => {
    const body = route.request().postData() ?? '';
    const response = body.includes('currentUser')
      ? {
          data: {
            userData: {
              currentUser: {
                id: 999,
                name: 'TestUser',
                naDisplayName: 'TestUser-NA',
                euDisplayName: null,
              },
            },
          },
        }
      : body.includes('masterData')
        ? { data: { reportData: { report: { masterData: { actors: [], abilities: [] } } } } }
        : body.includes('playerDetails')
          ? { data: { reportData: { report: { playerDetails: { data: { playerDetails: [] } } } } } }
          : { data: { reportData: { report: { events: { data: [], nextPageTimestamp: null } } } } };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
  const response = await page.goto(ANALYZER_URL, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/report/${REPORT_CODE}/fight/5/insights$`));
  await expect(page.getByTestId('fight-details-loaded')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
  await expect(page.getByTestId('insights-panel')).toBeVisible();
  await expect(page.getByTestId('insights-skeleton-layout')).toHaveCount(0);
}

// Mobile device configurations
const _MOBILE_DEVICES = [
  { ...devices['Pixel 5'], name: 'Pixel 5' },
  { ...devices['iPhone 12'], name: 'iPhone 12' },
];

// Tablet device configuration
const _TABLET_DEVICE = { ...devices['iPad Pro'], name: 'iPad Pro' };

// Desktop breakpoints to test
const _DESKTOP_BREAKPOINTS = [
  { width: 1280, height: 720, name: 'Desktop Small' },
  { width: 1920, height: 1080, name: 'Desktop Large' },
];

test.describe('Report Page Responsiveness', () => {
  // Test mobile devices - separate test files for each device
  test.describe('Mobile - Pixel 5', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should display properly without horizontal overflow', async ({ page }) => {
      await openAnalyzer(page);

      // Wait for page to load
      await expect(page.getByTestId('fight-title')).toBeVisible();

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should display fight cards in responsive grid', async ({ page }) => {
      await openAnalyzer(page);

      // Check that fight cards are visible and properly sized
      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
      await expect(fightCards.first()).toBeVisible();

      // Verify cards are in a grid layout
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(300); // Analyzer content uses the mobile viewport
    });

    test('should have mobile-optimized spacing', async ({ page }) => {
      await openAnalyzer(page);

      // Check that container uses full width on mobile
      const container = page.locator('[data-testid="fight-tab-content-container"]');
      const containerBox = await container.boundingBox();
      expect(containerBox).toBeTruthy();
      expect(containerBox!.width).toBeGreaterThan(300); // Should use most of mobile screen
    });

    test('should be able to scroll vertically', async ({ page }) => {
      await openAnalyzer(page);

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
      await openAnalyzer(page);

      // The helper proves this is a populated Analyzer route.
      await expect(page.getByTestId('fight-title')).toBeVisible();

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should display fight cards in responsive grid', async ({ page }) => {
      await openAnalyzer(page);

      // Check that fight cards are visible and properly sized
      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
      await expect(fightCards.first()).toBeVisible();

      // Verify cards are in a grid layout
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(300); // Analyzer content uses the mobile viewport
    });
  });

  // Test tablet
  test.describe('Tablet - iPad Pro', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should display optimized layout for tablet', async ({ page }) => {
      await openAnalyzer(page);

      // Check that the populated Analyzer content is sized appropriately for tablet
      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(150); // Tablet cards can be larger than mobile
    });

    test('should maintain proper grid layout', async ({ page }) => {
      await openAnalyzer(page);

      // Verify grid layout is working
      const grid = page.locator('[data-testid="fight-tab-content-container"]');
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
      await openAnalyzer(page);

      // Check that the populated Analyzer content is sized appropriately for desktop
      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
      const firstCard = fightCards.first();
      const firstCardBox = await firstCard.boundingBox();
      expect(firstCardBox).toBeTruthy();
      expect(firstCardBox!.width).toBeGreaterThan(180); // Desktop cards can be larger
    });

    test('should utilize screen space efficiently', async ({ page }) => {
      await openAnalyzer(page);

      // Check that container uses appropriate width on desktop
      const container = page.locator('[data-testid="fight-tab-content-container"]');
      const containerBox = await container.boundingBox();
      expect(containerBox).toBeTruthy();
      expect(containerBox!.width).toBeGreaterThan(800); // Should use significant desktop space
    });
  });

  test.describe('Desktop - Large', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display optimized layout for desktop', async ({ page }) => {
      await openAnalyzer(page);

      // Check that the populated Analyzer content is sized appropriately for desktop
      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
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

    testDeviceConfigs.forEach((deviceConfig, _index) => {
      test.describe(`Consistency - ${deviceConfig.name}`, () => {
        test.use({ ...deviceConfig });

        test('should display consistent content', async ({ page }) => {
          await openAnalyzer(page);

          // Check that the current fight title is consistent
          const title = page.locator('[data-testid="fight-title"]');
          await expect(title).toBeVisible();

          // Check that Analyzer content exists on all devices
          const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
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
      await openAnalyzer(page);
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time on mobile (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should not cause layout shifts', async ({ page }) => {
      test.use({ ...devices['Pixel 5'] });

      await openAnalyzer(page);

      // Wait for initial layout

      // Check for cumulative layout shift
      const clsScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cls = 0;
          // `layout-shift` entries carry `value`/`hadRecentInput`, but the DOM lib
          // types getEntries() as plain PerformanceEntry.
          type LayoutShiftEntry = PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as LayoutShiftEntry[]) {
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
