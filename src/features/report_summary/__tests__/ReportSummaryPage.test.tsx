import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { ReportSummaryPage } from '../ReportSummaryPage';
import { EsoLogsClientProvider } from '../../../EsoLogsClientContext';
import { ReportFightProvider } from '../../../ReportFightContext';
import { AuthProvider } from '../../auth/AuthContext';
import { LoggerProvider } from '../../../contexts/LoggerContext';

// Mock the hooks
jest.mock('../../../hooks/useReportData', () => ({
  useReportData: () => ({
    reportData: {
      title: 'Test Report',
      startTime: 1000000,
      endTime: 2000000,
      zone: { name: 'Test Zone' },
      fights: [
        { id: 1, name: 'Test Fight 1', startTime: 1000000, endTime: 1500000 },
        { id: 2, name: 'Test Fight 2', startTime: 1500000, endTime: 2000000 },
      ],
    },
    isReportLoading: false,
  }),
}));

const mockUseOptimizedReportSummaryData = jest.fn();

jest.mock('../hooks/useOptimizedReportSummaryData', () => ({
  useOptimizedReportSummaryData: (...args: any[]) => mockUseOptimizedReportSummaryData(...args),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ reportId: 'test123' }),
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      report: (
        state = {
          entries: {},
          accessOrder: [],
        },
      ) => state,
      playerData: (
        state = {
          entries: {},
          accessOrder: [],
        },
      ) => state,
      masterData: (
        state = {
          entries: {
            test123: {
              abilitiesById: {},
              actorsById: {},
              status: 'idle',
              error: null,
              cacheMetadata: {
                lastFetchedTimestamp: null,
                actorCount: 0,
                abilityCount: 0,
              },
              currentRequest: null,
            },
          },
          accessOrder: ['test123'],
        },
      ) => state,
      events: (
        state = {
          damage: {
            'test123::__all__': { events: [], loading: false, error: null },
            events: [],
            loading: false,
          },
          healing: {
            'test123::__all__': { events: [], loading: false, error: null },
            events: [],
            loading: false,
          },
          death: {
            'test123::__all__': { events: [], loading: false, error: null },
            events: [],
            loading: false,
          },
        },
      ) => state,
    },
  });
};

// Mock Apollo client
const mockClient = {
  query: jest.fn().mockResolvedValue({ data: {} }),
  mutate: jest.fn().mockResolvedValue({ data: {} }),
  watchQuery: jest.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  const theme = createTheme();

  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <LoggerProvider>
            <EsoLogsClientProvider client={mockClient}>
              <AuthProvider>
                <ReportFightProvider>{component}</ReportFightProvider>
              </AuthProvider>
            </EsoLogsClientProvider>
          </LoggerProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>,
  );
};

describe('ReportSummaryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return value
    mockUseOptimizedReportSummaryData.mockReturnValue({
      reportSummaryData: {
        reportInfo: {
          reportId: 'test123',
          title: 'Test Report',
          startTime: 1000000,
          endTime: 2000000,
          duration: 1000000,
          zoneName: 'Test Zone',
        },
        fights: [
          { id: 1, name: 'Test Fight 1' },
          { id: 2, name: 'Test Fight 2' },
        ],
        damageBreakdown: {
          totalDamage: 1000000,
          dps: 5000,
          playerBreakdown: [
            {
              playerId: '1',
              playerName: 'Test Player 1',
              role: 'DPS',
              totalDamage: 600000,
              dps: 3000,
              damagePercentage: 60,
              fightBreakdown: [],
            },
            {
              playerId: '2',
              playerName: 'Test Player 2',
              role: 'Tank',
              totalDamage: 400000,
              dps: 2000,
              damagePercentage: 40,
              fightBreakdown: [],
            },
          ],
          abilityTypeBreakdown: [
            {
              abilityType: 'Direct Damage',
              totalDamage: 600000,
              percentage: 60,
              hitCount: 300,
            },
            {
              abilityType: 'DOT',
              totalDamage: 400000,
              percentage: 40,
              hitCount: 200,
            },
          ],
          targetBreakdown: [],
        },
        deathAnalysis: {
          totalDeaths: 0,
          playerDeaths: [],
          mechanicDeaths: [],
          fightDeaths: [],
          deathPatterns: [],
        },
        loadingStates: {
          isLoading: false,
          fightDataLoading: {},
          damageEventsLoading: false,
          deathEventsLoading: false,
          playerDataLoading: false,
          masterDataLoading: false,
        },
        errors: {
          generalErrors: [],
          fightErrors: {},
          fetchErrors: {},
        },
      },
      isLoading: false,
      error: null,
      progress: null,
      fetchData: jest.fn(),
    });
  });

  it('renders report summary page with correct title', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Summary')).toBeInTheDocument();
      expect(screen.getByText('Test Report')).toBeInTheDocument();
    });
  });

  it('displays fight count chip', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('2 Fights')).toBeInTheDocument();
    });
  });

  it('shows flawless performance message when no deaths', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('0 Total Deaths')).toBeInTheDocument();
      expect(screen.getByText('Flawless Performance! 🎉')).toBeInTheDocument();
    });
  });

  it('displays damage breakdown section', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Damage Breakdown')).toBeInTheDocument();
      expect(screen.getByText('1.0M')).toBeInTheDocument(); // Total damage formatted
      expect(screen.getByText('5,000 DPS')).toBeInTheDocument();
    });
  });

  it('displays death analysis section', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Death Analysis')).toBeInTheDocument();
    });
  });

  it('shows top damage dealers', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Top Damage Dealers')).toBeInTheDocument();
      expect(screen.getByText('#1 Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('#2 Test Player 2')).toBeInTheDocument();
    });
  });

  it('shows damage type breakdown', async () => {
    renderWithProviders(<ReportSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Damage Type Distribution')).toBeInTheDocument();
      expect(screen.getByText('Direct Damage')).toBeInTheDocument();
      expect(screen.getByText('DOT')).toBeInTheDocument();
    });
  });
});

describe('ReportSummaryPage Loading State', () => {
  it('shows loading skeleton while data is loading', () => {
    // Mock loading state
    mockUseOptimizedReportSummaryData.mockReturnValue({
      reportSummaryData: undefined,
      isLoading: true,
      error: undefined,
      progress: {
        current: 2,
        total: 10,
        currentTask: 'Fetching damage events...',
      },
      fetchData: jest.fn(),
    });

    renderWithProviders(<ReportSummaryPage />);

    expect(screen.getByText('Loading Report Summary')).toBeInTheDocument();
    expect(screen.getByText('Fetching damage events...')).toBeInTheDocument();
    expect(screen.getByText('2/10')).toBeInTheDocument();
  });
});

describe('ReportSummaryPage Error State', () => {
  it('shows error message when data loading fails', () => {
    // Mock error state
    mockUseOptimizedReportSummaryData.mockReturnValue({
      reportSummaryData: undefined,
      isLoading: false,
      error: 'Failed to fetch report data',
      progress: undefined,
      fetchData: jest.fn(),
    });

    renderWithProviders(<ReportSummaryPage />);

    expect(screen.getByText('Failed to Load Report Summary')).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch report data/)).toBeInTheDocument();
  });
});
