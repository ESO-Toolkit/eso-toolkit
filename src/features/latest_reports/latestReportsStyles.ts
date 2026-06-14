import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared visual vocabulary for the Latest Reports surface, mirroring the
 * Roster Hub filter bar (src/features/roster-hub/components/FilterBar.tsx) so
 * the two community surfaces feel like one design system: glassmorphic fields,
 * a blue→purple gradient for active/segmented controls, and a soft focus glow.
 */

// --- Accent palette (matches roster-hub) ------------------------------------
export const ACCENT_BLUE = '#60a5fa';
export const ACCENT_PURPLE = '#a78bfa';

export const accentGradient = (isDark: boolean): string =>
  isDark
    ? 'linear-gradient(135deg, rgba(96,165,250,0.95) 0%, rgba(139,92,246,0.9) 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)';

export const accentGlow = (isDark: boolean): string =>
  isDark
    ? '0 0 10px rgba(96,165,250,0.35), 0 2px 8px rgba(0,0,0,0.35)'
    : '0 2px 8px rgba(59,130,246,0.35)';

// --- Border / focus states --------------------------------------------------
export const fieldBorder = (isDark: boolean): string =>
  isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
export const fieldBorderHover = (isDark: boolean): string =>
  isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)';
export const FOCUS_BORDER = 'rgba(96,165,250,0.55)';
export const FOCUS_GLOW = '0 0 0 3px rgba(96,165,250,0.12)';

// --- Glassmorphic surfaces --------------------------------------------------
/** Base glass fill + blur for an input/select field. */
export const glassFieldBg = (
  isDark: boolean,
): { background: string; backdropFilter: string; WebkitBackdropFilter: string } => ({
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
});

/** The outer glass panel that wraps the whole toolbar. */
export const glassPanelSx = (isDark: boolean): SxProps<Theme> => ({
  borderRadius: 3,
  p: { xs: 1.5, md: 2 },
  background: isDark ? 'rgba(11,16,26,0.88)' : 'rgba(248,250,252,0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
});

/**
 * Full OutlinedInput field treatment (glass fill + animated border + focus
 * glow). Spread into a TextField/Select `sx` under the root selector.
 */
export const glassOutlinedFieldSx = (isDark: boolean): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    ...glassFieldBg(isDark),
    borderRadius: '10px',
    '& fieldset': {
      borderColor: fieldBorder(isDark),
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    '&:hover fieldset': { borderColor: fieldBorderHover(isDark) },
    '&.Mui-focused fieldset': {
      borderColor: FOCUS_BORDER,
      borderWidth: '1px',
      boxShadow: FOCUS_GLOW,
    },
  },
});

/**
 * Glassmorphic dropdown/popover surface (menu paper), matching the roster-hub
 * Select menu styling.
 */
export const glassMenuPaperSx = (isDark: boolean): SxProps<Theme> => ({
  mt: 0.5,
  borderRadius: 2,
  background: isDark ? 'rgba(18,24,38,0.96)' : 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
});

/** The translucent track behind a pill segmented control. */
export const segmentedTrackSx = (isDark: boolean): SxProps<Theme> => ({
  display: 'inline-flex',
  p: '3px',
  borderRadius: '999px',
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  flexShrink: 0,
});

/** A single pill button inside a segmented control. */
export const segmentedButtonSx = (isDark: boolean, active: boolean): SxProps<Theme> => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.5,
  px: 1.5,
  py: 0.55,
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  ...(active
    ? {
        background: accentGradient(isDark),
        color: '#fff',
        boxShadow: accentGlow(isDark),
      }
    : {
        background: 'transparent',
        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
        '&:hover': {
          color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        },
      }),
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  '&:focus-visible': {
    outline: `2px solid ${FOCUS_BORDER}`,
    outlineOffset: '2px',
  },
});
