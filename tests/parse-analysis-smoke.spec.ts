import { test, expect, Page } from '@playwright/test';
import { setupTestPage } from './setup/global-test-setup';

/**
 * Parse Analysis Smoke Tests (ESO-501)
 *
 * Quick validation tests for the Parse Analysis tool.
 * These tests run fast and verify critical functionality works.
 *
 * Smoke tests should:
 * - Run in < 30 seconds total
 * - Cover critical happy paths
 * - Catch major regressions quickly
 */

test.describe('Parse Analysis Smoke Tests', () => {
  /**
   * Helper to set up authentication
   */
  async function setupAuth(page: Page) {
    // Block analytics first
    await setupTestPage(page);
    
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

  test('page loads without report ID', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/parse-analysis');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // ✅ Critical: URL is correct
    expect(page.url()).toContain('/parse-analysis');

    // ✅ Critical: Page title visible
    const pageTitle = page.locator('h4, h5, h6').filter({ hasText: /parse/i });
    await expect(pageTitle.first()).toBeVisible({ timeout: 5000 });

    // ✅ Critical: Input form exists
    const urlInput = page.locator('input');
    expect(await urlInput.count()).toBeGreaterThan(0);

    // ✅ Critical: No auth errors
    const authError = page.locator('text=/authentication required|access denied/i');
    await expect(authError).not.toBeVisible();
  });

  test('page loads with report ID', async ({ page }) => {
    await setupAuth(page);

    // Mock minimal report data
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
                  fights: [
                    {
                      id: 1,
                      name: 'Test Fight',
                      startTime: Date.now() - 120000,
                      endTime: Date.now(),
                      kill: true,
                      enemyNPCs: [{ id: 3, gameID: 131230 }],
                    },
                  ],
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

    await page.goto('/parse-analysis/SMOKE123/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // ✅ Critical: URL contains report ID
    expect(page.url()).toContain('SMOKE123');

    // ✅ Critical: Page loads without crashing
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // ✅ Critical: No JavaScript errors that crash the page
    const pageTitle = page.locator('h4, h5, h6');
    expect(await pageTitle.count()).toBeGreaterThan(0);
  });

  test('handles invalid URL gracefully', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/parse-analysis');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // ✅ Critical: Page doesn't crash on invalid input
    const urlInput = page.locator('input').first();
    await urlInput.fill('not-a-real-url');

    const analyzeButton = page.locator('button').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      await page.waitForTimeout(1000);

      // ✅ Critical: Page doesn't crash
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
    }
  });
});
