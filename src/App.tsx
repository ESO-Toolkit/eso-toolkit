import LinkIcon from '@mui/icons-material/Link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import React, { Suspense } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { EsoLogsClientProvider } from './EsoLogsClientContext';
import { AuthProvider } from './features/auth/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { clearAllEvents } from './store/events_data/actions';
import { clearMasterData } from './store/master_data/masterDataSlice';
import { clearReport } from './store/report/reportSlice';
import store, { persistor } from './store/storeWithHistory';
import { useAppDispatch } from './store/useAppDispatch';

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
  const [logUrl, setLogUrl] = React.useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

  const extractReportInfo = (url: string): { reportId: string; fightId: string | null } | null => {
    // Example URLs:
    // https://www.esologs.com/reports/dVZXRHYNCDWqLmbM
    // https://www.esologs.com/reports/dVZXRHYNCDWqLmbM#fight=5
    // https://www.esologs.com/reports/dVZXRHYNCDWqLmbM?fight=5
    // https://www.esologs.com/reports/dVZXRHYNCDWqLmbM/5

    const reportMatch = url.match(/reports\/([A-Za-z0-9]+)/);
    if (!reportMatch) return null;

    const reportId = reportMatch[1];

    // Try to extract fight ID from various URL patterns
    let fightId: string | null = null;

    // Pattern: #fight=5
    const hashFightMatch = url.match(/#fight=(\d+)/);
    if (hashFightMatch) {
      fightId = hashFightMatch[1];
    }

    // Pattern: ?fight=5 or &fight=5
    const queryFightMatch = url.match(/[?&]fight=(\d+)/);
    if (queryFightMatch) {
      fightId = queryFightMatch[1];
    }

    // Pattern: /reports/reportId/fightId
    const pathFightMatch = url.match(/reports\/[A-Za-z0-9]+\/(\d+)/);
    if (pathFightMatch) {
      fightId = pathFightMatch[1];
    }

    return { reportId, fightId };
  };

  const handleLoadLog = (): void => {
    const result = extractReportInfo(logUrl);
    if (result) {
      // Clear current fight, events, and report data before navigating
      dispatch(clearAllEvents());
      dispatch(clearMasterData());
      dispatch(clearReport());

      if (result.fightId) {
        navigate(`/report/${result.reportId}/fight/${result.fightId}`);
      } else {
        navigate(`/report/${result.reportId}`);
      }
    } else {
      alert('Invalid ESOLogs report URL');
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 4,
        p: 3,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
        border: '1px solid #1f2937',
        borderRadius: 3,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(56, 189, 248, 0.08)',
          borderColor: 'rgba(56, 189, 248, 0.25)',
        }
      }}
      className="u-fade-in-up"
    >
      <TextField
        label="ESOLogs.com Log URL"
        variant="outlined"
        value={logUrl}
        onChange={handleLogUrlChange}
        sx={{ 
          flex: 1,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'rgba(56, 189, 248, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(56, 189, 248, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#38bdf8',
              boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.15)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            '&.Mui-focused': {
              color: '#38bdf8',
            },
          },
        }}
        InputProps={{ 
          startAdornment: <LinkIcon sx={{ mr: 1, color: '#38bdf8' }} /> 
        }}
      />
      <Button
        variant="contained"
        color="secondary"
        sx={{ 
          minWidth: 140,
          height: 56,
          background: 'linear-gradient(135deg, #38bdf8, #00e1ff)',
          color: '#0b1220',
          fontWeight: 600,
          borderRadius: 2,
          boxShadow: '0 4px 15px rgba(56, 189, 248, 0.25)',
          transition: 'all 0.2s ease',
          '&:hover': {
            filter: 'brightness(1.05)',
            boxShadow: '0 6px 25px rgba(56, 189, 248, 0.35)',
            transform: 'translateY(-1px)',
          },
        }}
        onClick={handleLoadLog}
      >
        Load Log
      </Button>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AuthProvider>
            <EsoLogsClientProvider>
              <AppRoutes />
            </EsoLogsClientProvider>
          </AuthProvider>
        </PersistGate>
      </ReduxProvider>
    </ErrorBoundary>
  );
};

const AppRoutes: React.FC = () => {
  React.useEffect(() => {
    document.title = 'ESO Log Insights by NotaGuild';
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
    </HashRouter>
  );
};

export default App;
