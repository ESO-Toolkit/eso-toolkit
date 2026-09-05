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

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
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
const PlaybackButtonsComponent: React.FC<PlaybackButtonsProps> = ({
  isPlaying,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd,
  onSkipBackward10,
  onSkipForward10,
  compact = false,
}) => {
  // Hit-target size for play/pause. Compact (the overlay transport) stays at 44 — the minimum
  // comfortable tap target — so the row keeps a thin, uniform height; the glyph inside is what
  // makes it read as primary.
  const orbSize = compact ? 44 : 56;
  // Gate non-essential motion per replayDesign's motion contract (the press scale and the hover
  // tints). The global !important rule is a fallback.
  const prefersReducedMotion = usePrefersReducedMotion();
  const ghostTransition = prefersReducedMotion
    ? 'none'
    : `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`;
  const orbTransition = prefersReducedMotion
    ? 'none'
    : `transform ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`;
  // Ghost skip buttons — flat by default, a soft accent tint on hover. Quiet next to the
  // play orb so the focal hierarchy reads instantly: one bright control, four supporting.
  const ghostSx = {
    color: 'text.secondary',
    borderRadius: 2,
    ...(compact ? { padding: 0.5 } : null),
    transition: ghostTransition,
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

      {/* Play/pause is the primary action, and it earns that rank through GLYPH SIZE and position
          — not decoration. It used to be a gradient-filled orb carrying a cyan bloom, a 1px accent
          rim and a detached orbiting ring; three stacked glow layers on a control that sits over a
          moving 3D scene, which made the busiest pixel in the bar the one that never changes.
          Every shipping video player (YouTube, Netflix, Vimeo, Frame.io) draws play as a plain
          glyph, larger than its neighbours, and that is what reads as deliberate here too. */}
      <IconButton
        onClick={onPlayPause}
        size="large"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        sx={{
          mx: 0.25,
          width: orbSize,
          height: orbSize,
          color: 'text.primary',
          borderRadius: '50%',
          transition: orbTransition,
          '&:hover': { backgroundColor: 'action.hover' },
          '&:active': prefersReducedMotion ? undefined : { transform: 'scale(0.94)' },
          // ~1.5× the ghost skip glyphs — the whole focal hierarchy, in one number.
          '& .MuiSvgIcon-root': { fontSize: compact ? '1.75rem' : '2.1rem' },
        }}
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

/**
 * Memoized: the transport bars (mobile dock + desktop overlay) re-render at the ~10Hz playback
 * tick to move the scrub playhead, but these buttons depend only on `isPlaying` + stable callbacks.
 * The memo skips re-evaluating the play orb's heavy gradient/shadow sx 10×/sec while playing.
 */
export const PlaybackButtons = React.memo(PlaybackButtonsComponent);
