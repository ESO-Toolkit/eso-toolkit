/**
 * GlassPanel
 * Glassmorphism container with backdrop-filter, border, and shadow.
 * Adapts to dark/light mode automatically.
 */

import { Box, type SxProps, type Theme } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';

import { BE_TOKENS } from '../../theme/buildEditorTokens';

interface GlassPanelProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  glow?: boolean;
  component?: React.ElementType;
  id?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  sx,
  glow = false,
  component = 'div',
  id,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component={component}
      id={id}
      sx={
        {
          background: isDark ? BE_TOKENS.glass.bg : BE_TOKENS.glass.bgLight,
          backdropFilter: `blur(${BE_TOKENS.glass.blur}px)`,
          WebkitBackdropFilter: `blur(${BE_TOKENS.glass.blur}px)`,
          border: `1px solid ${isDark ? BE_TOKENS.glass.border : BE_TOKENS.glass.borderLight}`,
          borderRadius: 3,
          boxShadow: isDark ? BE_TOKENS.glass.shadow : BE_TOKENS.glass.shadowLight,
          transition: 'box-shadow 0.25s, border-color 0.25s',
          ...(glow && {
            '&:hover': {
              borderColor: isDark
                ? alpha('var(--be-accent)' as unknown as string, 0.3)
                : alpha('#0f172a', 0.15),
              boxShadow: isDark
                ? `0 8px 32px rgba(0, 0, 0, 0.18), 0 0 24px var(--be-glow)`
                : BE_TOKENS.glass.shadowLight,
            },
          }),
          ...sx,
        } as SxProps<Theme>
      }
    >
      {children}
    </Box>
  );
};
