import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Dark Elf Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/dark-elf-skills
 */
export const dunmer: SkillLineData = {
  id: 0,
  name: 'Dark Elf',
  skills: [
    { id: AbilityId.ASHLANDER, name: 'Ashlander', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.DYNAMIC, name: 'Dynamic', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.RESIST_FLAME, name: 'Resist Flame', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.RUINATION, name: 'Ruination', isPassive: true, isUltimate: false, maxRank: 2 },
  ],
};
