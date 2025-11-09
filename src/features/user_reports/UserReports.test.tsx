import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { Provider } from 'react-redux';
import { LoggerProvider } from '../../contexts/LoggerContext';
import { createMockStore } from '../../test/utils/createMockStore';

import { UserReports } from './UserReports';

// Mock the hooks and contexts
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the ESO Logs client
const mockClient = {
  query: jest.fn(),
  getAccessToken: jest.fn(),
  updateAccessToken: jest.fn(),
};

const mockSetAuthToken = jest.fn();
const mockClearAuthToken = jest.fn();

jest.mock('../../EsoLogsClientContext', () => ({
  EsoLogsClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEsoLogsClientContext: () => ({
    client: mockClient,
    isReady: true,
    setAuthToken: mockSetAuthToken,
    clearAuthToken: mockClearAuthToken,
  }),
  useEsoLogsClientInstance: () => mockClient,
}));

jest.mock('../auth/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Import mocked components after mocks are defined
const { EsoLogsClientProvider } = jest.requireMock('../../EsoLogsClientContext');
const { AuthProvider, useAuth } = jest.requireMock('../auth/AuthContext');

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy HH:mm') {
      return 'Jan 01, 2024 10:00';
    }
    return 'formatted-date';
  }),
}));

// Mock GraphQL documents
jest.mock('../../graphql/gql/graphql', () => ({
  GetCurrentUserDocument: { __mock: 'GetCurrentUserDocument' },
  GetUserReportsDocument: { __mock: 'GetUserReportsDocument' },
}));

const mockGetCurrentUserDocument = { __mock: 'GetCurrentUserDocument' };
const mockGetUserReportsDocument = { __mock: 'GetUserReportsDocument' };

const mockUserData = {
  userData: {
    currentUser: {
      id: 12345,
      name: 'TestUser',
      naDisplayName: 'TestUserNA',
      euDisplayName: null,
    },
    __typename: 'UserData',
  },
};

const mockReportsData = {
  reportData: {
    reports: {
      data: [
        {
          code: 'ABC123',
          startTime: 1640995200000, // Jan 1, 2022
          endTime: 1640998800000, // 1 hour later
          title: 'Test Report 1',
          visibility: 'public',
          zone: { name: 'Cloudrest' },
          owner: { name: 'TestUser' },
          __typename: 'Report',
        },
        {
          code: 'DEF456',
          startTime: 1641081600000, // Jan 2, 2022
          endTime: 1641085200000, // 1 hour later
          title: 'Test Report 2',
          visibility: 'private',
          zone: { name: 'Sunspire' },
          owner: { name: 'TestUser' },
          __typename: 'Report',
        },
      ],
      total: 2,
      current_page: 1,
      per_page: 10,
      last_page: 1,
      has_more_pages: false,
      __typename: 'ReportPagination',
    },
    __typename: 'ReportData',
  },
};

const defaultTheme = createTheme();

const renderWithProviders = (
  component: React.ReactElement,
  {
    token = '',
    userData = mockUserData,
    reportsData = mockReportsData,
    reportsError,
    initialPage = 1,
  }: {
    token?: string;
    userData?: any;
    reportsData?: any;
    reportsError?: Error | string;
    initialPage?: number;
  } = {},
) => {
  // Setup localStorage mock
  mockLocalStorage.getItem.mockReturnValue(token);

  // Create mock store
  const store = createMockStore();

  // Setup client query responses
  mockClient.query.mockImplementation((params) => {
    if (params.query === mockGetCurrentUserDocument) {
      return Promise.resolve(userData);
    }
    if (reportsError) {
      const errorInstance =
        reportsError instanceof Error ? reportsError : new Error(String(reportsError));
      return Promise.reject(errorInstance);
    }
    return Promise.resolve(reportsData);
  });

  // Setup auth mock based on token and userData
  const mockAuthValue = {
    accessToken: token,
    isLoggedIn: !!token,
    isBanned: false,
    banReason: null,
    currentUser: token && userData?.userData?.currentUser ? userData.userData.currentUser : null,
    userLoading: false,
    userError: null,
    setAccessToken: jest.fn(),
    rebindAccessToken: jest.fn(),
    refetchUser: jest.fn(),
  };

  (useAuth as jest.Mock).mockReturnValue(mockAuthValue);

  // Set initial URL with page parameter if provided
  const initialUrl = initialPage > 1 ? `/my-reports?page=${initialPage}` : '/my-reports';

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <ThemeProvider theme={defaultTheme}>
          <LoggerProvider config={{ enableConsole: false, enableStorage: false }}>
            <EsoLogsClientProvider>
              <AuthProvider>{component}</AuthProvider>
            </EsoLogsClientProvider>
          </LoggerProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
};

