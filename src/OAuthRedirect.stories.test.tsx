import { Store } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import { LoggerProvider, LogLevel } from './contexts/LoggerContext';

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

describe('OAuthRedirect Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(
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
    expect(container.firstChild).toMatchSnapshot();
  });
});
