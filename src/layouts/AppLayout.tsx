import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from '../components/Footer';
import { HeaderBar } from '../components/HeaderBar';
import { ReduxThemeProvider } from '../ReduxThemeProvider';
import { ReportFightProvider } from '../ReportFightContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  // Check if we're on the landing page (root path)
  const isLandingPage = location.pathname === '/' || location.pathname === '';

  return (
    <ReduxThemeProvider>
      <ReportFightProvider>
        <Box
          sx={{
            position: 'relative',
            minHeight: '100vh',
            bgcolor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
          }}
        >
          <HeaderBar />
          <Container
            maxWidth="md"
            sx={{
              px: { xs: isLandingPage ? 2 : 0, sm: 2 },
              flex: 1,
            }}
          >
            <Box
              sx={{
                pt: { xs: isLandingPage ? 2 : 0, sm: 8 },
                pb: { xs: isLandingPage ? 2 : 0, sm: 4 },
                minHeight: 'calc(100vh - 200px)',
                overflowY: 'auto',
              }}
            >
              <Outlet />
            </Box>
          </Container>
          <Footer />
        </Box>
      </ReportFightProvider>
    </ReduxThemeProvider>
  );
};
