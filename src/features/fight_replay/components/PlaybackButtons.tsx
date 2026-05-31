/**
 * PlaybackButtons Component
 *
 * Play/pause and skip controls for fight replay playback.
 *
 * @module PlaybackButtons
 */

import { PlayArrow, Pause, SkipPrevious, SkipNext, Forward10, Replay10 } from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import React from 'react';

import { TRANSPORT_MOTION } from '../constants/replayDesign';

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
  // Ghost skip buttons — flat by default, a soft accent tint on hover. Quiet next to the
  // play orb so the focal hierarchy reads instantly: one bright control, four supporting.
  const ghostSx = {
    color: 'text.secondary',
    borderRadius: 2,
    transition: `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
    '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
    '& .MuiSvgIcon-root': { fontSize: '1.4rem' },
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        // On touch devices, enforce a 44x44 minimum tap target and a little more
        // spacing so the playback controls are comfortable to use on mobile.
        '@media (pointer: coarse)': {
          gap: 1.25,
          '& .MuiIconButton-root': {
            minWidth: 44,
            minHeight: 44,
          },
        },
      }}
    >
      <Tooltip title="Jump to start">
        <IconButton onClick={onSkipToStart} size="small" aria-label="Skip to start" sx={ghostSx}>
          <SkipPrevious />
        </IconButton>
      </Tooltip>

      <Tooltip title="Back 10 seconds">
        <IconButton
          onClick={onSkipBackward10}
          size="small"
          aria-label="Skip backward 10 seconds"
          sx={ghostSx}
        >
          <Replay10 />
        </IconButton>
      </Tooltip>

      {/* Play/pause is the primary action — a filled accent orb (matching the app's
          contained-primary gradient) makes it the unmistakable focal point versus the
          flat ghost skip buttons, with a soft accent halo on hover. */}
      <IconButton
        onClick={onPlayPause}
        size="large"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        sx={(theme) => ({
          position: 'relative',
          mx: 0.5,
          width: 58,
          height: 58,
          color: theme.palette.mode === 'dark' ? theme.palette.background.default : '#fff',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          // Inner rim highlight + a bright radial accent glow — the luminous orb from the
          // bold proto. The glow is a wide soft cyan bloom so the orb reads as lit, not flat.
          boxShadow:
            theme.palette.mode === 'dark'
              ? `inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 0 1px ${theme.palette.primary.main}40, 0 0 28px ${theme.palette.primary.main}99, 0 8px 26px ${theme.palette.primary.main}80`
              : `inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 22px ${theme.palette.primary.main}66, 0 8px 24px ${theme.palette.primary.main}59`,
          transition: `transform ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, box-shadow ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, filter ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
          // Detached orbiting ring just outside the orb (the proto's bright halo gap).
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: `1.5px solid ${theme.palette.primary.main}80`,
            boxShadow: `0 0 14px ${theme.palette.primary.main}59`,
            pointerEvents: 'none',
          },
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            filter: 'brightness(1.07)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? `inset 0 0 0 1px rgba(255,255,255,0.3), 0 10px 32px ${theme.palette.primary.main}99`
                : `inset 0 0 0 1px rgba(255,255,255,0.5), 0 10px 30px ${theme.palette.primary.main}73`,
          },
          '&:active': { transform: 'scale(0.96)' },
          '& .MuiSvgIcon-root': { fontSize: '1.9rem' },
        })}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>

      <Tooltip title="Forward 10 seconds">
        <IconButton
          onClick={onSkipForward10}
          size="small"
          aria-label="Skip forward 10 seconds"
          sx={ghostSx}
        >
          <Forward10 />
        </IconButton>
      </Tooltip>

      <Tooltip title="Jump to end">
        <IconButton onClick={onSkipToEnd} size="small" aria-label="Skip to end" sx={ghostSx}>
          <SkipNext />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
