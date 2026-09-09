import { expect, Page, Route, test } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';

const REPORT_CODE = 'F4f2bMwWtgVKxjB9';
const FIGHT_ID = '5';

async function fulfillGraphQl(route: Route, response: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response),
  });
}

async function setupAuthAndGraphQl(page: Page): Promise<string[]> {
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

  // The app uses the ESO Logs user endpoint for the current-user query and
  // the roster-hub GraphQL endpoint for report data. Mock both explicitly so
  // an auth/API failure cannot be hidden by the public sample report fixture.
  await page.route(/\/api\/v2\/user(?:\?|$)/, fulfillCurrentUser);
  await page.route(/\/graphql(?:\?|$)/, async (route) => {
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

    // Sample reports load their report/fight metadata from public JSON. These
    // empty, successful responses cover optional API-backed panels without
    // allowing an unexpected operation to masquerade as a populated screen.
    if (queryText.includes('masterData') || operationName === 'getReportMasterData') {
      await fulfillGraphQl(route, {
        data: { reportData: { report: { masterData: { actors: [], abilities: [] } } } },
      });
      return;
    }

    if (queryText.includes('playerDetails') || operationName === 'getPlayersForReport') {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              playerDetails: { data: { playerDetails: [] } },
            },
          },
        },
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
        data: { reportData: { report: { events: { data: [], nextPageTimestamp: null } } } },
      });
      return;
    }

    await fulfillGraphQl(route, {
      errors: [
        {
          message: `Unexpected private GraphQL request: ${operationName ?? 'unknown'}`,
        },
      ],
    });
    unexpectedOperations.push(operationName);
  });

  return unexpectedOperations;
}

test('loads a populated Analyzer history route', async ({ page }) => {
  const unexpectedOperations = await setupAuthAndGraphQl(page);

  await page.goto(`/report/${REPORT_CODE}/fight/${FIGHT_ID}/insights`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page).toHaveURL(new RegExp(`/report/${REPORT_CODE}/fight/${FIGHT_ID}/insights$`));
  await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
  await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
  await expect(page.getByTestId('insights-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
  await expect(page.getByTestId('insights-skeleton-layout')).toHaveCount(0);
  expect(unexpectedOperations).toEqual([]);
});
