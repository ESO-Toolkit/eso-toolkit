import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Premium, accent-aware styling helpers shared across the report-summary
 * sections. These borrow the app's "Ultimate Calculator" surface language
 * (gradient table headers, zebra rows + accent hover rail, glowing stat tiles,
 * icon badges) so the summary tables and tiles read as first-class surfaces.
 *
 * Each helper takes an `accentRgb` triplet (see SUMMARY_ACCENTS) so a section's
 * colour flows through its header badge, table, tiles and rank badges.
 */

const MONO_FONT = '"Space Grotesk Variable", Inter Variable, system-ui, sans-serif';

/** Table styling: gradient small-caps header, subtle zebra rows, accent hover + left rail. */
export function accentTableSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    '& th, & td': {
      borderColor: dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)',
      fontVariantNumeric: 'tabular-nums',
    },
    '& thead th': {
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontSize: 11,
      fontWeight: 700,
      color: 'text.secondary',
      borderBottom: `2px solid rgba(${accentRgb}, ${dark ? 0.4 : 0.32})`,
      background: dark
        ? `linear-gradient(135deg, rgba(${accentRgb}, 0.12) 0%, rgba(${accentRgb}, 0.03) 100%)`
        : `linear-gradient(135deg, rgba(${accentRgb}, 0.09) 0%, rgba(${accentRgb}, 0.02) 100%)`,
    },
    '& tbody tr': { transition: 'background-color 0.15s ease' },
    '& tbody tr:nth-of-type(odd) td': {
      backgroundColor: dark ? 'rgba(148, 163, 184, 0.035)' : 'rgba(15, 23, 42, 0.015)',
    },
    '& tbody tr:hover td': {
      backgroundColor: dark ? `rgba(${accentRgb}, 0.1)` : `rgba(${accentRgb}, 0.07)`,
    },
    '& tbody tr:hover td:first-of-type': {
      boxShadow: `inset 3px 0 0 rgba(${accentRgb}, ${dark ? 0.95 : 0.85})`,
    },
    '& tbody tr:last-of-type td': { borderBottom: 'none' },
  };
}

/** A raised metric tile: accent gradient fill, top sheen bar, lift + glow on hover. */
export function statTileSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2,
    border: `1px solid rgba(${accentRgb}, ${dark ? 0.24 : 0.2})`,
    background: dark
      ? `linear-gradient(180deg, rgba(${accentRgb}, 0.14) 0%, rgba(${accentRgb}, 0.03) 100%)`
      : `linear-gradient(180deg, rgba(${accentRgb}, 0.1) 0%, rgba(${accentRgb}, 0.02) 100%)`,
    boxShadow: dark
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 16px rgba(0, 0, 0, 0.3)'
      : '0 2px 8px rgba(15, 23, 42, 0.05)',
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: `linear-gradient(90deg, transparent, rgba(${accentRgb}, ${dark ? 0.9 : 0.8}), transparent)`,
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: `rgba(${accentRgb}, ${dark ? 0.48 : 0.4})`,
      boxShadow: dark
        ? `inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 26px rgba(0, 0, 0, 0.4), 0 0 20px rgba(${accentRgb}, 0.2)`
        : `0 8px 20px rgba(15, 23, 42, 0.1), 0 0 16px rgba(${accentRgb}, 0.14)`,
    },
  };
}

/** Big tabular value typography for stat tiles. */
export const statValueSx: SystemStyleObject<Theme> = {
  fontFamily: MONO_FONT,
  fontWeight: 700,
  fontSize: { xs: '1.9rem', sm: '2.2rem' },
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
};

/** Small-caps label under a stat value. */
export const statLabelSx: SystemStyleObject<Theme> = {
  display: 'block',
  mt: 0.5,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'text.secondary',
};

/** Square icon badge that prefixes a section title, tinted + glowing in the accent. */
export function sectionIconBadgeSx(accentRgb: string): SystemStyleObject<Theme> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 2,
    flexShrink: 0,
    color: `rgb(${accentRgb})`,
    background: `rgba(${accentRgb}, 0.13)`,
    border: `1px solid rgba(${accentRgb}, 0.3)`,
    boxShadow: `0 0 18px rgba(${accentRgb}, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
    '& svg': { fontSize: 22, filter: `drop-shadow(0 0 5px rgba(${accentRgb}, 0.45))` },
  };
}

/** Accent-tinted gradient text for a section title (near-white/slate → accent). */
export function gradientTitleSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    background: dark
      ? `linear-gradient(90deg, rgb(241, 245, 249) 0%, rgb(${accentRgb}) 135%)`
      : `linear-gradient(90deg, rgb(15, 23, 42) 0%, rgba(${accentRgb}, 0.9) 135%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    width: 'fit-content',
  };
}

/** A premium gradient metric pill (for the section's headline numbers). */
export function metricPillSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    fontWeight: 700,
    fontFamily: MONO_FONT,
    letterSpacing: '0.01em',
    color: `rgb(${accentRgb})`,
    border: `1px solid rgba(${accentRgb}, ${dark ? 0.4 : 0.34})`,
    background: dark
      ? `linear-gradient(135deg, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.08) 100%)`
      : `linear-gradient(135deg, rgba(${accentRgb}, 0.16) 0%, rgba(${accentRgb}, 0.05) 100%)`,
    boxShadow: dark ? `0 0 14px rgba(${accentRgb}, 0.15)` : 'none',
    '& .MuiChip-label': { fontWeight: 700, fontFamily: MONO_FONT },
  };
}

