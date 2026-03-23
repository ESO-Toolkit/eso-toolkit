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
    { id: AbilityId.DYNAMIC, alternateIds: [36592, 45265, 45266, 45267, 45268, 157250, 157251], icon: 'ability_weapon_023', name: 'Dynamic', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.RESIST_FLAME,
      icon: 'ability_sorcerer_010',
      alternateIds: [36593, 45269, 45270],
      name: 'Resist Flame',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    { id: AbilityId.RUINATION, alternateIds: [45271, 45272], icon: 'ability_sorcerer_062', name: 'Ruination', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
