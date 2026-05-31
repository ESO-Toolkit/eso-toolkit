/**
 * Replay surface design tokens
 *
 * Shared values for the fight-replay transport bar and in-scene HUDs so spacing rhythm,
 * elevation, motion, and the canvas-HUD palette stay consistent across components instead
 * of being re-derived as scattered magic numbers.
 *
 * Two distinct consumers, two different rules:
 *
 *  1. DOM/MUI components (transport bar) — these use `sx` helpers that read live theme
 *     tokens. Prefer the `transportSurface()` / motion helpers below over hardcoded hex so
 *     the bar tracks the active light/dark palette (theme lives in `ReduxThemeProvider`).
 *
 *  2. Canvas-2D HUDs (PlayerListHUD, BossHealthHUD) — these paint into an offscreen 2D
 *     context inside the R3F render loop. They MUST NOT read the MUI theme or allocate in
 *     their per-frame `updateHUD()`/`updateHealthHUD()` draw pass (documented perf landmine).
 *     So the canvas palette here is a frozen, theme-aligned constant snapshot: the same
 *     cyan/slate language as the MUI theme, expressed as ready-to-use canvas color strings,
 *     resolved once at module load and read directly in the draw code. It is intentionally
 *     NOT wired to light/dark mode — the 3D arena is always a dark scene, so the HUDs are
 *     always dark-on-glass regardless of the app's light/dark setting.
 *
 * @module replayDesign
 */

import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Spacing rhythm for the transport bar, in MUI spacing units (×8px). Kept deliberately
 * small and consistent so the bar reads as one dense, intentional control cluster.
 */
export const TRANSPORT_SPACING = {
  /** Outer vertical padding of the docked bar (asymmetric: matches the bold proto). */
  padTop: 2, // 16px
  padBottom: 2.25, // 18px
  /** Outer horizontal padding (tighter on xs). */
  padX: { xs: 1.75, sm: 2.75 },
  /** Gap between the rail block and the control row. */
  sectionGap: 1.25,
  /** Gap between controls within the control row. */
  controlGap: 1,
} as const;

/**
 * Motion language. One easing, two durations — a short "tap" response and a slightly
 * longer "settle". Every transition on the surface uses these so micro-interactions feel
 * like one system. Components still gate motion behind `prefers-reduced-motion` where the
 * movement is non-essential (the theme also zeroes durations globally under that query).
 */
export const TRANSPORT_MOTION = {
  ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  tap: '0.12s',
  settle: '0.22s',
} as const;

/**
 * Build the docked transport bar's surface `sx` from the live theme. A subtle top-edge
 * accent wash (cyan in dark mode) lifts the bar off the arena above it and reads as the
 * "control deck" of a player rather than a flat form panel — without floating over the 3D
 * scene (the bar stays in document flow; see the audit's rejected "floating transport").
 */
export const transportSurface = (theme: Theme): SystemStyleObject<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  return {
    position: 'relative' as const,
    borderRadius: 3,
    border: '1px solid',
    borderColor: isDark ? 'rgba(148,210,255,0.18)' : 'divider',
    // Layered atmosphere — two soft accent glows pooling from the top corners over a vertical
    // panel gradient, so the bar reads as a lit "control deck" with depth, not a flat form
    // panel. All pure paint (no layout, no per-frame cost). Dark mode leans into the glow;
    // light mode keeps it whisper-subtle.
    backgroundImage: isDark
      ? `radial-gradient(120% 140% at 12% 0%, ${primary}24, transparent 42%),
         radial-gradient(90% 120% at 92% 8%, ${secondary}14, transparent 50%),
         linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
      : `radial-gradient(120% 140% at 12% 0%, ${primary}10, transparent 45%),
         linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 120%)`,
    boxShadow: isDark
      ? '0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 10px 28px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
    overflow: 'hidden',
    // Top-edge light seam — a thin accent gradient line that fades at both ends, the "this
    // surface is active" cue from the bold proto.
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '6%',
      right: '6%',
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${secondary}, transparent)`,
      opacity: isDark ? 0.7 : 0.4,
      pointerEvents: 'none',
    },
  };
};

/**
 * Canvas-2D HUD palette — a frozen, theme-aligned snapshot (see module header for why this
 * is a constant and not a theme read). Mirrors the dark-mode design tokens
 * (`bg #0b1220`, `panel #0f172a`, `accent #38bdf8`, `text #e5e7eb`, `muted #94a3b8`, …)
 * expressed as canvas fill/stroke strings. Read directly in the draw loop; never recomputed.
 */
export const HUD_PALETTE = {
  /** Panel background — translucent slate so the arena reads faintly through the HUD. */
  panelBg: 'rgba(15, 23, 42, 0.82)',
  /** Slightly darker header strip to separate the title from the rows. */
  headerBg: 'rgba(2, 6, 23, 0.9)',
  /** Hairline border — cyan-tinted at low alpha to match the MUI glass panels. */
  border: 'rgba(148, 210, 255, 0.16)',
  /** Inner divider lines (row separators / header underline). */
  divider: 'rgba(148, 210, 255, 0.1)',

  /** Primary text — the theme's `text.primary`. */
  text: '#e5e7eb',
  /** Secondary/label text — the theme's `text.secondary` muted slate. */
  muted: '#94a3b8',
  /** Accent — cyan `primary.main`, used for selection + active icons. */
  accent: '#38bdf8',
  /** Brighter cyan `secondary.main` for emphasis (boss name underglow, active fills). */
  accent2: '#00e1ff',

  /** Row states. */
  rowSelected: 'rgba(56, 189, 248, 0.16)',
  rowHover: 'rgba(148, 210, 255, 0.08)',

  /** Icon states — non-color cues carry the real meaning; color is reinforcement only. */
  iconActive: '#38bdf8',
  iconInactive: 'rgba(148, 163, 184, 0.55)',
  iconHover: '#e5e7eb',

  /** Health bar ramp — theme success/warning/error. */
  hpTrack: 'rgba(2, 6, 23, 0.85)',
  hpTrackBorder: 'rgba(148, 210, 255, 0.18)',
  hpGood: '#22c55e',
  hpWarn: '#ff9800',
  hpCritical: '#ef4444',
  /** Dead/disabled boss name. */
  dead: '#64748b',
} as const;

/**
 * Canvas font stack. The app's UI font is Inter; canvas text can't use the variable font
 * reliably across the texture pipeline, so we name Inter first with robust fallbacks. Boss
 * names use a heavier weight to echo the Space Grotesk display register without depending on
 * the web font being loaded into the canvas.
 */
export const HUD_FONT = {
  family: "Inter, system-ui, 'Segoe UI', Arial, sans-serif",
  /** Display weight for emphasis (boss name). */
  displayWeight: 700,
} as const;
