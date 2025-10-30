import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const mockSetAnalyticsUserId = jest.fn();
const mockSetUserProperties = jest.fn();

jest.mock('../../utils/banlist', () => ({
  checkUserBan: jest.fn(),
}));

jest.mock('../../utils/analytics', () => ({
  setAnalyticsUserId: mockSetAnalyticsUserId,
  setUserProperties: mockSetUserProperties,
}));

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
import { checkUserBan } from '../../utils/banlist';

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

const encodeBase64 = (value: string): string => {
  if (typeof globalThis !== 'undefined') {
    const browserBtoa = (globalThis as { btoa?: typeof btoa }).btoa;
    if (browserBtoa) {
      return browserBtoa(value);
    }

    const bufferCtor = (
      globalThis as {
        Buffer?: {
          from(input: string, encoding: string): { toString(encoding: string): string };
        };
      }
    ).Buffer;
    if (bufferCtor) {
      return bufferCtor.from(value, 'utf-8').toString('base64');
    }
  }

  // Jest's JSDOM environment should provide btoa, but add a final fallback for safety.
  throw new Error('Base64 encoding is not supported in the current test environment.');
};

const createMockToken = (expiresAtSeconds: number): string => {
  const payload = JSON.stringify({
    exp: expiresAtSeconds,
    sub: 'eso-user-123',
  });

  return `header.${encodeBase64(payload)}.signature`;
};

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
    isBanned,
    banReason,
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
      <div data-testid="is-banned">{isBanned.toString()}</div>
      <div data-testid="ban-reason">{banReason || 'no-ban'}</div>
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
  const mockCheckUserBan = checkUserBan as jest.MockedFunction<typeof checkUserBan>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('');
    mockSetAuthToken.mockClear();
    mockClearAuthToken.mockClear();
    mockSetAnalyticsUserId.mockClear();
    mockSetUserProperties.mockClear();
    mockCheckUserBan.mockResolvedValue({ isBanned: false });
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
    expect(screen.getByTestId('is-banned')).toHaveTextContent('false');
    expect(screen.getByTestId('ban-reason')).toHaveTextContent('no-ban');
    expect(screen.getByTestId('user-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user-error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');

    return waitFor(() => {
      expect(mockSetUserProperties).toHaveBeenCalledWith(
        expect.objectContaining({ auth_state: 'guest', has_token_subject: false }),
      );
    });
  });

  it('should detect logged in state with valid token', () => {
    // Create a mock valid JWT token (expires in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const mockToken = createMockToken(futureExp);
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    expect(screen.getByTestId('access-token')).toHaveTextContent(mockToken);
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('is-banned')).toHaveTextContent('false');
  });

  it('should detect expired token', () => {
    // Create a mock expired JWT token
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const mockToken = createMockToken(pastExp);
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    expect(screen.getByTestId('access-token')).toHaveTextContent(mockToken);
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
  });

  it('updates analytics user id when access token changes', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = createMockToken(futureExp);
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(mockSetAnalyticsUserId).toHaveBeenCalledWith('eso-user-123');
    });

    await waitFor(() => {
      expect(mockSetUserProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_state: 'authenticated',
          has_token_subject: true,
          account_region: 'multi',
        }),
      );
    });

    mockSetUserProperties.mockClear();
    mockLocalStorage.getItem.mockReturnValue('');
    fireEvent.click(screen.getByTestId('rebind-token'));

    await waitFor(() => {
      expect(mockSetAnalyticsUserId).toHaveBeenCalledWith(null);
    });

    await waitFor(() => {
      expect(mockSetUserProperties).toHaveBeenCalledWith(
        expect.objectContaining({ auth_state: 'guest', has_token_subject: false }),
      );
    });
  });

  it('should fetch user data when logged in', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = createMockToken(futureExp);
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
    const mockToken = createMockToken(futureExp);
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
    const mockToken = createMockToken(futureExp);
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    mockEsoLogsClient.query.mockResolvedValue({
      userData: null,
    });

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user-error')).toHaveTextContent('No user data received');
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('is-banned')).toHaveTextContent('false');
    });
  });

  it('should allow manual user refetch', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = createMockToken(futureExp);
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

  it('should mark user as banned and clear authentication', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = createMockToken(futureExp);
    mockLocalStorage.getItem.mockReturnValue(mockToken);

    mockCheckUserBan.mockResolvedValueOnce({
      isBanned: true,
      reason: 'Access revoked',
    });

    renderWithAuthProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('is-banned')).toHaveTextContent('true');
      expect(screen.getByTestId('ban-reason')).toHaveTextContent('Access revoked');
      expect(screen.getByTestId('user-error')).toHaveTextContent('Access revoked');
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(mockSetAuthToken.mock.calls).toContainEqual(['']);
    expect(mockClearAuthToken).toHaveBeenCalled();
  });

  it('should clear user data when token is removed', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = createMockToken(futureExp);

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
      expect(screen.getByTestId('is-banned')).toHaveTextContent('false');
    });
  });
});
