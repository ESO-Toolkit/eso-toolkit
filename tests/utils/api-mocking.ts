import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load real report data from data-downloads directory
 */
function loadReportData(reportCode: string, fileName: string = 'report-metadata.json') {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, fileName);
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real report data: ${error}`);
  }
  return null;
}

/**
 * Load real fight data from data-downloads directory
 */
function loadFightData(reportCode: string, fightId: string) {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, `fight-${fightId}`, 'fight-info.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real fight data: ${error}`);
  }
  return null;
}

/**
 * Load real damage/healing events for a fight
 */
function loadFightEventsData(reportCode: string, fightId: string, eventType: 'damage' | 'healing') {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, `fight-${fightId}`, 'events', `${eventType}-events.json`);
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real ${eventType} data: ${error}`);
  }
  return null;
}

/**
 * Load real player details data
 */
function loadPlayerData(reportCode: string) {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, 'player-details.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real player data: ${error}`);
  }
  return null;
}

/**
 * Sets up API mocking for Playwright tests using route interception
 * Now uses real ESO report data when available for authentic testing
 */
export async function setupApiMocking(page: Page) {
  // In CI environments, block external font requests that might cause timeouts
  if (process.env.CI) {
    await page.route('**/fonts.googleapis.com/**', async (route) => {
      await route.abort();
    });

    await page.route('**/fonts.gstatic.com/**', async (route) => {
      await route.abort();
    });
  }

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
        const reportCode = requestBody.variables?.code || '7zj1ma8kD9xn4cTq';
        
        // Try to load real report data first
        const realReportData = loadReportData(reportCode);
        if (realReportData) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(realReportData),
          });
          return;
        }

        // Fallback to mock data if real data not available
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
                  title: 'Sunspire Veteran - Test Guild',
                  visibility: 'PUBLIC',
                  zone: {
                    name: 'Trials',
                  },
                  fights: [
                    {
                      id: 1,
                      name: 'Sunspire - Yolnahkriin',
                      difficulty: 3,
                      startTime: 0,
                      endTime: 300000,
                      bossPercentage: 15,
                      friendlyPlayers: [
                        {
                          id: 1,
                          name: 'TestTank',
                          displayName: '@TestTank',
                          type: 'Dragonknight',
                          server: 'NA',
                          icon: 'dragonknight.png',
                        },
                        {
                          id: 2,
                          name: 'TestHealer',
                          displayName: '@TestHealer',
                          type: 'Templar',
                          server: 'NA',
                          icon: 'templar.png',
                        },
                        {
                          id: 3,
                          name: 'TestDPS',
                          displayName: '@TestDPS',
                          type: 'Nightblade',
                          server: 'NA',
                          icon: 'nightblade.png',
                        },
                      ],
                      enemyPlayers: [],
                      friendlyNPCs: [],
                      enemyNPCs: [
                        {
                          gameID: 12345,
                          id: 1,
                          name: 'Yolnahkriin',
                          groupCount: 1,
                          instanceCount: 1,
                        },
                      ],
                    },
                    {
                      id: 2,
                      name: 'Sunspire - Lokkestiiz',
                      difficulty: 3,
                      startTime: 400000,
                      endTime: 700000,
                      bossPercentage: 0,
                      friendlyPlayers: [
                        {
                          id: 1,
                          name: 'TestTank',
                          displayName: '@TestTank',
                          type: 'Dragonknight',
                          server: 'NA',
                          icon: 'dragonknight.png',
                        },
                        {
                          id: 2,
                          name: 'TestHealer',
                          displayName: '@TestHealer',
                          type: 'Templar',
                          server: 'NA',
                          icon: 'templar.png',
                        },
                        {
                          id: 3,
                          name: 'TestDPS',
                          displayName: '@TestDPS',
                          type: 'Nightblade',
                          server: 'NA',
                          icon: 'nightblade.png',
                        },
                      ],
                      enemyPlayers: [],
                      friendlyNPCs: [],
                      enemyNPCs: [
                        {
                          gameID: 12346,
                          id: 2,
                          name: 'Lokkestiiz',
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

      // Mock damage/healing data queries with real data when possible
      if (requestBody?.query?.includes('damage') || requestBody?.query?.includes('healing')) {
        const reportCode = requestBody.variables?.code || '7zj1ma8kD9xn4cTq';
        const fightId = requestBody.variables?.fightIDs?.[0] || '1';
        const eventType = requestBody.query?.includes('damage') ? 'damage' : 'healing';
        
        // Try to load real events data
        const realEventsData = loadFightEventsData(reportCode, fightId.toString(), eventType);
        if (realEventsData && realEventsData.data) {
          // Transform real events data to match expected format
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                reportData: {
                  report: {
                    table: {
                      data: {
                        entries: realEventsData.data.slice(0, 20), // Limit for performance
                      },
                    },
                  },
                },
              },
            }),
          });
          return;
        }

        // Fallback to mock data
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  table: {
                    data: {
                      entries: [
                        {
                          name: 'TestTank',
                          id: 1,
                          total: 15230000,
                          activeTime: 285000,
                          abilities: [
                            { name: 'Puncture', total: 5000000 },
                            { name: 'Heroic Slash', total: 3200000 },
                          ],
                        },
                        {
                          name: 'TestDPS',
                          id: 3,
                          total: 45670000,
                          activeTime: 280000,
                          abilities: [
                            { name: 'Surprise Attack', total: 15000000 },
                            { name: 'Incapacitating Strike', total: 12000000 },
                          ],
                        },
                        {
                          name: 'TestHealer',
                          id: 2,
                          total: 8900000,
                          activeTime: 290000,
                          abilities: [
                            { name: 'Breath of Life', total: 4500000 },
                            { name: 'Healing Springs', total: 3200000 },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          }),
        });
        return;
      }

      // Mock player details queries with real data
      if (requestBody?.query?.includes('playerDetails') || requestBody?.query?.includes('getPlayers')) {
        const reportCode = requestBody.variables?.code || '7zj1ma8kD9xn4cTq';
        
        // Try to load real player data
        const realPlayerData = loadPlayerData(reportCode);
        if (realPlayerData) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(realPlayerData),
          });
          return;
        }
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
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
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
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      ),
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
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>ESO Helper Tools Mock</body></html>',
      });
    }
  });

  // Block specific external services that we know about
  // ESO Logs API
  await page.route('**/esologs.com/**', async (route) => {
    const url = route.request().url();
    console.log(`🚫 Blocked ESO Logs request: ${url}`);
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'ESO Logs blocked in tests', url }),
    });
  });

  // Other external services
  await page.route('**/rpglogs.com/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'RPG Logs blocked in tests' }),
    });
  });

  await page.route('**/sentry.io/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sentry blocked in tests' }),
    });
  });
}
