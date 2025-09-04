import { Store } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { AuthProvider } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';

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
      events: { hostileBuffs: { data: [], loading: false } },
      workerResults: {},
      router: {
        location: {
          pathname: '/oauth-redirect',
          search: '?code=test-code&state=test-state',
          hash: '',
        },
      },
    };
    return selector(mockState);
  }),
}));

// Mock store with proper Redux store interface
const mockStore = {
  getState: jest.fn(() => ({
    auth: { isAuthenticated: false },
    report: { selectedReport: null },
    events: { hostileBuffs: { data: [], loading: false } },
    workerResults: {},
    router: {
      location: {
        pathname: '/oauth-redirect',
        search: '?code=test-code&state=test-state',
        hash: '',
      },
    },
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
      <Provider store={mockStore}>
        <AuthProvider>
          <OAuthRedirect />
        </AuthProvider>
      </Provider>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
