import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import React, { Suspense } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { BugReportFab } from './components/BugReportDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import { AuthProvider } from './features/auth/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import store, { persistor } from './store/storeWithHistory';
import { initializeSentry, addBreadcrumb } from './utils/sentryUtils';

// Initialize Sentry before the app starts
initializeSentry();

// Code splitting for major features
const LiveLog = React.lazy(() =>
  import('./features/live_logging/LiveLog').then((module) => ({ default: module.LiveLog }))
);
const ReportFightDetails = React.lazy(() =>
  import('./features/report_details/ReportFightDetails').then((module) => ({
    default: module.ReportFightDetails,
  }))
);
const ReportFights = React.lazy(() =>
  import('./features/report_details/ReportFights').then((module) => ({
    default: module.ReportFights,
  }))
);
const OAuthRedirect = React.lazy(() =>
  import('./OAuthRedirect').then((module) => ({ default: module.OAuthRedirect }))
);

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="200px">
    <CircularProgress />
  </Box>
);

const MainApp: React.FC = () => {
  return <LandingPage />;
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

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <EsoLogsClientProvider>
            <AppRoutes />
            {/* Add floating bug report button in production */}
            <BugReportFab />
          </EsoLogsClientProvider>
        </AuthProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

const AppRoutes: React.FC = () => {
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
  const publicUrl = process.env.PUBLIC_URL || '';
  const currentPath = window.location.pathname.replace(publicUrl, '');
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
    <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
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
          <Route element={<AppLayout />}>
            {/* Pass fights as prop via state, fallback to empty array if not present */}
            <Route
              path="/report/:reportId/fight/:fightId"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ReportFightDetails />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/report/:reportId/live"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <LiveLog>
                      <ReportFightDetails />
                    </LiveLog>
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/report/:reportId"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ReportFights />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route path="/*" element={<MainApp />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
