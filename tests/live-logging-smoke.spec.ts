import { expect, test } from '@playwright/test';

import { installLiveLoggingFixtures } from './live-logging-fixtures';

test.describe('Live Logging Smoke Tests', () => {
  test('loads a populated live report and selects its latest fight', async ({ page }) => {
    const fixtures = await installLiveLoggingFixtures(page, {
      reportCode: 'SMOKE123',
      scenario: 'active',
    });

    await page.goto('/report/SMOKE123/live', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/report\/SMOKE123\/live$/);
    await expect(page.getByTestId('report-fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-title')).toContainText('Latest Live Fight');
    expect(fixtures.reportRequests).toContain('SMOKE123');
  });

  test('shows the waiting state when a live report has no fights', async ({ page }) => {
    const fixtures = await installLiveLoggingFixtures(page, {
      reportCode: 'EMPTY456',
      scenario: 'empty',
    });

    await page.goto('/report/EMPTY456/live', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/report\/EMPTY456\/live$/);
    await expect(page.getByText('Waiting for fights to be uploaded...')).toBeVisible();
    await expect
      .poll(() => fixtures.reportRequests, {
        message: 'the empty report fixture should be fetched',
      })
      .toContain('EMPTY456');
  });
});
