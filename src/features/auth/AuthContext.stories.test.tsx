import { render, screen } from '@testing-library/react';
import React from 'react';

import { AuthProvider } from './AuthContext';
import { EsoLogsClientProvider } from '../../EsoLogsClientContext';
import { LoggerProvider, LogLevel } from '../../contexts/LoggerContext';

// Mock the ESO Logs client for tests
const mockClient = {
  query: jest.fn(),
  getAccessToken: jest.fn(),
  updateAccessToken: jest.fn(),
};

jest.mock('../../EsoLogsClientContext', () => ({
  ...jest.requireActual('../../EsoLogsClientContext'),
  useEsoLogsClientContext: () => ({
    client: mockClient,
    isReady: true,
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  }),
}));

describe('AuthProvider Storybook Snapshot', () => {
  it('renders children correctly', () => {
    render(
      <LoggerProvider
        config={{
          level: LogLevel.ERROR,
          enableConsole: false,
          enableStorage: false,
          maxStorageEntries: 0,
          contextPrefix: 'Test',
        }}
      >
        <EsoLogsClientProvider>
          <AuthProvider>Auth Context Example</AuthProvider>
        </EsoLogsClientProvider>
      </LoggerProvider>,
    );
    const element = screen.getByText('Auth Context Example');
    expect(element).toBeInTheDocument();
  });
});
