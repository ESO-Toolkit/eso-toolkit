import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography } from '@mui/material';

import { GearIcon } from './GearIcon';
import { PlayerGear, GearTrait, GearSlot } from '../types/playerDetails';

// Mock gear data for stories
const createMockGear = (overrides: Partial<PlayerGear> = {}): PlayerGear => ({
  id: -1,
  quality: 5,
  icon: 'gear_undnarlimor_head_a',
  name: 'Symphony of Blades Guise',
  championPoints: 160,
  trait: GearTrait.REINFORCED,
  enchantType: 22,
  enchantQuality: 5,
  setID: 436,
  type: 1,
  slot: GearSlot.HEAD,
  ...overrides,
});

const meta: Meta<typeof GearIcon> = {
  title: 'Components/GearIcon',
  component: GearIcon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A component for displaying ESO gear/equipment icons with optional quality borders and tooltips.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    gear: {
      control: { type: 'object' },
      description: 'The gear item object containing id, icon, name, etc.',
    },
    size: {
      control: { type: 'range', min: 16, max: 128, step: 4 },
      description: 'Size of the icon in pixels',
    },
    quality: {
      control: { type: 'select' },
      options: ['normal', 'fine', 'superior', 'epic', 'legendary', 'mythic'],
      description: 'Quality/rarity of the gear item for styling',
    },
    rounded: {
      control: { type: 'boolean' },
      description: 'Whether the icon should be rounded',
    },
    showTooltip: {
      control: { type: 'boolean' },
      description: 'Whether to show a tooltip with gear information',
    },
    tooltipPlacement: {
      control: { type: 'select' },
      options: [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
      ],
      description: 'Tooltip placement',
    },
    onClick: {
      description: 'Click handler for the icon',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic gear icon
export const Default: Story = {
  args: {
    gear: createMockGear(),
    size: 32,
    quality: 'normal',
    rounded: true,
    showTooltip: false,
  },
};

// Different sizes
export const Sizes: Story = {
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={16} />
        <Typography variant="caption" display="block">
          16px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={24} />
        <Typography variant="caption" display="block">
          24px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={32} />
        <Typography variant="caption" display="block">
          32px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} />
        <Typography variant="caption" display="block">
          48px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={64} />
        <Typography variant="caption" display="block">
          64px
        </Typography>
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different sizes of gear icons.',
      },
    },
  },
};

// Different qualities
export const Qualities: Story = {
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="normal" />
        <Typography variant="caption" display="block">
          Normal
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="fine" />
        <Typography variant="caption" display="block">
          Fine
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="superior" />
        <Typography variant="caption" display="block">
          Superior
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="epic" />
        <Typography variant="caption" display="block">
          Epic
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="legendary" />
        <Typography variant="caption" display="block">
          Legendary
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="mythic" />
        <Typography variant="caption" display="block">
          Mythic
        </Typography>
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different quality levels with colored borders.',
      },
    },
  },
};

// With tooltip
export const WithTooltip: Story = {
  args: {
    gear: createMockGear({ name: 'Epic Gear Item', icon: 'armor_heavy_chest_a' }),
    size: 48,
    quality: 'epic',
    showTooltip: true,
    tooltipContent: (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle2" color="primary">
          Epic Gear Item
        </Typography>
        <Typography variant="body2">A legendary piece of equipment</Typography>
        <Typography variant="caption" color="text.secondary">
          Item ID: -1
        </Typography>
      </Box>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Gear icon with a custom tooltip. Hover to see the tooltip.',
      },
    },
  },
};

// Clickable
export const Clickable: Story = {
  args: {
    gear: createMockGear({ name: 'Legendary Weapon', icon: 'weapon_sword_a' }),
    size: 48,
    quality: 'legendary',
    onClick: () => console.log('Gear clicked!'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Clickable gear icon with hover effects.',
      },
    },
  },
};

// Rounded vs Square
export const RoundedVsSquare: Story = {
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="epic" rounded={true} />
        <Typography variant="caption" display="block">
          Rounded
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <GearIcon gear={createMockGear()} size={48} quality="epic" rounded={false} />
        <Typography variant="caption" display="block">
          Square
        </Typography>
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison between rounded and square gear icons.',
      },
    },
  },
};

// Different gear items
export const DifferentGearItems: Story = {
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      {[
        { name: 'Basic Sword', icon: 'weapon_sword_a', quality: 1 },
        { name: 'Fine Shield', icon: 'armor_shield_a', quality: 2 },
        { name: 'Superior Armor', icon: 'armor_heavy_chest_a', quality: 3 },
        { name: 'Epic Helmet', icon: 'armor_heavy_head_a', quality: 4 },
        { name: 'Legendary Ring', icon: 'jewelry_ring_a', quality: 5 },
        { name: 'Mythic Artifact', icon: 'armor_mythic_a', quality: 6 },
      ].map((item, index) => {
        const mockGear = createMockGear({
          id: index + 1,
          name: item.name,
          icon: item.icon,
          quality: item.quality,
        });

        const qualityName = ['normal', 'fine', 'superior', 'epic', 'legendary', 'mythic'][
          item.quality - 1
        ];

        return (
          <Box key={mockGear.id} sx={{ textAlign: 'center' }}>
            <GearIcon
              gear={mockGear}
              size={48}
              quality={qualityName as any}
              showTooltip
              tooltipContent={
                <Box sx={{ p: 1 }}>
                  <Typography variant="subtitle2">{item.name}</Typography>
                  <Typography variant="caption">ID: {mockGear.id}</Typography>
                </Box>
              }
            />
            <Typography variant="caption" display="block">
              {item.name}
            </Typography>
          </Box>
        );
      })}
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different gear items with various qualities and tooltips.',
      },
    },
  },
};

// Custom styling
export const CustomStyling: Story = {
  args: {
    gear: createMockGear({ name: 'Mythic Artifact', icon: 'artifact_mythic_a' }),
    size: 64,
    quality: 'mythic',
    style: {
      filter: 'drop-shadow(0 0 10px rgba(255, 107, 53, 0.5))',
      borderRadius: '50%',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Gear icon with custom styling including drop shadow and circular border.',
      },
    },
  },
};
