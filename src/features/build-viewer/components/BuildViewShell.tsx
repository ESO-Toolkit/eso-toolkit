/**
 * BuildViewShell
 * Class-themed wrapper for the read-only build viewer.
 * Mirrors BuildEditorShell but accepts esoClass as a prop
 * instead of reading from Redux state.
 */

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';

import { CLASS_COLOR_MAP } from '../../build-editor/theme/classColorMap';
import type { ESOClass } from '../../build-editor/types/build.types';

interface BuildViewShellProps {
  children: React.ReactNode;
  esoClass: ESOClass;
}

export const BuildViewShell: React.FC<BuildViewShellProps> = ({ children, esoClass }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const classTheme = useMemo(() => CLASS_COLOR_MAP[esoClass], [esoClass]);

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
        } as React.CSSProperties
      }
    >
      <Box
        sx={{
          position: 'relative',
          borderRadius: 3,
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.10)'}`,
          backgroundColor: isDark ? 'rgb(8, 14, 26)' : 'rgb(245, 248, 252)',
          backgroundImage: isDark
            ? [
                `radial-gradient(ellipse at 50% 0%, rgba(${classTheme.accentRgb}, 0.12) 0%, transparent 45%)`,
                `radial-gradient(ellipse at 88% 12%, rgba(${classTheme.accentRgb}, 0.06) 0%, transparent 35%)`,
                `radial-gradient(ellipse at 12% 18%, rgba(${classTheme.accentRgb}, 0.04) 0%, transparent 30%)`,
              ].join(', ')
            : [
                `radial-gradient(ellipse at 50% 0%, rgba(${classTheme.accentRgb}, 0.08) 0%, transparent 45%)`,
                `radial-gradient(ellipse at 85% 10%, rgba(${classTheme.accentRgb}, 0.04) 0%, transparent 35%)`,
              ].join(', '),
          overflow: 'clip',
          minHeight: 400,
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
          // Soft ambient bloom below accent line
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '180px',
            background: `linear-gradient(to bottom, rgba(${classTheme.accentRgb}, 0.08) 0%, rgba(${classTheme.accentRgb}, 0.02) 60%, transparent 100%)`,
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
        data-class={esoClass}
      >
        {children}
      </Box>
    </Box>
  );
};
