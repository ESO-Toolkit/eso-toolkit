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
  /** Compact variant — a smaller play orb + tighter spacing for the thin overlay transport bar. */
  compact?: boolean;
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
  compact = false,
}) => {
  // Compact overlay shrinks the play orb (58→38) and its ring/icon so the bar reads as a thin
  // YouTube-style transport instead of a tall deck dominated by the orb.
  const orbSize = compact ? 38 : 58;
  // Ghost skip buttons — flat by default, a soft accent tint on hover. Quiet next to the
  // play orb so the focal hierarchy reads instantly: one bright control, four supporting.
  const ghostSx = {
    color: 'text.secondary',
    borderRadius: 2,
    ...(compact ? { padding: 0.5 } : null),
    transition: `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
    '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
    '& .MuiSvgIcon-root': { fontSize: compact ? '1.15rem' : '1.4rem' },
  } as const;

  // Skip-to-start / skip-to-end are the redundant outer buttons on a touch phone: the full-width
  // scrub rail already covers "seek anywhere", and at ~390px they pushed the cluster wide enough to
  // collide with the speed pill (left) and share (right). Hide them only on COARSE pointers (touch),
  // gated by media query — NOT by `compact`, because the DESKTOP overlay transport is also compact and
  // must keep ⏮/⏭ for mouse users.
  const endStopSx = {
    ...ghostSx,
    '@media (pointer: coarse)': { display: 'none' },
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        // On touch devices, enforce a 44x44 minimum tap target so the controls are comfortable.
        // In the compact mobile transport the cluster is just ±10 + orb (skip-to-start/end are
        // dropped), so keep the gap tight — a wide gap pushed the outer buttons into the speed/share
        // controls flanking the row. The non-compact (desktop touch, e.g. tablet) keeps the roomier gap.
        '@media (pointer: coarse)': {
          gap: compact ? 0.5 : 1.25,
          '& .MuiIconButton-root': {
            minWidth: 44,
            minHeight: 44,
          },
        },
      }}
    >
      {/* Skip-to-start — hidden on touch (endStopSx), kept on desktop/mouse. See endStopSx note. */}
      <Tooltip title="Jump to start">
        <IconButton onClick={onSkipToStart} size="small" aria-label="Skip to start" sx={endStopSx}>
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
          width: orbSize,
          height: orbSize,
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
          '& .MuiSvgIcon-root': { fontSize: compact ? '1.3rem' : '1.9rem' },
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

      {/* Skip-to-end — hidden on touch (endStopSx), kept on desktop/mouse. */}
      <Tooltip title="Jump to end">
        <IconButton onClick={onSkipToEnd} size="small" aria-label="Skip to end" sx={endStopSx}>
          <SkipNext />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
