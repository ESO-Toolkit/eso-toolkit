import {
  Login,
  Logout,
  Person,
  ExpandMore,
  Build,
  ExpandLess,
  Assessment,
} from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  useTheme,
  Container,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

const MobileMenuContent = styled(Box)<{ open: boolean }>(({ theme: _theme, open }) => ({
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

const MobileSubmenuContainer = styled(Box, {
  shouldForwardProp: (prop) => !['open', 'itemCount'].includes(prop as string),
})<{ open: boolean; itemCount?: number }>(({ theme, open, itemCount = 3 }) => ({
  width: '100%',
  overflow: 'hidden',
  // Calculate height dynamically based on number of items: items × (52px height + 4px margin) + top padding
  height: open ? `${itemCount * 56 + 4}px` : 0,
  transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  marginBottom: open ? theme.spacing(1) : 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: open ? theme.spacing(0.5) : 0,
  background: open
    ? theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(3, 7, 18, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.8) 100%)'
    : 'transparent',
  borderRadius: open ? '0 0 16px 16px' : 0,
  backdropFilter: open ? 'blur(10px)' : 'none',
}));

const BaseMobileSubmenuItem = styled(Button, {
  shouldForwardProp: (prop) => !['open', 'index', 'colorVariant'].includes(prop as string),
})<{
  open: boolean;
  index: number;
  colorVariant: 'default' | 'destructive' | 'positive';
}>(({ theme, open, index, colorVariant }) => {
  // Define color schemes for different variants
  const getColors = (): {
    borderLeft: string;
    borderLeftHover: string;
    borderHover: string;
    gradient: string;
    shadow: string;
  } => {
    switch (colorVariant) {
      case 'destructive':
        return {
          borderLeft:
            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.5)',
          borderLeftHover:
            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(220, 38, 38, 0.9)',
          borderHover:
            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(220, 38, 38, 0.3)',
          gradient:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(220, 38, 38, 0.02) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(220, 38, 38, 0.04) 0%, rgba(185, 28, 28, 0.02) 50%, transparent 100%)',
          shadow:
            theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(239, 68, 68, 0.12)'
              : '0 4px 12px rgba(220, 38, 38, 0.1)',
        };
      case 'positive':
        return {
          borderLeft:
            theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.5)',
          borderLeftHover:
            theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.9)',
          borderHover:
            theme.palette.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.25)'
              : 'rgba(100, 116, 139, 0.3)',
          gradient:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.06) 0%, rgba(100, 116, 139, 0.02) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(100, 116, 139, 0.04) 0%, rgba(71, 85, 105, 0.02) 50%, transparent 100%)',
          shadow:
            theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(148, 163, 184, 0.1)'
              : '0 4px 12px rgba(100, 116, 139, 0.08)',
        };
      default:
        return {
          borderLeft:
            theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.4)',
          borderLeftHover:
            theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)',
          borderHover:
            theme.palette.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.2)'
              : 'rgba(100, 116, 139, 0.25)',
          gradient:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.06) 0%, rgba(100, 116, 139, 0.02) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(100, 116, 139, 0.04) 0%, rgba(71, 85, 105, 0.02) 50%, transparent 100%)',
          shadow:
            theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(148, 163, 184, 0.1)'
              : '0 4px 12px rgba(100, 116, 139, 0.08)',
        };
    }
  };

  const colors = getColors();

  return {
    width: '100%',
    maxWidth: 'none',
    height: 52,
    marginBottom: theme.spacing(0.5),
    background: 'transparent',
    border: `1px solid transparent`,
    borderLeft: `2px solid ${colors.borderLeft}`,
    borderRadius: 8,
    color: theme.palette.mode === 'dark' ? '#ffffff' : '#0f172a',
    fontSize: '0.95rem',
    fontWeight: 500,
    textTransform: 'none',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    paddingLeft: theme.spacing(2),
    opacity: open ? 1 : 0,
    transform: open ? 'translateX(0) scale(1)' : 'translateX(-20px) scale(0.95)',
    transition: `all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`,
    transitionDelay: open ? `${0.1 + index * 0.08}s` : '0s',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.gradient,
      opacity: 0,
      transition: 'opacity 0.3s ease',
      borderRadius: 8,
    },
    '&:hover': {
      background:
        theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.6)',
      borderColor: colors.borderHover,
      borderLeftColor: colors.borderLeftHover,
      borderLeftWidth: '3px',
      transform: open ? 'translateX(2px) scale(1.02)' : 'translateX(-20px) scale(0.95)',
      boxShadow: colors.shadow,
      '&::before': {
        opacity: 1,
      },
    },
    '&:active': {
      transform: open ? 'translateX(1px) scale(1)' : 'translateX(-20px) scale(0.95)',
      background:
        theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
    },
  };
});

