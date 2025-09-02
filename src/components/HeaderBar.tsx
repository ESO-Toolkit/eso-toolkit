import { AppBar, Toolbar, Typography, Button, Box, IconButton, useTheme, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import discordIcon from '../assets/discord-icon.svg';
import esoLogo from '../assets/ESOHelpers-logo-icon.svg';
import { LOCAL_STORAGE_ACCESS_TOKEN_KEY, startPKCEAuth } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';

import { ThemeToggle } from './ThemeToggle';

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
    backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
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
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)'
      : 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
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
    background:
      theme.palette.mode === 'dark'
        ? 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.1) 0%, transparent 70%)'
        : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
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
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(0, 225, 255, 0.05) 100%)'
      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(59, 130, 246, 0.15)',
  borderRadius: 16,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#0f172a',
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
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
        : 'linear-gradient(90deg, transparent, rgba(15, 23, 42, 0.1), transparent)',
    transition: 'left 0.6s ease',
  },
  '&:hover': {
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(0, 225, 255, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
    borderColor:
      theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(59, 130, 246, 0.25)',
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 10px 30px rgba(56, 189, 248, 0.2)'
        : '0 10px 30px rgba(59, 130, 246, 0.15)',
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
  background:
    theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.08)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(59, 130, 246, 0.15)',
  borderRadius: 12,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#0f172a',
  transition: 'all 0.3s ease',
  '&:hover': {
    background:
      theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.12)',
    transform: 'rotate(90deg) scale(1.1)',
  },
}));

// Calculator SVG icon component
type CalculatorProps = {
  size: string;
};

const Calculator = ({ size }: CalculatorProps): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 48 48"
    aria-hidden="true"
    focusable="false"
  >
    <path fill="#616161" d="M40 16H8v24c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V16z" />
    <path fill="#424242" d="M36 4H12C9.8 4 8 5.8 8 8v9h32V8c0-2.2-1.8-4-4-4z" />
    <path
      fill="#9CCC65"
      d="M36 14H12c-.6 0-1-.4-1-1V8c0-.6.4-1 1-1h24c.6 0 1 .4 1 1v5c0 .6-.4 1-1 1z"
    />
    <path fill="#33691E" d="M33 10h2v2h-2zm-4 0h2v2h-2z" />
    <path
      fill="#FF5252"
      d="M36 23h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z"
    />
    <path
      fill="#E0E0E0"
      d="M15 23h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm-14 6h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm-14 6h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm-14 6h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm7 0h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z"
    />
    <path
      fill="#BDBDBD"
      d="M36 29h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm0 6h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1zm0 6h-3c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z"
    />
  </svg>
);

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
      icon: <Calculator size="18" />,
      href: 'https://esohelper.tools/calculator',
    },
    {
      text: 'Discord',
      icon: <img src={discordIcon} alt="Discord" style={{ width: 18, height: 18 }} />,
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
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Toolbar sx={{ display: 'flex', gap: 2, px: 0, minHeight: 64 }}>
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
                  fontFamily: 'Space Grotesk,Inter,system-ui',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)'
                      : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                <img src={esoLogo} alt="ESO Helpers" style={{ width: 30, height: 30 }} />
                Log Analyzer
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
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    borderRadius: 'inherit',
                  },
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.08)'
                        : 'rgba(59, 130, 246, 0.06)',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(59, 130, 246, 0.15)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 20px rgba(56, 189, 248, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
                        : '0 4px 20px rgba(59, 130, 246, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
                    '&::before': {
                      opacity: 1,
                    },
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                }}
              >
                {item.text}
              </Button>
            ))}
            <ThemeToggle />
            {isLoggedIn ? (
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'rgba(220, 38, 38, 0.06)',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(220, 38, 38, 0.15)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 20px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
                        : '0 4px 20px rgba(220, 38, 38, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                }}
              >
                Log out
              </Button>
            ) : (
              <Button
                color="inherit"
                onClick={handleLogin}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(34, 197, 94, 0.08)'
                        : 'rgba(22, 163, 74, 0.06)',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(22, 163, 74, 0.15)',
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 20px rgba(34, 197, 94, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
                        : '0 4px 20px rgba(22, 163, 74, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                }}
              >
                Log in
              </Button>
            )}
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
            <HamburgerButton
              open={mobileOpen}
              onClick={handleDrawerToggle}
              aria-label="toggle navigation"
            >
              <HamburgerLines>
                <Box className="hamburger-line" />
                <Box className="hamburger-line" />
                <Box className="hamburger-line" />
              </HamburgerLines>
            </HamburgerButton>
          </Box>
          </Toolbar>
        </Container>
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
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <img src={esoLogo} alt="ESO Helpers" style={{ width: 32, height: 32 }} />
            ESO Helper
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
              animationDelay: `${navItems.length * 0.1 + 0.1}s`,
              animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
              background: isLoggedIn
                ? theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(185, 28, 28, 0.04) 100%)'
                : theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(21, 128, 61, 0.04) 100%)',
              borderColor: isLoggedIn
                ? theme.palette.mode === 'dark'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(220, 38, 38, 0.15)'
                : theme.palette.mode === 'dark'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(22, 163, 74, 0.15)',
              '&:hover': {
                background: isLoggedIn
                  ? theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(185, 28, 28, 0.08) 100%)'
                  : theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(22, 163, 74, 0.12) 0%, rgba(21, 128, 61, 0.08) 100%)',
                borderColor: isLoggedIn
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(220, 38, 38, 0.25)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(34, 197, 94, 0.4)'
                    : 'rgba(22, 163, 74, 0.25)',
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
