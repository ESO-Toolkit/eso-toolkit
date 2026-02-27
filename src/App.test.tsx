import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import App from './App';

jest.mock('./store/storeWithHistory', () => {
  const configureStoreMock = require('redux-mock-store').default;
  const store = configureStoreMock([])({});
  return {
    __esModule: true,
    default: store,
    persistor: {
      subscribe: jest.fn((cb) => {
        cb();
        return jest.fn();
      }),
      getState: () => ({ bootstrapped: true }),
      purge: jest.fn(),
      flush: jest.fn(),
      pause: jest.fn(),
    },
    history: { listen: jest.fn(() => jest.fn()), location: { pathname: '/' } },
  };
});

jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./ReduxThemeProvider', () => ({
  ReduxThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./contexts/LoggerContext', () => ({
  LoggerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LogLevel: { DEBUG: 'DEBUG', ERROR: 'ERROR' },
}));

jest.mock('./EsoLogsClientContext', () => ({
  EsoLogsClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./features/auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isBanned: false }),
}));

jest.mock('./hooks/useWorkerManagerLogger', () => ({
  useWorkerManagerLogger: () => {},
}));

jest.mock('./utils/analytics', () => ({
  initializeAnalytics: jest.fn(),
  trackPageView: jest.fn(),
  trackEvent: jest.fn(),
}));

jest.mock('./utils/errorTracking', () => ({
  initializeErrorTracking: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('./components/AnalyticsListener', () => ({
  AnalyticsListener: () => null,
}));

jest.mock('./components/CookieConsent', () => ({
  CookieConsent: () => null,
}));

jest.mock('./components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./components/HashRouteRedirect', () => ({
  HashRouteRedirect: () => null,
}));

jest.mock('./components/ScrollRestoration', () => ({
  ScrollRestoration: () => null,
}));

jest.mock('./components/UpdateNotification', () => ({
  UpdateNotification: () => null,
}));

jest.mock('./components/BugReportDialog', () => ({
  ModernFeedbackFab: () => null,
}));

jest.mock('./layouts/AppLayout', () => {
  const React = require('react');
  const { Outlet } = require('react-router-dom');
  return {
    AppLayout: () => (
      <div data-testid="app-layout">
        <Outlet />
      </div>
    ),
  };
});

jest.mock('./pages/AboutPage', () => ({
  AboutPage: () => <div>About Route</div>,
}));

describe('App', () => {
  it('renders the about route when navigated', async () => {
    window.history.pushState({}, 'About', '/about');

    render(<App />);

    expect(await screen.findByText('About Route')).toBeInTheDocument();
  });
});
