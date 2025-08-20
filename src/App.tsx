import { ApolloProvider } from '@apollo/client';
import LinkIcon from '@mui/icons-material/Link';
import { Box, Paper, Button, TextField } from '@mui/material';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';

import { AuthProvider, useAuth } from './AuthContext';
import { createEsoLogsClient } from './esologsClient';
import ReportFightDetails from './features/ReportFightDetails';
import ReportFights from './features/ReportFights';
import AppLayout from './layouts/AppLayout';
import OAuthRedirect from './OAuthRedirect';
import store, { persistor } from './store/storeWithHistory';

const MainApp: React.FC = () => {
  const [logUrl, setLogUrl] = React.useState('');
  const navigate = useNavigate();

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogUrl(e.target.value);
  };

  const extractReportId = (url: string) => {
    // Example: https://www.esologs.com/reports/dVZXRHYNCDWqLmbM
    const match = url.match(/reports\/([A-Za-z0-9]+)/);
    return match ? match[1] : '';
  };

  const handleLoadLog = () => {
    const code = extractReportId(logUrl);
    if (code) {
      navigate(`/report/${code}`);
    } else {
      alert('Invalid ESOLogs report URL');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="ESOLogs.com Log URL"
          variant="outlined"
          value={logUrl}
          onChange={handleLogUrlChange}
          fullWidth
          InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1 }} /> }}
        />
        <Button
          variant="contained"
          color="secondary"
          sx={{ minWidth: 180 }}
          onClick={handleLoadLog}
        >
          Load Log
        </Button>
      </Box>
    </Paper>
  );
};

const App: React.FC = () => {
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
          <Route element={<AppLayout />}>
            {/* Pass fights as prop via state, fallback to empty array if not present */}
            <Route path="/report/:reportId/fight/:fightId" element={<ReportFightDetails />} />
            <Route path="/report/:reportId" element={<ReportFights />} />
            <Route path="/*" element={<MainApp />} />
          </Route>
        </Routes>
      </HashRouter>
    </ApolloProvider>
  );
};

export default App;
