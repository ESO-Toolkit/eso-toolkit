/**
 * MobileSheet
 *
 * A dismissible bottom sheet for the mobile replay — the single surface every secondary panel
 * (players, chapters, settings) opens into, one at a time. Slides up over the arena with a
 * backdrop tap-to-dismiss and a drag handle, rendered INSIDE the replay container (no portal) so
 * it layers correctly above the pseudo-fullscreen overlay and respects the safe-area inset.
 *
 * This is the cornerstone of the deterministic mobile UI: instead of many absolutely-positioned
 * panels fighting for screen corners, secondary controls live in one sheet that's either open or
 * closed — structurally impossible to clutter.
 *
 * @module features/fight_replay/components/mobile/MobileSheet
 */

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Box, IconButton, Typography } from '@mui/material';
import React, { useEffect } from 'react';

import { TRANSPORT_MOTION } from '../../constants/replayDesign';

interface MobileSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional element rendered on the right of the title row (e.g. a quick toggle). */
  action?: React.ReactNode;
}

const MobileSheetComponent: React.FC<MobileSheetProps> = ({
  open,
  title,
  onClose,
  children,
  action,
}) => {
  // Close on Escape for keyboard/AT users (and external keyboards on tablets).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — tap to dismiss. Fades with the sheet; pointer-events only while open. */}
      <Box
        aria-hidden
        onClick={onClose}
        sx={{
          // Fixed (not absolute) so the sheet covers the whole pseudo-fullscreen viewport no matter
          // where in the tree it's rendered (e.g. inside the bottom dock), without needing a flex
          // restructure of the container.
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
        }}
      />

      {/* Sheet */}
      <Box
        role="dialog"
        aria-modal="true"
        aria-label={title}
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme.zIndex.modal + 21,
          maxHeight: '72%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(13,18,30,0.98)' : '#fff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
          // Don't intercept taps while hidden (the arena/dock stay interactive).
          pointerEvents: open ? 'auto' : 'none',
        })}
      >
        {/* Grab handle */}
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'divider',
            mx: 'auto',
            mt: 1,
          }}
        />
        {/* Title row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 2,
            py: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {action}
            <IconButton aria-label={`Close ${title}`} size="small" onClick={onClose}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {/* Scrollable content */}
        <Box sx={{ overflowY: 'auto', px: 2, pb: 2, minHeight: 0 }}>{children}</Box>
      </Box>
    </>
  );
};

export const MobileSheet = React.memo(MobileSheetComponent);