/** Semantic accent triplets for status chips/pills. */
export const SEMANTIC_ACCENTS = {
  cyan: '56, 189, 248',
  amber: '251, 191, 36',
  coral: '248, 113, 113',
  green: '74, 222, 128',
  violet: '129, 140, 248',
  slate: '148, 163, 184',
} as const;

/** Death-mechanic category → accent triplet (ties the category chips to the palette). */
export const CATEGORY_ACCENTS: Record<string, string> = {
  'Direct Damage': SEMANTIC_ACCENTS.amber,
  'Burst Damage': SEMANTIC_ACCENTS.coral,
  'Execute Phase': SEMANTIC_ACCENTS.coral,
  'Area Effect': SEMANTIC_ACCENTS.violet,
  'Damage Over Time': SEMANTIC_ACCENTS.green,
  Environmental: SEMANTIC_ACCENTS.cyan,
  'Player Ability': SEMANTIC_ACCENTS.violet,
  Other: SEMANTIC_ACCENTS.slate,
};

/** Translucent inner panel so the card's gradient + cosmic background read through
 *  (apply to the Paper / TableContainer that wraps a list or table). */
export function innerPanelSx(dark: boolean): SystemStyleObject<Theme> {
  return {
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.02)',
    backgroundImage: 'none',
    border: `1px solid ${dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)'}`,
  };
}

/** Severity → accent for the death-pattern callouts. */
export const SEVERITY_ACCENTS: Record<string, string> = {
  High: '248, 113, 113',
  Medium: '251, 191, 36',
  Low: '56, 189, 248',
};

/** Premium accent-rail callout styling for a MUI Alert (severity-tinted glass). */
export function patternCalloutSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    mb: 2,
    borderRadius: 2,
    color: dark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    border: `1px solid rgba(${accentRgb}, ${dark ? 0.28 : 0.24})`,
    borderLeft: `3px solid rgb(${accentRgb})`,
    background: dark
      ? `linear-gradient(135deg, rgba(${accentRgb}, 0.13) 0%, rgba(${accentRgb}, 0.04) 100%)`
      : `linear-gradient(135deg, rgba(${accentRgb}, 0.09) 0%, rgba(${accentRgb}, 0.03) 100%)`,
    backdropFilter: 'blur(8px)',
    '& .MuiAlert-icon': { color: `rgb(${accentRgb})` },
  };
}

/** Subtle-glass styling for the per-fight accordions (drops MUI's default frame). */
export function fightAccordionSx(dark: boolean): SystemStyleObject<Theme> {
  return {
    mb: 1,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundImage: 'none',
    boxShadow: 'none',
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.02)',
    border: `1px solid ${dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)'}`,
    '&::before': { display: 'none' },
    '&.Mui-expanded': { margin: '0 0 8px 0' },
  };
}

/** A compact gradient pill for inline status/label chips (apply to a MUI Chip's sx). */
export function chipPillSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    fontWeight: 700,
    fontSize: '0.72rem',
    letterSpacing: '0.02em',
    color: `rgb(${accentRgb})`,
    border: `1px solid rgba(${accentRgb}, ${dark ? 0.42 : 0.36})`,
    background: dark
      ? `linear-gradient(135deg, rgba(${accentRgb}, 0.22) 0%, rgba(${accentRgb}, 0.08) 100%)`
      : `linear-gradient(135deg, rgba(${accentRgb}, 0.16) 0%, rgba(${accentRgb}, 0.05) 100%)`,
    '& .MuiChip-label': { fontWeight: 700 },
  };
}

/** Hover accent (tint + left rail) for an interactive list row. */
export function listRowHoverSx(dark: boolean, accentRgb: string): SystemStyleObject<Theme> {
  return {
    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      backgroundColor: dark ? `rgba(${accentRgb}, 0.07)` : `rgba(${accentRgb}, 0.05)`,
      boxShadow: `inset 3px 0 0 rgba(${accentRgb}, ${dark ? 0.8 : 0.7})`,
    },
  };
}

/** Medal RGBs for the podium ranks; everything else falls back to slate. */
const MEDAL_RGB: Record<number, string> = {
  1: '251, 191, 36', // gold
  2: '203, 213, 225', // silver
  3: '205, 127, 50', // bronze
};

/** Circular rank badge (#1 gold / #2 silver / #3 bronze / rest slate). */
export function rankBadgeSx(rank: number, dark: boolean): SystemStyleObject<Theme> {
  const rgb = MEDAL_RGB[rank] ?? '148, 163, 184';
  const podium = rank <= 3;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: '50%',
    fontFamily: MONO_FONT,
    fontWeight: 800,
    fontSize: 13,
    color: podium ? `rgb(${rgb})` : 'text.secondary',
    background: `radial-gradient(circle at 35% 30%, rgba(${rgb}, ${dark ? 0.3 : 0.22}) 0%, rgba(${rgb}, ${dark ? 0.12 : 0.08}) 100%)`,
    border: `1px solid rgba(${rgb}, ${dark ? 0.5 : 0.4})`,
    boxShadow: podium ? `0 0 14px rgba(${rgb}, 0.3)` : 'none',
  };
}
