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

import { PlaybackButtons } from './PlaybackButtons';
import { ShareButton } from './ShareButton';
import { SpeedSelector } from './SpeedSelector';
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
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

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
}) => {
  // Use optimized timeline scrubbing for better performance
  const {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    progressPercent,
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
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Timeline Slider with time display and progress indicator */}
      <TimelineSlider
        displayTime={displayTime}
        duration={duration}
        isDragging={isDragging}
        isScrubbingMode={isScrubbingMode}
        progressPercent={progressPercent}
        optimizedStep={optimizedStep}
        onSliderChange={handleSliderChange}
        onSliderChangeEnd={handleSliderChangeEnd}
        onSliderChangeStart={handleSliderChangeStart}
        markers={markers}
        onMarkerClick={handleMarkerClick}
      />

      {/* Playback control buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <PlaybackButtons
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onSkipToStart={onSkipToStart}
          onSkipToEnd={onSkipToEnd}
          onSkipBackward10={onSkipBackward10}
          onSkipForward10={onSkipForward10}
        />

        {/* Share button (only shown if report and fight IDs are provided) */}
        <ShareButton
          reportId={reportId}
          fightId={fightId}
          currentTime={currentTime}
          selectedActorIdRef={selectedActorIdRef}
          timeRef={timeRef}
        />
      </Box>

      {/* Playback speed selector */}
      <SpeedSelector
        playbackSpeed={playbackSpeed}
        onSpeedChange={onSpeedChange}
        speeds={PLAYBACK_SPEEDS}
      />
    </Box>
  );
};
