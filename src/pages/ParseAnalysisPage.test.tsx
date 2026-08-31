import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import '@testing-library/jest-dom';

import { LoggerProvider } from '../contexts/LoggerContext';
import { FightFragment } from '../graphql/gql/graphql';
import { ReportFightProvider } from '../ReportFightContext';
import masterDataReducer from '../store/master_data/masterDataSlice';

import { ParseAnalysisPage } from './ParseAnalysisPage';

// Mock GraphQL client
const mockQuery = jest.fn();
const mockUseDamageEvents = jest.fn();
const mockDetectBuildIssues = jest.fn();
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
    isCastEventsLoaded: true,
    castEventsStatus: 'succeeded',
    castEventsError: null,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useDamageEvents', () => ({
  useDamageEvents: () => mockUseDamageEvents(),
}));

jest.mock('../hooks/events/useFriendlyBuffEvents', () => ({
  useFriendlyBuffEvents: () => ({
    friendlyBuffEvents: [],
    isFriendlyBuffEventsLoading: false,
    friendlyBuffEventsStatus: 'succeeded',
    friendlyBuffEventsError: null,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useCombatantInfoEvents', () => ({
  useCombatantInfoEvents: () => ({
    combatantInfoEvents: [],
    isCombatantInfoEventsLoading: false,
    combatantInfoEventsStatus: 'succeeded',
    combatantInfoEventsError: null,
    selectedFight: null,
  }),
}));

jest.mock('../hooks/events/useDebuffEvents', () => ({
  useDebuffEvents: () => ({
    debuffEvents: [],
    isDebuffEventsLoading: false,
    debuffEventsStatus: 'succeeded',
    debuffEventsError: null,
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

jest.mock('../utils/detectBuildIssues', () => ({
  ...jest.requireActual('../utils/detectBuildIssues'),
  detectBuildIssues: (...args: unknown[]) => mockDetectBuildIssues(...args),
}));

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
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      isDamageEventsLoading: false,
      damageEventsStatus: 'succeeded',
      damageEventsError: null,
      selectedFight: null,
    });
    mockDetectBuildIssues.mockReturnValue([]);
  });

  // Create a mock Redux store for testing
  const createTestStore = () => {
    return configureStore({
      reducer: {
        masterData: masterDataReducer,
      },
      // No preloadedState: this used to hand-roll `{ abilitiesById, actorsById,
      // loading, loaded, error, cacheMetadata }`, a shape the slice stopped
      // using when it moved to a keyed cache (`{ entries, accessOrder }`). The
      // reducer's own initial state is that same empty cache, which is exactly
      // what these tests want.
    });
  };

  // Helper to wrap component with necessary providers
  const renderWithProviders = (component: React.ReactElement) => {
    const testStore = createTestStore();
    return render(
      <Provider store={testStore}>
        <LoggerProvider>
          <MemoryRouter initialEntries={['/parse-analysis']}>
            <Routes>
              <Route
                path="/parse-analysis"
                element={<ReportFightProvider>{component}</ReportFightProvider>}
              />
              <Route
                path="/parse-analysis/:reportId/:fightId"
                element={<ReportFightProvider>{component}</ReportFightProvider>}
              />
            </Routes>
          </MemoryRouter>
        </LoggerProvider>
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

    // Wait for the completed analysis output rather than merely asserting that
    // the unsupported-target error has not appeared yet.
    await waitFor(
      () => {
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Damage Per Second')).toBeInTheDocument();
        expect(
          screen.queryByRole('status', { name: 'Analyzing combat events' }),
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
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Damage Per Second')).toBeInTheDocument();
        expect(
          screen.queryByRole('status', { name: 'Analyzing combat events' }),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('fails closed when a required event stream fails to load', async () => {
    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      isDamageEventsLoading: false,
      damageEventsStatus: 'failed',
      damageEventsError: 'Damage event API failed',
      selectedFight: null,
    });
    mockQuery
      .mockResolvedValueOnce({
        reportData: {
          report: {
            fights: [mockTrialDummyFight],
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
      });

    renderWithProviders(<ParseAnalysisPage />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/), {
      target: { value: 'https://esologs.com/reports/TestReport#fight=1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

    expect(
      await screen.findByText('Unable to load complete damage events. Damage event API failed'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Damage Per Second')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: 'Analyzing combat events' }),
    ).not.toBeInTheDocument();
  });

  it('clears prior analysis results before a selected fight analysis fails', async () => {
    const reportResponse = {
      reportData: { report: { fights: [mockTrialDummyFight, mockHarrowingTrialFight] } },
    };
    const playerResponse = {
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
    };
    mockQuery
      .mockResolvedValueOnce(reportResponse)
      .mockResolvedValueOnce(playerResponse)
      .mockResolvedValueOnce(reportResponse)
      .mockResolvedValueOnce(playerResponse);
    mockDetectBuildIssues.mockReturnValue([
      { message: 'Stale build issue', gearName: 'Old Item', gearQuality: 1 },
    ]);

    renderWithProviders(<ParseAnalysisPage />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/www\.esologs\.com/), {
      target: { value: 'https://esologs.com/reports/TestReport#fight=1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
    expect(await screen.findByText('Stale build issue')).toBeInTheDocument();
    expect(screen.getByText('Checklist')).toBeInTheDocument();

    mockUseDamageEvents.mockReturnValue({
      damageEvents: [],
      isDamageEventsLoading: false,
      damageEventsStatus: 'failed',
      damageEventsError: 'Damage event API failed',
      selectedFight: null,
    });
    fireEvent.click(screen.getByRole('button', { name: '#3 — Target Harrowing Reaper, Raid' }));

    expect(
      await screen.findByText('Unable to load complete damage events. Damage event API failed'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Stale build issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Checklist')).not.toBeInTheDocument();
  });
});
