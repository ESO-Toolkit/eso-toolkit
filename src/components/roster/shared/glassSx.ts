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

/** @deprecated Use `isDark ? GLASS_SX_DARK : GLASS_SX_LIGHT` directly for a stable object reference. Kept for backward compatibility — callers that have not yet migrated will continue to work but will receive a new object reference on every call. */
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

/** @deprecated Use `isDark ? SECTION_BOX_SX_DARK : SECTION_BOX_SX_LIGHT` directly for a stable object reference. Kept for backward compatibility — callers that have not yet migrated will continue to work but will receive a new object reference on every call. */
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

/** @deprecated Use `isDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT` directly for a stable object reference. Kept for backward compatibility — callers that have not yet migrated will continue to work but will receive a new object reference on every call. */
export const makeSectionHeaderSx = (isDark: boolean): Record<string, unknown> =>
  isDark ? SECTION_HEADER_SX_DARK : SECTION_HEADER_SX_LIGHT;

// ---------------------------------------------------------------------------
// Equipment section box
//
// The bordered container that wraps the lazy-mounted Equipment block in each
// slot card (currently inlined identically in DPS/Tank/Healer cards). Exported
// as module-level constants so every card passes the same object reference and
// MUI/Emotion reuses one generated class instead of re-hashing per render.
// ---------------------------------------------------------------------------

export const EQUIPMENT_SECTION_BOX_SX_DARK: Record<string, unknown> = {
  p: 1.25,
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
};

export const EQUIPMENT_SECTION_BOX_SX_LIGHT: Record<string, unknown> = {
  p: 1.25,
  borderRadius: '10px',
  backgroundColor: 'rgba(0,0,0,0.015)',
  border: '1px solid rgba(0,0,0,0.04)',
};

// ---------------------------------------------------------------------------
// Equipment label
//
// The small uppercase "Equipment" caption above the equipment fields. Stable
// references (dark/light) keep the emotion class cache warm across renders.
// ---------------------------------------------------------------------------

export const EQUIPMENT_LABEL_SX_DARK: Record<string, unknown> = {
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)',
  mb: 1,
};

export const EQUIPMENT_LABEL_SX_LIGHT: Record<string, unknown> = {
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'rgba(0,0,0,0.35)',
  mb: 1,
};

// ---------------------------------------------------------------------------
// Tag / group chip
//
// The pill-shaped chips rendered by the "Groups" and "Tags" Autocompletes
// (passed via slotProps.chip.sx, currently duplicated inline in every card).
// Precomputed dark/light constants give Emotion a stable reference to reuse.
// ---------------------------------------------------------------------------

export const TAG_CHIP_SX_DARK: Record<string, unknown> = {
  borderRadius: '6px',
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  fontWeight: 500,
  fontSize: '0.75rem',
};

export const TAG_CHIP_SX_LIGHT: Record<string, unknown> = {
  borderRadius: '6px',
  backgroundColor: 'rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.1)',
  fontWeight: 500,
  fontSize: '0.75rem',
};
