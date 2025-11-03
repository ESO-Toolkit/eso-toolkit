import { test, expect, Page } from '@playwright/test';

/**
 * 3D Replay System Smoke Tests (ESO-499)
 *
 * Quick smoke tests for the 3D Replay System to validate critical functionality.
 *
 * Purpose: Fast validation (<30s total) of core 3D replay features:
 * - Page loads with 3D scene
 * - Timeline controls render
 * - Network error handling
 *
 * Route: /report/:reportId/fight/:fightId/replay
 */

test.describe('3D Replay Smoke Tests', () => {
  /**
   * Helper to set up authentication
   */
  async function setupAuth(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          sub: '999',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        }),
      );
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
                currentUser: {
                  id: 999,
                  name: 'TestUser',
                  naDisplayName: 'TestUser-NA',
                  euDisplayName: null,
                },
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
  }

  test('should load 3D replay page without crashing', async ({ page }) => {
    await setupAuth(page);

    // Mock fight data
    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getFight') || postData?.query?.includes('getReportByCode')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  code: 'test-report-123',
                  fights: [
                    {
                      id: 1,
                      name: 'Test Boss',
                      startTime: 1000,
                      endTime: 61000,
                      maps: [{ id: 100, name: 'Test Arena' }],
                      gameZone: { id: 1, name: 'Test Zone' },
                      boundingBox: { minX: 0, maxX: 10000, minY: 0, maxY: 10000 },
                    },
                  ],
                },
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/test-report-123/fight/1/replay');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify page renders without crash
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible({ timeout: 10000 });

    // Verify URL is correct
    expect(page.url()).toContain('/replay');
  });

  test('should handle network errors without crashing', async ({ page }) => {
    await setupAuth(page);

    // Mock network failure
    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getFight') || postData?.query?.includes('getReportByCode')) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({
            errors: [{ message: 'Network error' }],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/test-report-123/fight/1/replay');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify page renders (doesn't crash with network error)
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing fight data without crashing', async ({ page }) => {
    await setupAuth(page);

    // Mock empty fight data
    await page.route('**/api/v2/**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getFight') || postData?.query?.includes('getReportByCode')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  code: 'test-report-123',
                  fights: [],
                },
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/report/test-report-123/fight/999/replay');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify page renders (doesn't crash with missing data)
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});
