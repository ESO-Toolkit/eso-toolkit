/**
 * GlassPanel
 * Glassmorphism container with backdrop-filter, border, and shadow.
 * Adapts to dark/light mode automatically.
 *
 * variant='primary'  — Solid translucent border + inner top glow slit.
 *                      Used for Identity, Equipment, Skills, Champion sections.
 *                      (Previously used a gradient borderImage; removed because
 *                      the accent color bleed read as a debug outline.)
 * variant='default'  — Standard glass panel with solid translucent border.
 * variant='subtle'   — Quieter border + minimal shadow (Settings, Screenshots).
 */

import { Box, type SxProps, type Theme } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { BE_TOKENS } from '../../theme/buildEditorTokens';

export type GlassPanelVariant = 'primary' | 'default' | 'subtle';

interface GlassPanelProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  glow?: boolean;
  component?: React.ElementType;
  id?: string;
  variant?: GlassPanelVariant;
}

export const GlassPanel = React.memo<GlassPanelProps>(function GlassPanel({
  children,
  sx,
  glow = false,
  component = 'div',
  id,
  variant = 'default',
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isPrimary = variant === 'primary';
  const isSubtle = variant === 'subtle';

  // All variants use a solid translucent border. Primary used to carry a
  // gradient `borderImage`, but the shorthand left `border-color` falling
  // back to `currentColor` in some composite paths, producing a visible
  // "debug" outline around every primary panel.
  const solidBorder = `1px solid ${
    isSubtle
      ? isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.06)'
      : isDark
        ? BE_TOKENS.glass.border
        : BE_TOKENS.glass.borderLight
  }`;

  const shadow = isPrimary
    ? isDark
      ? '0 8px 40px rgba(0, 0, 0, 0.42), 0 1px 0 rgba(255, 255, 255, 0.06) inset'
      : '0 4px 28px rgba(15, 23, 42, 0.14), 0 1px 0 rgba(255, 255, 255, 0.90) inset'
    : isSubtle
      ? isDark
        ? '0 4px 16px rgba(0, 0, 0, 0.18)'
        : '0 2px 8px rgba(15, 23, 42, 0.05)'
      : isDark
        ? BE_TOKENS.glass.shadow
        : BE_TOKENS.glass.shadowLight;

  const hoverShadow = isPrimary
    ? isDark
      ? '0 12px 48px rgba(0, 0, 0, 0.38), 0 0 32px rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
      : '0 6px 32px rgba(15, 23, 42, 0.16)'
    : isDark
      ? '0 8px 32px rgba(0, 0, 0, 0.26), 0 0 18px rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)'
      : BE_TOKENS.glass.shadowLight;

  return (
    <Box
      component={component}
      id={id}
      sx={
        {
          position: 'relative',
          background: isDark ? BE_TOKENS.glass.bg : BE_TOKENS.glass.bgLight,
          border: solidBorder,
          borderRadius: 3,
          boxShadow: shadow,
          transition: 'box-shadow 0.3s ease, border-color 0.25s ease',

          // ── Primary tier: inner top glow slit ──────────────────────────
          // Subtle horizontal light streak at the top inside edge — the only
          // remaining visual accent that distinguishes primary panels.
          ...(isPrimary && {
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '1px',
              left: '12%',
              right: '12%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(var(--be-accent-rgb, 56, 189, 248), 0.70) 50%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 2,
            },
          }),

          // ── Hover states ───────────────────────────────────────────────────
          ...(glow && {
            '&:hover': {
              boxShadow: hoverShadow,
            },
          }),

          ...sx,
        } as SxProps<Theme>
      }
    >
      {children}
    </Box>
  );
});