describe('UserReports Component', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const validToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAuthToken.mockClear();
    mockClearAuthToken.mockClear();
  });

  describe('Authentication handling', () => {
    it('should show login message when user is not logged in', () => {
      renderWithProviders(<UserReports />, { token: '' });

      expect(screen.getByText('Please log in to view your reports.')).toBeInTheDocument();
    });

    it('should show loading state initially when logged in', () => {
      // Setup auth mock with userLoading true
      const mockAuthValue = {
        accessToken: 'token',
        isLoggedIn: true,
        isBanned: false,
        banReason: null,
        currentUser: null,
        userLoading: true,
        userError: null,
        setAccessToken: jest.fn(),
        rebindAccessToken: jest.fn(),
        refetchUser: jest.fn(),
      };

      (useAuth as jest.Mock).mockReturnValue(mockAuthValue);

      const store = createMockStore();

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ThemeProvider theme={defaultTheme}>
              <LoggerProvider config={{ enableConsole: false, enableStorage: false }}>
                <EsoLogsClientProvider>
                  <AuthProvider>
                    <UserReports />
                  </AuthProvider>
                </EsoLogsClientProvider>
              </LoggerProvider>
            </ThemeProvider>
          </MemoryRouter>
        </Provider>,
      );

      expect(screen.getByText('Loading user information...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('User data handling', () => {
    it('should display user information when available', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        expect(screen.getByText(/Reports for TestUser/)).toBeInTheDocument();
        expect(screen.getByText(/\(TestUserNA\)/)).toBeInTheDocument();
      });
    });

    it('should show error when user data is null', async () => {
      const mockUserDataNull = {
        userData: {
          currentUser: null,
          __typename: 'UserData',
        },
      };

      renderWithProviders(<UserReports />, { token: validToken, userData: mockUserDataNull });

      await waitFor(() => {
        expect(screen.getByText(/User ID not available/)).toBeInTheDocument();
      });
    });
  });

  describe('Reports data handling', () => {
    it('should display reports correctly', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        expect(screen.getByText('Test Report 1')).toBeInTheDocument();
        expect(screen.getByText('Test Report 2')).toBeInTheDocument();
        expect(screen.getByText('Cloudrest')).toBeInTheDocument();
        expect(screen.getByText('Sunspire')).toBeInTheDocument();
      });
    });

    it('should pass userID parameter when fetching reports', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        const reportsCall = mockClient.query.mock.calls.find(
          (call) => call[0].variables && 'userID' in call[0].variables,
        );
        expect(reportsCall).toBeDefined();
        expect(reportsCall[0].variables.userID).toBe(12345);
      });
    });

    it('should show error when user ID is not available for reports', async () => {
      const mockUserDataNoId = {
        userData: {
          currentUser: {
            name: 'TestUser',
            // No id field
          },
          __typename: 'UserData',
        },
      };

      mockClient.query.mockImplementation((params) => {
        if (params.query === mockGetCurrentUserDocument) {
          return Promise.resolve(mockUserDataNoId);
        }
        return Promise.resolve(mockReportsData);
      });

      renderWithProviders(<UserReports />, { token: validToken, userData: mockUserDataNoId });

      await waitFor(() => {
        expect(screen.getByText(/User ID not available/)).toBeInTheDocument();
      });
    });
  });

  describe('Duration formatting', () => {
    it('should format duration correctly for hours and minutes', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        // Mock reports have 1 hour duration (3600000 ms) - check for multiple instances
        const durationElements = screen.getAllByText('1h 0m');
        expect(durationElements).toHaveLength(2); // Both reports have 1h 0m duration
      });
    });

    it('should format duration correctly for minutes only', async () => {
      const mockReportsMinutes = {
        ...mockReportsData,
        reportData: {
          ...mockReportsData.reportData,
          reports: {
            ...mockReportsData.reportData.reports,
            data: [
              {
                ...mockReportsData.reportData.reports.data[0],
                endTime: mockReportsData.reportData.reports.data[0].startTime + 45 * 60 * 1000, // 45 minutes
              },
            ],
          },
        },
      };

      renderWithProviders(<UserReports />, {
        token: validToken,
        reportsData: mockReportsMinutes,
      });

      await waitFor(() => {
        expect(screen.getByText('45m')).toBeInTheDocument();
      });
    });
  });

  describe('User interactions', () => {
    it('should navigate to report details when report is clicked', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        const reportRow = screen.getByText('Test Report 1').closest('tr');
        expect(reportRow).toBeInTheDocument();
      });

      const reportRow = screen.getByText('Test Report 1').closest('tr')!;
      fireEvent.click(reportRow);

      expect(mockNavigate).toHaveBeenCalledWith('/report/ABC123');
    });

    it('should open report in new window on middle-click', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();

      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        const reportRow = screen.getByText('Test Report 1').closest('tr');
        expect(reportRow).toBeInTheDocument();
      });

      const reportRow = screen.getByText('Test Report 1').closest('tr')!;
      fireEvent.mouseDown(reportRow, { button: 1 });

      expect(windowOpenSpy).toHaveBeenCalledWith('/report/ABC123', '_blank', 'noopener,noreferrer');
      expect(mockNavigate).not.toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });

    it('should open report in new window on Ctrl+Click', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();

      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        const reportRow = screen.getByText('Test Report 1').closest('tr');
        expect(reportRow).toBeInTheDocument();
      });

      const reportRow = screen.getByText('Test Report 1').closest('tr')!;
      fireEvent.click(reportRow, { ctrlKey: true });

      expect(windowOpenSpy).toHaveBeenCalledWith('/report/ABC123', '_blank', 'noopener,noreferrer');
      expect(mockNavigate).not.toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });

    it('should open report in new window on Cmd+Click (Mac)', async () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();

      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        const reportRow = screen.getByText('Test Report 1').closest('tr');
        expect(reportRow).toBeInTheDocument();
      });

      const reportRow = screen.getByText('Test Report 1').closest('tr')!;
      fireEvent.click(reportRow, { metaKey: true });

      expect(windowOpenSpy).toHaveBeenCalledWith('/report/ABC123', '_blank', 'noopener,noreferrer');
      expect(mockNavigate).not.toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });

    it('should refresh data when refresh button is clicked', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        expect(screen.getByText('Test Report 1')).toBeInTheDocument();
      });

      // Clear previous calls
      jest.clearAllMocks();
      mockClient.query.mockImplementation((params) => {
        if (params.query === mockGetCurrentUserDocument) {
          return Promise.resolve(mockUserData);
        }
        return Promise.resolve(mockReportsData);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockClient.query).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message when fetching user data fails', async () => {
      // Mock auth to return userError state
      const mockAuthValue = {
        accessToken: validToken,
        isLoggedIn: true,
        isBanned: false,
        banReason: null,
        currentUser: null,
        userLoading: false,
        userError: 'Failed to fetch user information',
        setAccessToken: jest.fn(),
        rebindAccessToken: jest.fn(),
        refetchUser: jest.fn(),
      };

      (useAuth as jest.Mock).mockReturnValue(mockAuthValue);

      const store = createMockStore();

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ThemeProvider theme={defaultTheme}>
              <LoggerProvider config={{ enableConsole: false, enableStorage: false }}>
                <EsoLogsClientProvider>
                  <AuthProvider>
                    <UserReports />
                  </AuthProvider>
                </EsoLogsClientProvider>
              </LoggerProvider>
            </ThemeProvider>
          </MemoryRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch user information/)).toBeInTheDocument();
      });
    });

    it('should display error message when fetching reports fails', async () => {
      renderWithProviders(<UserReports />, {
        token: validToken,
        reportsError: new Error('Reports API Error'),
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch reports/)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', async () => {
      const mockReportsWithPagination = {
        ...mockReportsData,
        reportData: {
          ...mockReportsData.reportData,
          reports: {
            ...mockReportsData.reportData.reports,
            total: 25,
            last_page: 3,
            has_more_pages: true,
          },
        },
      };

      renderWithProviders(<UserReports />, {
        token: validToken,
        reportsData: mockReportsWithPagination,
      });

      await waitFor(() => {
        expect(screen.getByText('Total: 25 reports')).toBeInTheDocument();
      });
    });
  });

  describe('Visibility badges', () => {
    it('should display correct visibility badges', async () => {
      renderWithProviders(<UserReports />, { token: validToken });

      await waitFor(() => {
        expect(screen.getByText('public')).toBeInTheDocument();
        expect(screen.getByText('private')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination persistence (ESO-544)', () => {
    it('should use page number from URL query parameter on mount', async () => {
      const mockReportsPage3 = {
        reportData: {
          reports: {
            data: [
              {
                code: 'PAGE3_REPORT1',
                startTime: 1640995200000,
                endTime: 1640998800000,
                title: 'Page 3 Report',
                visibility: 'public',
                zone: { name: 'Cloudrest' },
                owner: { name: 'TestUser' },
              },
            ],
            current_page: 3,
            per_page: 10,
            last_page: 5,
            has_more_pages: true,
            total: 50,
          },
        },
      };

      // Track which page was requested
      let requestedPage: number | undefined;

      // Setup mock to capture page parameter
      mockLocalStorage.getItem.mockReturnValue(validToken);
      mockClient.query.mockImplementation((params) => {
        if (params.variables?.page !== undefined) {
          requestedPage = params.variables.page;
        }
        return Promise.resolve(mockReportsPage3);
      });

      // Setup auth mock
      const mockAuthValue = {
        accessToken: validToken,
        isLoggedIn: true,
        isBanned: false,
        banReason: null,
        currentUser: mockUserData.userData.currentUser,
        userLoading: false,
        userError: null,
        setAccessToken: jest.fn(),
        rebindAccessToken: jest.fn(),
        refetchUser: jest.fn(),
      };
      (useAuth as jest.Mock).mockReturnValue(mockAuthValue);

      const store = createMockStore();

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/my-reports?page=3']}>
            <ThemeProvider theme={defaultTheme}>
              <LoggerProvider config={{ enableConsole: false, enableStorage: false }}>
                <EsoLogsClientProvider>
                  <AuthProvider>
                    <UserReports />
                  </AuthProvider>
                </EsoLogsClientProvider>
              </LoggerProvider>
            </ThemeProvider>
          </MemoryRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Page 3 Report')).toBeInTheDocument();
      });

      // Verify that page 3 was requested, not page 1
      expect(requestedPage).toBe(3);
    });

    it('should update URL when page changes', async () => {
      const mockReportsWithMultiplePages = {
        reportData: {
          reports: {
            data: Array.from({ length: 10 }, (_, i) => ({
              code: `REPORT${i + 1}`,
              startTime: 1640995200000,
              endTime: 1640998800000,
              title: `Report ${i + 1}`,
              visibility: 'public',
              zone: { name: 'Cloudrest' },
              owner: { name: 'TestUser' },
            })),
            current_page: 1,
            per_page: 10,
            last_page: 3,
            has_more_pages: true,
            total: 30,
          },
        },
      };

      renderWithProviders(<UserReports />, {
        token: validToken,
        reportsData: mockReportsWithMultiplePages,
      });

      await waitFor(() => {
        expect(screen.getByText('Report 1')).toBeInTheDocument();
      });

      // Find and click page 2 button
      const page2Button = screen.getByRole('button', { name: /Go to page 2/i });

      // Mock should be called with page 2 after clicking
      mockClient.query.mockClear();
      fireEvent.click(page2Button);

      // Verify the query was called with page 2
      await waitFor(() => {
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              page: 2,
            }),
          }),
        );
      });
    });
  });
});
