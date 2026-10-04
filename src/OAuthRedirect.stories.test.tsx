import { Store } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { LoggerProvider, LogLevel } from './contexts/LoggerContext';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import * as auth from './features/auth/auth';
import { AuthProvider } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';

// Mock the ESO Logs client for tests
const mockClient = {
  query: jest.fn(),
  getAccessToken: jest.fn(),
  updateAccessToken: jest.fn(),
};

jest.mock('./EsoLogsClientContext', () => ({
  ...jest.requireActual('./EsoLogsClientContext'),
  useEsoLogsClientContext: () => ({
    client: mockClient,
    isReady: true,
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  }),
}));

// Mock the worker factory to avoid import.meta issues in Jest
jest.mock('./workers/workerFactories', () => ({
  createSharedWorker: jest.fn(() => ({
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    terminate: jest.fn(),
  })),
}));

// Mock useSelector to provide router state directly
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => {
    const mockState = {
      auth: { isAuthenticated: false },
      report: { selectedReport: null },
      events: { hostileBuffs: { entries: {}, accessOrder: [] } },
      workerResults: {},
    };
    return selector(mockState);
  }),
}));

// Mock store with proper Redux store interface
const mockStore = {
  getState: jest.fn(() => ({
    auth: { isAuthenticated: false },
    report: { selectedReport: null },
    events: { hostileBuffs: { entries: {}, accessOrder: [] } },
    workerResults: {},
  })),
  subscribe: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  replaceReducer: jest.fn(),
  [Symbol.observable]: jest.fn(),
} as unknown as Store;

jest.mock('./store/storeWithHistory', () => ({
  default: mockStore,
}));

describe('OAuthRedirect with story providers', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockFetch.mockReset();
    // Keep the exchange pending so the loading state is deterministic.
    mockFetch.mockImplementation(() => new Promise<Response>(() => {}));
    global.fetch = mockFetch;
    jest.spyOn(auth, 'getRedirectUri').mockReturnValue('https://example.test/oauth-redirect');
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  const renderRedirect = (): void => {
    render(
      <MemoryRouter initialEntries={['/oauth-redirect?code=test-code&state=test-state']}>
        <Provider store={mockStore}>
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
              <AuthProvider>
                <OAuthRedirect />
              </AuthProvider>
            </EsoLogsClientProvider>
          </LoggerProvider>
        </Provider>
      </MemoryRouter>,
    );
  };

  it('shows the exchange progress with valid OAuth state and PKCE setup', () => {
    auth.setPkceCodeVerifier('test-code-verifier');
    auth.setOAuthState('test-state');

    renderRedirect();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Exchanging authorization code for token...')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.esologs.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('code_verifier=test-code-verifier'),
      }),
    );
  });

  it('shows the restart action without requesting a token when PKCE setup is missing', () => {
    renderRedirect();

    expect(screen.getByRole('alert')).toHaveTextContent('Missing PKCE code verifier');
    expect(screen.getByRole('button', { name: 'Restart Authentication' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