const AuthIconButton = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#0f172a',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.08)',
    transform: 'scale(1.1)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 4px 20px rgba(56, 189, 248, 0.15)'
        : '0 4px 20px rgba(59, 130, 246, 0.12)',
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

// Function to determine logo text based on current path
const getLogoText = (pathname: string): string => {
  // Landing page
  if (pathname === '/' || pathname === '') {
    return 'ESO Toolkit';
  }

  // Calculator page
  if (pathname.includes('/calculator')) {
    return 'ESO Toolkit';
  }

  // Text editor page
  if (pathname.includes('/text-editor')) {
    return 'ESO Toolkit';
  }

  // Log analyzer related pages (reports, logs, etc.)
  if (
    pathname.includes('/report/') ||
    pathname.includes('/logs') ||
    pathname.includes('/latest-reports') ||
    pathname.includes('/my-reports')
  ) {
    return 'ESO Toolkit';
  }

  // Default for other pages
  return 'ESO Toolkit';
};

export const HeaderBar: React.FC = () => {
  const { isLoggedIn, currentUser, userLoading, userError, refetchUser, rebindAccessToken } =
    useAuth();
  const hasRequestedUser = React.useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [toolsAnchorEl, setToolsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = React.useState(false);
  const [mobileReportsOpen, setMobileReportsOpen] = React.useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = React.useState(false);

  // Determine logo text based on current location
  const logoText = getLogoText(location.pathname);

  const userDisplayName = React.useMemo(() => {
    if (!currentUser) return '';
    return currentUser.naDisplayName || currentUser.euDisplayName || currentUser.name || '';
  }, [currentUser]);

  React.useEffect(() => {
    if (currentUser) {
      // Temporary debug log to verify header data flow
      // eslint-disable-next-line no-console
      console.log('[HeaderBar] Current user loaded', currentUser);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (isLoggedIn && !currentUser && !userLoading && !userError && !hasRequestedUser.current) {
      hasRequestedUser.current = true;
      void refetchUser();
    }
  }, [isLoggedIn, currentUser, userLoading, userError, refetchUser]);

  const userLabel = React.useMemo(() => {
    if (userDisplayName) return userDisplayName;
    if (userLoading) return 'Loading…';
    if (userError) return 'Account';
    return '';
  }, [userDisplayName, userLoading, userError]);

  React.useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = React.useCallback((): void => {
    startPKCEAuth();
    setMobileOpen(false);
  }, []);

  const handleLogout = React.useCallback((): void => {
    localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
    rebindAccessToken();
    navigate('/');
    setMobileOpen(false);
  }, [rebindAccessToken, navigate]);

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
    if (!mobileOpen) {
      // Reset submenus when opening mobile menu
      setMobileToolsOpen(false);
      setMobileReportsOpen(false);
      setMobileAccountOpen(false);
    }
  };

  const handleMobileToolsToggle = (): void => {
    if (!mobileToolsOpen) {
      // Close account and reports submenus if they're open
      setMobileAccountOpen(false);
      setMobileReportsOpen(false);
    }
    setMobileToolsOpen(!mobileToolsOpen);
  };

  const handleMobileReportsToggle = (): void => {
    if (!mobileReportsOpen) {
      // Close tools and account submenus if they're open
      setMobileToolsOpen(false);
      setMobileAccountOpen(false);
    }
    setMobileReportsOpen(!mobileReportsOpen);
  };

  const handleMobileAccountToggle = (): void => {
    if (!mobileAccountOpen) {
      // Close tools and reports submenus if they're open
      setMobileToolsOpen(false);
      setMobileReportsOpen(false);
    }
    setMobileAccountOpen(!mobileAccountOpen);
  };

  const handleAccountClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  const handleViewReports = (): void => {
    navigate('/my-reports');
    setAnchorEl(null);
  };

  const handleLogoutFromMenu = (): void => {
    handleLogout();
    setAnchorEl(null);
  };

  const handleToolsClick = (event: React.MouseEvent<HTMLElement>): void => {
    setToolsAnchorEl(event.currentTarget);
  };

  const handleToolsClose = (): void => {
    setToolsAnchorEl(null);
  };

  const handleReportsClick = (event: React.MouseEvent<HTMLElement>): void => {
    setReportsAnchorEl(event.currentTarget);
  };

  const handleReportsClose = (): void => {
    setReportsAnchorEl(null);
  };

  const handleToolNavigation = (path: string): void => {
    if (path.startsWith('http')) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
    setToolsAnchorEl(null);
    setReportsAnchorEl(null);
    setMobileOpen(false);
    setMobileToolsOpen(false);
    setMobileReportsOpen(false);
    setMobileAccountOpen(false);
  };

  const handleSampleReport = React.useCallback((): void => {
    navigate('/sample-report');
    setReportsAnchorEl(null);
    setMobileOpen(false);
    setMobileReportsOpen(false);
  }, [navigate]);

  const handleMobileViewReports = React.useCallback((): void => {
    navigate('/my-reports');
    setMobileOpen(false);
    setMobileAccountOpen(false);
  }, [navigate]);

  const handleMobileAuthAction = React.useCallback((): void => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      handleLogin();
    }
    setMobileOpen(false);
    setMobileAccountOpen(false);
  }, [isLoggedIn, handleLogout, handleLogin]);

  const toolsItems = [
    {
      text: 'Text Editor',
      icon: '📝',
      path: '/text-editor',
    },
    {
      text: 'Calculator',
      icon: <Calculator size="24" />,
      path: '/calculator',
    },
    {
      text: 'Logs',
      icon: '📋',
      path: '/logs',
    },
    {
      text: 'Parse Analysis',
      icon: '📈',
      path: '/parse-analysis',
    },
    {
      text: 'Calculation Knowledge Base',
      icon: '📚',
      path: '/docs/calculations',
    },
    {
      text: 'Roster Builder',
      icon: '👥',
      path: '/roster-builder',
    },
    {
      text: 'About',
      icon: 'ℹ️',
      path: '/about',
    },
  ];

  const reportsItems = React.useMemo(() => {
    const items = [];

    // Add "My Reports" if user is logged in
    if (isLoggedIn) {
      items.push({
        text: 'My Reports',
        icon: '📁',
        path: '/my-reports',
      });
    }

    // Always show these items
    items.push(
      {
        text: 'Sample Report',
        icon: '🎲',
        action: handleSampleReport,
      },
      {
        text: 'Latest Report',
        icon: '📊',
        path: '/latest-reports',
      },
      {
        text: 'Leaderboards',
        icon: '🏆',
        path: '/leaderboards',
      },
    );

    return items;
  }, [isLoggedIn, handleSampleReport]);

  const accountItems = React.useMemo(() => {
    const items: Array<{
      text: string;
      icon: React.ReactElement;
      action: () => void;
      colorVariant: 'default' | 'destructive' | 'positive';
    }> = [];

    if (isLoggedIn) {
      items.push({
        text: 'View my reports',
        icon: <Person sx={{ fontSize: 18 }} />,
        action: handleMobileViewReports,
        colorVariant: 'default',
      });
      items.push({
        text: 'Log out',
        icon: <Logout sx={{ fontSize: 18 }} />,
        action: handleMobileAuthAction,
        colorVariant: 'destructive',
      });
    } else {
      items.push({
        text: 'Log in',
        icon: <Login sx={{ fontSize: 18 }} />,
        action: handleMobileAuthAction,
        colorVariant: 'positive',
      });
    }
    return items;
  }, [isLoggedIn, handleMobileAuthAction, handleMobileViewReports]);

  const navItems = [
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
                    textTransform:
                      location.pathname === '/' || location.pathname === '' ? 'uppercase' : 'none',
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
                  {logoText}
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

              {/* Reports submenu button */}
              <Button
                color="inherit"
                onClick={handleReportsClick}
                endIcon={<ExpandMore />}
                startIcon={<Assessment />}
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
                Reports
              </Button>

              {/* Tools submenu button */}
              <Button
                color="inherit"
                onClick={handleToolsClick}
                endIcon={<ExpandMore />}
                startIcon={<Build />}
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
                Tools
              </Button>
              <ThemeToggle />
              {isLoggedIn ? (
                <Tooltip title="Account" arrow placement="bottom">
                  <Button
                    onClick={handleAccountClick}
                    startIcon={<Person />}
                    sx={{
                      display: { xs: 'none', sm: 'flex' },
                      maxWidth: 220,
                      fontWeight: 600,
                      color:
                        theme.palette.mode === 'dark'
                          ? theme.palette.grey[100]
                          : theme.palette.text.primary,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '999px',
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(59,130,246,0.12)'
                          : 'rgba(59,130,246,0.16)',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(59,130,246,0.2)'
                            : 'rgba(59,130,246,0.24)',
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {userLabel || 'Account'}
                    </Typography>
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip title="Log in" arrow placement="bottom">
                  <AuthIconButton onClick={handleLogin} aria-label="Log in">
                    <Login />
                  </AuthIconButton>
                </Tooltip>
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

      {/* Account Menu for Logged In Users */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 180,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: 2,
              '&::before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          },
        }}
      >
        <MenuItem
          onClick={handleViewReports}
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'rgba(59, 130, 246, 0.08)',
            },
          }}
        >
          <Person sx={{ mr: 1.5, fontSize: 20 }} />
          View my reports
        </MenuItem>
        <MenuItem
          onClick={handleLogoutFromMenu}
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 1,
            mx: 1,
            color: 'error.main',
            '&:hover': {
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(220, 38, 38, 0.08)',
            },
          }}
        >
          <Logout sx={{ mr: 1.5, fontSize: 20 }} />
          Log out
        </MenuItem>
      </Menu>

      {/* Tools Submenu */}
      <Menu
        anchorEl={toolsAnchorEl}
        open={Boolean(toolsAnchorEl)}
        onClose={handleToolsClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 180,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: 2,
              '&::before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          },
        }}
      >
        {toolsItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => handleToolNavigation(item.path)}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&:hover': {
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.08)'
                    : 'rgba(59, 130, 246, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {typeof item.icon === 'string' ? (
                <Box sx={{ fontSize: 18 }}>{item.icon}</Box>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </MenuItem>
        ))}
      </Menu>

      {/* Reports Submenu */}
      <Menu
        anchorEl={reportsAnchorEl}
        open={Boolean(reportsAnchorEl)}
        onClose={handleReportsClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 180,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: 2,
              '&::before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          },
        }}
      >
        {reportsItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (item.path) {
                handleToolNavigation(item.path);
              }
            }}
            sx={{
              py: 1.5,
              px: 2,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&:hover': {
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.08)'
                    : 'rgba(59, 130, 246, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {typeof item.icon === 'string' ? (
                <Box sx={{ fontSize: 18 }}>{item.icon}</Box>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </MenuItem>
        ))}
      </Menu>

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
              textTransform:
                location.pathname === '/' || location.pathname === '' ? 'uppercase' : 'none',
            }}
          >
            <img src={esoLogo} alt="ESO Helpers" style={{ width: 32, height: 32 }} />
            {logoText}
          </Typography>

          {navItems.map((item, index) => (
            <MobileNavButton
              key={item.text}
              href={item.href}
              onClick={(_e: React.MouseEvent) => {
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

          {/* Reports submenu in mobile menu */}
          <Box>
            <MobileNavButton
              onClick={handleMobileReportsToggle}
              endIcon={mobileReportsOpen ? <ExpandLess /> : <ExpandMore />}
              startIcon={<Assessment />}
              sx={{
                animationDelay: `${navItems.length * 0.1}s`,
                animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                background: mobileReportsOpen
                  ? theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)'
                  : theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                borderColor: mobileReportsOpen
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.4)'
                    : 'rgba(59, 130, 246, 0.3)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(59, 130, 246, 0.15)',
                borderRadius: mobileReportsOpen ? '16px 16px 0 0' : '16px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: mobileReportsOpen
                    ? theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.12) 100%)'
                    : theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.4)'
                      : 'rgba(59, 130, 246, 0.25)',
                },
                '@keyframes slideInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              Reports
            </MobileNavButton>

            {/* Reports submenu items */}
            <MobileSubmenuContainer open={mobileReportsOpen} itemCount={reportsItems.length}>
              {reportsItems.map((item, index) => (
                <BaseMobileSubmenuItem
                  key={item.text}
                  open={mobileReportsOpen}
                  index={index}
                  colorVariant="default"
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      handleToolNavigation(item.path);
                    }
                  }}
                  startIcon={
                    typeof item.icon === 'string' ? (
                      <Box sx={{ fontSize: 18, mr: 1 }}>{item.icon}</Box>
                    ) : (
                      <Box sx={{ mr: 1 }}>{item.icon}</Box>
                    )
                  }
                >
                  {item.text}
                </BaseMobileSubmenuItem>
              ))}
            </MobileSubmenuContainer>
          </Box>

          {/* Tools submenu in mobile menu */}
          <Box>
            <MobileNavButton
              onClick={handleMobileToolsToggle}
              endIcon={mobileToolsOpen ? <ExpandLess /> : <ExpandMore />}
              startIcon={<Build />}
              sx={{
                animationDelay: `${navItems.length * 0.1}s`,
                animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                background: mobileToolsOpen
                  ? theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)'
                  : theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                borderColor: mobileToolsOpen
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.4)'
                    : 'rgba(59, 130, 246, 0.3)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(59, 130, 246, 0.15)',
                borderRadius: mobileToolsOpen ? '16px 16px 0 0' : '16px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: mobileToolsOpen
                    ? theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.12) 100%)'
                    : theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.4)'
                      : 'rgba(59, 130, 246, 0.25)',
                },
                '@keyframes slideInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              Tools
            </MobileNavButton>

            {/* Tools submenu items */}
            <MobileSubmenuContainer open={mobileToolsOpen} itemCount={toolsItems.length}>
              {toolsItems.map((item, index) => (
                <BaseMobileSubmenuItem
                  key={item.text}
                  open={mobileToolsOpen}
                  index={index}
                  colorVariant="default"
                  onClick={() => handleToolNavigation(item.path)}
                  startIcon={
                    typeof item.icon === 'string' ? (
                      <Box sx={{ fontSize: 18, mr: 1 }}>{item.icon}</Box>
                    ) : (
                      <Box sx={{ mr: 1 }}>{item.icon}</Box>
                    )
                  }
                >
                  {item.text}
                </BaseMobileSubmenuItem>
              ))}
            </MobileSubmenuContainer>
          </Box>

          {/* Account submenu in mobile menu */}
          <Box>
            <MobileNavButton
              onClick={handleMobileAccountToggle}
              endIcon={mobileAccountOpen ? <ExpandLess /> : <ExpandMore />}
              startIcon={<Person />}
              sx={{
                animationDelay: `${(navItems.length + 1) * 0.1}s`,
                animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                background: mobileAccountOpen
                  ? theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(29, 78, 216, 0.08) 100%)'
                  : theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(29, 78, 216, 0.04) 100%)',
                borderColor: mobileAccountOpen
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(59, 130, 246, 0.4)'
                    : 'rgba(37, 99, 235, 0.3)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(37, 99, 235, 0.15)',
                borderRadius: mobileAccountOpen ? '16px 16px 0 0' : '16px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: mobileAccountOpen
                    ? theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(29, 78, 216, 0.12) 100%)'
                    : theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(29, 78, 216, 0.08) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(59, 130, 246, 0.4)'
                      : 'rgba(37, 99, 235, 0.25)',
                },
                '@keyframes slideInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              Account
            </MobileNavButton>

            {/* Account submenu items */}
            <MobileSubmenuContainer open={mobileAccountOpen} itemCount={accountItems.length}>
              {accountItems.map((item, index) => (
                <BaseMobileSubmenuItem
                  key={item.text}
                  open={mobileAccountOpen}
                  index={index}
                  colorVariant={item.colorVariant}
                  onClick={item.action}
                  startIcon={<Box sx={{ mr: 1 }}>{item.icon}</Box>}
                >
                  {item.text}
                </BaseMobileSubmenuItem>
              ))}
            </MobileSubmenuContainer>
          </Box>
        </MobileMenuContent>
      </MobileMenuOverlay>
    </>
  );
};
