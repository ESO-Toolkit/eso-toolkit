import {
  Login,
  Logout,
  Person,
  ExpandMore,
  Build,
  Assessment,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
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
  Fade,
  Divider,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, styled } from '@mui/material/styles';
import React from 'react';
import { useLocation } from 'react-router-dom';

import esoLogo from '../assets/ESOHelpers-logo-icon.svg';
import { LOCAL_STORAGE_ACCESS_TOKEN_KEY, startPKCEAuth } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';
import { usePersistentDarkMode } from '../hooks/usePersistentDarkMode';
import {
  useViewTransitionNavigate,
  type ViewTransitionType,
} from '../hooks/useViewTransitionNavigate';

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

// ─── Mobile Bottom Sheet Components ─────────────────────────────────────────

const MobileBackdrop = styled(Box)<{ open: boolean }>(({ open }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 1299,
  opacity: open ? 1 : 0,
  visibility: open ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease',
}));

const MobileBottomSheet = styled(Box)<{ open: boolean }>(({ theme, open }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80dvh',
    boxSizing: 'border-box',
    zIndex: 1300,
    background: isDark
      ? 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.99) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.99) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '20px 20px 0 0',
    border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.08)'}`,
    borderBottom: 'none',
    boxShadow: isDark
      ? '0 -20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 -20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
    '@keyframes sheetItemIn': {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: noiseTexture,
      backgroundSize: '128px 128px',
      opacity: isDark ? 0.3 : 0.15,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      zIndex: 0,
    },
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
      background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      borderRadius: 2,
    },
  };
});

const MobileSheetItem = styled(Box)<{ active?: boolean }>(({ theme, active }) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 12,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    background: active ? (isDark ? alpha(accent, 0.1) : alpha(accent, 0.06)) : 'transparent',
    ...(active && {
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: 3,
        borderRadius: 2,
        background: accent,
      },
    }),
    '&:active': {
      transform: 'scale(0.98)',
      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    '@media (hover: hover)': {
      '&:hover': {
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      },
    },
  };
});

const MobileSectionLabel = styled(Typography)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.6)',
    padding: '16px 20px 6px',
    fontFamily: 'Space Grotesk, Inter, system-ui',
    position: 'relative',
    zIndex: 1,
  };
});

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

// ─── Shared desktop nav button styles ────────────────────────────────────────

const navButtonSx = (theme: Theme) =>
  ({
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
        theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(59, 130, 246, 0.06)',
      borderColor:
        theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(59, 130, 246, 0.15)',
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 4px 20px rgba(56, 189, 248, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
          : '0 4px 20px rgba(59, 130, 246, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
      '&::before': { opacity: 1 },
    },
    '&:active': { transform: 'translateY(0)' },
  }) as const;

// ─── SVG noise texture for dropdown panels ──────────────────────────────────

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`;

// ─── Shared dropdown paper styles ────────────────────────────────────────────

const dropdownPaperSx = (theme: Theme): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';
  const accentAlt = isDark ? '#0ea5e9' : '#2563eb';

  return {
    overflow: 'hidden',
    mt: 1,
    minWidth: 280,
    background: isDark
      ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.88) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.94) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${alpha(accent, isDark ? 0.12 : 0.1)}`,
    borderRadius: '16px',
    boxShadow: isDark
      ? `0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px ${alpha(accent, 0.08)}, inset 0 1px 0 ${alpha('#fff', 0.05)}`
      : `0 20px 60px rgba(15, 23, 42, 0.15), 0 0 0 1px ${alpha(accent, 0.06)}`,
    py: 0,
    // Stagger entrance for children
    '@keyframes dropdownShimmer': {
      '0%': { backgroundPosition: '-200% center' },
      '100%': { backgroundPosition: '200% center' },
    },
    '@keyframes menuItemIn': {
      '0%': { opacity: 0, transform: 'translateY(8px) scale(0.96)' },
      '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
    },
    // Animated shimmer accent line
    '&::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: `linear-gradient(90deg, transparent 0%, ${accent} 15%, ${accentAlt} 50%, ${accent} 85%, transparent 100%)`,
      backgroundSize: '200% 100%',
      animation: 'dropdownShimmer 3s linear infinite',
      zIndex: 2,
    },
    // Noise texture + spotlight layer
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: noiseTexture,
      backgroundSize: '128px 128px',
      opacity: isDark ? 0.4 : 0.2,
      pointerEvents: 'none',
      zIndex: 0,
      borderRadius: 'inherit',
    },
    // Spotlight glow follows --mouse-x / --mouse-y (set via JS)
    '& > .dropdown-spotlight': {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      borderRadius: 'inherit',
      background: `radial-gradient(320px circle at var(--mouse-x, 50%) var(--mouse-y, 0%), ${alpha(accent, isDark ? 0.07 : 0.05)}, transparent 60%)`,
      transition: 'background 0.15s ease',
    },
  };
};

