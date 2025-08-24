import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { startPKCEAuth } from '../auth';
import { useAuth } from '../AuthContext';

const HeaderBar: React.FC = () => {
  const { isLoggedIn, rebindAccessToken } = useAuth();
  // Dark mode toggle is disabled for now; keeping theme in dark mode only.
  const navigate = useNavigate();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = (): void => {
    startPKCEAuth();
  };

  const handleLogout = (): void => {
    localStorage.removeItem('access_token');
    rebindAccessToken();
    navigate('/');
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.35)' : 'none',
        transition: 'box-shadow .2s ease',
      }}
    >
      <Toolbar sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <Button
            color="inherit"
            sx={{ p: 0, minWidth: 0, '&:hover': { background: 'transparent' } }}
            onClick={() => navigate('/')}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontWeight: 800,
                letterSpacing: '-.02em',
                background:
                  'linear-gradient(135deg, #ffffff 0%, var(--accent) 50%, var(--accent-2) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <span role="img" aria-label="sword">
                ⚔️
              </span>
              ESO Insights Helper
            </Typography>
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            color="inherit"
            href="https://esohelper.tools/text-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="u-focus-ring u-hover-glow"
          >
            Text Editor
          </Button>
          <Button
            color="inherit"
            href="https://esohelper.tools/calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="u-focus-ring u-hover-glow"
          >
            Calculator
          </Button>
          <Button
            color="inherit"
            href="https://discord.gg/mMjwcQYFdc"
            target="_blank"
            rel="noopener noreferrer"
            className="u-focus-ring u-hover-glow"
          >
            Discord
          </Button>
          {isLoggedIn ? (
            <Button color="inherit" onClick={handleLogout} className="u-focus-ring u-hover-glow">
              Log out
            </Button>
          ) : (
            <Button color="inherit" onClick={handleLogin} className="u-focus-ring u-hover-glow">
              Log in
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderBar;
