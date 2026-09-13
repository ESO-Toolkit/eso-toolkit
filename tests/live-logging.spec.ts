import { expect, test } from '@playwright/test';

import { installLiveLoggingFixtures } from './live-logging-fixtures';

test.describe('Live Logging System', () => {
  test('loads the latest fight from a populated report', async ({ page }) => {
    const fixtures = await installLiveLoggingFixtures(page, {
      reportCode: 'LIVE123',
      scenario: 'active',
    });

    await page.goto('/report/LIVE123/live', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/report\/LIVE123\/live$/);
    await expect(page.getByTestId('report-fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-title')).toContainText('Latest Live Fight');
    expect(fixtures.reportRequests).toContain('LIVE123');
  });

  test('shows the explicit waiting state for a fresh report with no fights', async ({ page }) => {
    const fixtures = await installLiveLoggingFixtures(page, {
      reportCode: 'EMPTY123',
      scenario: 'empty',
    });

    await page.goto('/report/EMPTY123/live', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/report\/EMPTY123\/live$/);
    await expect(page.getByText('Waiting for fights to be uploaded...')).toBeVisible();
    await expect
      .poll(() => fixtures.reportRequests, {
        message: 'the empty report fixture should be fetched',
      })
      .toContain('EMPTY123');
  });

  test('fails fast instead of fulfilling an unknown GraphQL operation', async ({ page }) => {
    const fixtures = await installLiveLoggingFixtures(page, {
      reportCode: 'UNKNOWN123',
      scenario: 'empty',
    });

    await page.goto('/report/UNKNOWN123/live', { waitUntil: 'domcontentloaded' });

    await expect(
      page.evaluate(async () => {
        await fetch('/roster-hub-api/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operationName: 'UnexpectedOperation',
            query: 'query UnexpectedOperation { unknown }',
          }),
        });
      }),
    ).rejects.toThrow();
    expect(fixtures.unknownOperations).toContain('UnexpectedOperation');
  });

  test('renders populated live logging state at a desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installLiveLoggingFixtures(page, { reportCode: 'DESKTOP123', scenario: 'active' });

    await page.goto('/report/DESKTOP123/live', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-title')).toContainText('Latest Live Fight');
  });

  test('renders populated live logging state without horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installLiveLoggingFixtures(page, { reportCode: 'MOBILE123', scenario: 'active' });

    await page.goto('/report/MOBILE123/live', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-title')).toContainText('Latest Live Fight');
    const widths = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  });
});
