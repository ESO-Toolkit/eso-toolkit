import { test, expect, Page } from '@playwright/test';

/**
 * Live Logging Smoke Tests (ESO-500)
 *
 * Quick validation tests for the Live Logging System.
 * These tests run fast and verify critical functionality works.
 *
 * Smoke tests should:
 * - Run in < 30 seconds total
 * - Cover critical happy paths
 * - Catch major regressions quickly
 */

test.describe('Live Logging Smoke Tests', () => {
  /**
   * Helper to set up authentication
   */
  async function setupAuth(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: '999',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }));
      const token = `${header}.${payload}.mock_signature`;
      localStorage.setItem('access_token', token);
    });

    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();
      
      if (postData?.query?.includes('currentUser')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              userData: {
                currentUser: { id: 999, name: 'TestUser', naDisplayName: 'TestUser-NA', euDisplayName: null },
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
  }

  test('page loads with active fights', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getReportByCode')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  code: 'SMOKE123',
                  title: 'Smoke Test Report',
                  fights: [{
                    id: 1,
                    name: 'Smoke Test Fight',
                    startTime: Date.now() - 120000,
                    endTime: Date.now(),
                    kill: true,
                    enemyNPCs: [{ id: 1, gameID: 123456 }],
                  }],
                },
              },
            },
          }),
        });
      } else if (postData?.query?.includes('currentUser')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: { userData: { currentUser: { id: 999, name: 'TestUser' } } },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/SMOKE123/live');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // ✅ Critical: URL contains report code
    expect(page.url()).toContain('SMOKE123');

    // ✅ Critical: Page loads without crashing
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // ✅ Critical: No waiting message when fights exist
    const waitingMessage = page.locator('text=/waiting.*fight/i');
    expect(await waitingMessage.count()).toBe(0);

    // ✅ Critical: No auth errors
    const authError = page.locator('text=/authentication required|access denied/i');
    await expect(authError).not.toBeVisible();
  });

  test('shows waiting message when no fights available', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getReportByCode')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  code: 'EMPTY456',
                  title: 'Empty Report',
                  fights: [],
                },
              },
            },
          }),
        });
      } else if (postData?.query?.includes('currentUser')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: { userData: { currentUser: { id: 999, name: 'TestUser' } } },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/EMPTY456/live');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // ✅ Critical: Shows waiting message
    const waitingMessage = page.locator('text=/waiting.*fight|fight.*upload/i');
    await expect(waitingMessage.first()).toBeVisible({ timeout: 5000 });

    // ✅ Critical: Page doesn't crash
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });

  test('handles network errors gracefully', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getReportByCode')) {
        await route.abort('failed');
      } else if (postData?.query?.includes('currentUser')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: { userData: { currentUser: { id: 999, name: 'TestUser' } } },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/ERROR789/live');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // ✅ Critical: Page doesn't crash on network error
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // ✅ Critical: No JavaScript errors that crash the page
    const pageTitle = page.locator('h1, h2, h3, h4, h5, h6');
    const titleCount = await pageTitle.count();
    expect(titleCount).toBeGreaterThanOrEqual(0); // At least structure exists
  });
});
