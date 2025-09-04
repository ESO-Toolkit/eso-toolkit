import { Page } from '@playwright/test';

/**
 * Sets up API mocking for Playwright tests using route interception
 * This avoids the need for MSW service workers in the test environment
 */
export async function setupApiMocking(page: Page) {
  // Mock ESO Logs GraphQL API
  await page.route('**/api/v2/client**', async (route) => {
    const request = route.request();

    try {
      const requestBody = await request.postDataJSON();

      if (requestBody?.query?.includes('getReportByCode')) {
        const reportCode = requestBody.variables?.code || 'TEST123';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  code: reportCode,
                  startTime: 1630000000000,
                  endTime: 1630003600000,
                  title: 'Test Raid Report',
                  visibility: 'PUBLIC',
                  zone: {
                    name: 'Trials',
                  },
                  fights: [
                    {
                      id: 1,
                      name: 'Boss Fight 1',
                      difficulty: 3,
                      startTime: 0,
                      endTime: 300000,
                      friendlyPlayers: [],
                      enemyPlayers: [],
                      bossPercentage: 0,
                      friendlyNPCs: [],
                      enemyNPCs: [
                        {
                          gameID: 12345,
                          id: 1,
                          groupCount: 1,
                          instanceCount: 1,
                        },
                      ],
                    },
                  ],
                },
              },
            },
          }),
        });
        return;
      }

      if (
        requestBody?.query?.includes('getMasterData') ||
        requestBody?.query?.includes('getGameData')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              gameData: {
                abilities: [
                  {
                    id: 1,
                    name: 'Test Ability',
                    icon: 'test-icon.png',
                  },
                ],
                items: [
                  {
                    id: 1,
                    name: 'Test Item',
                    icon: 'test-item.png',
                  },
                ],
              },
            },
          }),
        });
        return;
      }

      // Default GraphQL response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {},
        }),
      });
    } catch (error) {
      // Fallback for non-JSON requests
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {},
        }),
      });
    }
  });

  // Mock other API calls
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock Sentry and other external services
  await page.route('**/sentry.io/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock any CDN or external resource requests
  await page.route('**/cdn.**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '',
    });
  });
}
