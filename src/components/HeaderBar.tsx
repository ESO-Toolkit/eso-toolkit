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
  Fade,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, styled } from '@mui/material/styles';
import React from 'react';
import { useLocation } from 'react-router-dom';

import esoLogo from '../assets/ESOHelpers-logo-icon.svg';
import { LOCAL_STORAGE_ACCESS_TOKEN_KEY, startPKCEAuth } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';
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
})<{ open: boolean; itemCount?: number }>(({ theme, open, itemCount = 3 }) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';

  return {
    width: '100%',
    overflow: 'hidden',
    // Calculate height dynamically based on number of items: items × (52px height + 4px margin) + top padding + border
    height: open ? `${itemCount * 56 + 8}px` : 0,
    transition:
      'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
    marginBottom: open ? theme.spacing(1) : 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: open ? theme.spacing(0.5) : 0,
    background: open
      ? isDark
        ? `linear-gradient(180deg, ${alpha('#0f172a', 0.5)} 0%, ${alpha('#030718', 0.65)} 100%)`
        : `linear-gradient(180deg, ${alpha('#ffffff', 0.5)} 0%, ${alpha('#f8fafc', 0.7)} 100%)`
      : 'transparent',
    borderRadius: open ? '0 0 14px 14px' : 0,
    backdropFilter: open ? 'blur(16px)' : 'none',
    WebkitBackdropFilter: open ? 'blur(16px)' : 'none',
    borderLeft: open ? `1px solid ${alpha(accent, isDark ? 0.1 : 0.08)}` : '1px solid transparent',
    borderRight: open ? `1px solid ${alpha(accent, isDark ? 0.1 : 0.08)}` : '1px solid transparent',
    borderBottom: open
      ? `1px solid ${alpha(accent, isDark ? 0.1 : 0.08)}`
      : '1px solid transparent',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '10%',
      right: '10%',
      height: '1px',
      background: open
        ? `linear-gradient(90deg, transparent, ${alpha(accent, 0.3)}, transparent)`
        : 'transparent',
      transition: 'background 0.3s ease',
    },
  };
});

const BaseMobileSubmenuItem = styled(Button, {
  shouldForwardProp: (prop) => !['open', 'index', 'colorVariant'].includes(prop as string),
})<{
  open: boolean;
  index: number;
  colorVariant: 'default' | 'destructive' | 'positive';
}>(({ theme, open, index, colorVariant }) => {
  const isDark = theme.palette.mode === 'dark';

  const variantAccent = {
    destructive: isDark ? '#ef4444' : '#dc2626',
    positive: isDark ? '#38bdf8' : '#3b82f6',
    default: isDark ? '#38bdf8' : '#3b82f6',
  }[colorVariant];

  return {
    width: '100%',
    maxWidth: 'none',
    height: 52,
    marginBottom: theme.spacing(0.5),
    background: 'transparent',
    border: `1px solid transparent`,
    borderLeft: `2px solid ${alpha(variantAccent, 0.35)}`,
    borderRadius: '10px',
    color: isDark ? '#ffffff' : '#0f172a',
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
    '& .MuiButton-startIcon': {
      transition: 'color 0.2s ease',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(135deg, ${alpha(variantAccent, 0.08)} 0%, ${alpha(variantAccent, 0.02)} 50%, transparent 100%)`,
      opacity: 0,
      transition: 'opacity 0.3s ease',
      borderRadius: '10px',
    },
    '&:hover': {
      background: isDark
        ? `linear-gradient(135deg, ${alpha(variantAccent, 0.1)} 0%, ${alpha(variantAccent, 0.04)} 100%)`
        : `linear-gradient(135deg, ${alpha(variantAccent, 0.08)} 0%, ${alpha(variantAccent, 0.03)} 100%)`,
      borderColor: alpha(variantAccent, 0.15),
      borderLeftColor: alpha(variantAccent, 0.7),
      borderLeftWidth: '3px',
      transform: open ? 'translateX(2px) scale(1.01)' : 'translateX(-20px) scale(0.95)',
      boxShadow: `0 2px 12px ${alpha(variantAccent, isDark ? 0.12 : 0.08)}`,
      '& .MuiButton-startIcon': {
        color: variantAccent,
      },
      '&::before': {
        opacity: 1,
      },
    },
    '&:active': {
      transform: open ? 'translateX(1px) scale(1)' : 'translateX(-20px) scale(0.95)',
      background: alpha(variantAccent, isDark ? 0.12 : 0.08),
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

// ─── Shared dropdown paper styles ────────────────────────────────────────────

const dropdownPaperSx = (theme: Theme): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';
  const accentAlt = isDark ? '#0ea5e9' : '#2563eb';

  return {
    overflow: 'hidden',
    mt: 1,
    minWidth: 260,
    background: isDark
      ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(3, 7, 18, 0.88) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.94) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${alpha(accent, isDark ? 0.12 : 0.1)}`,
    borderRadius: '14px',
    boxShadow: isDark
      ? `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px ${alpha(accent, 0.08)}, inset 0 1px 0 ${alpha('#fff', 0.04)}`
      : `0 8px 32px rgba(15, 23, 42, 0.12), 0 0 0 1px ${alpha(accent, 0.06)}`,
    py: 0.5,
    // Animated shimmer accent line
    '@keyframes dropdownShimmer': {
      '0%': { backgroundPosition: '-200% center' },
      '100%': { backgroundPosition: '200% center' },
    },
    '&::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${accentAlt} 50%, ${accent} 80%, transparent 100%)`,
      backgroundSize: '200% 100%',
      animation: 'dropdownShimmer 3s linear infinite',
      zIndex: 1,
    },
    // Subtle inner glow
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 2,
      left: '15%',
      right: '15%',
      height: '40px',
      background: `radial-gradient(ellipse at center, ${alpha(accent, isDark ? 0.06 : 0.04)} 0%, transparent 70%)`,
      pointerEvents: 'none',
      zIndex: 0,
    },
  };
};

