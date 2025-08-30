import { Box, Paper, Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { BossAvatar } from './BossAvatar';

const meta: Meta<typeof BossAvatar> = {
  title: 'Components/BossAvatar',
  component: BossAvatar,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    bossName: {
      control: 'text',
      description: 'Name of the boss to display avatar for',
    },
    size: {
      control: { type: 'range', min: 16, max: 128, step: 4 },
      description: 'Size of the avatar in pixels',
    },
    sx: {
      control: 'object',
      description: 'Material-UI sx prop for custom styling',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BossAvatar>;

// Basic usage examples
export const Default: Story = {
  args: {
    bossName: "Z'maja",
    size: 64,
  },
};

export const Small: Story = {
  args: {
    bossName: 'Rakkhat',
    size: 32,
  },
};

export const Large: Story = {
  args: {
    bossName: 'The Mage',
    size: 96,
  },
};

export const WithCustomStyling: Story = {
  args: {
    bossName: 'Saint Olms the Just',
    size: 64,
    sx: {
      border: '3px solid gold',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    },
  },
};

// Test different boss names and aliases
export const KynesAegisBosses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Lord Falgravn" size={48} />
        <Typography variant="caption" display="block">
          Lord Falgravn
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Captain Vrol" size={48} />
        <Typography variant="caption" display="block">
          Captain Vrol
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Yandir the Butcher" size={48} />
        <Typography variant="caption" display="block">
          Yandir the Butcher
        </Typography>
      </Box>
    </Box>
  ),
};

export const RockgroveBosses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Oaxiltso" size={48} />
        <Typography variant="caption" display="block">
          Oaxiltso
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Basks-in-Snakes" size={48} />
        <Typography variant="caption" display="block">
          Basks-in-Snakes
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Xalvakka" size={48} />
        <Typography variant="caption" display="block">
          Xalvakka
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Flame-Herald Bahsei" size={48} />
        <Typography variant="caption" display="block">
          Flame-Herald Bahsei
        </Typography>
      </Box>
    </Box>
  ),
};

export const CloudrestBosses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Shade of Galenwe" size={48} />
        <Typography variant="caption" display="block">
          Shade of Galenwe
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Shade of Relequen" size={48} />
        <Typography variant="caption" display="block">
          Shade of Relequen
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Shade of Siroria" size={48} />
        <Typography variant="caption" display="block">
          Shade of Siroria
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Z'maja" size={48} />
        <Typography variant="caption" display="block">
          Z'maja
        </Typography>
      </Box>
    </Box>
  ),
};

export const HallsOfFabricationBosses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Hunter-Killer Fabricant" size={48} />
        <Typography variant="caption" display="block">
          Hunter-Killer
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Pinnacle Factotum" size={48} />
        <Typography variant="caption" display="block">
          Pinnacle Factotum
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Archcustodian" size={48} />
        <Typography variant="caption" display="block">
          Archcustodian
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Assembly General" size={48} />
        <Typography variant="caption" display="block">
          Assembly General
        </Typography>
      </Box>
    </Box>
  ),
};

export const LucentCitadelBosses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Cavot Agnan" size={48} />
        <Typography variant="caption" display="block">
          Cavot Agnan
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Dariel Lemonds" size={48} />
        <Typography variant="caption" display="block">
          Dariel Lemonds
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Xoryn" size={48} />
        <Typography variant="caption" display="block">
          Xoryn
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Zilyseet" size={48} />
        <Typography variant="caption" display="block">
          Zilyseet
        </Typography>
      </Box>
    </Box>
  ),
};

// Test name aliases and variations
export const NameAliases: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Boss Name Aliases Test
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        The same boss avatar should appear for different name variations:
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
          <BossAvatar bossName="Lord Falgravn" size={32} />
          <Typography variant="body2">"Lord Falgravn"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Falgraven" size={32} />
          <Typography variant="body2">"Falgraven"</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Saint Olms the Just" size={32} />
          <Typography variant="body2">"Saint Olms the Just"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Saint Olms" size={32} />
          <Typography variant="body2">"Saint Olms"</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="The Serpent" size={32} />
          <Typography variant="body2">"The Serpent"</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Serpent" size={32} />
          <Typography variant="body2">"Serpent"</Typography>
        </Box>
      </Box>
    </Paper>
  ),
};

