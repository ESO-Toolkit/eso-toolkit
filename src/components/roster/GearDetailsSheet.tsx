/**
 * GearDetailsSheet — bottom sheet that shows a set's gear details (the shared
 * GearSetTooltip card) on touch / small screens, where the row's hover tooltip
 * isn't reachable.
 *
 * Opened by the per-row info button so touch users can inspect a set before
 * assigning it (the row tap remains the assign action). Mirrors the app's
 * MobileFilterSheet pattern: bottom Drawer, rounded top, drag handle,
 * safe-area-aware padding, backdrop / swipe dismiss.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import React from 'react';

import { GearSetTooltip } from '../GearSetTooltip';

import { getSetTooltipProps, type AssignableSet } from './allSetsCatalog';

interface GearDetailsSheetProps {
  /** The set to show, or null when closed. */
  set: AssignableSet | null;
  open: boolean;
  onClose: () => void;
  /** Assignment labels for this set, if any (e.g. ["Tank 1 (Set 1)"]). */
  assignedTo: string[];
}

export const GearDetailsSheet: React.FC<GearDetailsSheetProps> = ({
  set,
  open,
  onClose,
  assignedTo,
}) => {
  return (
    <Drawer
      anchor="bottom"
      open={open && set !== null}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            px: 2,
            pt: 1,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Drag handle */}
      <Box
        sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1 }}
        aria-hidden
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
          Set details
        </Typography>
        <IconButton onClick={onClose} aria-label="Close set details" edge="end" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ overflowY: 'auto', minHeight: 0, pb: 1 }}>
        {set && (
          <>
            <GearSetTooltip {...getSetTooltipProps(set)} />
            {assignedTo.length > 0 && (
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}
              >
                Currently assigned to {assignedTo.join(', ')}.
              </Typography>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
};
