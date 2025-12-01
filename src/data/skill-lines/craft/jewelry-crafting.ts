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
      name: 'Keen Eye: Jewelry',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.JEWELRY_EXTRACTION,
      name: 'Jewelry Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.LAPIDARY_RESEARCH,
      name: 'Lapidary Research',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.PLATINGS_EXPERTISE,
      name: 'Platings Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
