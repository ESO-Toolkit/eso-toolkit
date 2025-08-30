import { Box, Paper, Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ClassIcon } from './ClassIcon';

const meta: Meta<typeof ClassIcon> = {
  title: 'Components/ClassIcon',
  component: ClassIcon,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    className: {
      control: 'select',
      options: [
        'dragonknight',
        'templar',
        'warden',
        'nightblade',
        'sorcerer',
        'necromancer',
        'arcanist',
      ],
      description: 'ESO class name to display icon for',
    },
    size: {
      control: { type: 'range', min: 8, max: 64, step: 2 },
      description: 'Size of the icon in pixels',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the image (defaults to className)',
    },
    style: {
      control: 'object',
      description: 'CSS styles to apply to the image',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClassIcon>;

// Basic usage examples
export const Default: Story = {
  args: {
    className: 'dragonknight',
    size: 24,
  },
};

export const Small: Story = {
  args: {
    className: 'templar',
    size: 12,
  },
};

export const Large: Story = {
  args: {
    className: 'sorcerer',
    size: 48,
  },
};

export const WithCustomAlt: Story = {
  args: {
    className: 'nightblade',
    size: 32,
    alt: 'Nightblade Class',
  },
};

export const WithCustomStyling: Story = {
  args: {
    className: 'arcanist',
    size: 32,
    style: {
      opacity: 1,
      border: '2px solid gold',
      borderRadius: '4px',
      padding: '2px',
    },
  },
};

// All available class icons
export const AllClasses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
      {[
        'dragonknight',
        'templar',
        'warden',
        'nightblade',
        'sorcerer',
        'necromancer',
        'arcanist',
      ].map((className) => (
        <Box key={className} sx={{ textAlign: 'center' }}>
          <ClassIcon className={className} size={32} />
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 0.5, textTransform: 'capitalize' }}
          >
            {className}
          </Typography>
        </Box>
      ))}
    </Box>
  ),
};

// Size variations for a single class
export const SizeVariations: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      {[8, 12, 16, 20, 24, 32, 40, 48, 56, 64].map((size) => (
        <Box key={size} sx={{ textAlign: 'center' }}>
          <ClassIcon className="dragonknight" size={size} />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {size}px
          </Typography>
        </Box>
      ))}
    </Box>
  ),
};

// Usage in different UI contexts
export const InTextContext: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        Player List
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="dragonknight" size={16} />
          <Typography variant="body2">TankPlayerName (Dragonknight)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="templar" size={16} />
          <Typography variant="body2">HealerPlayerName (Templar)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="sorcerer" size={16} />
          <Typography variant="body2">DPSPlayerName (Sorcerer)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="nightblade" size={16} />
          <Typography variant="body2">DPSPlayerName2 (Nightblade)</Typography>
        </Box>
      </Box>
    </Paper>
  ),
};

// Different opacity settings
export const OpacityVariations: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      {[0.3, 0.5, 0.7, 0.8, 1.0].map((opacity) => (
        <Box key={opacity} sx={{ textAlign: 'center' }}>
          <ClassIcon className="warden" size={32} style={{ opacity }} />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {Math.round(opacity * 100)}%
          </Typography>
        </Box>
      ))}
    </Box>
  ),
};

// Case sensitivity test
export const CaseSensitivity: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 500 }}>
      <Typography variant="h6" gutterBottom>
        Case Sensitivity Test
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Component should handle different case variations of class names:
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="dragonknight" size={24} />
          <Typography variant="body2">"dragonknight"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="Dragonknight" size={24} />
          <Typography variant="body2">"Dragonknight"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="DRAGONKNIGHT" size={24} />
          <Typography variant="body2">"DRAGONKNIGHT"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="DragonKnight" size={24} />
          <Typography variant="body2">"DragonKnight"</Typography>
        </Box>
      </Box>
    </Paper>
  ),
};

// Edge cases
export const EdgeCases: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edge Cases Test
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="invalid-class" size={24} />
          <Typography variant="body2">
            Invalid class name (should return null): "invalid-class"
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="" size={24} />
          <Typography variant="body2">Empty class name (should return null)</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="   templar   " size={24} />
          <Typography variant="body2">Class name with whitespace: " templar "</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon className="templar" size={0} />
          <Typography variant="body2">Zero size (should still render): size=0</Typography>
        </Box>
      </Box>
    </Paper>
  ),
};

// Styling variations
export const StylingVariations: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <ClassIcon
          className="necromancer"
          size={32}
          style={{
            filter: 'grayscale(100%)',
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Grayscale
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <ClassIcon
          className="necromancer"
          size={32}
          style={{
            filter: 'sepia(100%)',
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Sepia
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <ClassIcon
          className="necromancer"
          size={32}
          style={{
            filter: 'hue-rotate(180deg)',
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Hue Rotate
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <ClassIcon
          className="necromancer"
          size={32}
          style={{
            border: '2px solid #ff6b6b',
            borderRadius: '50%',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Styled Border
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <ClassIcon
          className="necromancer"
          size={32}
          style={{
            transform: 'rotate(15deg)',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
          Rotated + Shadow
        </Typography>
      </Box>
    </Box>
  ),
};

// Interactive demo showing usage in a realistic context
export const PlayerPanelDemo: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom>
        Player Panel Usage Demo
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Example of how ClassIcon might be used in a player information panel:
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { name: 'Tank Player', class: 'dragonknight', subclasses: ['Stamina DK', 'Tank Build'] },
          { name: 'Healer Main', class: 'templar', subclasses: ['Magicka Templar', 'Healer'] },
          {
            name: 'DPS Wizard',
            class: 'sorcerer',
            subclasses: ['Magicka Sorcerer', 'Lightning Build'],
          },
          { name: 'Stealth Assassin', class: 'nightblade', subclasses: ['Stamina NB', 'Ganker'] },
          { name: 'Nature Guardian', class: 'warden', subclasses: ['Stamina Warden', 'Ice Tank'] },
          {
            name: 'Death Mage',
            class: 'necromancer',
            subclasses: ['Magicka Necro', 'Corpse Blast'],
          },
          {
            name: 'Mystic Scholar',
            class: 'arcanist',
            subclasses: ['Magicka Arcanist', 'Crux Build'],
          },
        ].map((player) => (
          <Box
            key={player.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 1,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <ClassIcon className={player.class} size={20} style={{ marginRight: '12px' }} />
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {player.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {player.subclasses.map((subclass, idx) => (
                  <React.Fragment key={subclass}>
                    {idx > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                        •
                      </Typography>
                    )}
                    <ClassIcon className={player.class} size={12} style={{ opacity: 0.8 }} />
                    <Typography variant="caption" color="text.secondary">
                      {subclass}
                    </Typography>
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  ),
};
