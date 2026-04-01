import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Wood Elf (Bosmer) Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/wood-elf-skills
 */
export const bosmer: SkillLineData = {
  id: 0,
  name: 'Wood Elf',
  class: 'racial',
  category: 'racial',
  icon: 'passive_weapon_025',
  skills: [
    {
      id: AbilityId.ACROBAT,
      icon: 'passive_weapon_025',
      alternateIds: [
        36008, 126723, 129604, 129605, 129606, 129608, 129610, 129611, 129619, 129620, 129649,
        129651, 129663, 129665, 129752, 129755,
      ],
      name: 'Acrobat',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.HUNTERS_EYE,
      icon: 'ability_armor_011',
      name: "Hunter's Eye",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.YFFRES_ENDURANCE,
      icon: 'ability_templar_002',
      name: "Y'ffre's Endurance",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RESIST_AFFLICTION,
      icon: 'passive_templar_021',
      alternateIds: [36011, 45317, 45319, 49185, 49186, 49188, 150995, 150996, 150997],
      name: 'Resist Affliction',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
