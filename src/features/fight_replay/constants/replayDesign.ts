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
 * Also home to the shared overlay tokens for the DOM chrome that floats OVER the 3D canvas
 * itself — `REPLAY_Z` (the z-index ladder), `overlayPanelSurface` / `overlayPillSurface` (the
 * two glass-chrome dialects), and `overlayIconButton` (the floating circular controls) — so that
 * family of overlays converges on one system too, instead of each panel/button/chip independently
 * reinventing its own alpha, blur, and z-index.
 *
 * @module replayDesign
 */

import { alpha, type Theme } from '@mui/material/styles';
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
 * The vertical band the compact transport bar occupies (px). ONE shared token consumed by every
 * geometry that must clear the bar — the bar's own pinned height AND the max-height caps of the
 * overlay panels (PlayerListPanel inner+outer caps, BossHealthPanel) — so the bar can never
 * re-grow into the panels and the panels can never plunge into the bar. Measured against the real
 * single-row layout: the 58px play orb + its -6px detached ring (~70px) + ~10px top/bottom padding,
 * rounded to 80 with headroom. Scoped to desktop widths (the row wraps below this on very narrow
 * viewports — mobile is a deferred refactor; see project_replay_mobile_refactor).
 */
export const TRANSPORT_RESERVED = 80;

/** Fullscreen cinema auto-hide: idle time (ms) of no pointer activity before the bar fades. */
export const TRANSPORT_IDLE_MS = 2500;

/** Height (px) of the always-on progress hairline shown while the fullscreen bar is hidden. */
export const HAIRLINE_H = 3;

/**
 * Spacing rhythm for the transport bar, in MUI spacing units (×8px). Kept deliberately
 * small and consistent so the bar reads as one dense, intentional control cluster.
 */
