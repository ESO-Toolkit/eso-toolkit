import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from './store/storeWithHistory';

export const ReduxThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Keep the selector so we can enable light mode later without refactors
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);

  // Design tokens (dark-first). Light tokens can be added later.
  const tokens = React.useMemo(
    () =>
      ({
        bg: '#0b1220',
        panel: '#0f172a',
        panel2: '#0d1430',
        text: '#e5e7eb',
        muted: '#94a3b8',
        accent: '#38bdf8',
        accent2: '#00e1ff',
        ok: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
        border: '#1f2937',
      }) as const,
    []
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'dark', // dark-only for now
          background: { default: tokens.bg, paper: tokens.panel },
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
                color: tokens.text,
                // Enable variable font optical sizing where supported
                fontOpticalSizing: 'auto',
              },
              '*, *::before, *::after': { boxSizing: 'border-box' },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(11, 18, 32, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                background:
                  'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
                border: `1px solid ${tokens.border}`,
                borderRadius: 14,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              },
            },
          },
          // Force dropdown (menu/popover) backgrounds to solid panel color
          MuiMenu: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: '#30394d',
              },
            },
          },
          MuiPopover: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: '#30394d',
              },
            },
          },
          MuiAutocomplete: {
            styleOverrides: {
              paper: {
                background: 'none',
                backgroundImage: 'none',
                backgroundColor: '#30394d',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                background:
                  'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
                border: `1px solid ${tokens.border}`,
                borderRadius: 14,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(56, 189, 248, 0.08)',
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
              containedPrimary: {
                background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accent2})`,
                color: tokens.bg,
                boxShadow: '0 4px 15px rgba(56, 189, 248, 0.25)',
                '&:hover': {
                  filter: 'brightness(1.05)',
                  boxShadow: '0 6px 25px rgba(56, 189, 248, 0.35)',
                },
              },
              outlined: {
                borderColor: 'rgba(56, 189, 248, 0.5)',
                color: tokens.accent,
                '&:hover': {
                  background: 'rgba(56, 189, 248, 0.1)',
                  borderColor: tokens.accent,
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                background: 'rgba(2,6,23,0.45)',
                border: `1px solid ${tokens.border}`,
              },
            },
          },
        },
      }),
    [darkMode, tokens]
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
          },
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '.u-fade-in': {
            animation: 'fadeIn 0.4s ease-out both',
          },
          '.u-fade-in-up': {
            animation: 'fadeInUp 0.5s ease-out both',
          },
          '.u-hover-lift': {
            transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), 0 0 30px rgba(56, 189, 248, 0.10)',
              borderColor: 'rgba(56, 189, 248, 0.25)',
            },
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
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
};
