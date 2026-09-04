import { Box, Fade, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { REPLAY_Z, overlayPillSurface } from '../constants/replayDesign';

/**
 * One-time touch-gesture legend for the mobile immersive replay overlay.
 *
 * KeyboardHelpPanel documents the desktop shortcut set, but that panel is correctly desktop-only
 * (`!isMobile` gate in Arena3D) — a touch user gets no equivalent, so the gestures the canvas
 * actually supports are effectively undiscoverable on a phone. This is that equivalent: a small
 * pill, shown once, naming the REAL gesture set (verified against the touch-handling utilities
 * rather than assumed):
 *   - ONE finger drag → rotate (OrbitControls' default single-touch action; see touchPolicy.ts).
 *   - TWO fingers → pinch zoom AND pan simultaneously (decomposeTwoFinger in twoFingerGesture.ts
 *     explicitly derives both from one two-finger move — it's not pinch-OR-pan, it's both at once,
 *     so the hint says so rather than under-claiming "zoom" alone).
 *   - Tap an actor → follow (Arena3D's onClick → FightReplay3D's handleActorClick).
 * Long-press (marker placement/edit) is deliberately NOT listed here: it only applies in marker
 * edit mode, which already has its own dedicated hint (the "Hold map: add · drag marker: move ·
 * hold marker: edit" pill in Arena3D) — this hint is suppressed by its caller while that one is
 * showing so the two never stack.
 *
 * Follows the exact ReplayZoomHint pattern (this file's sibling, and the pattern doc these
 * comments point back to): localStorage-gated to show only once ever, auto-dismissing on a timer,
 * and every storage access wrapped in try/catch — Safari private mode throws on
 * getItem/setItem, and that must not crash the replay; worst case the hint simply reappears (or
 * never persists as dismissed) instead of taking the overlay down with it.
 */
const STORAGE_KEY = 'replay.gestureHintSeen.v1';
const VISIBLE_MS = 4500;

function alreadySeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Storage blocked — treat as "not seen" so the hint still gets a chance to show; it just
    // won't remember being dismissed (see the module doc).
    return false;
  }
}

export interface ReplayGestureHintProps {
  /** Show only while true (the mobile immersive overlay, outside marker edit mode). Flipping this
   *  back to false does not "unsee" the hint — the localStorage flag, once set, is permanent. */
  active: boolean;
  /**
   * Bottom offset (px) from the caller. Passed in rather than hardcoded so this hint can share
   * Arena3D's existing lane-stacking math with the auto-quality chip (see
   * AUTO_QUALITY_CHIP_LANE_GAP's doc in Arena3D) instead of picking an independent fixed number
   * that could drift out of sync with it as that chip's own position changes with reservedInset.
   */
  bottomOffset: number;
}

export const ReplayGestureHint: React.FC<ReplayGestureHintProps> = ({ active, bottomOffset }) => {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const dismissedRef = useRef(alreadySeen());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Going inactive (marker-edit mode arming mid-hint) must HIDE a hint that is already on
    // screen, not just cancel its dismissal timer. Returning early with `show` still true left the
    // gesture legend up indefinitely next to the marker-edit legend — exactly the overlap `active`
    // exists to prevent — until marker mode was exited and a fresh timer completed.
    if (!active) {
      setShow(false);
      return;
    }

    if (dismissedRef.current || typeof window === 'undefined') {
      return;
    }

    setShow(true);
    hideTimerRef.current = setTimeout(() => {
      setShow(false);
      dismissedRef.current = true;
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // Private mode / storage disabled — the dismissal just won't persist; harmless, the hint
        // will simply show again on a future visit instead of staying suppressed.
      }
    }, VISIBLE_MS);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // Re-arms if `active` flips true→false→true (e.g. leaving and re-entering marker edit mode
    // within one immersive session) — harmless since dismissedRef already blocks a repeat once
    // the visible window has actually elapsed once.
  }, [active]);

  return (
    <Fade in={show} timeout={{ enter: 200, exit: 500 }} unmountOnExit>
      <Box
        sx={{
          position: 'absolute',
          bottom: bottomOffset,
          left: '50%',
          transform: 'translateX(-50%)',
          px: 1.75,
          py: 0.75,
          fontSize: 13,
          fontWeight: 500,
          // Shared floating-badge token (see ReplayZoomHint, which uses the same one) rather than
          // a hand-rolled fill/blur/radius — this is exactly the "brief self-dismissing chip over
          // the arena" case overlayPillSurface exists for.
          ...overlayPillSurface(theme),
          pointerEvents: 'none',
          // No `nowrap`: at 320 CSS px — a supported phone width — the full sentence is wider than
          // the max-width cap, and a non-wrapping pill just overflows and gets clipped by the
          // replay's overflow-hidden container, so part of a one-time onboarding message would be
          // unreadable on exactly the devices it is written for. Let it run to a second line.
          maxWidth: 'calc(100% - 32px)',
          textAlign: 'center',
          // Short-lived overlay — must beat the persistent panels, matching ReplayZoomHint's rung.
          zIndex: REPLAY_Z.overlay,
        }}
      >
        Drag: rotate · Pinch: zoom + pan · Tap an actor: follow
      </Box>
    </Fade>
  );
};
