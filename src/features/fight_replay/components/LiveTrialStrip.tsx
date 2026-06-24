/**
 * LiveTrialStrip
 *
 * The trial mini-map (whole-run scrub strip) wrapped in a COARSE live-time subscription so its
 * playhead advances without re-rendering the surrounding (memoized) transport every tick.
 *
 * The whole-run playhead moves very slowly — a 2-minute fight is a small fraction of a multi-fight
 * run — so it only needs a few updates per second. Sampling `timeRef` at ~4Hz here keeps the heavy
 * strip off the per-frame render path entirely (the desktop transport memoizes around it), while the
 * fast per-fight scrub thumb is handled separately by LiveScrubRail at ~20Hz.
 *
 * @module LiveTrialStrip
 */

import React from 'react';

import { useSampledTime } from '../hooks/useSampledTime';
import type { TrialTimeline as TrialTimelineModel } from '../trial_chapters/trialTimeline';

import { TrialTimeline, type TrialTimelineSeekTarget } from './TrialTimeline';

// The whole-run playhead crawls — ~4Hz is already far more than the eye needs and keeps the heavy
// strip's re-render cost negligible on slow devices.
const STRIP_THROTTLE_MS = 250;

interface LiveTrialStripProps {
  timeRef?: React.RefObject<number> | { current: number };
  timeline: TrialTimelineModel;
  currentFightId: string | undefined;
  currentFightStartTime?: number;
  onSeek: (target: TrialTimelineSeekTarget) => void;
  onDraggingChange?: (dragging: boolean) => void;
  variant?: 'deck' | 'sheet';
}

const LiveTrialStripComponent: React.FC<LiveTrialStripProps> = ({
  timeRef,
  timeline,
  currentFightId,
  currentFightStartTime,
  onSeek,
  onDraggingChange,
  variant,
}) => {
  const liveMs = useSampledTime(timeRef, STRIP_THROTTLE_MS);
  return (
    <TrialTimeline
      timeline={timeline}
      currentFightId={currentFightId}
      currentFightStartTime={currentFightStartTime}
      currentLocalMs={liveMs}
      onSeek={onSeek}
      onDraggingChange={onDraggingChange}
      variant={variant}
    />
  );
};

export const LiveTrialStrip = React.memo(LiveTrialStripComponent);
