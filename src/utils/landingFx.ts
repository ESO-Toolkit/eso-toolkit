import type { PerfTier } from '../store/ui/uiSlice';

/**
 * Whether the landing page should run its decorative effects (hero glow +
 * shimmer, and the mounted particle/rune layer).
 *
 * Low perf tier: the CSS animation kill in index.css already freezes the
 * styled-in loops, but frozen fixed-position particles would still cost
 * layout/composite work every scroll — so the caller unmounts them entirely.
 * Reduced motion: the OS preference wins regardless of hardware tier.
 */
export function shouldShowLandingFx(tier: PerfTier, reducedMotion: boolean): boolean {
  return tier !== 'low' && !reducedMotion;
}
