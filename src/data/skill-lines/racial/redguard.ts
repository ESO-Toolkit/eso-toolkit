import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Redguard Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/redguard-skills
 */
export const redguard: SkillLineData = {
  id: 0,
  name: 'Redguard',
  class: 'racial',
  category: 'racial',
  icon: 'ability_templar_027',
  skills: [
    {
      id: AbilityId.WAYFARER,
      icon: 'ability_templar_027',
      name: 'Wayfarer',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.MARTIAL_TRAINING,
      icon: 'ability_templar_002',
      alternateIds: [36009, 45277, 45278, 118392, 118393, 118394, 121178, 121179, 121180],
      name: 'Martial Training',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.CONDITIONING,
      icon: 'ability_dragonknight_021',
      alternateIds: [117752, 117753, 117754],
      name: 'Conditioning',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ADRENALINE_RUSH,
      icon: 'ability_armor_012',
      alternateIds: [251, 253, 36546, 36548, 45313, 45314, 45315, 45316, 193972],
      name: 'Adrenaline Rush',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
