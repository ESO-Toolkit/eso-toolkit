import { ApolloClient, InMemoryCache } from '@apollo/client';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import React from 'react';

import { AuthProvider } from './AuthContext';
import { EsoLogsClient } from './esologsClient';
import {
  EsoLogsClientProvider,
  useEsoLogsClientContext,
  useEsoLogsClientInstance,
} from './EsoLogsClientContext';

// Mock the EsoLogsClient
jest.mock('./esologsClient');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

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
  beforeEach(() => {
    jest.clearAllMocks();
    (EsoLogsClient as jest.MockedClass<typeof EsoLogsClient>).mockClear();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
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
    let mockGetAccessToken: jest.Mock;
    let mockUpdateAccessToken: jest.Mock;

    beforeEach(() => {
      // Mock a valid JWT token (not expired)
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = btoa(JSON.stringify({ exp: futureTimestamp }));
      const validToken = `header.${payload}.signature`;

      mockLocalStorage.getItem.mockReturnValue(validToken);

      mockUpdateAccessToken = jest.fn();
      mockGetAccessToken = jest.fn().mockReturnValue('old-token');

      (EsoLogsClient as jest.MockedClass<typeof EsoLogsClient>).mockImplementation(
        () =>
          ({
            updateAccessToken: mockUpdateAccessToken,
            getAccessToken: mockGetAccessToken,
            // Add minimal properties to satisfy type checker
            getClient: jest.fn(
              () =>
                new ApolloClient({
                  cache: new InMemoryCache(),
                })
            ),
            query: jest.fn(),
            mutate: jest.fn(),
            watchQuery: jest.fn(),
            subscribe: jest.fn(),
            resetStore: jest.fn(),
            clearStore: jest.fn(),
            stop: jest.fn(),
          }) as unknown as EsoLogsClient
      );
    });

    it('should create client instance and set ready status', () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('ready-status')).toHaveTextContent('ready');
      expect(screen.getByTestId('client-status')).toHaveTextContent('has-client');
      expect(EsoLogsClient).toHaveBeenCalledTimes(1);
    });

    it('should provide client instance through useEsoLogsClientInstance', () => {
      render(
        <AuthProvider>
          <EsoLogsClientProvider>
            <TestInstanceComponent />
          </EsoLogsClientProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('instance-status')).toHaveTextContent('has-instance');
      expect(EsoLogsClient).toHaveBeenCalledTimes(1);
    });

    it('should update client token when access token changes', () => {
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

      act(() => {
        // Trigger a re-render to simulate token change
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'access_token',
            newValue: newToken,
          })
        );
      });

      // The client should be updated with the new token
      expect(mockUpdateAccessToken).toHaveBeenCalledWith(newToken);
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
