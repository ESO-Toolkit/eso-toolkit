import { graphql, HttpResponse } from 'msw';

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
    {
      id: 2,
      name: 'Boss Fight 2',
      difficulty: 3,
      startTime: 300001,
      endTime: 600000,
      friendlyPlayers: [],
      enemyPlayers: [],
      bossPercentage: 0,
      friendlyNPCs: [],
      enemyNPCs: [
        {
          gameID: 67890,
          id: 2,
          groupCount: 1,
          instanceCount: 1,
        },
      ],
    },
  ],
};

export const mockMasterData = {
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
};

export const mockGameData = {
  abilities: mockMasterData.abilities,
  items: mockMasterData.items,
};

// MSW handlers for GraphQL endpoints
export const handlers = [
  // Mock the main reports endpoint
  graphql.query('getReportByCode', ({ variables }) => {
    const { code } = variables;

    // Return mock data for any report code
    return HttpResponse.json({
      data: {
        reportData: {
          report: {
            ...mockReport,
            code,
          },
        },
      },
    });
  }),

  // Mock game data queries
  graphql.query('getGameData', () => {
    return HttpResponse.json({
      data: {
        gameData: mockGameData,
      },
    });
  }),

  // Mock master data queries
  graphql.query('getMasterData', () => {
    return HttpResponse.json({
      data: {
        masterData: mockMasterData,
      },
    });
  }),

  // Mock any other GraphQL queries with a fallback
  graphql.query('*', () => {
    return HttpResponse.json({
      data: {},
    });
  }),

  // Mock mutations with success responses
  graphql.mutation('*', () => {
    return HttpResponse.json({
      data: {
        success: true,
      },
    });
  }),
];
