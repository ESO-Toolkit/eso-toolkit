/**
 * TimelineScrubPreview Component
 *
 * Hover "skim-preview" for the scrub rail: as the cursor moves across the timeline, a small
 * bubble follows it showing the hovered timecode and the label of the nearest event marker.
 * This is the replay analogue of a VOD scrubber's hover preview — a 3D replay has no
 * pre-rendered thumbnail track, so we surface the time + nearest beat instead.
 *
 * PERFORMANCE CONTRACT (see FIGHT-REPLAY-AUDIT-2026-05-30.md memo landmine):
 * `mousemove` fires at a high rate. This component owns ALL of the hover state and is mounted
 * as a *sibling* of <TimelineMarkers> (never an ancestor), so its frequent re-renders never
 * reach the memoized marker list — `markers`/`duration`/`onMarkerClick` stay referentially
 * stable and the 26/26-node memo-stability invariant holds. It attaches its pointer listener
 * to the shared rail element via a ref, so it adds no handler props to the slider either.
 *
 * @module TimelineScrubPreview
 */

import { Box, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { TimelineAnnotation } from '../../../types/timelineAnnotations';

interface TimelineScrubPreviewProps {
  /** The rail element to track the cursor over (the relatively-positioned Slider wrapper). */
  railRef: React.RefObject<HTMLElement | null>;
  /** Total duration in milliseconds. */
  duration: number;
  /** Markers on the rail — used to label the nearest event under the cursor. */
  markers?: TimelineAnnotation[];
}

interface HoverState {
  /** Cursor x as a fraction [0,1] of the rail width. */
  ratio: number;
  /** Hovered time in ms. */
  timeMs: number;
}

const formatTime = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const TimelineScrubPreviewComponent: React.FC<TimelineScrubPreviewProps> = ({
  railRef,
  duration,
  markers,
}) => {
  const [hover, setHover] = useState<HoverState | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Sorted timestamps for the nearest-event lookup. Stable across playback (markers is a
  // memoized array), so this only recomputes when the marker set genuinely changes.
  const sortedMarkers = useMemo(
    () => (markers ? [...markers].sort((a, b) => a.timestamp - b.timestamp) : []),
    [markers],
  );

  // The pointer listener is attached imperatively (not as a React handler prop) so the
  // slider/markers tree is untouched. Only this component's local state updates on move.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || duration <= 0) {
      return;
    }

    const handleMove = (e: PointerEvent): void => {
      const rect = rail.getBoundingClientRect();
      if (rect.width <= 0) return;
      // Suppress the skim-preview while the cursor is over an event marker: the marker has its own
      // richer MUI tooltip ("…at 0:57 / Killed by: …"), so showing both is a redundant, colliding
      // double tooltip. The bubble is for the EMPTY track between markers; the marker owns its own.
      const target = e.target as Element | null;
      if (target && target.closest('[role="button"]')) {
        setHover(null);
        return;
      }
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setHover({ ratio, timeMs: ratio * duration });
    };
    const handleLeave = (): void => setHover(null);

    rail.addEventListener('pointermove', handleMove);
    rail.addEventListener('pointerleave', handleLeave);
    // Pointer-type touch produces a sticky bubble with no leave; hide on pointerup/cancel too.
    rail.addEventListener('pointercancel', handleLeave);
    return () => {
      rail.removeEventListener('pointermove', handleMove);
      rail.removeEventListener('pointerleave', handleLeave);
      rail.removeEventListener('pointercancel', handleLeave);
    };
  }, [railRef, duration]);

  if (!hover) {
    return null;
  }

  // Nearest marker within a sensible window (5% of duration) — labels the beat the user is
  // skimming toward without claiming a far-off event is "here".
  let nearestLabel: string | null = null;
  if (sortedMarkers.length > 0) {
    const window = duration * 0.05;
    let best: TimelineAnnotation | null = null;
    let bestDist = Infinity;
    for (const m of sortedMarkers) {
      const dist = Math.abs(m.timestamp - hover.timeMs);
      if (dist < bestDist) {
        bestDist = dist;
        best = m;
      }
    }
    if (best && bestDist <= window) {
      nearestLabel = best.label;
    }
  }

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: `${hover.ratio * 100}%`,
        bottom: 'calc(100% + 4px)',
        transform: 'translateX(-50%)',
        // Bubble is decorative + cursor-driven; never intercept pointer events (would steal
        // the slider's drags and block the markers' own hit-areas).
        pointerEvents: 'none',
        zIndex: 3,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 2,
        whiteSpace: 'nowrap',
        transition: prefersReducedMotion ? 'none' : 'left 0.05s linear',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', display: 'block' }}
      >
        {formatTime(hover.timeMs)}
      </Typography>
      {nearestLabel && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {nearestLabel}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Memoized on its props (railRef/duration/markers are all stable), but note the real
 * isolation guarantee is structural: this component is a *sibling* of TimelineMarkers, so its
 * per-pointermove local-state churn cannot re-render the marker memo regardless.
 */
export const TimelineScrubPreview = React.memo(TimelineScrubPreviewComponent);
