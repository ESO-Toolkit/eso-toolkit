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

/** Stand-in for the 3D canvas, reporting the picker's last action for hands-on testing. */
const Harness: React.FC<{ mobile?: boolean }> = ({ mobile }) => {
  const [open, setOpen] = React.useState(true);
  const [lastEvent, setLastEvent] = React.useState('none yet');
  const eventCount = React.useRef(0);

  return (
    <>
      <Box sx={{ height: '100vh', bgcolor: '#1a1a1a', p: 2 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
          3D replay stand-in — the picker overlays this.
        </Typography>
        <Typography data-testid="picker-event" sx={{ color: '#7dd3fc', mt: 1 }}>
          Last picker event: {lastEvent}
        </Typography>
        {!open && (
          <Typography
            component="button"
            type="button"
            onClick={() => setOpen(true)}
            sx={{ mt: 2, display: 'block' }}
          >
            Reopen picker
          </Typography>
        )}
      </Box>
      <MarkerIconPicker
        open={open}
        mobile={mobile}
        anchorPosition={{ left: 220, top: 160 }}
        onSelect={(iconKey) => {
          eventCount.current += 1;
          setLastEvent(`selected icon ${iconKey} (event #${eventCount.current})`);
          setOpen(false);
        }}
        onClose={() => {
          eventCount.current += 1;
          setLastEvent(`closed (event #${eventCount.current})`);
          setOpen(false);
        }}
      />
    </>
  );
};

/** Desktop: popover anchored at the right-click point, all groups on one surface. */
export const DesktopPopover: Story = {
  render: () => <Harness />,
};

/** Touch: bottom sheet with finger-sized cells, a title, and an explicit close button. */
export const MobileBottomSheet: Story = {
  render: () => <Harness mobile />,
};
