import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet } from 'react-router-dom';

import { HeaderBar } from '../components/HeaderBar';
import { useAuth } from '../features/auth/AuthContext';
import { Login } from '../features/auth/Login';
import { ReduxThemeProvider } from '../ReduxThemeProvider';
import { ReportFightProvider } from '../ReportFightContext';

export const AppLayout: React.FC = () => {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'background.default' }}>
        <HeaderBar />
        <Container 
          maxWidth="md"
          sx={{
            px: { xs: 0, sm: 2 }
          }}
        >
          <Box sx={{ pt: { xs: 0, sm: 2 }, pb: { xs: 0, sm: 4 }, minHeight: '100vh', overflowY: 'auto' }}>
            <Login />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <ReduxThemeProvider>
      <ReportFightProvider>
        <Box sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'background.default' }}>
          <HeaderBar />
          <Container 
            maxWidth="md"
            sx={{
              px: { xs: 0, sm: 2 }
            }}
          >
            <Box sx={{ pt: { xs: 0, sm: 8}, pb: { xs: 0, sm: 4 }, minHeight: '100vh', overflowY: 'auto' }}>
              <Outlet />
            </Box>
          </Container>
        </Box>
      </ReportFightProvider>
    </ReduxThemeProvider>
  );
};
