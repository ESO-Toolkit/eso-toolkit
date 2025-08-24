import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import React from 'react';

import { AuthProvider } from './AuthContext';
import { EsoLogsClient } from './esologsClient';
import {
  EsoLogsClientProvider,
  useEsoLogsClientContext,
  useEsoLogsClientInstance,
} from './EsoLogsClientContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

jest.mock('@apollo/client', () => {
  const originalModule = jest.requireActual('@apollo/client');

  return {
    ...originalModule,
    ApolloProvider: jest.requireActual('./test/EmptyMockComponent').EmptyMockComponent,
  };
});

// Test component that uses the context
const TestComponent: React.FC = () => {
  const { client, isReady } = useEsoLogsClientContext();

  return (
    <div>
      <div data-testid="ready-status">{isReady ? 'ready' : 'not-ready'}</div>
      <div data-testid="client-status">{client ? 'has-client' : 'no-client'}</div>
    </div>
  );
};

// Test component that uses the client instance hook
const TestInstanceComponent: React.FC = () => {
  try {
    useEsoLogsClientInstance();
    return <div data-testid="instance-status">has-instance</div>;
  } catch (error) {
    return <div data-testid="instance-status">no-instance</div>;
  }
};

describe('EsoLogsClientContext', () => {
  let updateAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    // Set up spies on EsoLogsClient methods
    updateAccessTokenSpy = jest
      .spyOn(EsoLogsClient.prototype, 'updateAccessToken')
      .mockImplementation(() => {
        // Mock implementation
      });

    jest.spyOn(EsoLogsClient.prototype, 'getAccessToken').mockReturnValue('old-token');
  });

  afterEach(() => {
    // Restore all spies after each test
    jest.restoreAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      // Return null for access_token to simulate unauthenticated state
      mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('should provide null client and not ready status', () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('ready-status')).toHaveTextContent('not-ready');
      expect(screen.getByTestId('client-status')).toHaveTextContent('no-client');
    });

    it('should throw error when trying to get client instance', () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestInstanceComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('instance-status')).toHaveTextContent('no-instance');
    });
  });

  describe('when user is authenticated', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const payload = btoa(JSON.stringify({ exp: futureTimestamp }));
    const validToken = `header.${payload}.signature`;

    beforeEach(() => {
      // Return valid token for access_token to simulate authenticated state
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'access_token') return validToken;
        return null;
      });
    });

    it('should create client instance and set ready status', async () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      // The test initially renders with no token, then gets the token from localStorage
      // We need to wait for both the authentication state and client to be ready
      await waitFor(
        () => {
          expect(screen.getByTestId('ready-status')).toHaveTextContent('ready');
        },
        { timeout: 3000 }
      ); // Increased timeout for CI

      await waitFor(
        () => {
          expect(screen.getByTestId('client-status')).toHaveTextContent('has-client');
        },
        { timeout: 3000 }
      ); // Increased timeout for CI
    });

    it('should provide client instance through useEsoLogsClientInstance', async () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestInstanceComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      // Wait for the instance to be available with increased timeout for CI
      await waitFor(
        () => {
          expect(screen.getByTestId('instance-status')).toHaveTextContent('has-instance');
        },
        { timeout: 3000 }
      );
    });

    it('should update client token when access token changes', async () => {
      // Clear any previous calls BEFORE rendering
      updateAccessTokenSpy.mockClear();

      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      // Simulate token change
      const newPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
      const newToken = `header.${newPayload}.signature`;
      mockLocalStorage.getItem.mockReturnValue(newToken);

      await act(async () => {
        // Trigger the storage event that AuthProvider listens to
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'access_token',
            newValue: newToken,
          })
        );

        // Give React time to process the storage event and trigger re-renders
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Wait for the updateAccessToken to be called
      await waitFor(() => {
        expect(updateAccessTokenSpy).toHaveBeenCalledWith(newToken);
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when useEsoLogsClient is used outside provider', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Console error mock
      });

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useEsoLogsClient must be used within an EsoLogsClientProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useEsoLogsClientInstance is used outside provider', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Console error mock
      });

      // Create a component that uses the hook directly in render
      const DirectInstanceComponent: React.FC = () => {
        const client = useEsoLogsClientInstance();
        return <div data-testid="instance-status">has-instance: {client ? 'yes' : 'no'}</div>;
      };

      expect(() => {
        render(<DirectInstanceComponent />);
      }).toThrow('useEsoLogsClient must be used within an EsoLogsClientProvider');

      consoleSpy.mockRestore();
    });
  });
});
