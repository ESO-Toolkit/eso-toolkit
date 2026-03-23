import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Nord Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/nord-skills
 */
export const nord: SkillLineData = {
  id: 0,
  name: 'Nord',
  class: 'racial',
  category: 'racial',
  skills: [
    { id: AbilityId.REVELER, icon: 'ability_dragonknight_032', name: 'Reveler', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.RESIST_FROST,
      icon: 'ability_sorcerer_012',
      alternateIds: [36627, 45303, 45304, 49181, 49182, 49183],
      name: 'Resist Frost',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    { id: AbilityId.STALWART, icon: 'ability_sorcerer_018', name: 'Stalwart', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.RUGGED, icon: 'ability_dragonknight_020', name: 'Rugged', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
