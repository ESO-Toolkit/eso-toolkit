import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Clothing Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/clothing
 */
export const clothing: SkillLineData = {
  id: 0,
  name: 'Clothing',
  class: 'craft',
  category: 'craft',
  icon: 'ability_tradecraft_002',
  skills: [
    {
      id: AbilityId.TAILORING,
      alternateIds: [47288, 47289, 47290, 47291, 47292, 47293, 48188, 48189, 70044],
      icon: 'ability_tradecraft_002',
      name: 'Tailoring',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_CLOTH,
      icon: 'ability_smith_002',
      alternateIds: [47860, 47861, 47862],
      name: 'Keen Eye: Cloth',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.OUTFITTER_HIRELING,
      icon: 'ability_tradecraft_007',
      alternateIds: [48199, 48200, 48201],
      name: 'Outfitter Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.UNRAVELING,
      icon: 'ability_tradecraft_005',
      alternateIds: [48193, 48194, 48195],
      name: 'Unraveling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.STITCHING,
      alternateIds: [48191, 48192, 58782],
      icon: 'crafting_light_armor_component_004',
      name: 'Stitching',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.TANNIN_EXPERTISE,
      icon: 'ability_tradecraft_004',
      alternateIds: [48196, 48197, 48198],
      name: 'Tannin Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
