import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { FightFragment } from '../graphql/gql/graphql';
import { ReportFightProvider } from '../ReportFightContext';
import masterDataReducer from '../store/master_data/masterDataSlice';

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
    isLoggedIn: true,
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

// Mock event hooks
jest.mock('../hooks/events/useCastEvents', () => ({
  useCastEvents: () => ({
    castEvents: [],
    isCastEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useDamageEvents', () => ({
  useDamageEvents: () => ({
    damageEvents: [],
    isDamageEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useFriendlyBuffEvents', () => ({
  useFriendlyBuffEvents: () => ({
    friendlyBuffEvents: [],
    isFriendlyBuffEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useCombatantInfoEvents', () => ({
  useCombatantInfoEvents: () => ({
    combatantInfoEvents: [],
    isCombatantInfoEventsLoading: false,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useDebuffEvents', () => ({
  useDebuffEvents: () => ({
    debuffEvents: [],
    isDebuffEventsLoading: false,
    selectedFight: null,
  }),
}));

// Mock useReportData hook
jest.mock('../hooks/useReportData', () => ({
  useReportData: () => ({
    reportData: null,
    isReportLoading: false,
  }),
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

beforeEach(() => {
  mockQuery.mockReset();
  mockDispatch.mockClear();
});

const mockHarrowingTrialFight: FightFragment = {
  __typename: 'ReportFight',
  id: 3,
  name: 'Target Harrowing Reaper, Raid',
  startTime: 2000000,
  endTime: 2060000,
  difficulty: null,
  bossPercentage: null,
  encounterID: 2002,
  friendlyPlayers: [1],
  enemyPlayers: [],
  enemyNPCs: [{ __typename: 'ReportFightNPC', id: 200 }],
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

  // Create a mock Redux store for testing
  const createTestStore = () => {
    return configureStore({
      reducer: {
        masterData: masterDataReducer,
      },
      preloadedState: {
        masterData: {
          abilitiesById: {},
          actorsById: {},
          loading: false,
          loaded: false,
          error: null,
          cacheMetadata: {
            lastFetchedReportId: null,
            lastFetchedTimestamp: null,
            actorCount: 0,
            abilityCount: 0,
          },
        },
      },
    });
  };

  // Helper to wrap component with necessary providers
  const renderWithProviders = (component: React.ReactElement) => {
    const testStore = createTestStore();
    return render(
      <Provider store={testStore}>
        <MemoryRouter initialEntries={['/parse-analysis']}>
          <ReportFightProvider>{component}</ReportFightProvider>
        </MemoryRouter>
      </Provider>,
    );
  };

  it('should reject fights that are not against supported trial dummies', async () => {
    // Mock the report query to return a non-trial dummy fight
    mockQuery.mockResolvedValueOnce({
      reportData: {
        report: {
          fights: [mockNonTrialDummyFight],
        },
      },
    });

    renderWithProviders(<ParseAnalysisPage />);

    // Enter a valid ESO logs URL
    const input = screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/);
    fireEvent.change(input, {
      target: { value: 'https://esologs.com/reports/TestReport#fight=2' },
    });

    // Click analyze button
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(
          /This parse analysis tool requires fights against a supported trial dummy/,
        ),
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

    renderWithProviders(<ParseAnalysisPage />);

    // Enter a valid ESO logs URL
    const input = screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/);
    fireEvent.change(input, {
      target: { value: 'https://esologs.com/reports/TestReport#fight=1' },
    });

    // Click analyze button
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    // Wait for analysis to complete - should not show the trial dummy error
    await waitFor(
      () => {
        expect(
          screen.queryByText(
            /This parse analysis tool requires fights against a supported trial dummy/,
          ),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should allow analysis of fights against Target Harrowing Reaper, Raid', async () => {
    mockQuery
      .mockResolvedValueOnce({
        reportData: {
          report: {
            fights: [mockHarrowingTrialFight],
          },
        },
      })
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
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        reportData: {
          report: {
            events: {
              data: [],
            },
          },
        },
      });

    renderWithProviders(<ParseAnalysisPage />);

    const input = screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/);
    fireEvent.change(input, {
      target: { value: 'https://esologs.com/reports/TestReport#fight=3' },
    });

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await waitFor(
      () => {
        expect(
          screen.queryByText(
            /This parse analysis tool requires fights against a supported trial dummy/,
          ),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
