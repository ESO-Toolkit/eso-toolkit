/**
 * PlaybackControls Component
 *
 * Main playback controls container for fight replay.
 * Orchestrates timeline, buttons, speed, and share sub-components.
 *
 * @module PlaybackControls
 */

import { Box } from '@mui/material';
import React from 'react';

import { useOptimizedTimelineScrubbing } from '../../../hooks/useOptimizedTimelineScrubbing';
import { useTimelineMarkers } from '../../../hooks/useTimelineMarkers';
import { TRANSPORT_SPACING, transportSurface } from '../constants/replayDesign';

import { PlaybackButtons } from './PlaybackButtons';
import { ShareButton } from './ShareButton';
import { SpeedSelector } from './SpeedSelector';
import { TimelineLegend } from './TimelineLegend';
import { TimelineSlider } from './TimelineSlider';

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onSkipBackward10: () => void;
  onSkipForward10: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onScrubbingModeChange?: (scrubbing: boolean) => void;
  onDraggingChange?: (dragging: boolean) => void;
  timeRef?: React.RefObject<number> | { current: number };
  // Share button props
  reportId?: string;
  fightId?: string;
  selectedActorIdRef?: React.RefObject<number | null>;
  fightStartTime?: number;
  /** Contextual badges shown in the transport (encounter/difficulty/outcome). */
  replayContext?: {
    label?: string;
    difficultyTag?: string;
    isKill?: boolean | null;
  };
  /**
   * When true the bar is docked as a translucent overlay over the bottom of the 3D canvas (always
   * on screen, no scroll-to-play) rather than sitting in document flow below it. Uses the blurred,
   * flush-bottom surface variant and slightly tighter vertical padding to minimize occlusion of
   * bottom-edge actors.
   */
  overlay?: boolean;
  /** A–B loop in-point (ms into the fight), or null when unset. Drives the rail region + chip. */
  loopStart?: number | null;
  /** A–B loop out-point (ms), or null when unset. */
  loopEnd?: number | null;
  /** Clear both loop points (the loop chip's delete action). */
  onClearLoop?: () => void;
}

/**
 * The discrete playback speeds the transport steps through. Exported so the +/- keyboard
 * shortcuts (FightReplay3D) step through the SAME ladder the on-screen SpeedSelector uses.
 */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

/**
 * PlaybackControls Component
 *
 * Main playback controls container that orchestrates:
 * - Timeline slider with scrubbing support
 * - Playback buttons (play/pause, skip)
 * - Speed selector
 * - Share button (optional, when reportId/fightId provided)
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onSkipToStart,
  onSkipToEnd,
  onSkipBackward10,
  onSkipForward10,
  onPlayingChange,
  onScrubbingModeChange,
  onDraggingChange,
  timeRef,
  reportId,
  fightId,
  selectedActorIdRef,
  fightStartTime: _fightStartTime,
  replayContext,
  overlay = false,
  loopStart = null,
  loopEnd = null,
  onClearLoop,
}) => {
  // Use optimized timeline scrubbing for better performance
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
    currentTime,
    onTimeChange,
    isPlaying,
    onPlayingChange,
    timeRef,
  });

  // Get timeline markers (phase transitions, death events)
  const { markers } = useTimelineMarkers();

  // Handle marker click (jump to timestamp)
  const handleMarkerClick = React.useCallback(
    (timestamp: number) => {
      onTimeChange(timestamp);
    },
    [onTimeChange],
  );

  // Notify parent components about scrubbing mode changes
  React.useEffect(() => {
    onScrubbingModeChange?.(isScrubbingMode);
  }, [isScrubbingMode, onScrubbingModeChange]);

  React.useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: TRANSPORT_SPACING.sectionGap,
        px: TRANSPORT_SPACING.padX,
        // Overlay variant trims vertical padding so the bar is thinner over the 3D scene.
        pt: overlay ? TRANSPORT_SPACING.padBottom : TRANSPORT_SPACING.padTop,
        pb: TRANSPORT_SPACING.padBottom,
        // Docked "control deck" surface. In-flow below the canvas by default; the `overlay`
        // variant is the translucent, blurred, flush-bottom bar docked over the canvas bottom
        // (always on screen — the user chose always-visible controls over the audit's original
        // no-floating-transport stance; translucency keeps bottom-edge occlusion minimal).
        ...transportSurface(theme, overlay),
      })}
    >
      {/* Scrub rail with time readout + event markers overlaid on the track */}
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
        onMarkerClick={handleMarkerClick}
        replayContext={replayContext}
        loopStart={loopStart}
        loopEnd={loopEnd}
        onClearLoop={onClearLoop}
      />

      {/* One dense control row: transport cluster centered, utilities split to the
          edges. On narrow screens it wraps gracefully. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75, // proto .ctl gap: 14px
          flexWrap: 'wrap',
          rowGap: TRANSPORT_SPACING.sectionGap,
        }}
      >
        {/* Left: speed segment (proto .lz — flex:1) */}
        <Box
          sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-start', minWidth: 120 }}
        >
          <SpeedSelector
            playbackSpeed={playbackSpeed}
            onSpeedChange={onSpeedChange}
            speeds={PLAYBACK_SPEEDS}
          />
        </Box>

        {/* Center: transport cluster — skip + play + skip (proto .cz) */}
        <Box sx={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
          <PlaybackButtons
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onSkipToStart={onSkipToStart}
            onSkipToEnd={onSkipToEnd}
            onSkipBackward10={onSkipBackward10}
            onSkipForward10={onSkipForward10}
          />
        </Box>

        {/* Right: share pill (proto .rz — flex:1, justify end) */}
        <Box sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-end', minWidth: 120 }}>
          <ShareButton
            reportId={reportId}
            fightId={fightId}
            currentTime={currentTime}
            selectedActorIdRef={selectedActorIdRef}
            timeRef={timeRef}
          />
        </Box>
      </Box>

      {/* Legend — full-width row at the very bottom of the transport (proto .legend,
          margin-top:13px). Below the controls, not beside the speed chips. */}
      {markers.length > 0 && <TimelineLegend markers={markers} />}
    </Box>
  );
};
