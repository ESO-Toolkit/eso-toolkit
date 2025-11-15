import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Enchanting Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/enchanting
 */
export const enchanting: SkillLineData = {
  id: 0,
  name: 'Enchanting',
  skills: [
    { id: AbilityId.ASPECT_IMPROVEMENT, name: 'Aspect Improvement', isPassive: true, isUltimate: false, maxRank: 4 },
    { id: AbilityId.POTENCY_IMPROVEMENT, name: 'Potency Improvement', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.KEEN_EYE_RUNE_STONES, name: 'Keen Eye: Rune Stones', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.ENCHANTER_HIRELING, name: 'Enchanter Hireling', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.RUNESTONE_EXTRACTION, name: 'Runestone Extraction', isPassive: true, isUltimate: false, maxRank: 3 },
  ],
};
