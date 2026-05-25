import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

import { Footer } from '../components/Footer';
import { HeaderBar } from '../components/HeaderBar';
import { ReduxThemeProvider } from '../ReduxThemeProvider';
import { ReportFightProvider } from '../ReportFightContext';

const SkipNavLink: React.FC = () => (
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
        padding: '8px 16px',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 1,
        boxShadow: 4,
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
      },
    }}
  >
    Skip to main content
  </Box>
);

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [announcement, setAnnouncement] = React.useState('');

  // Check if we're on the landing page (root path)
  const isLandingPage = location.pathname === '/' || location.pathname === '';
  // Build editor needs a wider container and less vertical padding
  const isBuildEditor = location.pathname.startsWith('/build-editor');

  // Embed mode: strip chrome (header/footer) for iframe previews
  const isEmbed = searchParams.get('embed') === '1';

  React.useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(document.title), 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isEmbed) {
    return (
      <ReduxThemeProvider>
        <ReportFightProvider>
          <Box
            component="main"
            id="main-content"
            tabIndex={-1}
            sx={{
              bgcolor: 'background.default',
              color: 'text.primary',
              minHeight: '100vh',
              overflow: 'auto',
              outline: 'none',
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
          <SkipNavLink />
          <HeaderBar />
          <Container
            maxWidth={isBuildEditor ? 'xl' : 'md'}
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
                pt: { xs: isLandingPage ? 2 : 0, sm: isBuildEditor ? 2 : 8 },
                pb: { xs: isLandingPage ? 2 : 0, sm: isBuildEditor ? 2 : 4 },
                minHeight: 'calc(100vh - 200px)',
                outline: 'none',
              }}
            >
              <Outlet />
            </Box>
          </Container>
          <Footer />
          <Box
            aria-live="polite"
            role="status"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
            }}
          >
            {announcement}
          </Box>
        </Box>
      </ReportFightProvider>
    </ReduxThemeProvider>
  );
};
