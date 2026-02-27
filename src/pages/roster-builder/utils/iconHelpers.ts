/**
 * Icon Helper Utilities
 * Provides icons for abilities and skill lines
 */

import { Avatar } from '@mui/material';
import React from 'react';
import { SupportUltimate, HealerBuff } from '../../../types/roster';

// Icon mappings for ESO abilities
export const ULTIMATE_ICONS: Record<string, string> = {
  [SupportUltimate.WARHORN]: 'ability_ava_003_a',
  [SupportUltimate.COLOSSUS]: 'ability_necromancer_006_b',
  [SupportUltimate.BARRIER]: 'ability_ava_006',
  [SupportUltimate.ATRONACH]: 'ability_sorcerer_greater_storm_atronach',
};

export const HEALER_BUFF_ICONS: Record<string, string> = {
  [HealerBuff.ENLIVENING_OVERFLOW]: 'ability_mage_065',
  [HealerBuff.FROM_THE_BRINK]: 'ability_mage_065',
};

export const SKILL_LINE_ICONS = {
  // Dragonknight
  'Ardent Flame': 'ability_dragonknight_001',
  'Draconic Power': 'ability_dragonknight_008',
  'Earthen Heart': 'ability_dragonknight_007',

  // Sorcerer
  'Dark Magic': 'ability_sorcerer_mage_wraith',
  'Daedric Summoning': 'ability_sorcerer_greater_storm_atronach',
  'Storm Calling': 'ability_sorcerer_endless_fury',

  // Nightblade
  'Assassination': 'ability_nightblade_012',
  'Shadow': 'ability_nightblade_012',
  'Siphoning': 'ability_nightblade_012',

  // Templar
  'Aedric Spear': 'ability_templar_sun_fire',
  "Dawn's Wrath": 'ability_templar_sun_fire',
  'Restoring Light': 'ability_templar_sun_fire',

  // Warden
  'Animal Companions': 'ability_mage_065',
  'Green Balance': 'ability_mage_065',
  "Winter's Embrace": 'ability_mage_065',

  // Necromancer
  'Grave Lord': 'ability_necromancer_006_b',
  'Bone Tyrant': 'ability_necromancer_006_b',
  'Living Death': 'ability_necromancer_006_b',

  // Arcanist
  'Herald of the Tome': 'ability_mage_065',
  'Apocryphal Soldier': 'ability_mage_065',
  'Curative Runeforms': 'ability_mage_065',
} as const;

/**
 * Get icon for ultimates
 */
export const getUltimateIcon = (ultimate: string | undefined): React.ReactElement | null => {
  if (!ultimate) return null;
  const iconFile = ULTIMATE_ICONS[ultimate];
  if (!iconFile) return null;
  return (
    <Avatar
      src={'https://assets.rpglogs.com/img/eso/abilities/' + iconFile + '.png'}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for healer buffs
 */
export const getHealerBuffIcon = (buff: string | undefined): React.ReactElement | null => {
  if (!buff) return null;
  const iconFile = HEALER_BUFF_ICONS[buff];
  if (!iconFile) return null;
  return (
    <Avatar
      src={'https://assets.rpglogs.com/img/eso/abilities/' + iconFile + '.png'}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

/**
 * Get icon for skill lines based on class
 */
export const getSkillLineIcon = (skillLine: string): React.ReactElement | null => {
  const iconFile = SKILL_LINE_ICONS[skillLine];
  if (!iconFile) return null;
  return (
    <Avatar
      src={'https://assets.rpglogs.com/img/eso/abilities/' + iconFile + '.png'}
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};
