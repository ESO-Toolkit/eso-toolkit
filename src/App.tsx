import { ApolloProvider } from '@apollo/client';
import LinkIcon from '@mui/icons-material/Link';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  TextField,
  Button,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import ListItemButton from '@mui/material/ListItemButton';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { setPkceCodeVerifier, CLIENT_ID, REDIRECT_URI } from './auth';
import { AuthProvider, useAuth } from './AuthContext';
import { createEsoLogsClient } from './esologsClient';
import GraphiQLPage from './features/graphiql/GraphiQLPage';
import FightDetails from './FightDetails';
import { FightFragment } from './graphql/generated';
import { useGetReportByCodeQuery } from './graphql/report-data.generated';
import OAuthRedirect from './OAuthRedirect';
import ReduxThemeProvider from './ReduxThemeProvider';
import type { RootState } from './store';
import { fetchEventsForFight } from './store/eventsSlice';
import { setReportId, setFightId } from './store/navigationSlice';
import store, { persistor } from './store/storeWithHistory';
import { setDarkMode } from './store/uiSlice';
import { useAppDispatch } from './store/useAppDispatch';

// Utility: Remove nulls and undefineds from a generic array
function cleanArray<T>(arr: Array<T | null | undefined>): T[] {
  return arr.filter((item): item is T => item != null);
}

