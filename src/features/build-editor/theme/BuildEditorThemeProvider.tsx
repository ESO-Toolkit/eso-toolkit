/**
 * Build Editor Theme Provider
 * Reads the current ESO class from Redux and injects CSS custom properties
 * onto a wrapper div. Components use var(--be-accent) etc. in their styles.
 *
 * This is cheaper than a nested MUI ThemeProvider and scopes the class
 * theming to the build editor without leaking globally.
 */

import { Box } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { CLASS_COLOR_MAP } from './classColorMap';

export const BuildEditorThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const esoClass = useSelector((s: RootState) => s.buildEditor.build.esoClass);
  const classTheme = CLASS_COLOR_MAP[esoClass];

  return (
    <Box
      sx={
        {
          '--be-accent': classTheme.accent,
          '--be-glow': classTheme.glow,
          '--be-gradient': classTheme.gradient,
          '--be-accent-rgb': classTheme.accentRgb,
          width: '100%',
          minHeight: 0,
          // Global focus-visible ring scoped to the build editor.
          // MUI removes outlines by default; this restores keyboard-nav accessibility
          // without adding rings on mouse clicks (WCAG 2.4.7 / 2.4.11).
          '& *:focus-visible': {
            outline: '2px solid var(--be-accent, #38bdf8)',
            outlineOffset: '2px',
          },
          // MUI buttons override outline — target their inner element too
          '& .MuiButtonBase-root:focus-visible': {
            outline: '2px solid var(--be-accent, #38bdf8)',
            outlineOffset: '2px',
          },
        } as React.CSSProperties
      }
    >
      {children}
    </Box>
  );
};