export const TRANSPORT_SPACING = {
  /** Outer vertical padding of the docked bar (asymmetric: matches the bold proto). */
  padTop: 2, // 16px
  padBottom: 2.25, // 18px
  /** Compact (single-row) vertical padding — tighter so the row hits the TRANSPORT_RESERVED band. */
  padTopCompact: 1.25, // 10px
  padBottomCompact: 1.25, // 10px
  /** Outer horizontal padding (tighter on xs). */
  padX: { xs: 1.75, sm: 2.75 },
  /** Gap between the rail block and the control row. */
  sectionGap: 1.25,
  /** Gap between controls in the compact single row. */
  sectionGapCompact: 0.75,
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
 * Pill geometry for the transport's small control chips (speed selector, share button). One
 * shared radius so the pill family reads as one set instead of three independently-tuned magic
 * `11px` literals scattered across components.
 */
export const TRANSPORT_PILL_RADIUS = 11;

/**
 * Build the docked transport bar's surface `sx` from the live theme. A subtle top-edge
 * accent wash (cyan in dark mode) lifts the bar off the arena above it and reads as the
 * "control deck" of a player rather than a flat form panel — without floating over the 3D
 * scene (the bar stays in document flow; see the audit's rejected "floating transport").
 */
export const transportSurface = (
  theme: Theme,
  overlay = false,
  compact = false,
): SystemStyleObject<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  // Overlay variant: the bar is DOCKED over the bottom of the 3D canvas (always on screen, no
  // scroll-to-play) rather than in document flow below it. The original audit rejected a floating
  // transport because it occludes bottom-edge actors — the user has since chosen always-visible
  // controls, so the overlay leans translucent + backdrop-blurred (3D scene reads faintly through,
  // minimizing that occlusion) and squares its bottom corners to sit flush at the canvas edge.
  const paper = theme.palette.background.paper;
  const def = theme.palette.background.default;
  // Compact overlay leans lighter (less blur, a bottom-up scrim instead of a solid panel) so the
  // thinner bar reads as cinematic chrome floating over the scene rather than a heavy deck.
  const blur = compact ? 6 : 10;
  return {
    position: 'relative' as const,
    borderRadius: overlay ? '12px 12px 0 0' : 3,
    border: '1px solid',
    borderColor: isDark ? 'rgba(148,210,255,0.18)' : 'divider',
    ...(overlay ? { borderBottom: 'none', backdropFilter: `blur(${blur}px)` } : null),
    // Layered atmosphere — two soft accent glows pooling from the top corners over a vertical
    // panel gradient, so the bar reads as a lit "control deck" with depth, not a flat form
    // panel. All pure paint (no layout, no per-frame cost). Dark mode leans into the glow;
    // light mode keeps it whisper-subtle. The overlay variant uses translucent panel/default
    // stops so the 3D scene shows faintly through the blur. The compact overlay swaps the solid
    // panel stop for a bottom-anchored scrim (opaque at the bottom edge, fading up) so the scene
    // reads through the top of the thin bar.
    backgroundImage:
      compact && overlay
        ? `linear-gradient(0deg, ${alpha(def, 0.88)} 0%, ${alpha(paper, 0.5)} 60%, transparent 100%)`
        : isDark
          ? `radial-gradient(120% 140% at 12% 0%, ${primary}24, transparent 42%),
           radial-gradient(90% 120% at 92% 8%, ${secondary}14, transparent 50%),
           linear-gradient(180deg, ${overlay ? alpha(paper, 0.82) : paper} 0%, ${overlay ? alpha(def, 0.82) : def} 100%)`
          : `radial-gradient(120% 140% at 12% 0%, ${primary}10, transparent 45%),
           linear-gradient(180deg, ${overlay ? alpha(paper, 0.88) : paper} 0%, ${overlay ? alpha(def, 0.88) : def} 120%)`,
    boxShadow: isDark
      ? '0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 10px 28px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
    // The compact overlay must NOT clip: the scrub-rail hover preview bubble renders ABOVE the
    // rail and would be cut off at the bar's top edge. The compact paint (bottom scrim + the
    // inset top seam) doesn't overflow the box, so visible is safe here. The expanded deck keeps
    // overflow:hidden so its corner glow/gradient stays inside the rounded corners.
    overflow: compact ? 'visible' : 'hidden',
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
 * Build the map-markers toolbar's surface `sx` from the live theme. A quieter sibling of
 * `transportSurface`: the marker tools live in the page shell (above the arena), so this reads
 * as a calm "control panel" — soft corner accent wash, a hairline top seam, and a glass-tinted
 * panel gradient — rather than the heavier lit deck of the transport bar. Pure paint (no layout
 * cost). Dark mode leans into the cyan/secondary glow; light mode keeps it whisper-subtle so the
 * toolbar never competes with the arena hero below it.
 */
export const markerDeckSurface = (theme: Theme): SystemStyleObject<Theme> => {
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const paper = theme.palette.background.paper;
  const def = theme.palette.background.default;
  return {
    position: 'relative' as const,
    borderRadius: 2,
    border: '1px solid',
    borderColor: isDark ? 'rgba(148,210,255,0.18)' : 'divider',
    overflow: 'hidden',
    backgroundImage: isDark
      ? `radial-gradient(120% 160% at 6% 0%, ${alpha(primary, 0.16)}, transparent 46%),
         radial-gradient(90% 140% at 96% 0%, ${alpha(secondary, 0.1)}, transparent 56%),
         linear-gradient(180deg, ${alpha(paper, 0.72)} 0%, ${alpha(def, 0.72)} 100%)`
      : `radial-gradient(120% 160% at 6% 0%, ${alpha(primary, 0.06)}, transparent 52%),
         linear-gradient(180deg, ${alpha(paper, 0.9)} 0%, ${alpha(def, 0.86)} 100%)`,
    boxShadow: isDark
      ? '0 6px 22px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 4px 14px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
    // Top-edge light seam — the "this surface is active" cue, fading at both ends.
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '5%',
      right: '5%',
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${secondary}, transparent)`,
      opacity: isDark ? 0.5 : 0.3,
      pointerEvents: 'none',
    },
  };
};

/**
 * Z-index ladder for the DOM chrome that floats over the 3D canvas (player list, boss bars,
 * drawing HUD, keyboard help, …). Replaces the ad-hoc numbers (3, 4, 5, 6, 12, …) that had
 * drifted independently across each overlay component with no shared source of truth —
 * that drift is exactly how KeyboardHelpPanel ended up rendering UNDER the boss bars it was
 * meant to sit above (see its module doc). Each rung is named for what it means, not what it
 * contains, so a new overlay can pick the right rung by intent instead of copying a neighbor's
 * literal and hoping it's still correct.
 *
 * Rung order, low to high:
 *  - `panel`  — the persistent corner HUDs (PlayerListPanel, BossHealthPanel,
 *               LockedPlayerStatsPanel). These are always-on informational chrome; everything
 *               transient (hints, toasts, the drawing HUD) must render above them.
 *  - `hint`   — brief, self-dismissing toasts/chips layered over the panels (the auto-quality
 *               chip, the "Following" camera-lock chip on mobile).
 *  - `overlay`— short-lived full-viewport overlays (ReplayZoomHint, ReplayTransitionOverlay)
 *               that briefly own the frame and must beat both panels and hints.
 *  - `hud`    — actively-armed interactive chrome (DrawingHud while a draw tool is selected,
 *               the mobile top bar / control dock) — the user is mid-action with it, so it
 *               must never be occluded by passive panels or hints.
 *  - `help`   — the keyboard-help panel. It sits above every other rung, including `hud`,
 *               because it is opened ON DEMAND to explain the whole surface (including the
 *               panels and the HUD) and must stay legible over all of it — most importantly
 *               over the top-right boss bars, which is the exact regression its module doc
 *               describes ("the old bare rgba(0,0,0,0.85) box had no zIndex").
 *
 * Deliberately BELOW MUI's own layers: modals/menus/sheets (MobileSheet, MarkerIconPicker) use
 * `theme.zIndex.modal` (+n) rather than this ladder, since they must out-rank the whole in-canvas
 * chrome regardless of which rung triggered them.
 */
export const REPLAY_Z = {
  panel: 3,
  hint: 4,
  overlay: 5,
  hud: 6,
  help: 12,
} as const;

/**
 * Build the shared "glass panel" surface `sx` for DOM chrome floating over the 3D canvas
 * (PlayerListPanel, BossHealthPanel, KeyboardHelpPanel, LockedPlayerStatsPanel, …).
 *
 * These six overlays had each hand-rolled a near-identical dark glass panel with a slightly
 * different literal — `rgba(15,23,42,0.92)`, `rgba(15,23,42,0.82)`, `rgba(9,14,28,0.94)`,
 * `alpha(paper,0.82)`, `rgba(0,0,0,0.78)` — none of which read the live theme, so every one of
 * them stayed a fixed dark-navy tint even in light mode. This derives the tint from
 * `theme.palette.background.default` instead: dark mode lands within a few hex steps of the old
 * literals (default is already a deep slate there), and light mode gets a real light-glass panel
 * instead of a stray dark box floating over a bright page.
 *
 * Alpha/blur are tuned to the median of the six dialects rather than any single one: 0.88 opacity
 * (between the 0.82 and 0.94 extremes) and a 10px blur (the majority value; only the small
 * ReplayZoomHint toast used a lighter 6px, which is a toast-specific choice, not a panel one —
 * ReplayZoomHint should move to `overlayPillSurface` in the later migration pass, not this one).
 *
 * @param options.solid - Drop the backdrop blur and raise the fill opacity instead (mobile: a
 *   full-screen `backdrop-filter` is expensive and, per the PlayerListPanel/BossHealthPanel
 *   comments, the per-frame rAF repaint of the health bars inside these panels was recompositing
 *   against the live WebGL canvas every tick without a dedicated GPU layer. `solid` mirrors that
 *   fix: a flat, more-opaque fill plus `translateZ(0)` gets the same isolated compositing layer
 *   for a fraction of the cost, with no blur to recompute every frame.)
 * @param options.accentBorder - Use the theme's primary accent (at low alpha) for the border
 *   instead of the neutral divider-style border. Every one of the six existing dialects borders
 *   in a primary tint (`${primary.main}29` / `alpha(primary, 0.28)` / …) rather than a plain
 *   divider, so this defaults to `true`; pass `false` only for chrome that intentionally wants a
 *   neutral edge.
 */
export const overlayPanelSurface = (
  theme: Theme,
  options: { solid?: boolean; accentBorder?: boolean } = {},
): SystemStyleObject<Theme> => {
  const { solid = false, accentBorder = true } = options;
  const isDark = theme.palette.mode === 'dark';
  const base = theme.palette.background.default;
  return {
    backgroundColor: alpha(base, solid ? 0.96 : 0.88),
    border: '1px solid',
    borderColor: accentBorder ? alpha(theme.palette.primary.main, 0.28) : theme.palette.divider,
    boxShadow: isDark
      ? '0 8px 26px rgba(0,0,0,0.5)'
      : '0 8px 26px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
    ...(solid
      ? // No blur to recompute per frame; translateZ(0) still isolates this box onto its own
        // GPU compositing layer so its rAF-driven repaints (health bars, stat readouts) don't
        // force the browser to recomposite against the live WebGL canvas underneath.
        { transform: 'translateZ(0)' }
      : { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }),
  };
};

/**
 * Build the shared rounded-pill surface `sx` for small, transient chrome floating over the arena
 * (the auto-quality chip, the mobile "Following <actor>" camera-lock chip, the marker edit-mode
 * hint pill). These already agree with each other almost exactly — `rgba(13,20,48,0.8–0.85)` +
 * blur 8–10px + a `999px` radius — which is a genuinely different dialect from the panel family
 * above: panels tint from `background.default` (slate in dark mode, light in light mode) and use
 * a 2–3px corner radius for a "surface" read, while these pills lean into one fixed deep-navy
 * brand tint at full pill radius for a "floating badge" read, regardless of light/dark mode (a
 * badge over the 3D scene, not a page surface). So this is kept as its own helper rather than
 * folded into `overlayPanelSurface` with a radius override.
 *
 * @param options.accent - Border/glow accent color. Defaults to the theme's primary (matches the
 *   "Following" chip); pass an explicit color for a semantic variant (e.g. the auto-quality
 *   chip's amber `rgba(252,211,77,0.4)` warning border).
 */
export const overlayPillSurface = (
  theme: Theme,
  options: { accent?: string } = {},
): SystemStyleObject<Theme> => {
  const accent = options.accent ?? theme.palette.primary.main;
  return {
    borderRadius: '999px',
    color: '#e2e8f0',
    backgroundColor: 'rgba(13, 20, 48, 0.82)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(accent, 0.4)}`,
    boxShadow: `0 6px 22px rgba(0,0,0,0.5), 0 0 16px ${alpha(accent, 0.23)}`,
  };
};

/**
 * Build the floating circular icon-button style used by the bottom-right control stack in
 * Arena3D (locked-stats toggle, fullscreen, name-tag toggle, keyboard-help re-open, …).
 *
 * Ports the existing look (`rgba(0,0,0,0.85)` fill, `0.95` on hover, white when active) as-is —
 * that part isn't broken — and adds the two things every one of those five buttons currently
 * lacks:
 *
 *  1. A visible `&:focus-visible` ring. None of the five have any focus style, so a keyboard user
 *     tabbing through the stack gets no feedback at all over a dark 3D map — this adds a 2px
 *     outline in the theme's primary accent with an offset so it doesn't get swallowed by the
 *     button's own dark fill.
 *  2. A raised inactive-icon contrast. The old inactive color, `rgba(255,255,255,0.55)`, sits
 *     under a WCAG 3:1 non-text contrast floor once the surface behind the (translucent, non-blurred)
 *     button is bright parchment-toned map art rather than the dark canvas backdrop the buttons
 *     were designed against. Floored to `0.7` so the glyph stays legibly above 3:1 against light
 *     art without changing its "dimmed/off" read against dark art.
 *
 * @param active - Whether the control this button represents is currently toggled on. Active
 *   renders full-white (matches the existing convention); inactive renders the dimmed-but-legible
 *   `0.7` alpha above. Omit for buttons with no on/off state (e.g. fullscreen, help) — they stay
 *   full-white, matching their existing always-white treatment.
 */
export const overlayIconButton = (theme: Theme, active?: boolean): SystemStyleObject<Theme> => {
  return {
    color: active === false ? 'rgba(255, 255, 255, 0.7)' : 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  };
};

/**
 * The always-on progress hairline shown while the fullscreen bar is auto-hidden — a thin
 * elapsed-fill gradient flush at the bottom edge so the playhead position stays legible even when
 * the full transport has faded. `pct` (0–100) is the fraction elapsed: brand cyan→magenta up to
 * the playhead, then a faint primary tint for the remainder.
 */
export const transportHairline = (theme: Theme, pct: number): SystemStyleObject<Theme> => {
  const clamped = Math.max(0, Math.min(100, pct));
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${HAIRLINE_H}px`,
    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} ${clamped}%, ${alpha(theme.palette.primary.main, 0.18)} ${clamped}%)`,
    pointerEvents: 'none',
  };
};
