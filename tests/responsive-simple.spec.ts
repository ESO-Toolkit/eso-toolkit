import { expect, Page, test } from '@playwright/test';

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

test.describe('Responsive Layout Tests', () => {
  test('should not have horizontal overflow on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await openAnalyzer(page);

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });

  test('should display properly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await openAnalyzer(page);

    // Basic checks that page loads properly on tablet
    await expect(page.locator('body')).toBeVisible();

    // Check that content is not overflowing
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should display properly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await openAnalyzer(page);

    // Basic checks that page loads properly on desktop
    await expect(page.locator('body')).toBeVisible();

    // Check that content is not overflowing
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should handle responsive fight card layout', async ({ page }) => {
    // Test on multiple viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await openAnalyzer(page);

      // Check that page loads without errors on this viewport
      await expect(page.locator('body')).toBeVisible();

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const hasOverflow = bodyWidth > viewportWidth + 1;

      if (hasOverflow) {
        console.error(
          `Horizontal overflow detected on ${viewport.name} viewport: ${bodyWidth}px vs ${viewportWidth}px`,
        );
      }

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

      // Give a brief moment between viewport changes
      await page.waitForTimeout(100);
    }
  });

  test('should load within reasonable time on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await openAnalyzer(page);
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time on mobile (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds (more lenient for development)
  });
});
