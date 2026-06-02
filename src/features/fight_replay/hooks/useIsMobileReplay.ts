import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Single source of truth for "is the fight replay in its mobile layout?".
 *
 * The 3D replay is desktop-keyboard-first; the mobile experience is a separate layout
 * (inline scroll-safe preview → CSS pseudo-fullscreen interactive mode). EVERY mobile-only
 * branch in the replay tree gates on this one hook, so desktop is guaranteed untouched: the
 * hook returns `false` above the breakpoint and all mobile code paths become dead.
 *
 * Uses the same MUI `breakpoints.down('sm')` query the replay already relies on for its other
 * responsive collapses (SpeedSelector, MapMarkersModal), so dev-tools narrowing and the real
 * phone breakpoint stay identical. MUI's `useMediaQuery` handles SSR (returns the
 * `noSsr`-default of false until mounted) and live viewport changes internally.
 *
 * Note: this keys off WIDTH, not `pointer: coarse` — a deliberate match to the existing
 * precedent so a narrow desktop window previews the mobile layout. If a future need arises to
 * distinguish a true touch phone from a narrow desktop, AND-in `'(pointer: coarse)'` here; the
 * single seam means that change lands in exactly one place.
 */
export function useIsMobileReplay(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
