/**
 * Shared glass-morphism input style for roster card components.
 * Applies consistent bordered, semi-transparent styling to MUI outlined inputs.
 */
export const makeGlassSx = (isDark: boolean): Record<string, unknown> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    '& fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
    },
    '&:hover fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
    },
  },
});

/** Subtle container box for grouping related fields inside advanced options. */
export const makeSectionBoxSx = (isDark: boolean): Record<string, unknown> => ({
  p: 1.25,
  borderRadius: '10px',
  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
});

/** Consistent section header typography matching modern picker components. */
export const makeSectionHeaderSx = (isDark: boolean): Record<string, unknown> => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
  mb: 1,
});
