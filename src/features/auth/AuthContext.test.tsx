import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock the ESO Logs client
const mockEsoLogsClient = {
  query: jest.fn(),
  getAccessToken: jest.fn(),
  updateAccessToken: jest.fn(),
};

const mockSetAuthToken = jest.fn();
const mockClearAuthToken = jest.fn();

// Mock the EsoLogsClientContext module BEFORE importing
jest.mock('../../EsoLogsClientContext', () => ({
  EsoLogsClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-provider">{children}</div>
  ),
  useEsoLogsClientContext: () => ({
    client: mockEsoLogsClient,
    isReady: true,
    setAuthToken: mockSetAuthToken,
    clearAuthToken: mockClearAuthToken,
  }),
}));

// Now import after mocking
import { AuthProvider, useAuth } from './AuthContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock Logger
jest.mock('../../contexts/LoggerContext', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
  LogLevel: {
    ERROR: 'error',
  },
}));

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const {
    accessToken,
    isLoggedIn,
    currentUser,
    userLoading,
    userError,
    refetchUser,
    rebindAccessToken,
  } = useAuth();

  return (
    <div>
      <div data-testid="access-token">{accessToken}</div>
      <div data-testid="is-logged-in">{isLoggedIn.toString()}</div>
      <div data-testid="user-loading">{userLoading.toString()}</div>
      <div data-testid="user-error">{userError || 'no-error'}</div>
      <div data-testid="current-user">{currentUser ? currentUser.name : 'no-user'}</div>
      <button onClick={() => refetchUser()} data-testid="refetch-user">
        Refetch User
      </button>
      <button onClick={() => rebindAccessToken()} data-testid="rebind-token">
        Rebind Token
      </button>
    </div>
  );
};

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('');
    mockSetAuthToken.mockClear();
    mockClearAuthToken.mockClear();
    mockEsoLogsClient.query.mockResolvedValue({
      userData: {
        currentUser: {
          id: 123,
          name: 'testuser',
          naDisplayName: 'Test User',
          euDisplayName: 'Test User EU',
        },
      },
    });
  });

  it('should provide initial state when not logged in', () => {
    mockLocalStorage.getItem.mockReturnValue('');

    renderWithAuthProvider(<TestComponent />);

    expect(screen.getByTestId('access-token')).toHaveTextContent('');
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
    expect(screen.getByTestId('user-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user-error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
  });

  it('should detect logged in state with valid token', () => {
    // Create a mock valid JWT token (expires in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    expect(screen.getByTestId('access-token')).toHaveTextContent(mockToken);
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
  });

  it('should detect expired token', () => {
    // Create a mock expired JWT token
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const mockToken = `header.${btoa(JSON.stringify({ exp: pastExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    expect(screen.getByTestId('access-token')).toHaveTextContent(mockToken);
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
  });

  it('should fetch user data when logged in', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(mockEsoLogsClient.query).toHaveBeenCalledWith({
        query: expect.any(Object), // The GraphQL AST object
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('user-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user-error')).toHaveTextContent('no-error');
    });
  });

  it('should handle user fetch error', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    mockEsoLogsClient.query.mockRejectedValue(new Error('Network error'));

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user-error')).toHaveTextContent('Network error');
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('user-loading')).toHaveTextContent('false');
    });
  });

  it('should handle empty user data response', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    mockEsoLogsClient.query.mockResolvedValue({
      userData: null,
    });

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user-error')).toHaveTextContent('No user data received');
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
    });
  });

  it('should allow manual user refetch', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('testuser');
    });

    // Clear mock and setup new response
    mockEsoLogsClient.query.mockClear();
    mockEsoLogsClient.query.mockResolvedValue({
      userData: {
        currentUser: {
          id: 456,
          name: 'newuser',
          naDisplayName: 'New User',
          euDisplayName: 'New User EU',
        },
      },
    });

    // Trigger refetch
    screen.getByTestId('refetch-user').click();

    await waitFor(() => {
      expect(mockEsoLogsClient.query).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('current-user')).toHaveTextContent('newuser');
    });
  });

  it('should clear user data when token is removed', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;

    // Start with valid token
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('testuser');
    });

    // Simulate token removal
    mockLocalStorage.getItem.mockReturnValue('');

    // Simulate rebinding token (which would happen in real app through storage event or explicit call)
    const rebindButton = screen.getByTestId('rebind-token');
    rebindButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
    });
  });
});