// ─── Dropdown section header ─────────────────────────────────────────────────

const dropdownHeaderSx = (theme: Theme, _label: string): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';
  const accentAlt = isDark ? '#0ea5e9' : '#2563eb';

  return {
    px: 2,
    pt: 2,
    pb: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    position: 'relative',
    zIndex: 1,
    // Section label gradient
    '& .dropdown-header-label': {
      fontFamily: 'Space Grotesk, Inter, system-ui',
      fontWeight: 700,
      fontSize: '0.7rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      background: `linear-gradient(135deg, ${accent} 0%, ${accentAlt} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    // Fading separator line
    '&::after': {
      content: '""',
      flex: 1,
      height: '1px',
      background: `linear-gradient(90deg, ${alpha(accent, 0.25)}, transparent)`,
    },
  };
};

// ─── Dropdown menu item ──────────────────────────────────────────────────────

const menuItemSx = (theme: Theme, itemAccent: string, index: number): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';

  return {
    py: 1,
    px: 1.5,
    borderRadius: '10px',
    mx: 0.75,
    my: 0.25,
    position: 'relative',
    zIndex: 1,
    // Staggered entrance animation
    opacity: 0,
    animation: 'menuItemIn 0.3s ease-out forwards',
    animationDelay: `${index * 0.04}s`,
    transition:
      'background 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
    '& .MuiListItemIcon-root': {
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      minWidth: 40,
    },
    '& .MuiListItemText-primary': {
      fontSize: '0.875rem',
      fontWeight: 550,
      lineHeight: 1.3,
    },
    '& .MuiListItemText-secondary': {
      fontSize: '0.7rem',
      opacity: 0.45,
      lineHeight: 1.3,
      mt: 0.15,
      transition: 'opacity 0.25s ease',
    },
    '&:hover': {
      background: isDark
        ? `linear-gradient(135deg, ${alpha(itemAccent, 0.12)} 0%, ${alpha(itemAccent, 0.03)} 100%)`
        : `linear-gradient(135deg, ${alpha(itemAccent, 0.1)} 0%, ${alpha(itemAccent, 0.02)} 100%)`,
      transform: 'translateX(4px)',
      boxShadow: isDark
        ? `inset 2px 0 0 ${itemAccent}, 0 2px 12px ${alpha(itemAccent, 0.1)}`
        : `inset 2px 0 0 ${itemAccent}, 0 2px 8px ${alpha(itemAccent, 0.06)}`,
      '& .menu-icon-badge': {
        borderColor: alpha(itemAccent, 0.5),
        background: alpha(itemAccent, isDark ? 0.2 : 0.12),
        boxShadow: isDark ? `0 0 12px ${alpha(itemAccent, 0.25)}` : 'none',
        transform: 'scale(1.1)',
      },
      '& .MuiListItemText-secondary': {
        opacity: 0.75,
      },
    },
    '&:active': {
      transform: 'translateX(2px) scale(0.99)',
      background: alpha(itemAccent, isDark ? 0.16 : 0.12),
    },
  };
};

