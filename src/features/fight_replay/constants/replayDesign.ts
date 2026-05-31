/**
 * Replay surface design tokens
 *
 * Shared spacing rhythm, elevation, and motion for the fight-replay transport bar so its
 * micro-interactions feel like one system instead of scattered magic numbers.
 *
 * These are consumed by DOM/MUI components (the transport bar) via `sx` helpers that read
 * live theme tokens — prefer the `transportSurface()` / motion helpers below over hardcoded
 * hex so the bar tracks the active light/dark palette (theme lives in `ReduxThemeProvider`).
 *
 * (The in-scene player-list and boss-health HUDs are now DOM overlays that read the live
 * theme directly; they no longer need a frozen canvas palette here.)
 *
 * @module replayDesign
 */

import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Responsive arena viewport height (a CSS `clamp` expression): tracks a 16:9 ratio of the
 * available width, floored so it never shrinks below the old fixed size and capped so it
 * doesn't run past the fold. Shared so the in-scene DOM overlays (PlayerListPanel) can bound
 * their scroll region to the exact same height the arena uses, instead of duplicating the
 * literal and risking drift.
 */
export const ARENA_HEIGHT = 'clamp(420px, 56.25vw, 78vh)';

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
