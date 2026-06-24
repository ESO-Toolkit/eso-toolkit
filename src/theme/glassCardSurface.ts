import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/** Accent palette (RGB triplets) for the report-summary section cards. */
export const SUMMARY_ACCENTS = {
  /** Brand cyan — the report header / overview card. */
  info: '56, 189, 248',
  /** Amber — the damage breakdown card. */
  damage: '251, 191, 36',
  /** Coral — the death analysis card (and error states). */
  death: '248, 113, 113',
} as const;

/**
 * Premium "glass" surface for the report-summary section cards.
 *
 * Builds on the app's cyan-glass language (ReportActionBar, build-editor
 * GlassPanel, dashboard BaseWidget) so the summary reads as a first-class
 * surface rather than flat Material cards:
 *  - a translucent gradient that lets the page's cosmic background bleed through,
 *  - a color-coded top accent bar + a soft accent bloom under it (per card),
 *  - a layered drop shadow with an inset top highlight, and a hover glow.
 *
 * Returned as a plain style object so callers can spread per-card extras, e.g.
 * `sx={(theme) => ({ ...glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.damage), mb: 3 })}`.
 * Pair with `elevation={0}` — the recipe supplies its own shadow, and the
 * layered `background` clears MUI's dark-mode elevation overlay.
 */
export function glassCardSurfaceSx(
  dark: boolean,
  accentRgb: string = SUMMARY_ACCENTS.info,
): SystemStyleObject<Theme> {
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2.5,
    border: `1px solid ${dark ? `rgba(${accentRgb}, 0.20)` : `rgba(${accentRgb}, 0.18)`}`,
    // Accent bloom (top) layered over a translucent base so the cosmic page
    // background shows through the card.
    background: dark
      ? `linear-gradient(180deg, rgba(${accentRgb}, 0.1) 0%, rgba(${accentRgb}, 0) 150px),
         linear-gradient(160deg, rgba(20, 32, 54, 0.82) 0%, rgba(7, 12, 26, 0.8) 100%)`
      : `linear-gradient(180deg, rgba(${accentRgb}, 0.08) 0%, rgba(${accentRgb}, 0) 150px),
         linear-gradient(160deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 248, 255, 0.85) 100%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: dark
      ? '0 10px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
      : '0 6px 28px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    transition: 'box-shadow 0.28s ease, border-color 0.28s ease',
    // Color-coded top accent bar.
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: `linear-gradient(90deg, transparent 0%, rgba(${accentRgb}, ${dark ? 0.95 : 0.85}) 50%, transparent 100%)`,
      pointerEvents: 'none',
      zIndex: 1,
    },
    '&:hover': {
      borderColor: dark ? `rgba(${accentRgb}, 0.42)` : `rgba(${accentRgb}, 0.34)`,
      boxShadow: dark
        ? `0 14px 48px rgba(0, 0, 0, 0.5), 0 0 28px rgba(${accentRgb}, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)`
        : `0 10px 36px rgba(15, 23, 42, 0.16), 0 0 24px rgba(${accentRgb}, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)`,
    },
  };
}
