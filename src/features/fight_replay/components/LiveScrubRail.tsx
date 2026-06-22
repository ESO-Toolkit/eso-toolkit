/**
 * LiveScrubRail
 *
 * The scrub rail (timeline slider) wired so that NOTHING re-renders as playback advances.
 *
 * WHY THIS EXISTS (the low-power fps fix, confirmed by profiling): the transport used to receive the
 * playhead as a React state synced ~10Hz from the playback loop, re-rendering the whole transport
 * every tick. On a slow device a single frame can exceed that gate, so the sync fired EVERY frame.
 * Worse, the playhead lives on an MUI Slider, and re-rendering it re-runs emotion's style
 * serialization (`insertRule`) which invalidates the document stylesheet and forces a full style
 * recalc (`UpdateLayoutTree` — the single largest cost in a throttled trace). That style-recalc
 * storm, not the 3D scene, is what collapsed playback to single-digit fps.
 *
 * The fix: the MUI Slider's `value` is a COMMITTED position that changes only on a seek or when
 * playback pauses — never per tick — so the Slider does not re-render during playback at all. The
 * live, smooth playhead is drawn by an rAF-driven DOM overlay (RailPlayhead, inside TimelineSlider)
 * that writes `style.left`/`style.width` directly, touching no React and no emotion. The Slider
 * stays mounted underneath for drag / click-seek / keyboard / a11y.
 *
 * @module LiveScrubRail
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useOptimizedTimelineScrubbing } from '../../../hooks/useOptimizedTimelineScrubbing';
import { TimelineAnnotation } from '../../../types/timelineAnnotations';

import { TimelineSlider } from './TimelineSlider';

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
  // The MUI Slider's value: the last COMMITTED position. It moves only on a seek or when playback
  // pauses (so the paused/grabbed thumb is exact) — NOT every tick — so the Slider does not
  // re-render during playback. The live playhead is the rAF DOM overlay (livePlayhead below).
  const [committedMs, setCommittedMs] = useState<number>(timeRef?.current ?? 0);

  // Snap the committed value to the live playhead the instant playback pauses, so the MUI thumb
  // (which becomes visible when livePlayhead turns off) sits exactly where the overlay left it.
  const wasPlayingRef = useRef(isPlaying);
  useEffect(() => {
    if (wasPlayingRef.current && !isPlaying) {
      setCommittedMs(timeRef?.current ?? 0);
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, timeRef]);

  // Any committed seek (slider drag commit, marker/rail click) updates both the committed value and
  // the host. During playback this path doesn't fire, so the Slider stays still.
  const handleCommitTime = useCallback(
    (time: number) => {
      setCommittedMs(time);
      onTimeChange(time);
    },
    [onTimeChange],
  );

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
    currentTime: committedMs,
    onTimeChange: handleCommitTime,
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
