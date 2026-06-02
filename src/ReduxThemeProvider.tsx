import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

import { usePersistentDarkMode } from './hooks/usePersistentDarkMode';

export const ReduxThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use persistent dark mode hook that handles localStorage persistence
  const { darkMode } = usePersistentDarkMode();

  // Design tokens - Dynamic light/dark support
  const tokens = React.useMemo(() => {
    if (darkMode) {
      // Dark mode tokens
      return {
        bg: '#0b1220',
        panel: '#0f172a',
        panel2: '#0d1430',
        text: '#e5e7eb',
        muted: '#94a3b8',
        accent: '#38bdf8',
        accent2: '#00e1ff',
        ok: '#22c55e',
        warn: '#ff9800',
        danger: '#ef4444',
        border: '#1f2937',
      } as const;
    } else {
      // Light mode tokens with balanced contrast for readability
      return {
        bg: '#f8fafc',
        panel: '#ffffff',
        panel2: '#f8fafc',
        text: '#1e293b',
        muted: '#64748b',
        accent: '#0f172a',
        accent2: '#1e293b',
        ok: '#059669',
        warn: '#f97316',
        danger: '#dc2626',
        border: '#bcd9ff',
      } as const;
    }
  }, [darkMode]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          background: {
            default: tokens.bg,
            paper: darkMode ? tokens.panel : '#ffffff',
          },
          primary: { main: tokens.accent },
          secondary: { main: tokens.accent2 },
          success: { main: tokens.ok },
          warning: { main: tokens.warn },
          error: { main: tokens.danger },
          divider: tokens.border,
          text: { primary: tokens.text, secondary: tokens.muted },
        },
        shape: { borderRadius: 10 },
        typography: {
          // Inter variable as the default UI/body font; Space Grotesk for headings
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, 'Helvetica Neue', Arial",
          h1: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
          h2: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
          h3: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
          h4: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
          h5: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
          h6: { fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              html: { height: '100%', overflow: 'visible' },
              body: {
                minHeight: '100%',
                overflow: 'visible',
                background: tokens.bg,
                backgroundAttachment: 'fixed',
                color: tokens.text,
                // Enable variable font optical sizing where supported
                fontOpticalSizing: 'auto',
                // Smooth theme transitions
                transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
              },
              // Only add transitions to commonly themed elements
              'body, .MuiPaper-root, .MuiButton-root, .MuiIconButton-root': {
                transition:
                  'background-color 0.15s ease-in-out, color 0.15s ease-in-out, border-color 0.15s ease-in-out',
              },
              '*, *::before, *::after': { boxSizing: 'border-box' },
              '@media (prefers-reduced-motion: reduce)': {
                '*, *::before, *::after': {
                  animationDuration: '0.01ms !important',
                  animationIterationCount: '1 !important',
                  transitionDuration: '0.01ms !important',
                  scrollBehavior: 'auto !important',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? 'rgba(11, 18, 32, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                borderBottom: darkMode
                  ? '1px solid rgba(56, 189, 248, 0.15)'
                  : '1px solid rgba(15, 23, 42, 0.08)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                background: darkMode
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
                  : 'linear-gradient(180deg, rgb(230 241 248 / 56%) 0%, rgb(255 255 255 / 95%) 100%)',
                border: `1px solid ${tokens.border}`,
                borderRadius: 14,
                boxShadow: darkMode
                  ? '0 8px 30px rgba(0, 0, 0, 0.25)'
                  : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
              },
            },
          },
          // Force dropdown (menu/popover) backgrounds to solid panel color
          MuiMenu: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                color: darkMode ? '#e5e7eb' : '#1e293b',
                border: darkMode
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(0, 0, 0, 0.23)',
                '& .MuiMenuItem-root': {
                  color: `${darkMode ? '#e5e7eb' : '#1e293b'} !important`,
                  '&:hover': {
                    backgroundColor: `${darkMode ? '#1e293b' : '#f5f5f5'} !important`,
                    color: `${darkMode ? '#ffffff' : '#000000'} !important`,
                  },
                  '&.Mui-selected': {
                    backgroundColor: `${darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(25, 118, 210, 0.08)'} !important`,
                    color: `${darkMode ? '#ffffff' : '#1e293b'} !important`,
                    '&:hover': {
                      backgroundColor: `${darkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(25, 118, 210, 0.12)'} !important`,
                      color: `${darkMode ? '#ffffff' : '#000000'} !important`,
                    },
                  },
                },
              },
            },
          },
          MuiPopover: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                color: darkMode ? '#e5e7eb' : '#1e293b',
                border: darkMode
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(0, 0, 0, 0.23)',
              },
            },
          },
          MuiAutocomplete: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: darkMode ? '#30394d' : '#ffffff',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                background: darkMode
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,252,255,0.95) 100%)',
                border: `1px solid ${tokens.border}`,
                borderRadius: 14,
                transition: 'all 0.3s ease',
                // Exclude tooltip cards from global Card styling
                '&.gear-set-tooltip': {
                  background: darkMode ? 'rgba(10, 16, 32, 0.78)' : 'rgba(255, 255, 255, 0.82)',
                  backdropFilter: 'blur(16px) saturate(1.4) !important',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.4) !important',
                  border: darkMode
                    ? '1px solid rgba(148, 210, 255, 0.12)'
                    : '1px solid rgba(0, 0, 0, 0.12)',
                  boxShadow: darkMode
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    : '0 8px 32px rgba(15, 23, 42, 0.1), 0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  borderRadius: '12px',
                },
                '&.skill-tooltip': {
                  background: darkMode ? 'rgba(10, 16, 32, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(16px) saturate(1.4) !important',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.4) !important',
                  border: darkMode
                    ? '1px solid rgba(148, 210, 255, 0.12)'
                    : '1px solid rgba(0, 0, 0, 0.12)',
                  boxShadow: darkMode
                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    : '0 8px 32px rgba(15, 23, 42, 0.1), 0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  borderRadius: '12px',
                  '&:hover': {
                    transform: 'none',
                    boxShadow: darkMode
                      ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                      : '0 8px 32px rgba(15, 23, 42, 0.1), 0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    borderColor: darkMode ? 'rgba(148, 210, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                  },
                },
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: darkMode
                    ? '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(56, 189, 248, 0.08)'
                    : '0 6px 20px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
                  borderColor: darkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.15)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 600,
                '@media (pointer: coarse)': {
                  minHeight: 44,
                },
                '&.MuiButton-containedPrimary': {
                  background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`,
                  color: darkMode ? tokens.bg : '#ffffff',
                  boxShadow: darkMode
                    ? '0 4px 15px rgba(56, 189, 248, 0.25)'
                    : '0 4px 15px rgba(3, 105, 161, 0.25)',
                  '&:hover': {
                    filter: 'brightness(1.05)',
                    boxShadow: darkMode
                      ? '0 6px 25px rgba(56, 189, 248, 0.35)'
                      : '0 6px 25px rgba(3, 105, 161, 0.35)',
                  },
                  '&.Mui-disabled': {
                    background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
                    color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)',
                    boxShadow: 'none',
                  },
                },
              },
              outlined: {
                borderColor: darkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(3, 105, 161, 0.5)',
                color: tokens.accent,
                '&:hover': {
                  background: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(3, 105, 161, 0.1)',
                  borderColor: tokens.accent,
                },
              },
              text: {
                color: darkMode ? tokens.muted : '#666666',
                '&:hover': {
                  color: tokens.accent,
                  background: darkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(3, 105, 161, 0.08)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                border: `1px solid ${tokens.border}`,
              },
              colorDefault: {
                background: darkMode ? 'rgba(2,6,23,0.45)' : 'rgba(241,245,249,0.8)',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: darkMode ? tokens.panel : 'rgba(255, 255, 255, 0.9)',
                borderRadius: 8,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: darkMode ? '#1a2332 !important' : 'rgba(255, 255, 255, 1)',
                  transform: 'translateY(-1px)',
                },
                '&.Mui-focused': {
                  backgroundColor: darkMode ? tokens.bg : 'rgba(255, 255, 255, 1)',
                  boxShadow: darkMode
                    ? `0 0 0 2px ${tokens.accent}40`
                    : `0 0 0 2px ${tokens.accent}40`,
                },
              },
              notchedOutline: {
                borderColor: darkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(144, 202, 249, 0.5)',
                '&:hover': {
                  borderColor: darkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(144, 202, 249, 0.7)',
                },
                '&.Mui-focused': {
                  borderColor: darkMode ? 'rgba(56, 189, 248, 0.8)' : 'rgba(144, 202, 249, 0.9)',
                },
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                fontWeight: 500,
                color: darkMode ? '#94a3b8' : '#64748b', // Light gray in dark mode, slate gray in light mode
                '&.Mui-focused': {
                  color: darkMode ? '#ffffff' : '#000000', // White in dark mode, black in light mode
                },
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              select: {
                backgroundColor: darkMode ? tokens.panel : 'rgba(255, 255, 255, 0.9)',
                color: `${darkMode ? tokens.text : '#000000'} !important`,
                borderRadius: 8,
                '&:hover': {
                  backgroundColor: darkMode ? tokens.panel2 : 'rgba(255, 255, 255, 1)',
                  color: `${darkMode ? tokens.text : '#000000'} !important`,
                },
                '&.Mui-focused': {
                  backgroundColor: darkMode ? tokens.bg : 'rgba(255, 255, 255, 1)',
                  color: `${darkMode ? tokens.text : '#000000'} !important`,
                },
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(13,20,48,0.97) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: darkMode
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
                borderRadius: 24,
                boxShadow: darkMode
                  ? '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset'
                  : '0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)',
                color: darkMode ? tokens.text : tokens.text,
              },
            },
          },
          MuiDialogTitle: {
            styleOverrides: {
              root: {
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 600,
                borderBottom: darkMode
                  ? '1px solid rgba(56, 189, 248, 0.1)'
                  : '1px solid rgba(15, 23, 42, 0.08)',
                background: 'transparent',
              },
            },
          },
          MuiDialogActions: {
            styleOverrides: {
              root: {
                background: 'transparent',
                borderTop: darkMode
                  ? '1px solid rgba(56, 189, 248, 0.1)'
                  : '1px solid rgba(15, 23, 42, 0.08)',
                padding: '12px 24px',
              },
            },
          },
          MuiDialogContent: {
            styleOverrides: {
              root: {
                background: 'transparent',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                margin: '2px 0',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.05)',
                },
                '&.Mui-selected': {
                  backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.08)',
                  '&:hover': {
                    backgroundColor: darkMode
                      ? 'rgba(56, 189, 248, 0.18)'
                      : 'rgba(15, 23, 42, 0.12)',
                  },
                },
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${tokens.border}`,
                '&.MuiAlert-standardInfo': {
                  backgroundColor: darkMode
                    ? 'rgba(56, 189, 248, 0.08)'
                    : 'rgba(56, 189, 248, 0.06)',
                  color: darkMode ? tokens.text : tokens.text,
                },
                '&.MuiAlert-standardWarning': {
                  backgroundColor: darkMode
                    ? 'rgba(255, 152, 0, 0.08)'
                    : 'rgba(249, 115, 22, 0.06)',
                  color: darkMode ? tokens.text : tokens.text,
                },
                '&.MuiAlert-standardError': {
                  backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(220, 38, 38, 0.06)',
                  color: darkMode ? tokens.text : tokens.text,
                },
                '&.MuiAlert-standardSuccess': {
                  backgroundColor: darkMode ? 'rgba(34, 197, 94, 0.08)' : 'rgba(5, 150, 105, 0.06)',
                  color: darkMode ? tokens.text : tokens.text,
                },
              },
            },
          },
          MuiStepLabel: {
            styleOverrides: {
              label: {
                color: darkMode ? tokens.text : '#000000',
                '&.Mui-active': {
                  color: darkMode ? tokens.accent : '#1976d2',
                  fontWeight: 600,
                },
                '&.Mui-completed': {
                  color: darkMode ? tokens.text : '#000000',
                },
              },
            },
          },
          MuiAccordion: {
            styleOverrides: {
              root: {
                background:
                  'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                boxShadow: darkMode
                  ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
                '&:before': {
                  display: 'none', // Remove the default MUI accordion divider
                },
                '&:not(:last-child)': {
                  borderBottom: 0,
                },
                '&.Mui-expanded': {
                  margin: 0, // Prevent margin changes when expanded
                },
              },
            },
          },
          MuiAccordionSummary: {
            styleOverrides: {
              root: {
                '&.Mui-expanded': {
                  minHeight: 48, // Prevent height jump from 48→64 on expand
                },
              },
              content: {
                '&.Mui-expanded': {
                  margin: '12px 0', // Prevent margin jump from 12px→20px on expand
                },
              },
            },
          },
        },
      }),
    [darkMode, tokens],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ':root': {
            '--bg': tokens.bg,
            '--panel': tokens.panel,
            '--panel-2': tokens.panel2,
            '--text': tokens.text,
            '--muted': tokens.muted,
            '--accent': tokens.accent,
            '--accent-2': tokens.accent2,
            '--ok': tokens.ok,
            '--warn': tokens.warn,
            '--danger': tokens.danger,
            '--border': tokens.border,
            // Modern scrollbar theme variables
            '--scrollbar-track': darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(188, 217, 255, 0.2)',
            '--scrollbar-thumb': darkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.25)',
            '--scrollbar-thumb-hover': darkMode
              ? 'rgba(56, 189, 248, 0.5)'
              : 'rgba(15, 23, 42, 0.4)',
            '--scrollbar-thumb-active': darkMode
              ? 'rgba(56, 189, 248, 0.7)'
              : 'rgba(15, 23, 42, 0.55)',
          },
          // Dialog scrollbar styling
          '.MuiDialog-root': {
            '& ::-webkit-scrollbar': {
              width: '12px',
              height: '12px',
            },
            '& ::-webkit-scrollbar-track': {
              background: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(188, 217, 255, 0.2)',
              borderRadius: '6px',
              margin: '2px',
            },
            '& ::-webkit-scrollbar-thumb': {
              background: darkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.25)',
              borderRadius: '6px',
              border: darkMode
                ? '2px solid rgba(15, 23, 42, 0.5)'
                : '2px solid rgba(188, 217, 255, 0.2)',
              backgroundClip: 'padding-box',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
            },
            '& ::-webkit-scrollbar-thumb:hover': {
              background: darkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(15, 23, 42, 0.4)',
            },
            '& ::-webkit-scrollbar-thumb:active': {
              background: darkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(15, 23, 42, 0.55)',
            },
            '& ::-webkit-scrollbar-corner': {
              background: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(188, 217, 255, 0.2)',
            },
            '& *': {
              scrollbarWidth: 'thin',
              scrollbarColor: darkMode
                ? 'rgba(56, 189, 248, 0.3) rgba(15, 23, 42, 0.5)'
                : 'rgba(15, 23, 42, 0.25) rgba(188, 217, 255, 0.2)',
            },
          },
          // Exclude gear details table from global dialog styles to preserve custom gradients
          '.MuiDialog-root.gear-details-table .MuiDialog-paper': {
            background: 'none !important',
            backgroundColor: 'transparent !important',
            border: 'none',
            boxShadow: 'none',
          },
          '.MuiDialog-root.gear-details-table .MuiDialogContent-root': {
            background: 'none !important',
            backgroundColor: 'transparent !important',
          },
          // Custom typography colors for gear details table
          '.MuiDialog-root.gear-details-table .MuiTypography-root': {
            color: '#040635 !important',
          },
          '.MuiDialog-root.gear-details-table.dark-mode .MuiTypography-root': {
            color: '#ffffff !important',
            textShadow: '1px 1px 0 rgba(0, 0, 0, 0.89)',
          },
          // Placeholder text styling
          'input::placeholder, textarea::placeholder, .MuiInputBase-input::placeholder': {
            color: `${darkMode ? '#94a3b8' : '#64748b'} !important`,
            opacity: '1 !important',
          },
          // Force MenuItem text colors globally with highest specificity
          '.MuiMenuItem-root': {
            color: `${darkMode ? '#e5e7eb' : '#1e293b'} !important`,
            '& *': {
              color: `${darkMode ? '#e5e7eb' : '#1e293b'} !important`,
            },
            '&:hover': {
              backgroundColor: `${darkMode ? '#1e293b' : '#f5f5f5'} !important`,
              color: `${darkMode ? '#ffffff' : '#000000'} !important`,
              '& *': {
                color: `${darkMode ? '#ffffff' : '#000000'} !important`,
              },
            },
            '&.Mui-selected': {
              backgroundColor: `${darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(25, 118, 210, 0.08)'} !important`,
              color: `${darkMode ? '#ffffff' : '#1e293b'} !important`,
              '& *': {
                color: `${darkMode ? '#ffffff' : '#1e293b'} !important`,
              },
              '&:hover': {
                backgroundColor: `${darkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(25, 118, 210, 0.12)'} !important`,
                color: `${darkMode ? '#ffffff' : '#000000'} !important`,
                '& *': {
                  color: `${darkMode ? '#ffffff' : '#000000'} !important`,
                },
              },
            },
          },
          // Additional specific targeting for MenuItem content
          '.MuiMenuItem-root .MuiListItemText-root, .MuiMenuItem-root .MuiListItemText-primary, .MuiMenuItem-root .MuiTypography-root':
            {
              color: `${darkMode ? '#e5e7eb' : '#1e293b'} !important`,
            },
          '.MuiMenuItem-root:hover .MuiListItemText-root, .MuiMenuItem-root:hover .MuiListItemText-primary, .MuiMenuItem-root:hover .MuiTypography-root':
            {
              color: `${darkMode ? '#ffffff' : '#000000'} !important`,
            },
          '.MuiMenuItem-root.Mui-selected .MuiListItemText-root, .MuiMenuItem-root.Mui-selected .MuiListItemText-primary, .MuiMenuItem-root.Mui-selected .MuiTypography-root':
            {
              color: `${darkMode ? '#ffffff' : '#1e293b'} !important`,
            },
          // Force Menu and Popover paper backgrounds globally
          '.MuiMenu-paper, .MuiPopover-paper': {
            backgroundColor: `${darkMode ? '#0f172a' : '#ffffff'} !important`,
            color: `${darkMode ? '#e5e7eb' : '#1e293b'} !important`,
            border: `${darkMode ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(0, 0, 0, 0.23)'} !important`,
          },
          // Enhanced scrollbar styles for TextFields and form elements
          '.MuiTextField-root textarea, .MuiOutlinedInput-input': {
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(188, 217, 255, 0.15)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: darkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.3)',
              borderRadius: '4px',
              border: darkMode
                ? '1px solid rgba(15, 23, 42, 0.3)'
                : '1px solid rgba(188, 217, 255, 0.15)',
              backgroundClip: 'padding-box',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: darkMode ? 'rgba(56, 189, 248, 0.6)' : 'rgba(15, 23, 42, 0.45)',
            },
          },
          // DataGrid pagination controls styling
          '.data-grid-pagination': {
            '& .MuiPaginationItem-root': {
              transition: 'all 0.1s ease-in-out !important',
              backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              border: darkMode
                ? '1px solid rgba(56, 189, 248, 0.2)'
                : '1px solid rgba(25, 118, 210, 0.2)',
              color: darkMode ? tokens.text : tokens.text,
              '&:hover:not(:disabled)': {
                backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(25, 118, 210, 0.08)',
                borderColor: darkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(0, 0, 0, 0.05)',
                color: darkMode ? 'rgba(229, 231, 235, 0.4)' : 'rgba(0, 0, 0, 0.4)',
              },
              '&.Mui-selected': {
                backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(25, 118, 210, 0.15)',
                borderColor: darkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(25, 118, 210, 0.3)',
                color: darkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: darkMode
                    ? 'rgba(56, 189, 248, 0.3)'
                    : 'rgba(25, 118, 210, 0.25)',
                  borderColor: darkMode ? 'rgba(56, 189, 248, 0.6)' : 'rgba(25, 118, 210, 0.5)',
                },
              },
            },
          },
        }}
      />
      <GlobalStyles
        styles={{
          // Global scrollbar styles with highest specificity
          '*': {
            '&::-webkit-scrollbar': {
              width: '12px !important',
              height: '12px !important',
            },
            '&::-webkit-scrollbar-track': {
              background: `${darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(188, 217, 255, 0.2)'} !important`,
              borderRadius: '6px !important',
              margin: '2px !important',
            },
            '&::-webkit-scrollbar-thumb': {
              background: `${darkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.25)'} !important`,
              borderRadius: '6px !important',
              border: `${darkMode ? '2px solid rgba(15, 23, 42, 0.5)' : '2px solid rgba(188, 217, 255, 0.2)'} !important`,
              backgroundClip: 'padding-box !important',
              transition: 'background-color 0.2s ease, border-color 0.2s ease !important',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: `${darkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(15, 23, 42, 0.4)'} !important`,
            },
            '&::-webkit-scrollbar-thumb:active': {
              background: `${darkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(15, 23, 42, 0.55)'} !important`,
            },
            '&::-webkit-scrollbar-corner': {
              background: `${darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(188, 217, 255, 0.2)'} !important`,
            },
            scrollbarWidth: 'thin !important',
            scrollbarColor: `${
              darkMode
                ? 'rgba(56, 189, 248, 0.3) rgba(15, 23, 42, 0.5)'
                : 'rgba(15, 23, 42, 0.25) rgba(188, 217, 255, 0.2)'
            } !important`,
          },
          // Specific overrides for form elements with smaller scrollbars
          'textarea, input[type="text"], .MuiOutlinedInput-input': {
            '&::-webkit-scrollbar': {
              width: '8px !important',
              height: '8px !important',
            },
            '&::-webkit-scrollbar-track': {
              background: `${darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(188, 217, 255, 0.15)'} !important`,
              borderRadius: '4px !important',
            },
            '&::-webkit-scrollbar-thumb': {
              background: `${darkMode ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.3)'} !important`,
              borderRadius: '4px !important',
              border: `${darkMode ? '1px solid rgba(15, 23, 42, 0.3)' : '1px solid rgba(188, 217, 255, 0.15)'} !important`,
              backgroundClip: 'padding-box !important',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: `${darkMode ? 'rgba(56, 189, 248, 0.6)' : 'rgba(15, 23, 42, 0.45)'} !important`,
            },
          },
        }}
      />
      <GlobalStyles
        styles={{
          '@keyframes tooltipEnter': {
            '0%': {
              opacity: 0,
              transform: 'translateY(6px) scale(0.96)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
          '@keyframes tooltipShimmer': {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' },
          },
          // Electric-border (top DPS): register the angle custom property so it
          // can interpolate inside the conic-gradient. Without @property the
          // gradient angle would not animate. Falls back gracefully (static
          // ring) in engines that don't support @property.
          '@property --tdps-angle': {
            syntax: '"<angle>"',
            initialValue: '0deg',
            inherits: 'false',
          },
          // Sweep the gradient's start angle, NOT the element's transform — that
          // keeps the rectangular ring in place and moves only the bright
          // "current" travelling around its edge.
          '@keyframes electricBorderSpin': {
            to: { '--tdps-angle': '360deg' },
          },
          // Electric-border (top DPS): gentle glow pulse on the outer halo
          '@keyframes electricBorderPulse': {
            '0%, 100%': { opacity: 0.55 },
            '50%': { opacity: 1 },
          },
          '.u-fade-in': {
            animation: 'tooltipEnter 220ms cubic-bezier(0.26, 0.53, 0.74, 1.48) both',
          },
          '.u-hover-glow': {
            transition: 'box-shadow .2s ease',
            '&:hover': {
              boxShadow: '0 0 0 3px rgba(56, 189, 248, 0.25)',
            },
          },
          '.u-focus-ring:focus-visible': {
            outline: '2px solid var(--accent)',
            outlineOffset: 2,
            borderRadius: 'inherit',
          },
          // Utility: align digits for better comparison in stat-heavy UIs
          '.u-tabular': {
            fontVariantNumeric: 'tabular-nums',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '.u-fade-in': { animation: 'none !important' },
            '.u-fade-in-up': { animation: 'none !important' },
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
};
