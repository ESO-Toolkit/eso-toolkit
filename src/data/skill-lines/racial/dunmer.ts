import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Dark Elf Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/dark-elf-skills
 */
export const dunmer: SkillLineData = {
  id: 0,
  name: 'Dark Elf',
  class: 'racial',
  category: 'racial',
  skills: [
    { id: AbilityId.ASHLANDER, icon: 'ability_weapon_016', name: 'Ashlander', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.DYNAMIC, icon: 'ability_weapon_023', name: 'Dynamic', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.RESIST_FLAME,
      icon: 'ability_sorcerer_010',
      alternateIds: [36593, 45269, 45270],
      name: 'Resist Flame',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    { id: AbilityId.RUINATION, icon: 'ability_sorcerer_062', name: 'Ruination', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
