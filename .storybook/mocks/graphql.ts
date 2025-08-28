import { MockedResponse } from '@apollo/client/testing';
import {
  EXCHANGE_OAUTH_TOKEN,
  GET_CURRENT_USER,
  GET_REPORT_DATA,
  GET_FIGHT_DETAILS,
} from '../../src/test/mocks/queries';

// Apollo Client MockedResponse definitions for GraphQL operations
export const mockExchangeOAuthToken = (
  code = 'auth_code_123',
  state = 'xyz',
  result?: any
): MockedResponse => ({
  request: {
    query: EXCHANGE_OAUTH_TOKEN,
    variables: { code, state },
  },
  result: result || {
    data: {
      exchangeToken: {
        accessToken: 'mock_access_token_123',
        refreshToken: 'mock_refresh_token_456',
        expiresIn: 3600,
        user: {
          id: '1',
          name: 'Mock User',
          email: 'mock@example.com',
          avatar: null,
        },
      },
    },
  },
});

export const mockExchangeOAuthTokenError = (
  code = 'invalid_code',
  state = 'xyz'
): MockedResponse => ({
  request: {
    query: EXCHANGE_OAUTH_TOKEN,
    variables: { code, state },
  },
  error: new Error('Invalid authorization code'),
});

export const mockGetCurrentUser = (user?: any): MockedResponse => ({
  request: {
    query: GET_CURRENT_USER,
  },
  result: {
    data: {
      user: user || {
        id: '1',
        name: 'Mock User',
        email: 'mock@example.com',
        avatar: null,
      },
    },
  },
});

export const mockGetCurrentUserUnauthenticated = (): MockedResponse => ({
  request: {
    query: GET_CURRENT_USER,
  },
  error: new Error('User not authenticated'),
});

export const mockGetReportData = (code: string, reportData?: any): MockedResponse => ({
  request: {
    query: GET_REPORT_DATA,
    variables: { code },
  },
  result: {
    data: {
      reportData: reportData || {
        report: {
          code,
          title: 'Mock Report Title',
          owner: {
            name: 'Mock Owner',
          },
          fights: [
            {
              id: 1,
              name: 'Mock Fight 1',
              startTime: 0,
              endTime: 120000,
              encounterID: 1001,
              difficulty: 1,
              kill: true,
            },
            {
              id: 2,
              name: 'Mock Fight 2',
              startTime: 150000,
              endTime: 300000,
              encounterID: 1002,
              difficulty: 2,
              kill: false,
            },
          ],
        },
      },
    },
  },
});

export const mockGetFightDetails = (
  startTime = 0,
  endTime = 120000,
  events?: any[]
): MockedResponse => ({
  request: {
    query: GET_FIGHT_DETAILS,
    variables: { startTime, endTime },
  },
  result: {
    data: {
      reportData: {
        report: {
          events: {
            data: events || [
              {
                timestamp: startTime,
                type: 'damage',
                sourceID: 1,
                targetID: 2,
                abilityGameID: 12345,
                amount: 1500,
              },
            ],
          },
        },
      },
    },
  },
});

// Common mock combinations for different scenarios
export const successfulOAuthMocks = [mockExchangeOAuthToken(), mockGetCurrentUser()];

export const failedOAuthMocks = [
  mockExchangeOAuthTokenError(),
  mockGetCurrentUserUnauthenticated(),
];

export const reportDataMocks = (reportCode: string) => [
  mockGetReportData(reportCode),
  mockGetFightDetails(),
];

// Default mocks that can be used across stories
export const defaultApolloMocks: MockedResponse[] = [
  mockGetCurrentUser(),
  mockGetReportData('mock-report-123'),
  mockGetFightDetails(),
];
