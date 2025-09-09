import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React, { Suspense } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { HeaderBar } from './components/HeaderBar';
import { LandingPage } from './components/LandingPage';
import { LoggerProvider, LogLevel } from './contexts/LoggerContext';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import { AuthProvider } from './features/auth/AuthContext';
import { AuthenticatedRoute } from './features/auth/AuthenticatedRoute';
import { Login } from './features/auth/Login';
import { ReportFightDetails } from './features/report_details/ReportFightDetails';
import { UserReports } from './features/user_reports/UserReports';
import { useAbilitiesPreloader } from './hooks/useAbilitiesPreloader';
import { useWorkerManagerLogger } from './hooks/useWorkerManagerLogger';
import { AppLayout } from './layouts/AppLayout';
import { ReduxThemeProvider } from './ReduxThemeProvider';
import store, { persistor } from './store/storeWithHistory';
import { initializeSentry, addBreadcrumb } from './utils/sentryUtils';

// Initialize Sentry before the app starts
initializeSentry();

// Code splitting for major features and components
const LiveLog = React.lazy(() =>
  import('./features/live_logging/LiveLog').then((module) => ({ default: module.LiveLog })),
);
// ReportFightDetails is imported directly above for LCP optimization
const ReportFights = React.lazy(() =>
  import('./features/report_details/ReportFights').then((module) => ({
    default: module.ReportFights,
  })),
);
const OAuthRedirect = React.lazy(() =>
  import('./OAuthRedirect').then((module) => ({ default: module.OAuthRedirect })),
);
const Calculator = React.lazy(() =>
  import('./components/Calculator').then((module) => ({ default: module.Calculator })),
);
const FightReplay = React.lazy(() =>
  import('./features/fight_replay/FightReplay').then((module) => ({ default: module.FightReplay })),
);
// Lazy load the feedback FAB to improve initial page load performance
const LazyModernFeedbackFab = React.lazy(() =>
  import('./components/BugReportDialog').then((module) => ({ default: module.ModernFeedbackFab })),
);

// Loading fallback component - simple and fast
const LoadingFallback: React.FC = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="400px"
    role="status"
    aria-label="Loading"
  >
    <CircularProgress size={40} />
  </Box>
);

const MainApp: React.FC = () => {
  return (
    <ReduxThemeProvider>
      <HeaderBar />
      <LandingPage />
    </ReduxThemeProvider>
  );
};

const App: React.FC = () => {
  // Add breadcrumb for app initialization
  React.useEffect(() => {
    addBreadcrumb('App component mounted', 'navigation', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }, []);

  // Check if we're on the landing page to conditionally load components
  const isLandingPage = window.location.hash === '' || window.location.hash === '#/';

  return (
    <LoggerProvider
      config={{
        level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR, // DEBUG in dev, WARN in prod
        enableConsole: true,
        enableStorage: true,
        maxStorageEntries: 1000,
        contextPrefix: 'ESO-Logger',
      }}
    >
      <ReduxProvider store={store}>
        <PersistGate loading={<LoadingFallback />} persistor={persistor}>
          <EsoLogsClientProvider>
            <AuthProvider>
              <AppRoutes />
              {/* Add floating bug report button - lazy loaded for non-landing pages */}
              {!isLandingPage && (
                <Suspense fallback={null}>
                  <LazyModernFeedbackFab />
                </Suspense>
              )}
            </AuthProvider>
          </EsoLogsClientProvider>
        </PersistGate>
      </ReduxProvider>
    </LoggerProvider>
  );
};

const AppRoutes: React.FC = () => {
  // Initialize worker manager with logger
  useWorkerManagerLogger();

  // Check current path for abilities preloading and OAuth redirect
  const publicUrl = process.env.PUBLIC_URL || '';
  const currentPath = window.location.pathname.replace(publicUrl, '');

  // Preload abilities data when navigating to report pages
  const isReportPage = /\/report\//.test(currentPath);
  useAbilitiesPreloader(isReportPage);

  React.useEffect(() => {
    document.title = 'ESO Log Insights by NotaGuild';
    // Add breadcrumb for page load
    addBreadcrumb('App routes initialized', 'navigation', {
      title: document.title,
      url: window.location.href,
    });
  }, []);

  // Support non-hash OAuth redirect: /oauth-redirect?code=...
  // HashRouter won't match a path without a hash, so we short-circuit here.
  if (currentPath === '/oauth-redirect') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <OAuthRedirect />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <HashRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/oauth-redirect"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <OAuthRedirect />
                </Suspense>
              </ErrorBoundary>
            }
          />
          {/* Landing page without AppLayout for better performance */}
          <Route path="/" element={<MainApp />} />
          {/* Login page */}
          <Route
            path="/login"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Login />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route element={<AppLayout />}>
            {/* Pass fights as prop via state, fallback to empty array if not present */}
            <Route
              path="/report/:reportId/fight/:fightId/:tabId"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ReportFightDetails />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/report/:reportId/fight/:fightId"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ReportFightDetails />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/report/:reportId/fight/:fightId/replay"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <FightReplay />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/report/:reportId/live"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <LiveLog>
                        <ReportFightDetails />
                      </LiveLog>
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/report/:reportId"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ReportFights />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/calculator"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Calculator />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/my-reports"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <UserReports />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
