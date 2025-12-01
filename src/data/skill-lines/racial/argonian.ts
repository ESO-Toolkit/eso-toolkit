import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Argonian Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/argonian-skills
 */
export const argonian: SkillLineData = {
  id: 0,
  name: 'Argonian',
  skills: [
    {
      id: AbilityId.AMPHIBIAN,
      name: 'Amphibian',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.LIFE_MENDER,
      name: 'Life Mender',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.ARGONIAN_RESISTANCE,
      name: 'Argonian Resistance',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RESOURCEFUL,
      name: 'Resourceful',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
