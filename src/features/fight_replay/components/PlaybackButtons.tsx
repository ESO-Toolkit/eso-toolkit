/**
 * PlaybackButtons Component
 *
 * Play/pause and skip controls for fight replay playback.
 *
 * @module PlaybackButtons
 */

import { PlayArrow, Pause, SkipPrevious, SkipNext, Forward10, Replay10 } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';
import React from 'react';

interface PlaybackButtonsProps {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Callback to toggle play/pause */
  onPlayPause: () => void;
  /** Callback to skip to start */
  onSkipToStart: () => void;
  /** Callback to skip to end */
  onSkipToEnd: () => void;
  /** Callback to skip backward 10 seconds */
  onSkipBackward10: () => void;
  /** Callback to skip forward 10 seconds */
  onSkipForward10: () => void;
}

/**
 * Playback Buttons Component
 *
 * Provides standard media playback controls:
 * - Skip to start
 * - Skip backward 10 seconds
 * - Play/Pause (large button)
 * - Skip forward 10 seconds
 * - Skip to end
 */
export const PlaybackButtons: React.FC<PlaybackButtonsProps> = ({
  isPlaying,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd,
  onSkipBackward10,
  onSkipForward10,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
      <IconButton onClick={onSkipToStart} size="small" title="Skip to start">
        <SkipPrevious />
      </IconButton>

      <IconButton onClick={onSkipBackward10} size="small" title="Skip backward 10 seconds">
        <Replay10 />
      </IconButton>

      <IconButton onClick={onPlayPause} size="large" title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>

      <IconButton onClick={onSkipForward10} size="small" title="Skip forward 10 seconds">
        <Forward10 />
      </IconButton>

      <IconButton onClick={onSkipToEnd} size="small" title="Skip to end">
        <SkipNext />
      </IconButton>
    </Box>
  );
};
