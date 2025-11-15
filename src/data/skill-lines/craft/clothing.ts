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
    { id: AbilityId.KEEN_EYE_CLOTH, name: 'Keen Eye: Cloth', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.OUTFITTER_HIRELING, name: 'Outfitter Hireling', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.UNRAVELING, name: 'Unraveling', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.STITCHING, name: 'Stitching', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.TANNIN_EXPERTISE, name: 'Tannin Expertise', isPassive: true, isUltimate: false, maxRank: 4 },
  ],
};
