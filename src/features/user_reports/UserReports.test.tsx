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

      expect(screen.getByTestId('user-loading-skeleton')).toBeInTheDocument();
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

    it('should show info message when user data is null', async () => {
      const mockUserDataNull = {
        userData: {
          currentUser: null,
          __typename: 'UserData',
        },
      };

      renderWithProviders(<UserReports />, { token: validToken, userData: mockUserDataNull });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load user profile information/)).toBeInTheDocument();
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

    // TODO: Fix infinite loop when fetchAllUserReports fails
    // The component needs to track error state to prevent re-fetching
    it.skip('should display error message when fetching reports fails', async () => {
      // Set up mock to reject on first call
      mockClient.query.mockImplementation((params) => {
        if (params.query === mockGetCurrentUserDocument) {
          return Promise.resolve(mockUserData);
        }
        // Reject reports fetch
        return Promise.reject(new Error('Reports API Error'));
      });

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
          <MemoryRouter initialEntries={['/my-reports']}>
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

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(screen.getByText(/Failed to fetch all reports/)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Pagination', () => {
    // TODO: Fix mock setup for fetchAllUserReports in tests
    // The manual render setup doesn't properly trigger the mocked API responses
    it.skip('should display pagination when there are multiple pages', async () => {
      // Create mock data for 3 pages (25 reports total)
      const createPageData = (pageNum: number, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          code: `PAGE${pageNum}_REPORT${i + 1}`,
          startTime: 1640995200000 + pageNum * 86400000,
          endTime: 1640998800000 + pageNum * 86400000,
          title: `Page ${pageNum} Report ${i + 1}`,
          visibility: 'public',
          zone: { name: 'Cloudrest' },
          owner: { name: 'TestUser' },
        }));

      // Mock sequential API calls for fetchAllUserReports (25 reports across 3 pages)
      mockClient.query
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(1, 10),
              current_page: 1,
              per_page: 100,
              last_page: 3,
              has_more_pages: true,
              total: 25,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(2, 10),
              current_page: 2,
              per_page: 100,
              last_page: 3,
              has_more_pages: true,
              total: 25,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(3, 5),
              current_page: 3,
              per_page: 100,
              last_page: 3,
              has_more_pages: false,
              total: 25,
            },
          },
        });

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
          <MemoryRouter initialEntries={['/my-reports']}>
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

      await waitFor(
        () => {
          expect(screen.getByText('Total: 25 reports')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Verify pagination appears (3 pages: ceil(25 / 10) = 3)
      expect(screen.getByRole('button', { name: /Go to page 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to page 3/i })).toBeInTheDocument();
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
    // TODO: Fix mock setup for fetchAllUserReports in tests
    it.skip('should use page number from URL query parameter on mount', async () => {
      // Mock all 5 pages of data for fetchAllUserReports
      const createPageData = (pageNum: number) =>
        Array.from({ length: 10 }, (_, i) => ({
          code: `PAGE${pageNum}_REPORT${i + 1}`,
          startTime: 1640995200000 + pageNum * 86400000, // Different dates per page
          endTime: 1640998800000 + pageNum * 86400000,
          title: `Page ${pageNum} Report ${i + 1}`,
          visibility: 'public',
          zone: { name: 'Cloudrest' },
          owner: { name: 'TestUser' },
        }));

      // Mock sequential API calls for fetchAllUserReports
      mockClient.query
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(1),
              current_page: 1,
              per_page: 100,
              last_page: 5,
              has_more_pages: true,
              total: 50,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(2),
              current_page: 2,
              per_page: 100,
              last_page: 5,
              has_more_pages: true,
              total: 50,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(3),
              current_page: 3,
              per_page: 100,
              last_page: 5,
              has_more_pages: true,
              total: 50,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(4),
              current_page: 4,
              per_page: 100,
              last_page: 5,
              has_more_pages: true,
              total: 50,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: createPageData(5),
              current_page: 5,
              per_page: 100,
              last_page: 5,
              has_more_pages: false,
              total: 50,
            },
          },
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

      // Wait for all reports to be fetched
      await waitFor(
        () => {
          expect(screen.getByText('Total: 50 reports')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // After all reports are fetched, the URL page parameter (?page=3) should cause page 3 to be displayed
      // Verify that reports from page 3 are visible (not page 1)
      expect(screen.queryByText('Page 1 Report 1')).not.toBeInTheDocument();
      expect(screen.getByText('Page 3 Report 1')).toBeInTheDocument();
    });

    // TODO: Fix mock setup for fetchAllUserReports in tests
    it.skip('should update URL when page changes', async () => {
      // Mock sequential responses for fetchAllUserReports
      const page1Data = Array.from({ length: 10 }, (_, i) => ({
        code: `REPORT${i + 1}`,
        startTime: 1640995200000,
        endTime: 1640998800000,
        title: `Report ${i + 1}`,
        visibility: 'public',
        zone: { name: 'Cloudrest' },
        owner: { name: 'TestUser' },
      }));

      const page2Data = Array.from({ length: 10 }, (_, i) => ({
        code: `REPORT${i + 11}`,
        startTime: 1640995200000,
        endTime: 1640998800000,
        title: `Report ${i + 11}`,
        visibility: 'public',
        zone: { name: 'Cloudrest' },
        owner: { name: 'TestUser' },
      }));

      const page3Data = Array.from({ length: 10 }, (_, i) => ({
        code: `REPORT${i + 21}`,
        startTime: 1640995200000,
        endTime: 1640998800000,
        title: `Report ${i + 21}`,
        visibility: 'public',
        zone: { name: 'Cloudrest' },
        owner: { name: 'TestUser' },
      }));

      // Mock client to return different pages
      mockClient.query
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: page1Data,
              current_page: 1,
              per_page: 100,
              last_page: 3,
              has_more_pages: true,
              total: 30,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: page2Data,
              current_page: 2,
              per_page: 100,
              last_page: 3,
              has_more_pages: true,
              total: 30,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: page3Data,
              current_page: 3,
              per_page: 100,
              last_page: 3,
              has_more_pages: false,
              total: 30,
            },
          },
        });

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
          <MemoryRouter initialEntries={['/my-reports']}>
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

      // Wait for all reports to be fetched (fetchAllUserReports)
      await waitFor(
        () => {
          expect(screen.getByText('Report 1')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Now all 30 reports should be cached, pagination should show 3 pages
      // Find and click page 2 button
      const page2Button = await screen.findByRole('button', { name: /Go to page 2/i });
      fireEvent.click(page2Button);

      // After clicking, Report 11 (first report on page 2) should be visible
      await waitFor(() => {
        expect(screen.getByText('Report 11')).toBeInTheDocument();
      });

      // Report 1 (from page 1) should not be visible anymore
      expect(screen.queryByText('Report 1')).not.toBeInTheDocument();
    });
  });
});
