import { Box } from '@mui/material';
import React, { Suspense } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { AnalyticsListener } from './components/AnalyticsListener';
import { CookieConsent } from './components/CookieConsent';
import { MemoizedLoadingSpinner } from './components/CustomLoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HashRouteRedirect } from './components/HashRouteRedirect';
import { HeaderBar } from './components/HeaderBar';
import { LandingPage } from './components/LandingPage';
import { ReportFightsSkeleton } from './components/ReportFightsSkeleton';
import { ScrollRestoration } from './components/ScrollRestoration';
import { SmartCalculatorSkeleton } from './components/SmartCalculatorSkeleton';
import { TextEditorSkeleton } from './components/TextEditorSkeleton';
import { UpdateNotification } from './components/UpdateNotification';
import { LoggerProvider, LogLevel } from './contexts/LoggerContext';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import { AuthProvider } from './features/auth/AuthContext';
import { AuthenticatedRoute } from './features/auth/AuthenticatedRoute';
import { BanRedirect } from './features/auth/BanRedirect';
import { Login } from './features/auth/Login';
import { ReportFightDetails } from './features/report_details/ReportFightDetails';
import { UserReports } from './features/user_reports/UserReports';
import { useWorkerManagerLogger } from './hooks/useWorkerManagerLogger';
import { AppLayout } from './layouts/AppLayout';
import { Banned } from './pages/Banned';
import { NotFound } from './pages/NotFound';
import { ReduxThemeProvider } from './ReduxThemeProvider';
import store, { persistor } from './store/storeWithHistory';
import { initializeAnalytics } from './utils/analytics';
import { initializeSentry, addBreadcrumb } from './utils/sentryUtils';

// Initialize Sentry before the app starts
initializeSentry();

// Initialize Google Analytics
initializeAnalytics();

// Expose Redux store to window for debugging and testing (dev/test only)
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__REDUX_STORE__ = store;
}

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
const LatestReports = React.lazy(() =>
  import('./features/latest_reports/LatestReports').then((module) => ({
    default: module.LatestReports,
  })),
);
const OAuthRedirect = React.lazy(() =>
  import('./OAuthRedirect').then((module) => ({ default: module.OAuthRedirect })),
);
const Calculator = React.lazy(() =>
  import('./components/Calculator').then((module) => ({ default: module.Calculator })),
);
const TextEditor = React.lazy(() =>
  import('./components/TextEditor').then((module) => ({ default: module.TextEditor })),
);
const Logs = React.lazy(() =>
  import('./components/Logs').then((module) => ({ default: module.Logs })),
);
const LeaderboardLogsPage = React.lazy(() =>
  import('./features/leaderboard/LeaderboardLogsPage').then((module) => ({
    default: module.LeaderboardLogsPage,
  })),
);
const FightReplay = React.lazy(() =>
  import('./features/fight_replay/FightReplay').then((module) => ({ default: module.FightReplay })),
);
const ScribingSimulatorPage = React.lazy(() =>
  import('./pages/ScribingSimulatorPage').then((module) => ({
    default: module.ScribingSimulatorPage,
  })),
);
const ParseAnalysisPage = React.lazy(() =>
  import('./pages/ParseAnalysisPage').then((module) => ({
    default: module.ParseAnalysisPage,
  })),
);
const CalculationKnowledgeBasePage = React.lazy(() =>
  import('./pages/CalculationKnowledgeBasePage').then((module) => ({
    default: module.CalculationKnowledgeBasePage,
  })),
);
const WhoAmIPage = React.lazy(() =>
  import('./pages/WhoAmIPage').then((module) => ({ default: module.WhoAmIPage })),
);
const SampleReportPage = React.lazy(() =>
  import('./pages/SampleReportPage').then((module) => ({ default: module.SampleReportPage })),
);
const RosterBuilderPage = React.lazy(() =>
  import('./pages/RosterBuilderPage').then((module) => ({ default: module.RosterBuilderPage })),
);
const AboutPage = React.lazy(() =>
  import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);

const ReportSummaryPage = React.lazy(() =>
  import('./features/report_summary/ReportSummaryPage').then((module) => ({
    default: module.ReportSummaryPage,
  })),
);

// Lazy load the feedback FAB to improve initial page load performance
const LazyModernFeedbackFab = React.lazy(() =>
  import('./components/BugReportDialog').then((module) => ({ default: module.ModernFeedbackFab })),
);

// Loading fallback component - use custom spinner to prevent theme flashing
const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
    <MemoizedLoadingSpinner size={40} />
  </Box>
);

// Text Editor specific loading fallback
const TextEditorLoadingFallback: React.FC = () => <TextEditorSkeleton />;

// Report fights specific loading fallback
const ReportFightsLoadingFallback: React.FC = () => <ReportFightsSkeleton />;

// Calculator specific loading fallback
const CalculatorLoadingFallback: React.FC = () => <SmartCalculatorSkeleton />;

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

  // Listen for consent changes and reinitialize analytics
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'eso-log-aggregator-cookie-consent' && e.newValue) {
        try {
          const consent = JSON.parse(e.newValue);
          if (consent.accepted) {
            // User has accepted consent, reinitialize analytics
            initializeAnalytics();
          }
        } catch {
          // Ignore parsing errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check if we're on the landing page to conditionally load components
  const isLandingPage = window.location.pathname === '/' || window.location.pathname === '';

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
              {/* Update notification for new versions */}
              <UpdateNotification />
              {/* Cookie consent banner */}
              <CookieConsent />
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

  React.useEffect(() => {
    document.title = 'ESO Toolkit';
    // Add breadcrumb for page load
    addBreadcrumb('App routes initialized', 'navigation', {
      title: document.title,
      url: window.location.href,
    });
  }, []);

  return (
    <BrowserRouter>
      <HashRouteRedirect />
      <AnalyticsListener />
      <ScrollRestoration />
      <BanRedirect />
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
          {/* Banned page */}
          <Route
            path="/banned"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Banned />
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
              path="/report/:reportId/summary"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ReportSummaryPage />
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
                    <Suspense fallback={<ReportFightsLoadingFallback />}>
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
                  <Suspense fallback={<CalculatorLoadingFallback />}>
                    <Calculator />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/text-editor"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<TextEditorLoadingFallback />}>
                    <TextEditor />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/logs"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Logs />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/leaderboards"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <LeaderboardLogsPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/sample-report"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <SampleReportPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/latest-reports"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <LatestReports />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/whoami"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <WhoAmIPage />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <UserReports />
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/scribing-simulator"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ScribingSimulatorPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/parse-analysis/:reportId?/:fightId?"
              element={
                <AuthenticatedRoute>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ParseAnalysisPage />
                    </Suspense>
                  </ErrorBoundary>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/docs/calculations"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <CalculationKnowledgeBasePage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/roster-builder"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <RosterBuilderPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/about"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <AboutPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>
          {/* Catch-all route for 404 - must be last */}
          <Route
            path="*"
            element={
              <ErrorBoundary>
                <NotFound />
              </ErrorBoundary>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export { SmartCalculatorSkeleton, ReportFightsSkeleton, TextEditorSkeleton };
export default App;
