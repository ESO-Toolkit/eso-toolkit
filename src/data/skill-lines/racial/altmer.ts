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
      alternateIds: [
        35993, 45273, 45274, 118110, 118111, 118112, 118113, 118114, 118115, 118116,
        118117, 118118,
      ],
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
      alternateIds: [35998, 45275, 45276],
      name: 'Elemental Talent',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
