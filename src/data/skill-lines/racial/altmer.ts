import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Altmer (High Elf) Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/high-elf-skills
 */
export const altmer: SkillLineData = {
  id: 0,
  name: 'Altmer',
  skills: [
    {
      id: AbilityId.HIGHBORN,
      name: 'Highborn',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SPELL_RECHARGE,
      name: 'Spell Recharge',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SYRABANES_BOON,
      name: "Syrabane's Boon",
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ELEMENTAL_TALENT,
      name: 'Elemental Talent',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
