import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Alchemy Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/alchemy
 */
export const alchemy: SkillLineData = {
  id: 0,
  name: 'Alchemy',
  skills: [
    { id: AbilityId.SOLVENT_PROFICIENCY, name: 'Solvent Proficiency', isPassive: true, isUltimate: false, maxRank: 9 },
    { id: AbilityId.KEEN_EYE_REAGENTS, name: 'Keen Eye: Reagents', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.MEDICINAL_USE, name: 'Medicinal Use', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.CHEMISTRY, name: 'Chemistry', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.LABORATORY_USE, name: 'Laboratory Use', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.SNAKEBLOOD, name: 'Snakeblood', isPassive: true, isUltimate: false, maxRank: 3 },
  ],
};
