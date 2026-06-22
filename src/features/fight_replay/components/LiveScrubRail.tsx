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

import React, { useCallback, useEffect, useState } from 'react';

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
  // The MUI Slider's value. During PLAYBACK it is FROZEN (the rAF DOM overlay shows the live
  // playhead), so the Slider never re-renders per tick. While PAUSED it tracks the live playhead so
  // every seek path — the ±10s / skip-to-start/end buttons, keyboard arrows, marker jumps, the trial
  // rail — moves the visible MUI thumb (those seeks update `timeRef` directly, not this component).
  const [committedMs, setCommittedMs] = useState<number>(timeRef?.current ?? 0);
  useEffect(() => {
    // Frozen during playback: the overlay owns the live playhead and the Slider must not re-render.
    if (isPlaying) return undefined;
    // Paused: snap immediately (zero-flash on the pause edge), then sample so later seeks reflect.
    setCommittedMs(timeRef?.current ?? 0);
    let raf = 0;
    let last = 0;
    let lastVal = NaN;
    const tick = (now: number): void => {
      if (now - last >= 80) {
        const t = timeRef?.current ?? 0;
        if (t !== lastVal) {
          lastVal = t;
          last = now;
          setCommittedMs(t);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, timeRef]);

  // A committed seek (slider drag commit, marker/rail click) updates the value instantly (no sample
  // lag) and the host. During playback this path doesn't fire, so the Slider stays still.
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
