import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

const ROUTE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/text-editor': 'Text Editor',
  '/calculator': 'Calculator',
  '/parse-analysis': 'Parse Analysis',
  '/loadout-manager': 'Loadout Manager',
  '/roster-builder': 'Roster Builder',
  '/build-editor': 'Build Editor',
  '/roster-hub': 'Roster Hub',
  '/build-hub': 'Build Hub',
  '/pack-hub': 'Pack Hub',
  '/my-reports': 'My Reports',
  '/latest-reports': 'Latest Reports',
  '/leaderboards': 'Leaderboards',
  '/sample-report': 'Sample Report',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
};

import { Footer } from '../components/Footer';
import { HeaderBar } from '../components/HeaderBar';
import { ReduxThemeProvider } from '../ReduxThemeProvider';
import { ReportFightProvider } from '../ReportFightContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [routeAnnouncement, setRouteAnnouncement] = React.useState('');

  React.useEffect(() => {
    const name = ROUTE_NAMES[location.pathname] || 'Page';
    setRouteAnnouncement(`Navigated to ${name}`);
  }, [location.pathname]);

  // Check if we're on the landing page (root path)
  const isLandingPage = location.pathname === '/' || location.pathname === '';
  // Build editor needs a wider container and less vertical padding
  const isBuildEditor = location.pathname.startsWith('/build-editor');

  // Embed mode: strip chrome (header/footer) for iframe previews
  const isEmbed = searchParams.get('embed') === '1';

  if (isEmbed) {
    return (
      <ReduxThemeProvider>
        <ReportFightProvider>
          <Box
            sx={{
              bgcolor: 'background.default',
              color: 'text.primary',
              minHeight: '100vh',
              overflow: 'auto',
            }}
          >
            <Outlet />
          </Box>
        </ReportFightProvider>
      </ReduxThemeProvider>
    );
  }

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
              zIndex: 9999,
              '&:focus': {
                position: 'fixed',
                top: 8,
                left: 8,
                width: 'auto',
                height: 'auto',
                overflow: 'visible',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 4,
              },
            }}
          >
            Skip to main content
          </Box>
          <HeaderBar />
          <Box
            component="main"
            id="main-content"
            tabIndex={-1}
            sx={{ outline: 'none', flex: 1 }}
          >
            <Container
              maxWidth={isBuildEditor ? 'xl' : 'md'}
              sx={{
                px: { xs: isLandingPage ? 2 : 0, sm: 2 },
              }}
            >
              <Box
                sx={{
                  pt: { xs: isLandingPage ? 2 : 0, sm: isBuildEditor ? 2 : 8 },
                  pb: { xs: isLandingPage ? 2 : 0, sm: isBuildEditor ? 2 : 4 },
                  minHeight: 'calc(100vh - 200px)',
                }}
              >
                <Outlet />
              </Box>
            </Container>
          </Box>
          <Box
            aria-live="polite"
            aria-atomic="true"
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {routeAnnouncement}
          </Box>
          <Footer />
        </Box>
      </ReportFightProvider>
    </ReduxThemeProvider>
  );
};
