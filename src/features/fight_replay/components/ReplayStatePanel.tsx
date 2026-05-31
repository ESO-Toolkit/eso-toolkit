/**
 * ReplayStatePanel
 *
 * One cohesive panel for the fight-replay page's non-render states (loading, error, no fight
 * selected, no position data) so they read as designed states instead of four bare
 * `h5 + Alert` stacks. A centered glass card with a state icon, a title, a supporting line,
 * and an optional action — matching the rest of the replay surface.
 *
 * Loading uses a spinner; the other states get a severity-tinted icon and (optionally) a
 * back/retry action. The panel reserves the same vertical space the arena would occupy so
 * the layout doesn't jump when data arrives.
 *
 * @module ReplayStatePanel
 */

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import React from 'react';

export type ReplayStateKind = 'loading' | 'error' | 'empty';

interface ReplayStatePanelProps {
  /** Which state to render. */
  kind: ReplayStateKind;
  /** Short headline (e.g. "Loading replay", "Couldn't load positions"). */
  title: string;
  /** Supporting sentence with detail/next step. */
  detail?: string;
  /** Optional action button label (e.g. "Back to Fight"). */
  actionLabel?: string;
  /** Optional action handler. */
  onAction?: () => void;
}

const ICON_BY_KIND: Record<Exclude<ReplayStateKind, 'loading'>, React.ReactNode> = {
  error: <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />,
  empty: <InfoIcon sx={{ fontSize: 40, color: 'info.main' }} />,
};

export const ReplayStatePanel: React.FC<ReplayStatePanelProps> = ({
  kind,
  title,
  detail,
  actionLabel,
  onAction,
}) => {
  return (
    <Paper
      elevation={2}
      aria-live="polite"
      sx={{
        // Reserve the same generous height the arena uses so the page doesn't reflow when
        // the 3D scene takes over.
        minHeight: 'clamp(360px, 48vw, 64vh)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 72,
          height: 72,
          borderRadius: '50%',
          mb: 0.5,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {kind === 'loading' ? (
          <CircularProgress size={32} thickness={4} aria-label="Loading" />
        ) : (
          ICON_BY_KIND[kind]
        )}
      </Box>

      <Typography
        variant="h6"
        component="p"
        sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontWeight: 600 }}
      >
        {title}
      </Typography>

      {detail && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {detail}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={onAction}
          sx={{ mt: 1 }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};
