import type { SkillLineData } from '@/data/types/skill-line-types';

import { AbilityId } from '../ability-ids';

/**
 * Jewelry Crafting Skills
 */
export const jewelryCrafting: SkillLineData = {
  id: 0,
  name: 'Jewelry Crafting',
  class: 'craft',
  category: 'craft',
  icon: 'passive_jewelerengraver',
  skills: [
    {
      id: AbilityId.ENGRAVER,
      alternateIds: [103633, 103634, 103635, 103636],
      icon: 'passive_jewelerengraver',
      name: 'Engraver',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_JEWELRY,
      icon: 'ability_smith_002',
      alternateIds: [103637, 103638, 103639],
      name: 'Keen Eye: Jewelry',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.JEWELRY_EXTRACTION,
      icon: 'passive_jewelryextraction',
      alternateIds: [103643, 103644, 103645],
      name: 'Jewelry Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.LAPIDARY_RESEARCH,
      icon: 'passive_lapidaryresearch',
      alternateIds: [103640, 103641, 103642, 108098],
      name: 'Lapidary Research',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.PLATINGS_EXPERTISE,
      icon: 'passive_platingexpertise',
      alternateIds: [103646, 103647, 103648],
      name: 'Platings Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
