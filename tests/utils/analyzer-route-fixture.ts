import { expect, Page, Route } from '@playwright/test';

import { setupTestPage } from '../setup/global-test-setup';

// Keep this outside the app's bundled sample-report allowlist so the route test
// exercises the mocked report GraphQL request rather than static sample JSON.
const REPORT_CODE = 'AnalyzerMatrixFixture01';
const FIGHT_ID = '5';
const FIGHT_START = 1_000;
const FIGHT_END = 61_000;

const reportFixture = {
  __typename: 'Report',
  code: REPORT_CODE,
  title: 'Deterministic Analyzer fixture',
  startTime: FIGHT_START,
  endTime: FIGHT_END,
  visibility: 'public',
  zone: { __typename: 'Zone', name: 'Training Grounds' },
  owner: { __typename: 'User', name: 'TestUser' },
  fights: [
    {
      __typename: 'ReportFight',
      id: Number(FIGHT_ID),
      name: 'Training Dummy',
      difficulty: 1,
      startTime: FIGHT_START,
      endTime: FIGHT_END,
      kill: true,
      encounterID: 1,
      friendlyPlayers: [1],
      enemyPlayers: [],
      bossPercentage: 0,
      originalEncounterID: null,
      lastPhase: null,
      lastPhaseAsAbsoluteIndex: null,
      lastPhaseIsIntermission: false,
      boundingBox: null,
      friendlyNPCs: [],
      enemyNPCs: [],
      maps: [],
      phaseTransitions: [],
      gameZone: { __typename: 'GameZone', id: 1, name: 'Training Grounds' },
      dungeonPulls: [],
    },
  ],
  phases: null,
};

const playerFixture = {
  id: 1,
  name: 'SamplePlayer',
  displayName: '@SamplePlayer',
  type: 'Dragonknight',
  icon: 'https://assets.rpglogs.com/img/eso/classes/dragonknight.png',
  server: 'NA',
  combatantInfo: { specs: [{ role: 'DPS' }] },
};

const actorFixture = {
  id: 1,
  name: 'SamplePlayer',
  displayName: '@SamplePlayer',
  type: 'Player',
  subType: 'Dragonknight',
  gameID: 1,
  server: 'NA',
  icon: playerFixture.icon,
};

const targetActorFixture = {
  id: 2,
  name: 'Training Dummy',
  displayName: 'Training Dummy',
  type: 'NPC',
  subType: 'NPC',
  gameID: 2,
  server: null,
  icon: null,
};

const abilityFixture = {
  gameID: 1001,
  name: 'Flame Lash',
  icon: 'ability_dragonknight_flame_lash',
  type: 'damage',
};

const damageEventFixture = {
  timestamp: FIGHT_START + 1_000,
  type: 'damage',
  sourceID: 1,
  targetID: 2,
  abilityGameID: abilityFixture.gameID,
  amount: 10_000,
  hitType: 1,
};

export async function fulfillGraphQl(route: Route, response: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response),
  });
}

export async function setupAuthAndGraphQl(page: Page): Promise<string[]> {
  await setupTestPage(page);
  const unexpectedOperations: string[] = [];

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
    sessionStorage.setItem('access_token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({
        preferences: { essential: true, analytics: false, errorTracking: false },
        version: '2',
        timestamp: new Date().toISOString(),
      }),
    );
  });

  const fulfillCurrentUser = async (route: Route): Promise<void> => {
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
  };

  await page.route(/\/api\/v2\/user(?:\?|$)/, fulfillCurrentUser);
  await page.route(/\/graphql\?query=/i, async (route) => {
    let postData: { operationName?: string; query?: string } | null = null;
    try {
      postData = route.request().postDataJSON() as {
        operationName?: string;
        query?: string;
      } | null;
    } catch {
      // GET-style persisted queries carry the operation in the URL.
    }
    const requestUrl = new URL(route.request().url());
    const queryText = postData?.query ?? '';
    const operationName =
      postData?.operationName ??
      requestUrl.searchParams.get('operationName') ??
      requestUrl.searchParams.get('query') ??
      'unknown';

    if (queryText.includes('currentUser') || operationName === 'getCurrentUser') {
      await fulfillCurrentUser(route);
      return;
    }
    const normalizedOperation = operationName.toLowerCase();
    if (
      queryText.toLowerCase().includes('getreportbycode') ||
      normalizedOperation.includes('getreportbycode')
    ) {
      await fulfillGraphQl(route, { data: { reportData: { report: reportFixture } } });
      return;
    }
    if (queryText.includes('masterData') || operationName === 'getReportMasterData') {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              masterData: {
                actors: [actorFixture, targetActorFixture],
                abilities: [abilityFixture],
              },
            },
          },
        },
      });
      return;
    }
    if (queryText.includes('playerDetails') || operationName === 'getPlayersForReport') {
      await fulfillGraphQl(route, {
        data: { reportData: { report: { playerDetails: [playerFixture] } } },
      });
      return;
    }
    if (
      queryText.includes('events(') ||
      [
        'getBuffEvents',
        'getCombatantInfoEvents',
        'getDamageEvents',
        'getDebuffEvents',
        'getResourceEvents',
      ].includes(operationName)
    ) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: { events: { data: [damageEventFixture], nextPageTimestamp: null } },
          },
        },
      });
      return;
    }
    await fulfillGraphQl(route, {
      errors: [{ message: `Unexpected private GraphQL request: ${operationName}` }],
    });
    unexpectedOperations.push(operationName);
  });

  return unexpectedOperations;
}

export async function openPopulatedAnalyzer(page: Page): Promise<string[]> {
  const unexpectedOperations = await setupAuthAndGraphQl(page);
  await page.goto(`/report/${REPORT_CODE}/fight/${FIGHT_ID}/insights`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(new RegExp(`/report/${REPORT_CODE}/fight/${FIGHT_ID}/insights$`));
  await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
  await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
  await expect(page.getByTestId('insights-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
  await expect(page.getByText('Training Dummy', { exact: true })).toBeVisible();
  // The duration is calculated from the mocked fight boundaries (1,000–61,000ms),
  // proving that the populated route rendered Analyzer data rather than only its shell.
  await expect(page.getByText('Duration: 1m 0.0s', { exact: true })).toBeVisible();
  await expect(page.getByTestId('insights-skeleton-layout')).toHaveCount(0);
  return unexpectedOperations;
}
