import { expect, test, type Page } from '@playwright/test';

const REPORT_CODE = 'LIVEHEALTHFIXTURE';
const REPORT_TITLE = 'Fixture Live Dashboard';
const FIXTURE_CLOCK_START = 1_800_000_000_000;
const DASHBOARD_BASE_URL =
  process.env.LIVE_HEALTH_BASE_URL ?? process.env.FULL_BASE_URL ?? 'http://127.0.0.1:3016';

type FixtureScenario = 'fresh' | 'api-error' | 'recovered';

interface FixtureState {
  current: FixtureScenario;
}

const makeFight = (id: number, endTime: number) => ({
  __typename: 'ReportFight',
  id,
  name: id === 1 ? 'Fixture Dragon Pull' : 'Fixture Dragon Pull Two',
  difficulty: 2,
  startTime: 0,
  endTime,
  kill: true,
  encounterID: 1000 + id,
  originalEncounterID: null,
  lastPhase: null,
  lastPhaseAsAbsoluteIndex: null,
  lastPhaseIsIntermission: null,
  friendlyPlayers: [1],
  enemyPlayers: [],
  bossPercentage: 0,
  boundingBox: null,
  friendlyNPCs: [],
  enemyNPCs: [],
  maps: [],
  phaseTransitions: [],
  gameZone: null,
  dungeonPulls: [],
});

const makeReport = (scenario: FixtureScenario) => ({
  __typename: 'Report',
  code: REPORT_CODE,
  title: REPORT_TITLE,
  startTime: FIXTURE_CLOCK_START - 5_000,
  endTime: FIXTURE_CLOCK_START,
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Fixture Arena' },
  owner: { __typename: 'User', name: 'Fixture Raid Lead' },
  fights:
    scenario === 'recovered'
      ? [makeFight(1, 4_000), makeFight(2, 4_500)]
      : [makeFight(1, 4_000)],
  phases: [],
});

const installFixture = async (page: Page, state: FixtureState): Promise<void> => {
  await page.clock.install({ time: FIXTURE_CLOCK_START });
  await page.addInitScript(
    ({ issuedAt }) => {
      sessionStorage.setItem(
        'access_token',
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiJsaXZlLWhlYWx0aC1maXh0dXJlIiwiZXhwIjo0MTAyNDQ0ODAwfQ.',
      );
      sessionStorage.setItem('authenticated', 'true');
      sessionStorage.setItem('access_token_refreshed_at', String(issuedAt));
      sessionStorage.setItem('access_token_expires_at', String(issuedAt + 60 * 60 * 1_000));
    },
    { issuedAt: FIXTURE_CLOCK_START },
  );

  await page.route('**/roster-hub-api/graphql**', async (route) => {
    const operationName = new URL(route.request().url()).searchParams.get('query');

    if (operationName !== 'getReportByCode') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
      return;
    }

    if (state.current === 'api-error') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Fixture API outage' }] }),
      });
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          __typename: 'Query',
          reportData: {
            __typename: 'ReportData',
            report: makeReport(state.current),
          },
        },
      }),
    });
  });
};

test('renders populated, accessible live-dashboard health through stale, failed, recovered, and new-pull states', async ({
  page,
}) => {
  const state: FixtureState = { current: 'fresh' };
  await installFixture(page, state);

  await page.goto(`${DASHBOARD_BASE_URL}/report/${REPORT_CODE}/dashboard`);

  const healthStatus = page.locator('#live-sync-status');
  const firstWidget = page.getByTestId('widget-death-causes-1');
  const pauseButton = page.getByRole('button', { name: 'Pause live refresh' });
  const refreshButton = page.getByRole('button', { name: 'Refresh dashboard now' });

  await expect(page).toHaveURL(new RegExp(`/report/${REPORT_CODE}/dashboard$`));
  await expect(page.getByText('Raid Dashboard', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: REPORT_TITLE })).toBeVisible();
  await expect(page.getByText('3 widgets', { exact: true })).toBeVisible();
  await expect(firstWidget).toBeVisible();
  await expect(page.getByText(/^As of /).first()).toBeVisible();
  await expect(page.getByText('Loading dashboard…', { exact: true })).not.toBeVisible();
  await expect(healthStatus).toHaveAccessibleName(/Live synchronization status: Fresh\./);
  await page.clock.fastForward(15_001);
  await expect(page.getByText('New pull detected', { exact: true })).not.toBeVisible();

  await pauseButton.click();
  await expect(page.getByRole('button', { name: 'Resume live refresh' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await page.clock.fastForward(31_000);
  await expect(healthStatus).toHaveAccessibleName(/Live synchronization status: Stale\./);

  state.current = 'api-error';
  await page.getByRole('button', { name: 'Resume live refresh' }).click();
  await expect(refreshButton).toBeEnabled();
  await refreshButton.click();
  await expect(healthStatus).toHaveAccessibleName(/Live synchronization status: API error\./);
  await expect(healthStatus).toContainText('Retrying in');
  await expect(firstWidget).toBeVisible();

  state.current = 'recovered';
  await page.clock.fastForward(5_000);
  await expect(healthStatus).toHaveAccessibleName(/Live synchronization status: Fresh\./);
  await expect(page.getByText('New pull detected', { exact: true })).toBeVisible();
  await expect(firstWidget).toBeVisible();
});