// Test edge cases
export const EdgeCases: Story = {
  render: () => (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edge Cases Test
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Z'maja #1" size={32} />
          <Typography variant="body2">Boss with instance number: "Z'maja #1"</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="Unknown Boss" size={32} />
          <Typography variant="body2">Unknown boss (should return null): "Unknown Boss"</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="" size={32} />
          <Typography variant="body2">Empty boss name (should return null)</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BossAvatar bossName="   Z'maja   " size={32} />
          <Typography variant="body2">Boss name with whitespace: " Z'maja "</Typography>
        </Box>
      </Box>
    </Paper>
  ),
};

// Size variations
export const SizeVariations: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={16} />
        <Typography variant="caption" display="block">
          16px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={24} />
        <Typography variant="caption" display="block">
          24px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={32} />
        <Typography variant="caption" display="block">
          32px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={48} />
        <Typography variant="caption" display="block">
          48px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={64} />
        <Typography variant="caption" display="block">
          64px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={96} />
        <Typography variant="caption" display="block">
          96px
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <BossAvatar bossName="Rakkhat" size={128} />
        <Typography variant="caption" display="block">
          128px
        </Typography>
      </Box>
    </Box>
  ),
};

// All available bosses showcase
export const AllAvailableBosses: Story = {
  render: () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        All Available Boss Avatars
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Complete showcase of all boss avatars available in the component
      </Typography>

      {[
        { title: "Kyne's Aegis", bosses: ['Lord Falgravn', 'Captain Vrol', 'Yandir the Butcher'] },
        {
          title: 'Rockgrove',
          bosses: ['Oaxiltso', 'Basks-in-Snakes', 'Xalvakka', 'Ash Titan', 'Flame-Herald Bahsei'],
        },
        {
          title: 'Cloudrest',
          bosses: ['Shade of Galenwe', 'Shade of Relequen', 'Shade of Siroria', "Z'maja"],
        },
        {
          title: 'Dreadsail Reef',
          bosses: [
            'Bow Breaker',
            'Lylanar and Turlassil',
            'Reef Guardian',
            'Sail Ripper',
            'Tideborn Taleria',
          ],
        },
        {
          title: 'Halls of Fabrication',
          bosses: [
            'Hunter-Killer Fabricant',
            'Pinnacle Factotum',
            'Archcustodian',
            'Assembly General',
            'The Refabrication Committee',
          ],
        },
        {
          title: 'Lucent Citadel',
          bosses: ['Cavot Agnan', 'Dariel Lemonds', 'Xoryn', 'Zilyseet', 'Orphic Shattered Shard'],
        },
        {
          title: 'Asylum Sanctorium',
          bosses: ['Saint Felms the Bold', 'Saint Llothis the Pious', 'Saint Olms the Just'],
        },
        {
          title: 'Sanctum Ophidia',
          bosses: ['Ozara', 'Possessed Manticora', 'Stonebreaker', 'The Serpent'],
        },
        { title: 'Maw of Lorkhaj', bosses: ["Zhaj'hassa the Forgotten", 'Rakkhat', 'The Twins'] },
        { title: 'Hel Ra Citadel', bosses: ['Ra Kotu', 'The Warrior', 'The Yokedas'] },
        {
          title: 'Aetherian Archive',
          bosses: [
            'Foundation Stone Atronach',
            'Lightning Storm Atronach',
            'The Mage',
            'Varlariel',
          ],
        },
        {
          title: 'Ossein Cage',
          bosses: [
            'Blood Drinker Thisa',
            'Hall of Fleshcraft',
            'Jynorah and Skorkhif',
            'Overfiend Kazpian',
            'Red Witch Gedna Relvel',
            'Tortured Ranyu',
          ],
        },
      ].map((trial) => (
        <Box key={trial.title} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {trial.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {trial.bosses.map((boss) => (
              <Box key={boss} sx={{ textAlign: 'center' }}>
                <BossAvatar bossName={boss} size={40} />
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ maxWidth: 80, wordWrap: 'break-word' }}
                >
                  {boss}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  ),
};
