/**
 * Right-anchored sheet that overlays the Publish-to-Discord modal with an
 * admin-focused bot install guide. Opening this sheet does not dismiss the
 * underlying dialog, so members who opened it accidentally can close and
 * return to publishing.
 */

import { Close } from '@mui/icons-material';
import { Box, Drawer, IconButton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import {
  DiscordAdminGuideContent,
  type DiscordAdminGuideContentProps,
} from './DiscordAdminGuideContent';

export interface DiscordAdminGuideSheetProps extends Omit<
  DiscordAdminGuideContentProps,
  'standalone'
> {
  open: boolean;
  onClose: () => void;
}

export const DiscordAdminGuideSheet: React.FC<DiscordAdminGuideSheetProps> = ({
  open,
  onClose,
  ...contentProps
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fullscreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor={fullscreen ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      // Stack above the ServerPickerDialog (MUI dialog is 1300; modal stack auto-bumps,
      // but we set explicitly so nested scroll inside the drawer behaves predictably).
      sx={{ zIndex: (t) => t.zIndex.modal + 2 }}
      slotProps={{
        paper: {
          sx: {
            width: fullscreen ? '100%' : { xs: '100%', sm: 460 },
            maxWidth: '100vw',
            height: fullscreen ? '85vh' : '100%',
            borderTopLeftRadius: fullscreen ? 16 : 0,
            borderTopRightRadius: fullscreen ? 16 : 0,
            background: isDark ? 'rgba(16, 23, 41, 0.98)' : 'rgba(255,255,255,0.98)',
            backgroundImage: 'none',
            backdropFilter: 'blur(10px)',
            borderLeft: fullscreen
              ? 'none'
              : isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.06)',
          },
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
         
         
          sx={{ justifyContent: 'space-between', alignItems: 'center',
            px: 2,
            py: 1.5,
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Install the Discord bot
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close admin guide">
            <Close fontSize="small" />
          </IconButton>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 2 }}>
          <DiscordAdminGuideContent {...contentProps} standalone={false} />
        </Box>
      </Stack>
    </Drawer>
  );
};