const MainApp: React.FC = () => {
  const [fights, setFights] = useState<FightFragment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logUrl, setLogUrl] = useState<string>('');
  const reportId = useSelector((state: RootState) => state.navigation.reportId);
  const selectedFightId = useSelector((state: RootState) => state.navigation.fightId);

  const { isLoggedIn, setAccessToken } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);
  const eventsLoading = useSelector((state: RootState) => state.events.loading);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken('');
    handleMenuClose();
  };
  const handleThemeToggle = () => {
    dispatch(setDarkMode(!darkMode));
    handleMenuClose();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogUrl(e.target.value);
  };

  const generateCodeVerifier = () => {
    const array = new Uint32Array(32);
    window.crypto.getRandomValues(array);
    const verifier = Array.from(array, (dec) => ('0' + dec.toString(16)).slice(-2)).join('');
    localStorage.setItem('eso_code_verifier', verifier);
    return verifier;
  };

  const base64UrlEncode = (str: ArrayBuffer) => {
    const uint8 = new Uint8Array(str);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
  };
  const startPKCEAuth = async () => {
    setError(null);
    const verifier = generateCodeVerifier();
    setPkceCodeVerifier(verifier);
    const challenge = await generateCodeChallenge(verifier);
    const authUrl = `https://www.esologs.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = authUrl;
  };

  const extractReportId = (url: string) => {
    // Example: https://www.esologs.com/reports/dVZXRHYNCDWqLmbM
    const match = url.match(/reports\/([A-Za-z0-9]+)/);
    return match ? match[1] : '';
  };

  const { accessToken } = useAuth();
  const {
    data,
    loading,
    error: gqlError,
    refetch,
  } = useGetReportByCodeQuery({
    variables: { code: reportId },
    skip: !reportId,
    context: {
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      },
    },
  });

  const handleFetchLog = () => {
    if (!logUrl) {
      setError('Please provide the ESOLogs report URL.');
      return;
    }
    if (!accessToken) {
      setError('You must be logged in to fetch logs.');
      return;
    }
    setError(null);
    const extractedId = extractReportId(logUrl);
    if (!extractedId) {
      setError('Invalid ESOLogs report URL.');
      return;
    }
    dispatch(setReportId(extractedId));
    refetch({ code: extractedId });
  };

  React.useEffect(() => {
    if (data && data.reportData?.report?.fights) {
      const fightsData = cleanArray(data.reportData.report.fights);
      setFights(fightsData);
      if (fightsData.length === 0) {
        setError('No fights found in API response.');
      }
    } else if (gqlError) {
      setError('Failed to fetch or parse data from ESOLogs GraphQL API.');
      setFights([]);
    }
  }, [data, gqlError]);

  const handleFightSelect = (id: number) => {
    dispatch(setFightId(id));
  };

  // Dispatch event fetch when fight selection changes and all required data is present
  React.useEffect(() => {
    if (selectedFightId !== null && fights.length > 0 && isLoggedIn && accessToken && reportId) {
      const fight = fights.find((f) => f.id === selectedFightId);
      if (fight) {
        dispatch(fetchEventsForFight({ reportCode: reportId, fight, accessToken }));
      }
    }
  }, [selectedFightId, fights, isLoggedIn, accessToken, reportId, dispatch]);

  return (
    <ReduxThemeProvider>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          bgcolor: 'background.default',
        }}
      />
      {eventsLoading ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            opacity: 0.85,
          }}
        >
          <Paper
            elevation={6}
            sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6">Loading events...</Typography>
          </Paper>
        </Box>
      ) : (
        <Container maxWidth="md">
          <AppBar position="static" color="primary" sx={{ mb: 4 }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                  ESO Log Aggregator
                </a>
              </Typography>
              {isLoggedIn && (
                <>
                  <IconButton color="inherit" onClick={handleMenuOpen} sx={{ ml: 2 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <MenuItem onClick={handleThemeToggle}>
                      Switch to {darkMode ? 'Light' : 'Dark'} Mode
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </>
              )}
            </Toolbar>
          </AppBar>
          <Box sx={{ mt: 2, mb: 4 }}>
            {!isLoggedIn && (
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startPKCEAuth}
                    disabled={loading}
                    sx={{ minWidth: 180 }}
                  >
                    Login with ESO Logs
                  </Button>
                </Box>
              </Paper>
            )}
            {isLoggedIn && (
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <TextField
                    label="ESOLogs.com Log URL"
                    variant="outlined"
                    value={logUrl}
                    onChange={handleUrlChange}
                    fullWidth
                    InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1 }} /> }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleFetchLog}
                    disabled={loading || !logUrl}
                    sx={{ minWidth: 180 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Load Log'}
                  </Button>
                </Box>
              </Paper>
            )}
            {(error || gqlError) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error || gqlError?.message}
              </Alert>
            )}
            {isLoggedIn && fights.length > 0 && selectedFightId == null && (
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Select a Fight
                </Typography>
                <List>
                  {fights.map((fight) => (
                    <ListItem key={fight.id} divider>
                      <ListItemButton
                        selected={selectedFightId === fight.id}
                        onClick={() => handleFightSelect(fight.id)}
                      >
                        <ListItemText
                          primary={fight.name}
                          secondary={`Time: ${fight.startTime} - ${fight.endTime}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {selectedFightId != null && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Button
                  variant="outlined"
                  sx={{ mb: 2 }}
                  onClick={() => dispatch(setFightId(null))}
                >
                  Back to Fight List
                </Button>
                <Typography variant="h6" gutterBottom>
                  Fight Details
                </Typography>
                {(() => {
                  const fight = fights.find((f) => f.id === selectedFightId);
                  return fight ? <FightDetails fight={fight} /> : null;
                })()}
              </Paper>
            )}
          </Box>
        </Container>
      )}
    </ReduxThemeProvider>
  );
};

// import OAuthRedirect from './OAuthRedirect';

const App: React.FC = () => {
  // Use AuthProvider to get access token
  // We need to wrap ApolloProvider inside AuthProvider to get the token
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <AuthApolloProvider />
        </AuthProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

const AuthApolloProvider: React.FC = () => {
  const { accessToken } = useAuth();
  const client = createEsoLogsClient(accessToken || '');
  return (
    <ApolloProvider client={client}>
      <HashRouter>
        <Routes>
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          <Route path="/graphiql" element={<GraphiQLPage />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </HashRouter>
    </ApolloProvider>
  );
};

export default App;