const menuItemSx = (theme: Theme): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';

  return {
    py: 1,
    px: 1.5,
    borderRadius: '10px',
    mx: 0.75,
    my: 0.25,
    position: 'relative',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    '& .MuiListItemIcon-root': {
      transition: 'all 0.25s ease',
      minWidth: 36,
    },
    '& .MuiListItemText-primary': {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    '& .MuiListItemText-secondary': {
      fontSize: '0.7rem',
      opacity: 0.5,
      lineHeight: 1.3,
      mt: 0.15,
    },
    '&:hover': {
      background: isDark
        ? `linear-gradient(135deg, ${alpha(accent, 0.12)} 0%, ${alpha(accent, 0.04)} 100%)`
        : `linear-gradient(135deg, ${alpha(accent, 0.1)} 0%, ${alpha(accent, 0.03)} 100%)`,
      transform: 'translateX(2px)',
      '& .MuiListItemIcon-root': {
        color: accent,
        transform: 'scale(1.15)',
        filter: isDark ? `drop-shadow(0 0 6px ${alpha(accent, 0.4)})` : 'none',
      },
      '& .MuiListItemText-secondary': {
        opacity: 0.7,
      },
    },
    '&:active': {
      transform: 'translateX(1px) scale(0.99)',
      background: alpha(accent, isDark ? 0.16 : 0.12),
    },
  };
};

// ─── Mobile submenu button style helper ──────────────────────────────────────

