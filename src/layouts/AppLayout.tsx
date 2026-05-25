import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from '../components/Footer';
import { HeaderBar } from '../components/HeaderBar';
import { ReduxThemeProvider } from '../ReduxThemeProvider';
import { ReportFightProvider } from '../ReportFightContext';

const ROUTE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/calculator': 'Calculator',
  '/text-editor': 'Text Editor',
  '/logs': 'Log Analyzer',
  '/leaderboards': 'Leaderboards',
  '/scribing-simulator': 'Scribing Simulator',
  '/docs/calculations': 'Calculation Knowledge Base',
  '/login': 'Log In',
  '/my-reports': 'My Reports',
  '/latest-reports': 'Latest Reports',
  '/whoami': 'Who Am I',
  '/sample-report': 'Sample Report',
  '/parse-analysis': 'Parse Analysis',
  '/banned': 'Access Denied',
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [routeAnnouncement, setRouteAnnouncement] = React.useState('');

  React.useEffect(() => {
    const name = ROUTE_NAMES[location.pathname] || 'Page';
    setRouteAnnouncement(`Navigated to ${name}`);
  }, [location.pathname]);

  const isLandingPage = location.pathname === '/' || location.pathname === '';

  return (
    <ReduxThemeProvider>
      <ReportFightProvider>
        <Box
          sx={{
            position: 'relative',
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            component="a"
            href="#main-content"
            sx={{
              position: 'absolute',
              left: '-9999px',
              top: 'auto',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              '&:focus': {
                position: 'fixed',
                top: 16,
                left: 16,
                width: 'auto',
                height: 'auto',
                padding: '12px 24px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                zIndex: 9999,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
                boxShadow: 4,
              },
            }}
          >
            Skip to main content
          </Box>
          <HeaderBar />
          <Container
            maxWidth="md"
            sx={{
              px: { xs: isLandingPage ? 2 : 0, sm: 2 },
              flex: 1,
            }}
          >
            <Box
              component="main"
              id="main-content"
              tabIndex={-1}
              sx={{
                pt: { xs: isLandingPage ? 2 : 0, sm: 8 },
                pb: { xs: isLandingPage ? 2 : 0, sm: 4 },
                minHeight: 'calc(100vh - 200px)',
                overflowY: 'auto',
                outline: 'none',
              }}
            >
              <Outlet />
            </Box>
          </Container>
          <Footer />
          <Box
            aria-live="polite"
            aria-atomic="true"
            role="status"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {routeAnnouncement}
          </Box>
        </Box>
      </ReportFightProvider>
    </ReduxThemeProvider>
  );
};
