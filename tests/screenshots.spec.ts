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

test.describe('Responsive report route smoke checks', () => {
  test('mobile report route - 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openAnalyzer(page);
    await page.waitForTimeout(2000); // Wait for animations

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('tablet report route - 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openAnalyzer(page);
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('desktop report route - 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openAnalyzer(page);
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('small mobile report route - 320x568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openAnalyzer(page);
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });
});
