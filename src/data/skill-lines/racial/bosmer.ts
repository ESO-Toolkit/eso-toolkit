import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Wood Elf (Bosmer) Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/wood-elf-skills
 */
export const bosmer: SkillLineData = {
  id: 0,
  name: 'Wood Elf',
  skills: [
    {
      id: AbilityId.ACROBAT,
      name: 'Acrobat',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.HUNTERS_EYE,
      name: "Hunter's Eye",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.YFFRES_ENDURANCE,
      name: "Y'ffre's Endurance",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RESIST_AFFLICTION,
      name: 'Resist Affliction',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
