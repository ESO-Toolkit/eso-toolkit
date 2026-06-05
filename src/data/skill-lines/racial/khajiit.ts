import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Khajiit Racial Skills
 */
export const khajiit: SkillLineData = {
  id: 0,
  name: 'Khajiit',
  class: 'racial',
  category: 'racial',
  icon: 'ability_armor_010',
  skills: [
    {
      id: AbilityId.CUTPURSE,
      icon: 'ability_armor_010',
      name: 'Cutpurse',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ROBUSTNESS,
      icon: 'ability_sorcerer_018',
      alternateIds: [70386, 70387, 70388, 70389, 70390, 70391, 117806, 117844, 117845],
      name: 'Robustness',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.LUNAR_BLESSINGS,
      icon: 'passive_khajiit_01',
      alternateIds: [117846, 117847, 117848, 117861, 117862, 117867, 117868, 117869, 117870],
      name: 'Lunar Blessings',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.FELINE_AMBUSH,
      icon: 'ability_armor_006',
      alternateIds: [36067, 45299, 45301, 117875, 117877],
      name: 'Feline Ambush',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
