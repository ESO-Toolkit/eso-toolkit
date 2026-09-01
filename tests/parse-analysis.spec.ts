import { expect, Page, Route, test } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';

const CURRENT_USER_RESPONSE = {
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
};

async function fulfillGraphQl(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setupAuthenticatedPage(page: Page): Promise<void> {
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
    localStorage.setItem('access_token', `${header}.${payload}.mock_signature`);
  });

  await page.route('**/api/v2/**', async (route) => {
    const request = route.request().postDataJSON();
    if (request?.query?.includes('currentUser')) {
      await fulfillGraphQl(route, CURRENT_USER_RESPONSE);
      return;
    }

    await fulfillGraphQl(route, {
      errors: [{ message: `Unexpected GraphQL request: ${request?.operationName ?? 'unknown'}` }],
    });
  });
}

async function mockPublicGraphQl(
  page: Page,
  handler: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route('**/graphql?query=getReportByCode**', handler);
}

const REQUIRED_ANALYSIS_OPERATIONS = [
  'getPlayersForReport',
  'getReportMasterData',
  'getDamageEvents',
  'getBuffEvents',
  'getCombatantInfoEvents',
  'getDebuffEvents',
  'getCastEvents',
] as const;

async function mockCompletedAnalysisGraphQl(page: Page): Promise<Set<string>> {
  const requestedOperations = new Set<string>();

  const handler = async (route: Route): Promise<void> => {
    const request = route.request().postDataJSON();
    const operationName = request?.operationName as string | undefined;

    if (operationName !== undefined) {
      requestedOperations.add(operationName);
    }

    if (request?.query?.includes('currentUser')) {
      await fulfillGraphQl(route, CURRENT_USER_RESPONSE);
      return;
    }

    if (request?.query?.includes('getReportByCode')) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              code: 'SUPPORTED123',
              title: 'Supported Encounter Report',
              startTime: 0,
              endTime: 120000,
              fights: [
                {
                  id: 1,
                  name: 'Target Iron Atronach',
                  startTime: 0,
                  endTime: 120000,
                  kill: true,
                  friendlyPlayers: [1],
                  enemyNPCs: [{ id: 3, gameID: 131230 }],
                },
              ],
            },
          },
        },
      });
      return;
    }

    if (request?.query?.includes('getPlayersForReport')) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              playerDetails: {
                data: {
                  playerDetails: {
                    dps: [{ id: 1, name: 'Test Player' }],
                    healers: [],
                    tanks: [],
                  },
                },
              },
            },
          },
        },
      });
      return;
    }

    if (request?.query?.includes('getReportMasterData')) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              masterData: {
                abilities: [{ gameID: 1001, icon: 'ability_test.dds', name: 'Test Ability' }],
                actors: [
                  {
                    id: 1,
                    gameID: 1,
                    name: 'Test Player',
                    type: 'Player',
                    subType: 'DragonKnight',
                  },
                  {
                    id: 3,
                    gameID: 131230,
                    name: 'Target Iron Atronach',
                    type: 'NPC',
                  },
                ],
              },
            },
          },
        },
      });
      return;
    }

    if (request?.query?.includes('getDamageEvents')) {
      const isFriendlySource = request.variables?.hostilityType === 'Friendlies';
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              events: {
                data: isFriendlySource
                  ? [
                      {
                        timestamp: 1000,
                        type: 'damage',
                        sourceID: 1,
                        sourceIsFriendly: true,
                        targetID: 3,
                        targetIsFriendly: false,
                        abilityGameID: 1001,
                        fight: 1,
                        hitType: 1,
                        amount: 120000,
                      },
                    ]
                  : [],
                nextPageTimestamp: null,
              },
            },
          },
        },
      });
      return;
    }

    if (request?.query?.includes('getCastEvents')) {
      const isFriendlySource = request.variables?.hostilityType === 'Friendlies';
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              events: {
                data: isFriendlySource
                  ? [
                      {
                        timestamp: 1000,
                        type: 'cast',
                        sourceID: 1,
                        sourceIsFriendly: true,
                        targetID: 3,
                        targetIsFriendly: false,
                        abilityGameID: 1001,
                        fight: 1,
                      },
                    ]
                  : [],
                nextPageTimestamp: null,
              },
            },
          },
        },
      });
      return;
    }

    if (
      request?.query?.includes('getBuffEvents') ||
      request?.query?.includes('getCombatantInfoEvents') ||
      request?.query?.includes('getDebuffEvents')
    ) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            report: {
              events: { data: [], nextPageTimestamp: null },
            },
          },
        },
      });
      return;
    }

    await fulfillGraphQl(route, {
      errors: [{ message: `Unexpected GraphQL request: ${operationName ?? 'unknown'}` }],
    });
  };

  await page.route('**/graphql?query=**', handler);
  await page.route('**/api/v2/**', handler);
  return requestedOperations;
}

test.describe('Parse Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('exposes an accessible URL form with guarded submission', async ({ page }) => {
    await page.goto('/parse-analysis');

    await expect(page.getByRole('heading', { name: 'Parse Analysis', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'ESOLogs.com Report URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze Parse' })).toBeDisabled();
    await expect(page.locator('.MuiAlert-colorError')).toHaveCount(0);
  });

  test('rejects an invalid URL without navigating', async ({ page }) => {
    await page.goto('/parse-analysis');
    const reportUrl = page.getByRole('textbox', { name: 'ESOLogs.com Report URL' });

    await reportUrl.fill('not-a-real-url');
    await page.getByRole('button', { name: 'Analyze Parse' }).click();

    await expect(
      page.getByRole('alert').filter({
        hasText: 'Invalid ESOLogs report URL. Please provide a valid URL.',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/parse-analysis\/?$/);
  });

  test('deep links fail closed with a useful unsupported-target error', async ({ page }) => {
    await mockPublicGraphQl(page, async (route) => {
      const request = route.request().postDataJSON();

      if (request?.query?.includes('getReportByCode')) {
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
                    startTime: 0,
                    endTime: 120000,
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
        errors: [{ message: `Unexpected GraphQL request: ${request?.operationName ?? 'unknown'}` }],
      });
    });

    await page.goto('/parse-analysis/UNSUPPORTED123/1');

    const unsupportedTargetError = page.getByRole('alert').filter({
      hasText: 'requires fights against a supported trial dummy',
    });
    await expect(unsupportedTargetError).toContainText('Unsupported Encounter');
    await expect(page.getByRole('status', { name: 'Analyzing combat events' })).toHaveCount(0);
  });

  test('submits with Enter and completes a supported report analysis', async ({ page }) => {
    const requestedOperations = await mockCompletedAnalysisGraphQl(page);
    await page.goto('/parse-analysis');

    const reportUrl = page.getByRole('textbox', { name: 'ESOLogs.com Report URL' });
    await reportUrl.fill('https://www.esologs.com/reports/SUPPORTED123#fight=1');
    await reportUrl.press('Enter');

    await expect(page).toHaveURL(/\/parse-analysis\/SUPPORTED123\/1$/);
    await expect(page.getByText('Performance Metrics', { exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Damage Per Second', { exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Analyzing combat events' })).toHaveCount(0);

    for (const operationName of REQUIRED_ANALYSIS_OPERATIONS) {
      expect(requestedOperations, `${operationName} should be requested`).toContain(operationName);
    }
  });

  test('keeps the URL form usable without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parse-analysis');

    await expect(page.getByRole('textbox', { name: 'ESOLogs.com Report URL' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Analyze Parse' })).toBeInViewport();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
