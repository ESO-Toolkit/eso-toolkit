import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Redguard Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/redguard-skills
 */
export const redguard: SkillLineData = {
  id: 0,
  name: 'Redguard',
  skills: [
    { id: AbilityId.WAYFARER, name: 'Wayfarer', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.MARTIAL_TRAINING,
      name: 'Martial Training',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.CONDITIONING,
      name: 'Conditioning',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ADRENALINE_RUSH,
      name: 'Adrenaline Rush',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
