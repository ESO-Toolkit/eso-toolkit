import { http, HttpResponse } from 'msw';

// Mock data for testing
export const mockReport = {
  code: 'TEST123',
  startTime: 1630000000000,
  endTime: 1630003600000,
  title: 'Test Raid',
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
};

// HTTP handlers for REST API mocking
export const restHandlers = [
  // Mock ESO Logs OAuth token endpoint
  http.post('https://www.esologs.com/oauth/token', async () => {
    return HttpResponse.json({
      access_token: 'mock_access_token_12345',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock_refresh_token',
      scope: 'view-user-profile view-private-reports',
    });
  }),

  // Mock ESO Logs OAuth authorize endpoint
  http.get('https://www.esologs.com/oauth/authorize', async () => {
    return new HttpResponse(null, {
      status: 302,
      headers: {
        Location: `${process.env.PUBLIC_URL || ''}/oauth-redirect?code=mock_auth_code&state=mock_state`,
      },
    });
  }),

  // Mock ESO Logs GraphQL endpoint
  http.post('https://www.esologs.com/api/v2/client', async ({ request }) => {
    const body = (await request.json()) as any;

    if (body?.query?.includes('getReportByCode')) {
      return HttpResponse.json({
        data: {
          reportData: {
            report: {
              ...mockReport,
              code: body.variables?.code || 'TEST123',
            },
          },
        },
      });
    }

    // Default response for other GraphQL queries
    return HttpResponse.json({
      data: {},
    });
  }),

  // Mock rpglogs.com assets (ability icons)
  http.get('https://assets.rpglogs.com/img/eso/abilities/*', () => {
    // Return a small transparent PNG
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    return new HttpResponse(transparentPng, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  }),

  // Mock Rollbar
  http.post('https://api.rollbar.com/*', () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock any other API endpoints
  http.get('*/api/*', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('*/api/*', () => {
    return HttpResponse.json({ success: true });
  }),
];
