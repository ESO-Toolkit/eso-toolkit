import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FightFragment } from '../graphql/gql/graphql';

// Mock GraphQL client
const mockQuery = jest.fn();
const mockClient = {
  query: mockQuery,
};

// Mock dispatch
const mockDispatch = jest.fn();

// Mock useAppDispatch
jest.mock('../store/useAppDispatch', () => ({
  useAppDispatch: () => mockDispatch,
}));

// Mock EsoLogsClientContext
jest.mock('../EsoLogsClientContext', () => ({
  EsoLogsClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEsoLogsClientContext: () => ({
    client: mockClient,
    isReady: true,
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  }),
  useEsoLogsClientInstance: () => mockClient,
}));

// Mock AuthContext
jest.mock('../features/auth/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    isLoggedIn: true,
    user: { name: 'Test User' },
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ParseAnalysisPage } from './ParseAnalysisPage';

const mockTrialDummyFight: FightFragment = {
  __typename: 'ReportFight',
  id: 1,
  name: 'Target Iron Atronach',
  startTime: 1000000,
  endTime: 1060000,
  difficulty: null,
  bossPercentage: null,
  encounterID: 1001,
  friendlyPlayers: [1],
  enemyPlayers: [],
  enemyNPCs: [{ __typename: 'ReportFightNPC', id: 100 }],
};

const mockNonTrialDummyFight: FightFragment = {
  __typename: 'ReportFight',
  id: 2,
  name: 'Some Random Boss',
  startTime: 1000000,
  endTime: 1060000,
  difficulty: null,
  bossPercentage: null,
  encounterID: 1002,
  friendlyPlayers: [1],
  enemyPlayers: [],
  enemyNPCs: [{ __typename: 'ReportFightNPC', id: 200 }],
};

describe('ParseAnalysisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
  });

  it('should reject fights that are not against Target Iron Atronach', async () => {

    // Mock the report query to return a non-trial dummy fight
    mockQuery.mockResolvedValueOnce({
      reportData: {
        report: {
          fights: [mockNonTrialDummyFight],
        },
      },
    });

    render(<ParseAnalysisPage />);

    // Enter a valid ESO logs URL
    const input = screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/);
    fireEvent.change(input, { target: { value: 'https://esologs.com/reports/TestReport#fight=2' } });

    // Click analyze button
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(/This parse analysis tool requires fights against "Target Iron Atronach"/),
      ).toBeInTheDocument();
    });

    // Verify it shows the found target name
    expect(screen.getByText(/Found: "Some Random Boss"/)).toBeInTheDocument();
  });

  it('should allow analysis of fights against Target Iron Atronach', async () => {
    // Mock the report query to return a trial dummy fight
    mockQuery
      .mockResolvedValueOnce({
        reportData: {
          report: {
            fights: [mockTrialDummyFight],
          },
        },
      })
      // Mock player details query
      .mockResolvedValueOnce({
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
      })
      // Mock cast events
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      })
      // Mock buff events
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      })
      // Mock damage events
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      });

    render(<ParseAnalysisPage />);

    // Enter a valid ESO logs URL
    const input = screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/);
    fireEvent.change(input, { target: { value: 'https://esologs.com/reports/TestReport#fight=1' } });

    // Click analyze button
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    // Wait for analysis to complete - should not show the trial dummy error
    await waitFor(
      () => {
        expect(
          screen.queryByText(/This parse analysis tool requires fights against "Target Iron Atronach"/),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
