import { ApolloProvider } from '@apollo/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { Decorator } from '@storybook/react';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { EsoLogsClient } from '../../esologsClient';
import { EsoLogsClientContext } from '../../EsoLogsClientContext';
import { ReportFightContext } from '../../ReportFightContext';
import { storybookDarkTheme } from '../themes/storybookThemes';
import { createMockStore } from '../utils/createMockStore';
import { MockData } from '../utils/mockDataSets';

import { TabId } from '@/utils/getSkeletonForTab';

// Mock data provider component
const MockDataProvider: React.FC<{ children: React.ReactNode; mockData: MockData }> = ({
  children,
  mockData,
}) => {
  // Store mock data in a way that can be accessed by the component
  React.useEffect(() => {
    // This is a simple approach for Storybook - in real usage you'd use proper context
    (window as typeof window & { __storybook_mock_data?: MockData }).__storybook_mock_data =
      mockData;
  }, [mockData]);

  return <>{children}</>;
};

// LocalStorage provider component for Storybook testing
const MockLocalStorageProvider: React.FC<{
  children: React.ReactNode;
  localStorageValues?: Record<string, string>;
}> = ({ children, localStorageValues = {} }) => {
  React.useEffect(() => {
    // Store original values for cleanup
    const originalValues: Record<string, string | null> = {};

    // Set mock values
    Object.entries(localStorageValues).forEach(([key, value]) => {
      originalValues[key] = localStorage.getItem(key);
      localStorage.setItem(key, value);
    });

    // Cleanup function to restore original values
    return () => {
      Object.entries(originalValues).forEach(([key, originalValue]) => {
        if (originalValue === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, originalValue);
        }
      });
    };
  }, [localStorageValues]);

  return <>{children}</>;
};

// Mock ReportFightContext provider for Storybook
const MockReportFightProvider: React.FC<{
  children: React.ReactNode;
  reportId?: string;
  fightId?: string;
}> = ({ children, reportId = 'mock-report-123', fightId = 'mock-fight-1' }) => {
  const contextValue = React.useMemo(
    () => ({
      reportId,
      fightId,
      tabId: null, // Mock doesn't have a specific tab
      selectedTabId: TabId.INSIGHTS, // Default to 'overview' tab
      showExperimentalTabs: false,
      setSelectedTab: () => {
        // No-op for mock
      },
      setShowExperimentalTabs: () => {
        // No-op for mock
      },
    }),
    [reportId, fightId],
  );

  return <ReportFightContext.Provider value={contextValue}>{children}</ReportFightContext.Provider>;
};

/**
 * Mock Redux Provider for Storybook that uses the same store structure as production
 */
const MockReduxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = React.useMemo(() => createMockStore(), []);
  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};

// Mock ESOLogs Client Provider for Storybook
const MockEsoLogsClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockClient = React.useMemo(() => {
    return new EsoLogsClient('some-token');
  }, []);

  // Mock EsoLogsClient context value
  const mockContextValue = React.useMemo(
    () => ({
      client: mockClient, // We provide Apollo client directly for Storybook
      isReady: true, // Always ready in Storybook
      setAuthToken: (token: string) => {
        // Mock implementation - no-op for Storybook
      },
      clearAuthToken: () => {
        // Mock implementation - no-op for Storybook
      },
      isLoggedIn: true, // Assume logged in for Storybook
    }),
    [mockClient],
  );

  return (
    <EsoLogsClientContext.Provider value={mockContextValue}>
      <ApolloProvider client={mockClient.getClient()}>{children}</ApolloProvider>
    </EsoLogsClientContext.Provider>
  );
};

/**
 * Standard decorator for ESO log components that provides:
 * - React Router context (MemoryRouter)
 * - Redux Provider with mock store
 * - Material-UI dark theme
 * - CSS baseline reset
 * - ReportFightContext with mock values
 * - MockDataProvider for component data
 * - Standard padding container
 */
export const withEsoLogDecorators = (mockData: MockData): Decorator => {
  return (Story, context) => (
    <MockReduxProvider>
      <MockEsoLogsClientProvider>
        <ThemeProvider theme={storybookDarkTheme}>
          <CssBaseline />
          <MockReportFightProvider>
            <MockDataProvider mockData={mockData}>
              <div style={{ padding: '20px' }}>
                <Story />
              </div>
            </MockDataProvider>
          </MockReportFightProvider>
        </ThemeProvider>
      </MockEsoLogsClientProvider>
    </MockReduxProvider>
  );
};

