import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Enchanting Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/enchanting
 */
export const enchanting: SkillLineData = {
  id: 0,
  name: 'Enchanting',
  class: 'craft',
  category: 'craft',
  icon: 'ability_enchanter_002b',
  skills: [
    {
      id: AbilityId.ASPECT_IMPROVEMENT,
      icon: 'ability_enchanter_002b',
      alternateIds: [46758, 46759, 46760, 46763],
      name: 'Aspect Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
    {
      id: AbilityId.POTENCY_IMPROVEMENT,
      icon: 'ability_enchanter_001b',
      alternateIds: [46727, 46729, 46731, 46735, 46736, 46740, 49112, 49113, 49114, 70045],
      name: 'Potency Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_RUNE_STONES,
      icon: 'ability_smith_002',
      alternateIds: [47851, 47852, 47853],
      name: 'Keen Eye: Rune Stones',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.ENCHANTER_HIRELING,
      icon: 'ability_enchanter_008',
      alternateIds: [46770, 46771, 46772],
      name: 'Enchanter Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.RUNESTONE_EXTRACTION,
      icon: 'ability_enchanter_004',
      alternateIds: [46767, 46768, 46769],
      name: 'Runestone Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
