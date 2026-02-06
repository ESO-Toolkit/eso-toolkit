import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Imperial Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/imperial-skills
 */
export const imperial: SkillLineData = {
  id: 0,
  name: 'Imperial',
  skills: [
    { id: AbilityId.DIPLOMAT, name: 'Diplomat', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.TOUGH, name: 'Tough', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.IMPERIAL_METTLE,
      name: 'Imperial Mettle',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RED_DIAMOND,
      name: 'Red Diamond',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
