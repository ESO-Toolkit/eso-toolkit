/**
 * BuildEditorShell
 * Outermost wrapper for the redesigned build editor.
 * Provides class-theme CSS vars and a scoped background.
 */

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { useClassTheme } from '../hooks/useClassTheme';
import { BuildEditorThemeProvider } from '../theme/BuildEditorThemeProvider';

import { BuildEditorLayout } from './BuildEditorLayout';

const ShellInner: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const classTheme = useClassTheme();
  const esoClass = useSelector((s: RootState) => s.buildEditor.build.esoClass);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.10)'}`,
        backgroundColor: isDark ? 'rgb(8, 14, 26)' : 'rgb(245, 248, 252)',
        // Multi-point aurora mesh — class accent bleeds from 3 positions for depth
        backgroundImage: isDark
          ? [
              'radial-gradient(ellipse at 50% 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.12) 0%, transparent 45%)',
              'radial-gradient(ellipse at 88% 12%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.06) 0%, transparent 35%)',
              'radial-gradient(ellipse at 12% 18%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 0%, transparent 30%)',
            ].join(', ')
          : [
              'radial-gradient(ellipse at 50% 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.08) 0%, transparent 45%)',
              'radial-gradient(ellipse at 85% 10%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.04) 0%, transparent 35%)',
            ].join(', '),
        overflow: 'clip',
        minHeight: 600,
        // Class-colored accent line at the top edge
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: classTheme.gradient,
          opacity: 0.9,
          pointerEvents: 'none',
          zIndex: 2,
        },
        // Soft ambient bloom radiating below the accent line
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '180px',
          background:
            'linear-gradient(to bottom, rgba(var(--be-accent-rgb, 56, 189, 248), 0.08) 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.02) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
      data-class={esoClass}
    >
      <BuildEditorLayout />
    </Box>
  );
};

export const BuildEditorShell: React.FC = () => (
  <BuildEditorThemeProvider>
    <ShellInner />
  </BuildEditorThemeProvider>
);
