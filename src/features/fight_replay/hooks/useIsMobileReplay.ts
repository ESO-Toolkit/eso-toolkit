import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Single source of truth for "is the fight replay in its mobile layout?".
 *
 * The 3D replay is desktop-keyboard-first; the mobile experience is a separate layout
 * (inline scroll-safe preview → CSS pseudo-fullscreen interactive mode). EVERY mobile-only
 * branch in the replay tree gates on this one hook, so desktop is guaranteed untouched: the
 * hook returns `false` on a wide pointer-fine viewport and all mobile code paths become dead.
 *
 * Two ways to qualify as mobile, OR'd together:
 *  1. A narrow viewport (`breakpoints.down('sm')`, ≈<600px wide) — the same query the replay's
 *     other responsive collapses use (SpeedSelector, MapMarkersModal), so a narrow DESKTOP window
 *     still previews the mobile layout for dev/testing.
 *  2. A touch device whose SHORT side is phone-sized (`(pointer: coarse) and (max-height: 600px)`).
 *     This is the LANDSCAPE-PHONE case: rotated, a phone is wide (≥667px) so #1 alone would flip to
 *     `false` mid-session — which previously unmounted the overlay's controls and stranded the user
 *     in a body-locked pseudo-fullscreen with no Close. A phone's short side stays ≤ ~430px in
 *     either orientation, so gating on `max-height` (the short side in landscape) keeps a phone
 *     classified as mobile through rotation. A large touch tablet (short side > 600px) stays desktop.
 *
 * MUI's `useMediaQuery` handles SSR (false until mounted) and live viewport/orientation changes.
 */
export function useIsMobileReplay(): boolean {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const landscapePhone = useMediaQuery('(pointer: coarse) and (max-height: 600px)');
  return narrow || landscapePhone;
}
