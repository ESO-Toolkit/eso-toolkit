import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Nord Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/nord-skills
 */
export const nord: SkillLineData = {
  id: 0,
  name: 'Nord',
  skills: [
    { id: AbilityId.REVELER, name: 'Reveler', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.RESIST_FROST, name: 'Resist Frost', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.STALWART, name: 'Stalwart', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.RUGGED, name: 'Rugged', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