const mobileSubmenuButtonSx = (
  theme: Theme,
  isOpen: boolean,
  navItemCount: number,
  mobileOpen: boolean,
): SxProps<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#38bdf8' : '#3b82f6';
  const accentAlt = isDark ? '#0ea5e9' : '#2563eb';

  return {
    animationDelay: `${navItemCount * 0.1}s`,
    animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
    background: isOpen
      ? isDark
        ? `linear-gradient(135deg, ${alpha(accent, 0.2)} 0%, ${alpha(accentAlt, 0.1)} 100%)`
        : `linear-gradient(135deg, ${alpha(accent, 0.15)} 0%, ${alpha(accentAlt, 0.08)} 100%)`
      : isDark
        ? `linear-gradient(135deg, ${alpha(accent, 0.1)} 0%, ${alpha(accentAlt, 0.05)} 100%)`
        : `linear-gradient(135deg, ${alpha(accent, 0.08)} 0%, ${alpha(accentAlt, 0.04)} 100%)`,
    borderColor: isOpen ? alpha(accent, isDark ? 0.4 : 0.3) : alpha(accent, isDark ? 0.2 : 0.15),
    borderRadius: isOpen ? '14px 14px 0 0' : '14px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    // Top shimmer when open
    '&::after': isOpen
      ? {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${alpha(accent, 0.3)}, transparent)`,
        }
      : {},
    '&:hover': {
      background: isOpen
        ? isDark
          ? `linear-gradient(135deg, ${alpha(accent, 0.25)} 0%, ${alpha(accentAlt, 0.15)} 100%)`
          : `linear-gradient(135deg, ${alpha(accent, 0.2)} 0%, ${alpha(accentAlt, 0.12)} 100%)`
        : isDark
          ? `linear-gradient(135deg, ${alpha(accent, 0.2)} 0%, ${alpha(accentAlt, 0.1)} 100%)`
          : `linear-gradient(135deg, ${alpha(accent, 0.12)} 0%, ${alpha(accentAlt, 0.08)} 100%)`,
      borderColor: alpha(accent, isDark ? 0.4 : 0.25),
    },
    '@keyframes slideInUp': {
      '0%': { opacity: 0, transform: 'translateY(30px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
    },
  };
};

export const HeaderBar: React.FC = () => {
  const { isLoggedIn, currentUser, userLoading, userError, refetchUser, rebindAccessToken } =
    useAuth();
  const hasRequestedUser = React.useRef(false);
  const navigate = useViewTransitionNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [toolsAnchorEl, setToolsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = React.useState(false);
  const [mobileReportsOpen, setMobileReportsOpen] = React.useState(false);

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
    if (!mobileOpen) {
      // Reset submenus when opening mobile menu
      setMobileToolsOpen(false);
      setMobileReportsOpen(false);
    }
  };

  const handleMobileToolsToggle = (): void => {
    if (!mobileToolsOpen) {
      setMobileReportsOpen(false);
    }
    setMobileToolsOpen(!mobileToolsOpen);
  };

  const handleMobileReportsToggle = (): void => {
    if (!mobileReportsOpen) {
      setMobileToolsOpen(false);
    }
    setMobileReportsOpen(!mobileReportsOpen);
  };

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
    setMobileToolsOpen(false);
    setMobileReportsOpen(false);
  };

  const handleSampleReport = React.useCallback((): void => {
    navigate('/sample-report', { vtType: 'forward' });
    setReportsAnchorEl(null);
    setMobileOpen(false);
    setMobileReportsOpen(false);
  }, [navigate]);

  const toolsItems = [
    {
      text: 'Text Editor',
      desc: 'Format guild announcements',
      icon: '📝',
      path: '/text-editor',
    },
    {
      text: 'Calculator',
      desc: 'Stat & damage math',
      icon: <Calculator size="24" />,
      path: '/calculator',
    },
    {
      text: 'Parse Analysis',
      desc: 'Break down your parses',
      icon: '📈',
      path: '/parse-analysis',
    },
    {
      text: 'Loadout Manager',
      desc: 'Manage gear loadouts',
      icon: '⚔️',
      path: '/loadout-manager',
    },
    {
      text: 'Roster Builder',
      desc: 'Plan trial compositions',
      icon: '👥',
      path: '/roster-builder',
    },
    {
      text: 'Build Editor',
      desc: 'Create & share builds',
      icon: '🔧',
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
        path: '/my-reports',
      });
    }

    // Always show these items
    items.push(
      {
        text: 'Sample Report',
        desc: 'Explore a demo log',
        icon: '🎲',
        action: handleSampleReport,
      },
      {
        text: 'Latest Report',
        desc: 'Recently uploaded',
        icon: '📊',
        path: '/latest-reports',
      },
      {
        text: 'Leaderboards',
        desc: 'Top parse rankings',
        icon: '🏆',
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
              <ThemeToggle />
              {isLoggedIn ? (
                <>
                  <Tooltip title="My profile" arrow placement="bottom">
                    <Button
                      onClick={handleNavigateToProfile}
                      aria-label={userLabel ? `Profile: ${userLabel}` : 'Profile'}
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
                        {userLabel || 'Profile'}
                      </Typography>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Log out" arrow placement="bottom">
                    <AuthIconButton onClick={handleLogout} aria-label="Log out">
                      <Logout />
                    </AuthIconButton>
                  </Tooltip>
                </>
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

      {/* Tools Submenu */}
      <Menu
        anchorEl={toolsAnchorEl}
        open={Boolean(toolsAnchorEl)}
        onClose={handleToolsClose}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        slotProps={{ paper: { elevation: 0, sx: dropdownPaperSx(theme) } }}
      >
        {toolsItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => handleToolNavigation(item.path)}
            sx={menuItemSx(theme)}
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    theme.palette.mode === 'dark' ? alpha('#38bdf8', 0.08) : alpha('#3b82f6', 0.06),
                  border: `1px solid ${alpha(theme.palette.mode === 'dark' ? '#38bdf8' : '#3b82f6', 0.1)}`,
                  fontSize: typeof item.icon === 'string' ? 15 : undefined,
                  transition: 'all 0.25s ease',
                }}
              >
                {typeof item.icon === 'string' ? item.icon : item.icon}
              </Box>
            </ListItemIcon>
            <ListItemText primary={item.text} secondary={item.desc} />
          </MenuItem>
        ))}
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
        slotProps={{ paper: { elevation: 0, sx: dropdownPaperSx(theme) } }}
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
            sx={menuItemSx(theme)}
          >
            <ListItemIcon>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    theme.palette.mode === 'dark' ? alpha('#38bdf8', 0.08) : alpha('#3b82f6', 0.06),
                  border: `1px solid ${alpha(theme.palette.mode === 'dark' ? '#38bdf8' : '#3b82f6', 0.1)}`,
                  fontSize: 15,
                  transition: 'all 0.25s ease',
                }}
              >
                {typeof item.icon === 'string' ? item.icon : item.icon}
              </Box>
            </ListItemIcon>
            <ListItemText primary={item.text} secondary={item.desc} />
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
            ESO Toolkit
          </Typography>

          {navItems.map((item, index) => (
            <MobileNavButton
              key={item.text}
              onClick={(_e: React.MouseEvent) => {
                navigate(item.path, { vtType: getLateralTransitionType(item.path) });
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
              sx={mobileSubmenuButtonSx(theme, mobileReportsOpen, navItems.length, mobileOpen)}
            >
              Reports
            </MobileNavButton>
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
              sx={mobileSubmenuButtonSx(theme, mobileToolsOpen, navItems.length, mobileOpen)}
            >
              Tools
            </MobileNavButton>
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

          {/* Profile + auth in mobile menu */}
          {isLoggedIn ? (
            <>
              <MobileNavButton
                onClick={handleNavigateToProfile}
                startIcon={<Person />}
                sx={{
                  animationDelay: `${(navItems.length + 1) * 0.1}s`,
                  animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(29, 78, 216, 0.04) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(37, 99, 235, 0.15)',
                  '&:hover': {
                    background:
                      theme.palette.mode === 'dark'
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
                {userLabel || 'My Profile'}
              </MobileNavButton>
              <MobileNavButton
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                startIcon={<Logout />}
                sx={{
                  animationDelay: `${(navItems.length + 2) * 0.1}s`,
                  animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(185, 28, 28, 0.04) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(220, 38, 38, 0.15)',
                  color: theme.palette.error.main,
                  '&:hover': {
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(185, 28, 28, 0.08) 100%)',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : 'rgba(220, 38, 38, 0.25)',
                  },
                }}
              >
                Log out
              </MobileNavButton>
            </>
          ) : (
            <MobileNavButton
              onClick={handleLogin}
              startIcon={<Login />}
              sx={{
                animationDelay: `${(navItems.length + 1) * 0.1}s`,
                animation: mobileOpen ? 'slideInUp 0.6s ease-out forwards' : 'none',
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(21, 128, 61, 0.04) 100%)',
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(22, 163, 74, 0.15)',
                color: theme.palette.success.main,
                '&:hover': {
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(22, 163, 74, 0.12) 0%, rgba(21, 128, 61, 0.08) 100%)',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(34, 197, 94, 0.4)'
                      : 'rgba(22, 163, 74, 0.25)',
                },
              }}
            >
              Log in
            </MobileNavButton>
          )}
        </MobileMenuContent>
      </MobileMenuOverlay>
    </>
  );
};
