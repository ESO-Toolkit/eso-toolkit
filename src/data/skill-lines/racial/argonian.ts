import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Argonian Racial Skills
 */
export const argonian: SkillLineData = {
  id: 0,
  name: 'Argonian',
  class: 'racial',
  category: 'racial',
  icon: 'ability_templar_010',
  skills: [
    {
      id: AbilityId.AMPHIBIAN,
      icon: 'ability_templar_010',
      name: 'Amphibian',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.LIFE_MENDER,
      icon: 'ability_templar_014',
      alternateIds: [36585, 45257, 45258],
      name: 'Life Mender',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ARGONIAN_RESISTANCE,
      icon: 'ability_templar_022',
      alternateIds: [36583, 36584, 45253, 45254, 45255, 45256, 150992, 150993, 150994],
      name: 'Argonian Resistance',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RESOURCEFUL,
      icon: 'ability_templar_009',
      alternateIds: [
        36568, 45243, 45247, 49151, 63694, 63695, 63696, 63697, 63698, 63699, 63700, 63701, 63702,
        63703, 63704, 149848, 149849, 149850,
      ],
      name: 'Resourceful',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