// ─── Avatar gradient helper ─────────────────────────────────────────────────

const avatarGradients: [string, string][] = [
  ['#f59e0b', '#ef4444'],
  ['#3b82f6', '#8b5cf6'],
  ['#06b6d4', '#3b82f6'],
  ['#22c55e', '#06b6d4'],
  ['#8b5cf6', '#ec4899'],
  ['#ef4444', '#f59e0b'],
  ['#ec4899', '#f43f5e'],
  ['#14b8a6', '#22c55e'],
];

const getAvatarProps = (name: string): { gradient: string; color: string; initials: string } => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % avatarGradients.length;
  const [c1, c2] = avatarGradients[idx];
  const initials = name.slice(0, 2).toUpperCase();
  return { gradient: `linear-gradient(135deg, ${c1}, ${c2})`, color: c1, initials };
};

export const HeaderBar: React.FC = () => {
  const { isLoggedIn, currentUser, userLoading, userError, refetchUser, rebindAccessToken } =
    useAuth();
  const hasRequestedUser = React.useRef(false);
  const navigate = useViewTransitionNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { darkMode, toggleDarkMode } = usePersistentDarkMode();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [toolsAnchorEl, setToolsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = React.useState<null | HTMLElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef(0);

  const userDisplayName = React.useMemo(() => {
    if (!currentUser) return '';
    return currentUser.naDisplayName || currentUser.euDisplayName || currentUser.name || '';
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

  const avatarProps = React.useMemo(
    () => getAvatarProps(userDisplayName || 'U'),
    [userDisplayName],
  );

  const handleProfileMenuOpen = React.useCallback((event: React.MouseEvent<HTMLElement>): void => {
    setProfileAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = React.useCallback((): void => {
    setProfileAnchorEl(null);
  }, []);

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
    navigate('/', { vtType: 'down' });
    setMobileOpen(false);
  }, [rebindAccessToken, navigate]);

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const handleSheetTouchStart = React.useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const handleSheetTouchMove = React.useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const handleSheetTouchEnd = React.useCallback((e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - dragStartY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (dy > 80) setMobileOpen(false);
  }, []);

  const handleNavigateToProfile = React.useCallback((): void => {
    if (currentUser?.name) {
      navigate(`/u/${currentUser.name}`, { vtType: 'forward' });
    }
    setMobileOpen(false);
  }, [currentUser, navigate]);

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
      navigate(path, { vtType: 'forward' });
    }
    setToolsAnchorEl(null);
    setReportsAnchorEl(null);
    setMobileOpen(false);
  };

  const handleSampleReport = React.useCallback((): void => {
    navigate('/sample-report', { vtType: 'forward' });
    setReportsAnchorEl(null);
    setMobileOpen(false);
  }, [navigate]);

  const toolsItems = [
    {
      text: 'Text Editor',
      desc: 'Format guild announcements',
      icon: '📝',
      accent: '#f59e0b',
      path: '/text-editor',
    },
    {
      text: 'Calculator',
      desc: 'Stat & damage math',
      icon: <Calculator size="16" />,
      accent: '#22c55e',
      path: '/calculator',
    },
    {
      text: 'Parse Analysis',
      desc: 'Break down your parses',
      icon: '📈',
      accent: '#a855f7',
      path: '/parse-analysis',
    },
    {
      text: 'Loadout Manager',
      desc: 'Manage gear loadouts',
      icon: '⚔️',
      accent: '#ef4444',
      path: '/loadout-manager',
    },
    {
      text: 'Roster Builder',
      desc: 'Plan trial compositions',
      icon: '👥',
      accent: '#06b6d4',
      path: '/roster-builder',
    },
    {
      text: 'Build Editor',
      desc: 'Create & share builds',
      icon: '🔧',
      accent: '#3b82f6',
      path: '/build-editor',
    },
  ];

  const reportsItems = React.useMemo(() => {
    const items = [];

    // Add "My Reports" if user is logged in
    if (isLoggedIn) {
      items.push({
        text: 'My Reports',
        desc: 'Your uploaded logs',
        icon: '📁',
        accent: '#f59e0b',
        path: '/my-reports',
      });
    }

    // Always show these items
    items.push(
      {
        text: 'Sample Report',
        desc: 'Explore a demo log',
        icon: '🎲',
        accent: '#a855f7',
        action: handleSampleReport,
      },
      {
        text: 'Latest Report',
        desc: 'Recently uploaded',
        icon: '📊',
        accent: '#06b6d4',
        path: '/latest-reports',
      },
      {
        text: 'Leaderboards',
        desc: 'Top parse rankings',
        icon: '🏆',
        accent: '#eab308',
        path: '/leaderboards',
      },
    );

    return items;
  }, [isLoggedIn, handleSampleReport]);

  const navItems = [
    {
      text: 'Roster Hub',
      icon: '👥',
      path: '/roster-hub',
    },
    {
      text: 'Build Hub',
      icon: '🏗️',
      path: '/build-hub',
    },
    {
      text: 'Pack Hub',
      icon: '🧩',
      path: '/pack-hub',
    },
  ];

  // Lateral peer paths — ordered left-to-right for slide direction
  const lateralPeers = navItems.map((i) => i.path);

  const getLateralTransitionType = React.useCallback(
    (targetPath: string): ViewTransitionType => {
      const fromIdx = lateralPeers.indexOf(location.pathname);
      const toIdx = lateralPeers.indexOf(targetPath);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        return toIdx > fromIdx ? 'slide-left' : 'slide-right';
      }
      return 'forward';
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname],
  );

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          viewTransitionName: 'site-header',
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
                onClick={() => navigate('/', { vtType: 'down' })}
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
                  ESO Toolkit
                </Typography>
              </Button>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  onClick={() =>
                    navigate(item.path, { vtType: getLateralTransitionType(item.path) })
                  }
                  startIcon={
                    typeof item.icon === 'string' ? (
                      <span
                        role="img"
                        aria-label={item.text.toLowerCase()}
                        style={{ fontSize: 16, lineHeight: 1, display: 'inline-block' }}
                      >
                        {item.icon}
                      </span>
                    ) : (
                      item.icon
                    )
                  }
                  sx={navButtonSx(theme)}
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
                sx={navButtonSx(theme)}
              >
                Reports
              </Button>

              {/* Tools submenu button */}
              <Button
                color="inherit"
                onClick={handleToolsClick}
                endIcon={<ExpandMore />}
                startIcon={<Build />}
                sx={navButtonSx(theme)}
              >
                Tools
              </Button>
              {!isLoggedIn && <ThemeToggle />}
              {isLoggedIn ? (
                <Tooltip title="" arrow={false} open={false}>
                  <Box
                    onClick={handleProfileMenuOpen}
                    aria-label={userLabel ? `Profile: ${userLabel}` : 'Profile'}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleProfileMenuOpen(e as unknown as React.MouseEvent<HTMLElement>);
                    }}
                    sx={{
                      display: { xs: 'none', sm: 'flex' },
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      px: 1,
                      py: 0.5,
                      borderRadius: '12px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                      '&:hover': {
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        boxShadow: isDark
                          ? `0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)`
                          : `0 4px 16px rgba(0,0,0,0.06)`,
                        '& .profile-chevron': { opacity: 0.7, transform: 'translateY(1px)' },
                      },
                      '&:active': { transform: 'scale(0.97)' },
                    }}
                  >
                    {/* Avatar */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '9px',
                        background: avatarProps.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        position: 'relative',
                        flexShrink: 0,
                        boxShadow: `0 2px 8px ${alpha(avatarProps.color, 0.35)}`,
                        transition: 'box-shadow 0.25s ease',
                      }}
                    >
                      {avatarProps.initials}
                      {/* Online indicator */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: `2px solid ${isDark ? '#0f172a' : '#ffffff'}`,
                          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                      }}
                    >
                      {userLabel || 'Profile'}
                    </Typography>
                    <ExpandMore
                      className="profile-chevron"
                      sx={{
                        fontSize: 16,
                        opacity: 0.4,
                        transition: 'all 0.25s ease',
                        color: isDark ? '#94a3b8' : '#64748b',
                      }}
                    />
                  </Box>
                </Tooltip>
              ) : (
                <Button
                  onClick={handleLogin}
                  startIcon={<Login sx={{ fontSize: '18px !important' }} />}
                  aria-label="Sign in with ESO Logs"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    px: 2.5,
                    py: 0.75,
                    borderRadius: '10px',
                    background: isDark
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isDark
                      ? '0 4px 16px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : '0 4px 16px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                      opacity: 0,
                      transition: 'opacity 0.25s ease',
                    },
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: isDark
                        ? '0 8px 24px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : '0 8px 24px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                      '&::before': { opacity: 1 },
                    },
                    '&:active': { transform: 'translateY(0) scale(0.97)' },
                  }}
                >
                  Sign in
                </Button>
              )}
            </Box>

            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
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

      {/* Tools Submenu */}
      <Menu
        anchorEl={toolsAnchorEl}
        open={Boolean(toolsAnchorEl)}
        onClose={handleToolsClose}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: dropdownPaperSx(theme),
            onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                '--mouse-x',
                `${((e.clientX - rect.left) / rect.width) * 100}%`,
              );
              e.currentTarget.style.setProperty(
                '--mouse-y',
                `${((e.clientY - rect.top) / rect.height) * 100}%`,
              );
            },
          },
        }}
      >
        <Box className="dropdown-spotlight" />
        <Box sx={dropdownHeaderSx(theme, 'Tools')}>
          <Build sx={{ fontSize: 14, color: isDark ? '#38bdf8' : '#3b82f6' }} />
          <span className="dropdown-header-label">Tools</span>
        </Box>
        {toolsItems.map((item, index) => (
          <MenuItem
            key={item.text}
            onClick={() => handleToolNavigation(item.path)}
            sx={menuItemSx(theme, item.accent, index)}
          >
            <ListItemIcon>
              <Box
                className="menu-icon-badge"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: alpha(item.accent, isDark ? 0.12 : 0.08),
                  border: `1px solid ${alpha(item.accent, 0.15)}`,
                  fontSize: typeof item.icon === 'string' ? 15 : undefined,
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {item.icon}
              </Box>
            </ListItemIcon>
            <ListItemText primary={item.text} secondary={item.desc} />
          </MenuItem>
        ))}
        <Box sx={{ pb: 0.5 }} />
      </Menu>

      {/* Reports Submenu */}
      <Menu
        anchorEl={reportsAnchorEl}
        open={Boolean(reportsAnchorEl)}
        onClose={handleReportsClose}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: dropdownPaperSx(theme),
            onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                '--mouse-x',
                `${((e.clientX - rect.left) / rect.width) * 100}%`,
              );
              e.currentTarget.style.setProperty(
                '--mouse-y',
                `${((e.clientY - rect.top) / rect.height) * 100}%`,
              );
            },
          },
        }}
      >
        <Box className="dropdown-spotlight" />
        <Box sx={dropdownHeaderSx(theme, 'Reports')}>
          <Assessment sx={{ fontSize: 14, color: isDark ? '#38bdf8' : '#3b82f6' }} />
          <span className="dropdown-header-label">Reports</span>
        </Box>
        {reportsItems.map((item, index) => (
          <MenuItem
            key={item.text}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (item.path) {
                handleToolNavigation(item.path);
              }
            }}
            sx={menuItemSx(theme, item.accent, index)}
          >
            <ListItemIcon>
              <Box
                className="menu-icon-badge"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: alpha(item.accent, isDark ? 0.12 : 0.08),
                  border: `1px solid ${alpha(item.accent, 0.15)}`,
                  fontSize: 15,
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {item.icon}
              </Box>
            </ListItemIcon>
            <ListItemText primary={item.text} secondary={item.desc} />
          </MenuItem>
        ))}
        <Box sx={{ pb: 0.5 }} />
      </Menu>

      {/* Profile Dropdown */}
      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileMenuClose}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              ...dropdownPaperSx(theme),
              minWidth: 240,
            } as SxProps<Theme>,
            onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty(
                '--mouse-x',
                `${((e.clientX - rect.left) / rect.width) * 100}%`,
              );
              e.currentTarget.style.setProperty(
                '--mouse-y',
                `${((e.clientY - rect.top) / rect.height) * 100}%`,
              );
            },
          },
        }}
      >
        <Box className="dropdown-spotlight" />
        {/* User info header */}
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '11px',
              background: avatarProps.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 800,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              flexShrink: 0,
              boxShadow: `0 4px 12px ${alpha(avatarProps.color, 0.35)}`,
              position: 'relative',
            }}
          >
            {avatarProps.initials}
            <Box
              sx={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: '#22c55e',
                border: `2.5px solid ${isDark ? 'rgba(15,23,42,0.95)' : '#ffffff'}`,
                boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userLabel || 'Profile'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem',
                opacity: 0.45,
                lineHeight: 1.3,
                mt: 0.15,
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              ESO Logs account
            </Typography>
          </Box>
        </Box>
        <Divider
          sx={{
            mx: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}
        />
        <MenuItem
          onClick={() => {
            handleNavigateToProfile();
            handleProfileMenuClose();
          }}
          sx={menuItemSx(theme, isDark ? '#38bdf8' : '#3b82f6', 0)}
        >
          <ListItemIcon>
            <Box
              className="menu-icon-badge"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha(isDark ? '#38bdf8' : '#3b82f6', isDark ? 0.12 : 0.08),
                border: `1px solid ${alpha(isDark ? '#38bdf8' : '#3b82f6', 0.15)}`,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <Person sx={{ fontSize: 18, color: isDark ? '#38bdf8' : '#3b82f6' }} />
            </Box>
          </ListItemIcon>
          <ListItemText primary="My Profile" secondary="View your public profile" />
        </MenuItem>
        <MenuItem
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            toggleDarkMode();
          }}
          sx={menuItemSx(theme, isDark ? '#f59e0b' : '#6366f1', 1)}
        >
          <ListItemIcon>
            <Box
              className="menu-icon-badge"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha(isDark ? '#f59e0b' : '#6366f1', isDark ? 0.12 : 0.08),
                border: `1px solid ${alpha(isDark ? '#f59e0b' : '#6366f1', 0.15)}`,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {darkMode ? (
                <LightModeIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 18, color: '#6366f1' }} />
              )}
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={darkMode ? 'Light mode' : 'Dark mode'}
            secondary="Toggle appearance"
          />
        </MenuItem>
        <Divider
          sx={{
            mx: 1.5,
            my: 0.5,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}
        />
        <MenuItem
          onClick={() => {
            handleLogout();
            handleProfileMenuClose();
          }}
          sx={{
            ...menuItemSx(theme, '#ef4444', 1),
            '& .MuiListItemText-primary': {
              color: isDark ? '#f87171' : '#dc2626',
              fontSize: '0.875rem',
              fontWeight: 550,
              lineHeight: 1.3,
            },
          }}
        >
          <ListItemIcon>
            <Box
              className="menu-icon-badge"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha('#ef4444', isDark ? 0.12 : 0.08),
                border: `1px solid ${alpha('#ef4444', 0.15)}`,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <Logout sx={{ fontSize: 18, color: isDark ? '#f87171' : '#dc2626' }} />
            </Box>
          </ListItemIcon>
          <ListItemText primary="Log out" />
        </MenuItem>
        <Box sx={{ pb: 0.5 }} />
      </Menu>

      {/* Mobile Bottom Sheet */}
      <MobileBackdrop open={mobileOpen} onClick={() => setMobileOpen(false)} />
      <MobileBottomSheet open={mobileOpen} ref={sheetRef}>
        {/* Drag Handle */}
        <Box
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1.5,
            pb: 1,
            cursor: 'grab',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            }}
          />
        </Box>

        {/* User Card */}
        {isLoggedIn && (
          <Box
            onClick={handleNavigateToProfile}
            sx={{
              mx: 2,
              mb: 0.5,
              p: 1.5,
              borderRadius: 3,
              background: isDark
                ? `linear-gradient(135deg, ${alpha(avatarProps.color, 0.08)} 0%, rgba(15,23,42,0.4) 100%)`
                : `linear-gradient(135deg, ${alpha(avatarProps.color, 0.06)} 0%, rgba(255,255,255,0.4) 100%)`,
              border: `1px solid ${alpha(avatarProps.color, isDark ? 0.15 : 0.12)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(120px circle at 20% 50%, ${alpha(avatarProps.color, 0.1)}, transparent 60%)`,
                pointerEvents: 'none',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '11px',
                background: avatarProps.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 800,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${alpha(avatarProps.color, 0.35)}`,
                position: 'relative',
              }}
            >
              {avatarProps.initials}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: `2.5px solid ${isDark ? 'rgba(15,23,42,0.95)' : '#ffffff'}`,
                  boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                }}
              />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userLabel || 'Profile'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  opacity: 0.45,
                  lineHeight: 1.3,
                  mt: 0.15,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                View profile
              </Typography>
            </Box>
            <ExpandMore
              sx={{
                fontSize: 18,
                opacity: 0.3,
                color: isDark ? '#94a3b8' : '#64748b',
                flexShrink: 0,
              }}
            />
          </Box>
        )}

        {/* Navigate */}
        <MobileSectionLabel>Navigate</MobileSectionLabel>
        <Box sx={{ px: 1.5, position: 'relative', zIndex: 1 }}>
          {navItems.map((item, i) => (
            <MobileSheetItem
              key={item.text}
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path, { vtType: getLateralTransitionType(item.path) });
                setMobileOpen(false);
              }}
              sx={{
                opacity: 0,
                animation: mobileOpen
                  ? `sheetItemIn 0.3s ease-out ${0.05 + i * 0.03}s both`
                  : 'none',
              }}
            >
              <Box sx={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </Box>
              <Typography sx={{ fontWeight: 500, fontSize: '0.925rem' }}>{item.text}</Typography>
            </MobileSheetItem>
          ))}
        </Box>

        {/* Reports */}
        <MobileSectionLabel>Reports</MobileSectionLabel>
        <Box sx={{ px: 1.5, position: 'relative', zIndex: 1 }}>
          {reportsItems.map((item, i) => (
            <MobileSheetItem
              key={item.text}
              onClick={() => {
                if (item.action) item.action();
                else if (item.path) handleToolNavigation(item.path);
              }}
              sx={{
                opacity: 0,
                animation: mobileOpen
                  ? `sheetItemIn 0.3s ease-out ${0.15 + i * 0.03}s both`
                  : 'none',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: alpha(item.accent, isDark ? 0.12 : 0.08),
                  border: `1px solid ${alpha(item.accent, 0.15)}`,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 550, fontSize: '0.875rem', lineHeight: 1.3 }}>
                  {item.text}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.3, mt: 0.15 }}>
                  {item.desc}
                </Typography>
              </Box>
            </MobileSheetItem>
          ))}
        </Box>

        {/* Tools */}
        <MobileSectionLabel>Tools</MobileSectionLabel>
        <Box sx={{ px: 1.5, position: 'relative', zIndex: 1 }}>
          {toolsItems.map((item, i) => (
            <MobileSheetItem
              key={item.text}
              onClick={() => handleToolNavigation(item.path)}
              sx={{
                opacity: 0,
                animation: mobileOpen
                  ? `sheetItemIn 0.3s ease-out ${0.25 + i * 0.03}s both`
                  : 'none',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: alpha(item.accent, isDark ? 0.12 : 0.08),
                  border: `1px solid ${alpha(item.accent, 0.15)}`,
                  fontSize: typeof item.icon === 'string' ? 15 : undefined,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 550, fontSize: '0.875rem', lineHeight: 1.3 }}>
                  {item.text}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.3, mt: 0.15 }}>
                  {item.desc}
                </Typography>
              </Box>
            </MobileSheetItem>
          ))}
        </Box>

        {/* Theme toggle + Auth */}
        <Box sx={{ px: 1.5, pt: 1, position: 'relative', zIndex: 1 }}>
          <MobileSheetItem
            onClick={toggleDarkMode}
            sx={{
              opacity: 0,
              animation: mobileOpen ? `sheetItemIn 0.3s ease-out 0.35s both` : 'none',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha(isDark ? '#f59e0b' : '#6366f1', isDark ? 0.12 : 0.08),
                border: `1px solid ${alpha(isDark ? '#f59e0b' : '#6366f1', 0.15)}`,
                flexShrink: 0,
              }}
            >
              {darkMode ? (
                <LightModeIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 18, color: '#6366f1' }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 550, fontSize: '0.875rem', lineHeight: 1.3 }}>
                {darkMode ? 'Light mode' : 'Dark mode'}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', opacity: 0.45, lineHeight: 1.3, mt: 0.15 }}>
                Toggle appearance
              </Typography>
            </Box>
          </MobileSheetItem>
        </Box>
        <Box sx={{ px: 2, pt: 1.5, pb: 1, position: 'relative', zIndex: 1 }}>
          {isLoggedIn ? (
            <Button
              onClick={() => {
                handleLogout();
                setMobileOpen(false);
              }}
              startIcon={<Logout sx={{ fontSize: 18 }} />}
              fullWidth
              sx={{
                py: 1.25,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(220,38,38,0.04)',
                border: `1px solid ${isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)'}`,
                color: isDark ? '#f87171' : '#dc2626',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(220,38,38,0.08)',
                  borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.18)',
                },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              Log out
            </Button>
          ) : (
            <Button
              onClick={handleLogin}
              startIcon={<Login sx={{ fontSize: 20 }} />}
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.01em',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(59,130,246,0.12) 100%)'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.1) 100%)',
                border: `1px solid ${isDark ? 'rgba(56,189,248,0.25)' : 'rgba(59,130,246,0.2)'}`,
                color: isDark ? '#e0f2fe' : '#1e40af',
                boxShadow: isDark
                  ? '0 4px 16px rgba(56,189,248,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 4px 16px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(56,189,248,0.08), transparent 60%)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.06), transparent 60%)',
                  opacity: 0,
                  transition: 'opacity 0.25s ease',
                },
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: isDark
                    ? '0 8px 24px rgba(56,189,248,0.18), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 8px 24px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
                  borderColor: isDark ? 'rgba(56,189,248,0.35)' : 'rgba(59,130,246,0.3)',
                  '&::before': { opacity: 1 },
                },
                '&:active': { transform: 'translateY(0) scale(0.98)' },
              }}
            >
              Sign in with ESO Logs
            </Button>
          )}
        </Box>
      </MobileBottomSheet>
    </>
  );
};
