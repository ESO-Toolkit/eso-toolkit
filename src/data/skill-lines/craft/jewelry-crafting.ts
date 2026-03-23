import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Jewelry Crafting Skills
 * Source: https://eso-hub.com/en/skills/craft/jewelry-crafting
 */
export const jewelryCrafting: SkillLineData = {
  id: 0,
  name: 'Jewelry Crafting',
  skills: [
    { id: AbilityId.ENGRAVER, name: 'Engraver', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.KEEN_EYE_JEWELRY,
      alternateIds: [103637, 103638, 103639],
      name: 'Keen Eye: Jewelry',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.JEWELRY_EXTRACTION,
      alternateIds: [103643, 103644, 103645],
      name: 'Jewelry Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.LAPIDARY_RESEARCH,
      alternateIds: [103640, 103641, 103642, 108098],
      name: 'Lapidary Research',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.PLATINGS_EXPERTISE,
      alternateIds: [103646, 103647, 103648],
      name: 'Platings Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
