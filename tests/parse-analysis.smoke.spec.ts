import { expect, Page, Route, test } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';

/**
 * Parse Analysis Smoke Tests (ESO-501)
 *
 * Quick validation tests for the Parse Analysis tool.
 * These tests run fast and verify critical functionality works.
 */

test.describe('Parse Analysis Smoke Tests', () => {
  async function fulfillGraphQl(route: Route, response: unknown): Promise<void> {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  }

  async function setupAuth(page: Page): Promise<void> {
    await setupTestPage(page);

    await page.addInitScript(() => {
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
        await fulfillGraphQl(route, {
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
        });
        return;
      }

      await fulfillGraphQl(route, {
        errors: [
          {
            message: `Unexpected private GraphQL request: ${postData?.operationName ?? 'unknown'}`,
          },
        ],
      });
    });
  }

  test('page loads without report ID', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/parse-analysis');

    await expect(page).toHaveURL(/\/parse-analysis\/?$/);
    await expect(page.getByRole('heading', { name: 'Parse Analysis', exact: true })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('textbox', { name: 'ESOLogs.com Report URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze Parse' })).toBeDisabled();
    await expect(page.locator('text=/authentication required|access denied/i')).not.toBeVisible();
  });

  test('shows a clear error for an unsupported report target', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/graphql?query=getReportByCode**', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.query?.includes('getReportByCode')) {
        await fulfillGraphQl(route, {
          data: {
            reportData: {
              report: {
                code: 'UNSUPPORTED123',
                title: 'Unsupported Encounter Report',
                fights: [
                  {
                    id: 1,
                    name: 'Unsupported Encounter',
                    startTime: Date.now() - 120000,
                    endTime: Date.now(),
                    kill: true,
                    enemyNPCs: [{ id: 3, gameID: 1 }],
                  },
                ],
              },
            },
          },
        });
        return;
      }

      await fulfillGraphQl(route, {
        errors: [
          {
            message: `Unexpected public GraphQL request: ${postData?.operationName ?? 'unknown'}`,
          },
        ],
      });
    });

    await page.goto('/parse-analysis/UNSUPPORTED123/1');

    await expect(page).toHaveURL(/\/parse-analysis\/UNSUPPORTED123\/1$/);
    await expect(
      page.getByRole('alert').filter({
        hasText: 'requires fights against a supported trial dummy',
      }),
    ).toContainText('Unsupported Encounter');
    await expect(page.getByRole('status', { name: 'Analyzing combat events' })).toHaveCount(0);
  });

  test('handles invalid URL gracefully', async ({ page }) => {
    await setupAuth(page);
    await page.goto('/parse-analysis');

    const urlInput = page.getByRole('textbox', { name: 'ESOLogs.com Report URL' });
    await urlInput.fill('not-a-real-url');
    await page.getByRole('button', { name: 'Analyze Parse' }).click();

    await expect(
      page.getByRole('alert').filter({
        hasText: 'Invalid ESOLogs report URL. Please provide a valid URL.',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/parse-analysis\/?$/);
  });
});