/**
 * Enhanced decorator for ESO log components that provides everything from withEsoLogDecorators
 * plus localStorage support for testing components that depend on localStorage values
 */
export const withEsoLogDecoratorsAndLocalStorage = (
  mockData: MockData,
  localStorageValues: Record<string, string> = {},
): Decorator => {
  return (Story, context) => (
    <MockLocalStorageProvider localStorageValues={localStorageValues}>
      <MockReduxProvider>
        <MemoryRouter initialEntries={['/']}>
          <MockEsoLogsClientProvider>
            <ThemeProvider theme={storybookDarkTheme}>
              <CssBaseline />
              <MockReportFightProvider>
                <MockDataProvider mockData={mockData}>
                  <div style={{ padding: '20px' }}>
                    <Story />
                  </div>
                </MockDataProvider>
              </MockReportFightProvider>
            </ThemeProvider>
          </MockEsoLogsClientProvider>
        </MemoryRouter>
      </MockReduxProvider>
    </MockLocalStorageProvider>
  );
};

/**
 * Minimal decorator that provides theme, router context, and Redux
 * Useful for components that don't need mock data providers
 */
export const withBasicDecorators: Decorator = (Story) => (
  <MockReduxProvider>
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider theme={storybookDarkTheme}>
        <CssBaseline />
        <div style={{ padding: '20px' }}>
          <Story />
        </div>
      </ThemeProvider>
    </MemoryRouter>
  </MockReduxProvider>
);

/**
 * ESOLogs client decorator that provides Apollo client for GraphQL queries
 * Can be used standalone or combined with other decorators
 */
export const withEsoLogsClient: Decorator = (Story) => (
  <MockEsoLogsClientProvider>
    <Story />
  </MockEsoLogsClientProvider>
);

/**
 * LocalStorage decorator factory for testing components that depend on localStorage values
 * Automatically cleans up after the story unmounts
 */
export const withLocalStorage = (localStorageValues: Record<string, string>): Decorator => {
  return (Story) => (
    <MockLocalStorageProvider localStorageValues={localStorageValues}>
      <Story />
    </MockLocalStorageProvider>
  );
};

/**
 * Standalone ReportFightContext decorator factory
 * Provides only the ReportFightContext with custom report and fight IDs
 * Can be used standalone or combined with other decorators
 */
export const withReportFightContext = (
  reportId = 'mock-report-123',
  fightId = 'mock-fight-1',
): Decorator => {
  return (Story) => (
    <MockReportFightProvider reportId={reportId} fightId={fightId}>
      <Story />
    </MockReportFightProvider>
  );
};

/**
 * Default ReportFightContext decorator with standard mock values
 * Provides ReportFightContext with default mock-report-123 and mock-fight-1
 */
export const withMockReportFightContext: Decorator = (Story) => (
  <MockReportFightProvider>
    <Story />
  </MockReportFightProvider>
);

/**
 * Redux-only decorator for components that only need Redux state
 * Uses a mock store that mirrors the production storeWithHistory configuration
 */
export const withReduxProvider: Decorator = (Story) => (
  <MockReduxProvider>
    <Story />
  </MockReduxProvider>
);

/**
 * Custom decorator factory for components needing specific ReportFightContext values
 */
export const withCustomReportFightContext = (reportId: string, fightId: string): Decorator => {
  return (Story) => (
    <MockReduxProvider>
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider theme={storybookDarkTheme}>
          <CssBaseline />
          <MockReportFightProvider reportId={reportId} fightId={fightId}>
            <div style={{ padding: '20px' }}>
              <Story />
            </div>
          </MockReportFightProvider>
        </ThemeProvider>
      </MemoryRouter>
    </MockReduxProvider>
  );
};

/**
 * Re-export provider components for custom decorator usage
 */
export {
  MockDataProvider,
  MockReportFightProvider,
  MockReduxProvider,
  MockEsoLogsClientProvider,
  MockLocalStorageProvider,
};
