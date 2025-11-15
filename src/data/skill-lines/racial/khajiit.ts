import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Khajiit Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/khajiit-skills
 */
export const khajiit: SkillLineData = {
  id: 0,
  name: 'Khajiit',
  skills: [
    { id: AbilityId.CUTPURSE, name: 'Cutpurse', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.ROBUSTNESS, name: 'Robustness', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.LUNAR_BLESSINGS, name: 'Lunar Blessings', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.FELINE_AMBUSH, name: 'Feline Ambush', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
