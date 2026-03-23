import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Orc Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/orc-skills
 */
export const orc: SkillLineData = {
  id: 0,
  name: 'Orc',
  class: 'racial',
  category: 'racial',
  skills: [
    { id: AbilityId.CRAFTSMAN, icon: 'ability_dragonknight_021', name: 'Craftsman', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.BRAWNY, icon: 'ability_dragonknight_020', name: 'Brawny', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.UNFLINCHING_RAGE,
      icon: 'ability_sorcerer_018',
      alternateIds: [84668, 84670, 84672, 118196, 118197, 118203, 118204, 118206, 118207],
      name: 'Unflinching Rage',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SWIFT_WARRIOR,
      icon: 'ability_dragonknight_029',
      alternateIds: [33304, 45311, 45312],
      name: 'Swift Warrior',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
