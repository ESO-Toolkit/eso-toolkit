/**
 * LiveScrubRail
 *
 * The scrub rail (timeline slider), isolated so playback does NOT re-render the surrounding transport.
 *
 * WHY THIS EXISTS (the low-power fps fix, confirmed by profiling): the transport used to receive the
 * playhead as React state synced ~10Hz, re-rendering the WHOLE transport (trial mini-map, control
 * row, buttons) every tick. On a slow device a single frame can exceed that gate, so it fired EVERY
 * frame, and the dynamic-position emotion styles re-ran `insertRule` → a full document style recalc
 * (`UpdateLayoutTree` — the single largest cost in a throttled trace). That style-recalc storm, not
 * the 3D scene, collapsed playback to single-digit fps.
 *
 * The fix: the smooth VISIBLE playhead is drawn by an rAF-driven DOM overlay (RailPlayhead, inside
 * TimelineSlider) that writes `style.left`/`style.width` directly — no React, no emotion — and the
 * MUI thumb/track are hidden while it's live. The surrounding transport is memoized and no longer
 * takes the playhead, so it never re-renders during playback. Only THIS isolated leaf resamples the
 * MUI Slider's `value` from timeRef (capped to ~10Hz), which keeps the slider's semantic value —
 * aria-valuenow, keyboard/Home/End seeks, the thumb shown on pause/drag — tracking the real playhead.
 * The leaf's own styles are stable, so its resample is a cheap value update (no insertRule storm) and
 * a fraction of the original whole-transport cost.
 *
 * @module LiveScrubRail
 */

import React, { useEffect } from 'react';

import { useOptimizedTimelineScrubbing } from '../../../hooks/useOptimizedTimelineScrubbing';
import { TimelineAnnotation } from '../../../types/timelineAnnotations';
import { useSampledTime } from '../hooks/useSampledTime';

import { TimelineSlider } from './TimelineSlider';

// How often the MUI Slider's *semantic* value is resampled from timeRef. The smooth VISIBLE playhead
// is the rAF DOM overlay (RailPlayhead) with the MUI thumb hidden during playback; this is only the
// slider's React value, which must stay current so aria-valuenow, keyboard/Home/End seeks, and the
// thumb shown on pause track the real playhead. Capped (not per-frame) so it can't spiral on a slow
// device, and only this isolated leaf re-renders (its styles are stable → no emotion/insertRule
// churn), so the cost is a fraction of the original per-tick whole-transport re-render.
const SLIDER_SYNC_MS = 100;

interface LiveScrubRailProps {
  /** High-frequency playhead (ms into the fight) — read by the DOM overlay, never re-renders this. */
  timeRef?: React.RefObject<number> | { current: number };
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onScrubbingModeChange?: (scrubbing: boolean) => void;
  onDraggingChange?: (dragging: boolean) => void;
  markers?: TimelineAnnotation[];
  onMarkerClick?: (timestamp: number) => void;
  replayContext?: {
    label?: string;
    difficultyTag?: string;
    isKill?: boolean | null;
  };
  loopStart?: number | null;
  loopEnd?: number | null;
  onClearLoop?: () => void;
  density?: 'compact' | 'expanded';
}

const LiveScrubRailComponent: React.FC<LiveScrubRailProps> = ({
  timeRef,
  duration,
  isPlaying,
  onTimeChange,
  onPlayingChange,
  onScrubbingModeChange,
  onDraggingChange,
  markers,
  onMarkerClick,
  replayContext,
  loopStart = null,
  loopEnd = null,
  onClearLoop,
  density,
}) => {
  // The MUI Slider's value, resampled from the live timeRef at a capped rate (always — playing or
  // paused). It is NOT the visible playhead during playback (that's the rAF overlay, thumb hidden),
  // but it must stay live so the slider's aria-valuenow, keyboard/Home/End seeks, and the thumb shown
  // on pause/drag operate from the real playhead rather than a frozen value. Seeks (±10s / skip /
  // marker / rail / keyboard) update timeRef and are reflected here within SLIDER_SYNC_MS.
  const liveMs = useSampledTime(timeRef, SLIDER_SYNC_MS);

  const {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    optimizedStep,
  } = useOptimizedTimelineScrubbing({
    duration,
    currentTime: liveMs,
    onTimeChange,
    isPlaying,
    onPlayingChange,
    timeRef,
  });

  // Notify the host of scrubbing/drag transitions (3D scrub-degradation + cinema auto-hide guard).
  // These fire only on drag edges, not per tick.
  useEffect(() => {
    onScrubbingModeChange?.(isScrubbingMode);
  }, [isScrubbingMode, onScrubbingModeChange]);
  useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

  return (
    <TimelineSlider
      displayTime={displayTime}
      duration={duration}
      isDragging={isDragging}
      isScrubbingMode={isScrubbingMode}
      optimizedStep={optimizedStep}
      onSliderChange={handleSliderChange}
      onSliderChangeEnd={handleSliderChangeEnd}
      onSliderChangeStart={handleSliderChangeStart}
      markers={markers}
      onMarkerClick={onMarkerClick}
      replayContext={replayContext}
      loopStart={loopStart}
      loopEnd={loopEnd}
      onClearLoop={onClearLoop}
      density={density}
      timeRef={timeRef}
      // Show the rAF overlay (and hide the MUI thumb/track) whenever playback is running; the MUI
      // thumb returns for paused inspection and dragging.
      livePlayhead={isPlaying && !isDragging}
    />
  );
};

export const LiveScrubRail = React.memo(LiveScrubRailComponent);
