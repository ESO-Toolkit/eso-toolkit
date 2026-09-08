import { expect, test as base, type BrowserContext, type Page, type Route } from '@playwright/test';

export const ANALYZER_REPORT_CODE = 'E2E-ANALYZER';
export const ANALYZER_FIGHT_ID = 1;
export const ANALYZER_REPORT_TITLE = 'Analyzer Fixture Report';
export const ANALYZER_SUMMARY_ROUTE = `/report/${ANALYZER_REPORT_CODE}/summary`;

const ANALYZER_ACCESS_TOKEN =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtdXNlciIsImV4cCI6NDA5OTY4OTYwMH0.e2e';

const boundingBox = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

const analyzerReport = {
  __typename: 'Report',
  code: ANALYZER_REPORT_CODE,
  startTime: 1_000,
  endTime: 61_000,
  title: ANALYZER_REPORT_TITLE,
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Analyzer Test Zone' },
  owner: { __typename: 'User', name: 'E2E User' },
  fights: [
    {
      __typename: 'ReportFight',
      id: ANALYZER_FIGHT_ID,
      name: 'Analyzer Fixture Fight',
      difficulty: 1,
      startTime: 1_000,
      endTime: 61_000,
      kill: true,
      encounterID: 9_001,
      originalEncounterID: 9_001,
      lastPhase: null,
      lastPhaseAsAbsoluteIndex: null,
      lastPhaseIsIntermission: false,
      friendlyPlayers: [101],
      enemyPlayers: [201],
      bossPercentage: 0,
      boundingBox,
      friendlyNPCs: [],
      enemyNPCs: [],
      maps: [],
      phaseTransitions: [],
      gameZone: { __typename: 'GameZone', id: 9_001, name: 'Analyzer Test Zone' },
      dungeonPulls: [],
    },
  ],
  phases: [],
};

const summaryTables = {
  damage: {
    data: {
      entries: [{ id: 101, name: 'E2E Player', type: 'Sorcerer', total: 60_000 }],
    },
  },
  deaths: { data: { entries: [] } },
};

const eventPage = { data: [], nextPageTimestamp: null };

type GraphQLBody = { operationName?: string };

export interface AnalyzerFixtureTracker {
  operations: string[];
  assertComplete: () => void;
}

const KNOWN_OPERATIONS = new Set([
  'getBatchEventsForSummary',
  'getCastEvents',
  'getCombatantInfoEvents',
  'getCurrentUser',
  'getDamageEvents',
  'getDeathEvents',
  'getDebuffEvents',
  'getHealingEvents',
  'getPlayersForReport',
  'getReportByCode',
  'getReportMasterData',
  'getResourceEvents',
  'getBuffEvents',
]);

/**
 * Install the exact proxy endpoint used by the app and return request evidence.
 * Unknown operations are rejected so a new unmocked dependency cannot silently
 * render the app shell or a skeleton page.
 */
export async function installAnalyzerGraphQLFixture(page: Page): Promise<AnalyzerFixtureTracker> {
  const operations: string[] = [];

  const fulfillGraphQL = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      throw new Error(
        `Analyzer fixture received unexpected ${route.request().method()} request to ${route.request().url()}`,
      );
    }

    const body = route.request().postDataJSON() as GraphQLBody;
    const operationName = body.operationName;
    if (!operationName || !KNOWN_OPERATIONS.has(operationName)) {
      throw new Error(
        `Analyzer fixture has no response for GraphQL operation: ${operationName ?? '<missing>'}`,
      );
    }
    operations.push(operationName);

    let response: unknown;
    switch (operationName) {
      case 'getReportByCode':
        response = { reportData: { report: analyzerReport } };
        break;
      case 'getBatchEventsForSummary':
        response = { reportData: { report: summaryTables } };
        break;
      case 'getCurrentUser':
        response = {
          userData: {
            currentUser: {
              id: 1,
              name: 'E2E User',
              naDisplayName: 'E2E User',
              euDisplayName: 'E2E User',
            },
          },
        };
        break;
      case 'getReportMasterData':
        response = { reportData: { report: { masterData: { abilities: [], actors: [] } } } };
        break;
      case 'getPlayersForReport':
        response = { reportData: { report: { playerDetails: [] } } };
        break;
      default:
        response = { reportData: { report: { events: eventPage } } };
        break;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: response }),
    });
  };

  await page.route('**/graphql?*', fulfillGraphQL);
  await page.route('**/api/v2/user?*', fulfillGraphQL);

  return {
    operations,
    assertComplete: () => {
      const required = [
        'getReportByCode',
        'getBatchEventsForSummary',
        'getDamageEvents',
        'getCastEvents',
      ];
      const missing = required.filter((operation) => !operations.includes(operation));
      expect(
        missing,
        `Analyzer fixture operations were not reached: ${missing.join(', ')}`,
      ).toEqual([]);
    },
  };
}

export async function installAnalyzerAuthentication(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('access_token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem(
      'user_info',
      JSON.stringify({
        id: 1,
        name: 'E2E User',
        naDisplayName: 'E2E User',
        euDisplayName: 'E2E User',
      }),
    );
  }, ANALYZER_ACCESS_TOKEN);
}

export async function preloadAnalyzerSummary(
  page: Page,
  tracker: AnalyzerFixtureTracker,
): Promise<void> {
  await page.goto(ANALYZER_SUMMARY_ROUTE);
  await expect(page).toHaveURL(new RegExp(`/report/${ANALYZER_REPORT_CODE}/summary$`));
  await expect(page.getByRole('heading', { name: ANALYZER_REPORT_TITLE })).toBeVisible();
  await expect(page.getByText('Damage Breakdown', { exact: true })).toBeVisible();
  await expect(page.getByText('Death Analysis', { exact: true })).toBeVisible();
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  tracker.assertComplete();
}

type AnalyzerFixtures = { analyzerPage: Page };
type AnalyzerWorkerFixtures = { analyzerWorkerPreloaded: void };

/**
 * Every worker proves the authenticated, populated summary route once before
 * tests run. Individual tests get their own strict fixture and repeat the
 * route/content assertion without relying on shared browser state.
 */
export const analyzerTest = base.extend<AnalyzerFixtures, AnalyzerWorkerFixtures>({
  analyzerWorkerPreloaded: [
    async ({ browser }, use, workerInfo) => {
      const context: BrowserContext = await browser.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      const page = await context.newPage();
      const tracker = await installAnalyzerGraphQLFixture(page);
      await installAnalyzerAuthentication(page);
      await preloadAnalyzerSummary(page, tracker);
      await use();
      await context.close();
    },
    { scope: 'worker', auto: true },
  ],
  analyzerPage: async ({ page, analyzerWorkerPreloaded }, use) => {
    void analyzerWorkerPreloaded;
    const tracker = await installAnalyzerGraphQLFixture(page);
    await installAnalyzerAuthentication(page);
    await preloadAnalyzerSummary(page, tracker);
    await use(page);
  },
});
