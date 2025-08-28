import { AppBar, Toolbar, Typography, Button, Box, IconButton, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ReactComponent as DiscordIcon } from '../assets/discord-icon.svg';
import { LOCAL_STORAGE_ACCESS_TOKEN_KEY, startPKCEAuth } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';

// Animated Hamburger Icon
const HamburgerButton = styled(IconButton)<{ open: boolean }>(({ theme, open }) => ({
  width: 48,
  height: 48,
  padding: 12,
  borderRadius: 8,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    transform: 'scale(1.05)',
  },
  '& .hamburger-line': {
    width: 24,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'center',
    '&:nth-of-type(1)': {
      transform: open ? 'translateY(7px) rotate(45deg)' : 'translateY(0) rotate(0)',
    },
    '&:nth-of-type(2)': {
      opacity: open ? 0 : 1,
      transform: open ? 'scaleX(0)' : 'scaleX(1)',
    },
    '&:nth-of-type(3)': {
      transform: open ? 'translateY(-7px) rotate(-45deg)' : 'translateY(0) rotate(0)',
    },
  },
}));

const HamburgerLines = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  width: 24,
  height: 24,
  justifyContent: 'center',
});

// Modern Mobile Menu Overlay
const MobileMenuOverlay = styled(Box)<{ open: boolean }>(({ theme, open }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)',
  backdropFilter: 'blur(20px)',
  zIndex: 1300,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: open ? 1 : 0,
  visibility: open ? 'visible' : 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
    animation: open ? 'pulse-bg 4s ease-in-out infinite alternate' : 'none',
  },
  '@keyframes pulse-bg': {
    '0%': { opacity: 0.3, transform: 'scale(0.8)' },
    '100%': { opacity: 0.6, transform: 'scale(1.2)' },
  },
}));

const MobileMenuContent = styled(Box)<{ open: boolean }>(({ theme, open }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2rem',
  zIndex: 1,
  transform: open ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)',
  opacity: open ? 1 : 0,
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  transitionDelay: open ? '0.1s' : '0s',
}));

const MobileNavButton = styled(Button)(({ theme }) => ({
  minWidth: 280,
  height: 64,
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(0, 225, 255, 0.05) 100%)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: 16,
  color: '#ffffff',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    transition: 'left 0.6s ease',
  },
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(0, 225, 255, 0.1) 100%)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 10px 30px rgba(56, 189, 248, 0.2)',
    '&::before': {
      left: '100%',
    },
  },
  '&:active': {
    transform: 'translateY(0) scale(1)',
  },
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 20,
  right: 20,
  width: 48,
  height: 48,
  background: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: 12,
  color: '#ffffff',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(56, 189, 248, 0.2)',
    transform: 'rotate(90deg) scale(1.1)',
  },
}));

export const HeaderBar: React.FC = () => {
  const { isLoggedIn, rebindAccessToken } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = (): void => {
    startPKCEAuth();
    setMobileOpen(false);
  };

  const handleLogout = (): void => {
    localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
    rebindAccessToken();
    navigate('/');
    setMobileOpen(false);
  };

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    {
      text: 'Text Editor',
      icon: '📝',
      href: 'https://esohelper.tools/text-editor',
    },
    {
      text: 'Calculator',
      icon: '🧮',
      href: 'https://esohelper.tools/calculator',
    },
    {
      text: 'Discord',
      icon: <DiscordIcon style={{ width: 18, height: 18 }} />,
      href: 'https://discord.gg/mMjwcQYFdc',
    },
  ];

  return (
    <>
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
                ESO Helper
              </Typography>
            </Button>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
            {navItems.map((item) => (
              <Button
                key={item.text}
                color="inherit"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="u-focus-ring u-hover-glow"
                startIcon={
                  typeof item.icon === 'string' ? (
                    <Box
                      component="span"
                      role="img"
                      aria-label={item.text.toLowerCase()}
                      sx={{ fontSize: 16, lineHeight: 1, display: 'inline-block' }}
                    >
                      {item.icon}
                    </Box>
                  ) : (
                    item.icon
                  )
                }
              >
                {item.text}
              </Button>
            ))}
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

          <HamburgerButton
            open={mobileOpen}
            onClick={handleDrawerToggle}
            sx={{ display: { xs: 'block', md: 'none' } }}
            aria-label="toggle navigation"
          >
            <HamburgerLines>
              <Box className="hamburger-line" />
              <Box className="hamburger-line" />
              <Box className="hamburger-line" />
            </HamburgerLines>
          </HamburgerButton>
        </Toolbar>
      </AppBar>

      {/* Modern Mobile Menu Overlay */}
      <MobileMenuOverlay open={mobileOpen}>
        <CloseButton onClick={handleDrawerToggle} aria-label="close menu">
          ✕
        </CloseButton>
        
        <MobileMenuContent open={mobileOpen}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #00e1ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2
            }}
          >
            ⚔️ ESO Helper
          </Typography>
          
          {navItems.map((item, index) => (
            <MobileNavButton
              key={item.text}
              href={item.href}
              onClick={(e: React.MouseEvent) => {
                window.open(item.href, '_blank', 'noopener,noreferrer');
                handleDrawerToggle();
              }}
              startIcon={
                typeof item.icon === 'string' ? (
                  <Box sx={{ fontSize: 20, mr: 1 }}>{item.icon}</Box>
                ) : (
                  <Box sx={{ mr: 1 }}>{item.icon}</Box>
                )
              }
              sx={{
                animationDelay: `${index * 0.1}s`,
                animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                '@keyframes slideInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              {item.text}
            </MobileNavButton>
          ))}
          
          <MobileNavButton
            onClick={isLoggedIn ? handleLogout : handleLogin}
            sx={{
              animationDelay: `${navItems.length * 0.1}s`,
              animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
              background: isLoggedIn 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
              borderColor: isLoggedIn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              '&:hover': {
                background: isLoggedIn 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)',
                borderColor: isLoggedIn ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)',
              },
              '@keyframes slideInUp': {
                '0%': { opacity: 0, transform: 'translateY(30px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            {isLoggedIn ? 'Log out' : 'Log in'}
          </MobileNavButton>
        </MobileMenuContent>
      </MobileMenuOverlay>
    </>
  );
};
