/**
 * ReplayTransitionOverlay
 *
 * The "Entering <area>" card shown over the arena while the next fight's data
 * loads during continuous play. It covers the brief reload + the collapsed
 * out-of-combat gap so the trial flows seamlessly, and — because it renders
 * inside the (persistent) replay container — it keeps fullscreen intact across
 * the transition.
 *
 * @module features/fight_replay/components/ReplayTransitionOverlay
 */

import { Box, CircularProgress, Fade, Typography } from '@mui/material';
import React from 'react';

interface ReplayTransitionOverlayProps {
  /** Whether the overlay is shown. */
  visible: boolean;
  /** The area / boss being entered (e.g. "Xalvakka"). */
  label: string | null;
  /** Secondary line (e.g. difficulty, or "Loading…"). */
  sublabel?: string | null;
}

const ReplayTransitionOverlayComponent: React.FC<ReplayTransitionOverlayProps> = ({
  visible,
  label,
  sublabel,
}) => {
  return (
    <Fade in={visible} unmountOnExit timeout={250}>
      <Box
        // Decorative status surface; the arena underneath remains the labelled region.
        aria-hidden={!visible}
        role="status"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          // Frosted dark veil so the rebuilding canvas behind it never flashes.
          backgroundColor: 'rgba(10, 14, 24, 0.82)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          textAlign: 'center',
          px: 3,
        }}
      >
        <CircularProgress size={36} thickness={4} />
        <Box>
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em' }}
          >
            Entering
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.15,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {label || 'Next fight'}
          </Typography>
          {sublabel && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
              {sublabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Fade>
  );
};

export const ReplayTransitionOverlay = React.memo(ReplayTransitionOverlayComponent);
