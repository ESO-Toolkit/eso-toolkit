import { Page } from '@playwright/test';

/**
 * Sets up API mocking for Playwright tests using route interception
 * This avoids the need for MSW service workers in the test environment
 */
export async function setupApiMocking(page: Page) {
  // Mock ESO Logs OAuth endpoints
  await page.route('**/oauth/authorize**', async (route) => {
    // Mock OAuth authorization endpoint - should redirect back with code
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${process.env.PUBLIC_URL || ''}/#/oauth-redirect?code=mock_auth_code&state=mock_state`,
      },
    });
  });

  await page.route('**/oauth/token**', async (route) => {
    // Mock OAuth token exchange endpoint
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_access_token_12345',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        scope: 'view-user-profile view-private-reports',
      }),
    });
  });

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

  // Mock ESO Logs main domain requests (any other API calls)
  await page.route('**/esologs.com/**', async (route) => {
    const url = route.request().url();
    
    // If it's not already handled by specific routes above
    if (!url.includes('/oauth/') && !url.includes('/api/v2/client')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Mock rpglogs.com (alternative domain and assets)
  await page.route('**/rpglogs.com/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/img/eso/abilities/')) {
      // Mock ability icons with a 1x1 transparent PNG
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Mock assets.rpglogs.com specifically for ability icons
  await page.route('**/assets.rpglogs.com/**', async (route) => {
    // Return a small transparent PNG for any image request
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
    });
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

  // Mock Google Analytics
  await page.route('**/google-analytics.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '',
    });
  });

  await page.route('**/googletagmanager.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: '',
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

  // Mock fonts and other external assets
  await page.route('**/fonts.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: '',
    });
  });

  await page.route('**/fonts.gstatic.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'font/woff2',
      body: '',
    });
  });

  // Mock Discord links (in case they're programmatically accessed)
  await page.route('**/discord.gg/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Discord Mock</body></html>',
    });
  });

  // Mock GitHub links
  await page.route('**/github.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>GitHub Mock</body></html>',
    });
  });

  // Mock any external helper tool domains
  await page.route('**/esohelper.tools/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('.svg') || url.includes('.png') || url.includes('.jpg')) {
      // Mock images with a small transparent PNG
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>ESO Helper Tools Mock</body></html>',
      });
    }
  });
}
