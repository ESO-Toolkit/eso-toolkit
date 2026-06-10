import { Box, Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { MarkerIconPicker } from './MarkerIconPicker';

const meta: Meta<typeof MarkerIconPicker> = {
  title: 'FightReplay/MarkerIconPicker',
  component: MarkerIconPicker,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof MarkerIconPicker>;

const Backdrop: React.FC = () => (
  <Box sx={{ height: '100vh', bgcolor: '#1a1a1a', p: 2 }}>
    <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
      3D replay stand-in — the picker overlays this.
    </Typography>
  </Box>
);

/** Desktop: popover anchored at the right-click point, all groups on one surface. */
export const DesktopPopover: Story = {
  render: () => (
    <>
      <Backdrop />
      <MarkerIconPicker
        open
        anchorPosition={{ left: 220, top: 160 }}
        onSelect={() => undefined}
        onClose={() => undefined}
      />
    </>
  ),
};

/** Touch: bottom sheet with finger-sized cells, a title, and an explicit close button. */
export const MobileBottomSheet: Story = {
  render: () => (
    <>
      <Backdrop />
      <MarkerIconPicker
        open
        mobile
        anchorPosition={{ left: 180, top: 320 }}
        onSelect={() => undefined}
        onClose={() => undefined}
      />
    </>
  ),
};
