import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Breton Racial Skills
 */
export const breton: SkillLineData = {
  id: 0,
  name: 'Breton',
  class: 'racial',
  category: 'racial',
  icon: 'ability_sorcerer_010',
  skills: [
    {
      id: AbilityId.OPPORTUNIST,
      icon: 'ability_sorcerer_010',
      alternateIds: [36247, 63099, 98307, 100408],
      name: 'Opportunist',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.GIFT_OF_MAGNUS,
      icon: 'ability_armor_004',
      alternateIds: [35995, 45259, 45260],
      name: 'Gift of Magnus',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SPELL_ATTUNEMENT,
      icon: 'ability_sorcerer_013',
      alternateIds: [36266, 45261, 45262, 118947, 118948, 118949, 121184, 121207, 121208],
      name: 'Spell Attunement',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.MAGICKA_MASTERY,
      icon: 'ability_armor_005',
      alternateIds: [36303, 45263, 45264],
      name: 'Magicka Mastery',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
