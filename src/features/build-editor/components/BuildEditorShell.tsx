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
        border: `1px solid ${isDark ? `rgba(${classTheme.accentRgb}, 0.12)` : 'rgba(15, 23, 42, 0.1)'}`,
        background: isDark ? 'rgb(11, 18, 32)' : 'rgb(255, 255, 255)',
        backdropFilter: 'blur(4px)',
        overflow: 'hidden',
        minHeight: 600,
        // Subtle class-colored top border glow
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: classTheme.gradient,
          opacity: 0.6,
          pointerEvents: 'none',
        },
        // Corner accent glow
        '&::after': isDark
          ? {
              content: '""',
              position: 'absolute',
              top: -60,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(ellipse, rgba(${classTheme.accentRgb}, 0.04) 0%, transparent 70%)`,
              pointerEvents: 'none',
              transition: 'background 0.5s',
            }
          : {},
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
