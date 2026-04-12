/**
 * Shared glass-morphism input style for roster card components.
 * Applies consistent bordered, semi-transparent styling to MUI outlined inputs.
 *
 * Precomputed as module-level constants (dark and light variants) so card
 * components always receive the same stable object reference. This prevents
 * MUI from regenerating emotion CSS classes on every render.
 */

export const GLASS_SX_DARK: Record<string, unknown> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.08)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255,255,255,0.15)',
    },
  },
};

export const GLASS_SX_LIGHT: Record<string, unknown> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    '& fieldset': {
      borderColor: 'rgba(0,0,0,0.12)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(0,0,0,0.2)',
    },
  },
};

/** @deprecated Use `isDark ? GLASS_SX_DARK : GLASS_SX_LIGHT` for stable object references. */
export const makeGlassSx = (isDark: boolean): Record<string, unknown> =>
  isDark ? GLASS_SX_DARK : GLASS_SX_LIGHT;

// ---------------------------------------------------------------------------
// Section box
// ---------------------------------------------------------------------------

export const SECTION_BOX_SX_DARK: Record<string, unknown> = {
  p: 1.25,
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
};

export const SECTION_BOX_SX_LIGHT: Record<string, unknown> = {
  p: 1.25,
  borderRadius: '10px',
  backgroundColor: 'rgba(0,0,0,0.015)',
  border: '1px solid rgba(0,0,0,0.04)',
};

/** @deprecated Use `isDark ? SECTION_BOX_SX_DARK : SECTION_BOX_SX_LIGHT` for stable object references. */
export const makeSectionBoxSx = (isDark: boolean): Record<string, unknown> =>
  isDark ? SECTION_BOX_SX_DARK : SECTION_BOX_SX_LIGHT;

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

export const SECTION_HEADER_SX_DARK: Record<string, unknown> = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  color: 'rgba(255,255,255,0.5)',
  mb: 1,
};

export const SECTION_HEADER_SX_LIGHT: Record<string, unknown> = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  color: 'rgba(0,0,0,0.45)',
  mb: 1,
};

/** @deprecated Use `isDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT` for stable object references. */
export const makeSectionHeaderSx = (isDark: boolean): Record<string, unknown> =>
  isDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT;
