/**
 * Portal target for replay overlays (marker menus, the icon picker, the edit dialog) so they
 * stay visible while the replay block is in DESKTOP native fullscreen.
 *
 * The desktop fullscreen path calls `replayContainerRef.current.requestFullscreen()` (see
 * FightReplay3D.toggleFullscreen). The browser then renders ONLY that element's subtree in the
 * top layer — any MUI overlay portaled to `document.body` (the default) lives outside it and is
 * invisible. Pointing each overlay's `container` at the active fullscreen element drops it back
 * inside the visible subtree.
 *
 * Three cases, all correct with one resolver:
 *  - Desktop, not fullscreen: `fullscreenElement` is null → `document.body` (unchanged default).
 *  - Desktop, fullscreen:     `fullscreenElement` IS the replay container → portals inside it (fix).
 *  - Mobile pseudo-fullscreen: a CSS overlay, not the native API, so `fullscreenElement` stays null
 *    → `document.body`. The overlay is still in the normal DOM there, so this is already correct.
 *
 * Module-level const (not a per-render closure): this PR is about identity-churn perf regressions,
 * so every memoized overlay gets the SAME `container` function reference and never re-portals on a
 * playback tick.
 */
export const portalToFullscreen = (): HTMLElement =>
  (document.fullscreenElement as HTMLElement | null) ?? document.body;
