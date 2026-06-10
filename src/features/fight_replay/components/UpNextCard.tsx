/**
 * UpNextCard
 *
 * The end-of-fight affordances for continuous trial play, rendered over the
 * arena (inside the persistent replay container, so they survive fullscreen):
 *
 *  - Autoplay ON, a next fight exists, playhead in the final seconds →
 *    "Up next: <name> · starting in Ns" with a Cancel that skips THIS boundary
 *    (the Netflix/YouTube pattern — auto-advance never feels like a seizure of
 *    control).
 *  - Autoplay OFF and playback ended with a next fight available → a one-tap
 *    "Play next: <name>" chip instead of a silent dead stop.
 *  - Playback ended on the run's final fight → "Run complete" with Replay.
 *
 * Mounts nothing outside the final-seconds / ended states, and ticks on the
 * host's 500ms currentTime state — zero per-frame cost.
 *
 * @module features/fight_replay/components/UpNextCard
 */

import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

export type UpNextState =
  | { kind: 'countdown'; label: string; secondsLeft: number }
  | { kind: 'play-next'; label: string }
  | { kind: 'run-complete' };

interface UpNextCardProps {
  state: UpNextState;
  /** Cancel auto-advance for this boundary only (countdown state). */
  onCancel: () => void;
  /** Advance to the next fight now (countdown + play-next states). */
  onPlayNext: () => void;
  /** Restart the run from its first fight (run-complete state). */
  onReplayRun: () => void;
  /** Lifted above the transport (px). */
  bottomInset: number;
}

const surfaceSx = (compactPad = false): Record<string, unknown> => ({
  position: 'absolute' as const,
  right: 16,
  zIndex: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: compactPad ? 1 : 1.5,
  py: compactPad ? 0.5 : 1,
  borderRadius: 2.5,
  backgroundColor: 'rgba(10, 14, 24, 0.88)',
  border: '1px solid rgba(148, 210, 255, 0.25)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  color: '#fff',
});

const UpNextCardComponent: React.FC<UpNextCardProps> = ({
  state,
  onCancel,
  onPlayNext,
  onReplayRun,
  bottomInset,
}) => {
  if (state.kind === 'countdown') {
    return (
      <Box sx={{ ...surfaceSx(), bottom: bottomInset }} role="status">
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.65)', display: 'block', lineHeight: 1.2 }}
          >
            Up next
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700, maxWidth: 240 }}>
            {state.label}
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              {' '}
              · in {state.secondsLeft}s
            </Box>
          </Typography>
        </Box>
        <Button
          size="small"
          variant="text"
          onClick={onCancel}
          sx={{ color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onPlayNext}
          startIcon={<PlayArrowRounded />}
          sx={{ flexShrink: 0 }}
        >
          Now
        </Button>
      </Box>
    );
  }

  if (state.kind === 'play-next') {
    return (
      <Box sx={{ ...surfaceSx(true), bottom: bottomInset }}>
        <Button
          size="small"
          variant="text"
          onClick={onPlayNext}
          startIcon={<PlayArrowRounded />}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 700 }}
        >
          Play next: {state.label}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ ...surfaceSx(), bottom: bottomInset }} role="status">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        Run complete
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={onReplayRun}
        startIcon={<ReplayRounded />}
        sx={(theme) => ({
          color: '#fff',
          borderColor: alpha(theme.palette.primary.main, 0.6),
          textTransform: 'none',
          flexShrink: 0,
        })}
      >
        Replay run
      </Button>
    </Box>
  );
};

export const UpNextCard = React.memo(UpNextCardComponent);
