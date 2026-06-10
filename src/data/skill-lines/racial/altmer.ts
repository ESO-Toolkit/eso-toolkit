import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Altmer (High Elf) Racial Skills
 */
export const altmer: SkillLineData = {
  id: 0,
  name: 'Altmer',
  class: 'racial',
  category: 'racial',
  icon: 'ability_templar_032',
  skills: [
    {
      id: AbilityId.HIGHBORN,
      icon: 'ability_templar_032',
      name: 'Highborn',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SPELL_RECHARGE,
      icon: 'ability_sorcerer_063',
      alternateIds: [
        35993, 45273, 45274, 118110, 118111, 118112, 118113, 118114, 118115, 118116, 118117, 118118,
      ],
      name: 'Spell Recharge',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SYRABANES_BOON,
      icon: 'ability_armor_004',
      name: "Syrabane's Boon",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ELEMENTAL_TALENT,
      icon: 'ability_armor_005',
      alternateIds: [35998, 45275, 45276],
      name: 'Elemental Talent',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
