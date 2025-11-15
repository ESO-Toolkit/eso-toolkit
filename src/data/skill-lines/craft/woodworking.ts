import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Woodworking Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/woodworking
 */
export const woodworking: SkillLineData = {
  id: 0,
  name: 'Woodworking',
  skills: [
    { id: AbilityId.WOODWORKING, name: 'Woodworking', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.KEEN_EYE_WOOD, name: 'Keen Eye: Wood', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.LUMBERJACK_HIRELING, name: 'Lumberjack Hireling', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.WOOD_EXTRACTION, name: 'Wood Extraction', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.CARPENTRY, name: 'Carpentry', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.RESIN_EXPERTISE, name: 'Resin Expertise', isPassive: true, isUltimate: false, maxRank: 4 },
  ],
};
