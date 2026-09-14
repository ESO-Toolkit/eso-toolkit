import { expect, test, type Page } from '@playwright/test';

import { openPopulatedAnalyzer } from '../utils/analyzer-route-fixture';

const playerDetailsFixture = {
  id: 1,
  name: 'SamplePlayer',
  guid: 1,
  type: 'Dragonknight',
  server: 'NA',
  displayName: '@SamplePlayer',
  anonymous: false,
  icon: 'https://assets.rpglogs.com/img/eso/classes/dragonknight.png',
  specs: [],
  potionUse: 0,
  healthstoneUse: 0,
  combatantInfo: { stats: [], talents: [], gear: [] },
};

async function addPlayerDetailsFixture(page: Page): Promise<void> {
  await page.route(/\/graphql\?query=/i, async (route) => {
    const requestUrl = new URL(route.request().url());
    const requestText = `${route.request().postData() ?? ''} ${requestUrl.search}`;
    if (!requestText.includes('playerDetails')) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          reportData: {
            report: {
              playerDetails: {
                data: { playerDetails: { dps: [playerDetailsFixture], healers: [], tanks: [] } },
              },
            },
          },
        },
      }),
    });
  });
}

async function openPopulatedAnalyzerWithPlayers(page: Page): Promise<string[]> {
  const unexpectedOperations = await openPopulatedAnalyzer(page);
  await addPlayerDetailsFixture(page);
  await page.goto('/report/AnalyzerMatrixFixture01/fight/5/insights', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
  await expect(page.getByTestId('insights-panel')).toBeVisible();
  return unexpectedOperations;
}

async function assertNoVisibleSkeletons(page: Page): Promise<void> {
  await expect(page.locator('[data-testid*="skeleton" i]:visible')).toHaveCount(0);
}

async function attachPanelScreenshot(page: Page, panel: 'players' | 'insights'): Promise<void> {
  const testInfo = test.info();
  const deviceName = testInfo.project.name || 'Unknown Device';
  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  const safeDeviceName = deviceName.replace(/\s+/g, '-');

  await testInfo.attach(`${panel}-panel-${safeDeviceName}.png`, {
    body: screenshot,
    contentType: 'image/png',
  });

  await testInfo.attach(`${panel}-metadata-${safeDeviceName}.json`, {
    body: Buffer.from(
      JSON.stringify(
        {
          device: {
            name: deviceName,
            viewport: page.viewportSize(),
            userAgent: await page.evaluate(() => navigator.userAgent),
          },
          panel,
          testMode: 'deterministic-analyzer-fixture',
          capturedAfterPopulatedStateAssertions: true,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
}

test.describe('Visual Regression - Core Panels', () => {
  test('players panel visual regression', async ({ page }) => {
    const unexpectedOperations = await openPopulatedAnalyzerWithPlayers(page);
    expect(unexpectedOperations).toEqual([]);

    // The fixture opens Insights first to prove the report route is populated, then exercises the
    // lazy Players panel using the same deterministic GraphQL responses.
    const playersTab = page.getByRole('tab', { name: 'Players', exact: true });
    await expect(playersTab).toBeVisible();
    await playersTab.click();
    await expect(playersTab).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByTestId('players-panel-view').getByTestId('players-panel-loaded'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SamplePlayer', exact: true })).toBeVisible();
    await assertNoVisibleSkeletons(page);

    await attachPanelScreenshot(page, 'players');
  });

  test('insights panel visual regression', async ({ page }) => {
    const unexpectedOperations = await openPopulatedAnalyzer(page);
    expect(unexpectedOperations).toEqual([]);

    await expect(page.getByTestId('insights-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
    await expect(page.getByText('Training Dummy', { exact: true })).toBeVisible();
    await expect(page.getByText('Duration: 1m 0.0s', { exact: true })).toBeVisible();
    await assertNoVisibleSkeletons(page);

    await attachPanelScreenshot(page, 'insights');
  });
});
