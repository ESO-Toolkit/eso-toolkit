import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Khajiit Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/khajiit-skills
 */
export const khajiit: SkillLineData = {
  id: 0,
  name: 'Khajiit',
  skills: [
    { id: AbilityId.CUTPURSE, name: 'Cutpurse', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.ROBUSTNESS,
      alternateIds: [70386, 70387, 70388, 70389, 70390, 70391, 117806, 117844, 117845],
      name: 'Robustness',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.LUNAR_BLESSINGS,
      alternateIds: [117846, 117847, 117848, 117861, 117862, 117867, 117868, 117869, 117870],
      name: 'Lunar Blessings',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.FELINE_AMBUSH,
      alternateIds: [36067, 45299, 45301, 117875, 117877],
      name: 'Feline Ambush',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
