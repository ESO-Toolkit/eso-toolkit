import type { PerfTier } from '../../../store/ui/uiSlice';

/**
 * The fidelity of the inline mobile preview (the non-interactive teaser shown on the report page
 * before the user taps "Expand" into the pseudo-fullscreen interactive mode).
 *
 * - `'static'`  — a still frame (poster). No idle animation, no auto-orbit. Chosen for low-end GPUs
 *                 and for users who asked for reduced motion: the preview must never burn battery or
 *                 spin the fans on a device that will struggle, and must respect the OS motion pref.
 * - `'animated'`— a gentle, cheap idle (e.g. a slow auto-rotate / playing at preview scale). Used on
 *                 capable devices to make the preview read as "this is alive, tap to explore".
 */
export type ReplayPreviewMode = 'static' | 'animated';

/**
 * Decide the inline mobile preview's fidelity from the device's GPU tier and the user's reduced-motion
 * preference. Pure (no DOM / no hooks) so it's unit-testable in isolation; the component layer feeds it
 * the resolved tier from `usePerfTier()` and the flag from `usePrefersReducedMotion()`.
 *
 * Reduced-motion ALWAYS wins (accessibility) and the low tier falls back to static (perf); only a
 * capable device with motion allowed gets the animated preview.
 */
export function decidePreviewMode(tier: PerfTier, prefersReducedMotion: boolean): ReplayPreviewMode {
  if (prefersReducedMotion) return 'static';
  if (tier === 'low') return 'static';
  return 'animated';
}
