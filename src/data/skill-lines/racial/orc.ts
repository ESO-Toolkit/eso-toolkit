import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Orc Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/orc-skills
 */
export const orc: SkillLineData = {
  id: 0,
  name: 'Orc',
  skills: [
    { id: AbilityId.CRAFTSMAN, name: 'Craftsman', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.BRAWNY, name: 'Brawny', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.UNFLINCHING_RAGE, name: 'Unflinching Rage', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.SWIFT_WARRIOR, name: 'Swift Warrior', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
