import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Clothing Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/clothing
 */
export const clothing: SkillLineData = {
  id: 0,
  name: 'Clothing',
  skills: [
    { id: AbilityId.TAILORING, name: 'Tailoring', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.KEEN_EYE_CLOTH,
      alternateIds: [47860, 47861, 47862],
      name: 'Keen Eye: Cloth',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.OUTFITTER_HIRELING,
      alternateIds: [48199, 48200, 48201],
      name: 'Outfitter Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.UNRAVELING,
      alternateIds: [48193, 48194, 48195],
      name: 'Unraveling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.STITCHING, name: 'Stitching', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.TANNIN_EXPERTISE,
      alternateIds: [48196, 48197, 48198],
      name: 'Tannin Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
