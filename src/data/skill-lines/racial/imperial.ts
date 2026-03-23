import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Imperial Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/imperial-skills
 */
export const imperial: SkillLineData = {
  id: 0,
  name: 'Imperial',
  class: 'racial',
  category: 'racial',
  skills: [
    { id: AbilityId.DIPLOMAT, icon: 'ability_templar_027', name: 'Diplomat', isPassive: true, isUltimate: false, maxRank: 2 },
    { id: AbilityId.TOUGH, alternateIds: [50906, 50907, 157245, 157249], icon: 'ability_dragonknight_020', name: 'Tough', isPassive: true, isUltimate: false, maxRank: 2 },
    {
      id: AbilityId.IMPERIAL_METTLE,
      icon: 'ability_dragonknight_021',
      alternateIds: [36153, 45279, 45280],
      name: 'Imperial Mettle',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.RED_DIAMOND,
      icon: 'ability_dragonknight_028',
      alternateIds: [
        36155, 36214, 45291, 45292, 45293, 45294, 121126, 121127, 121139, 121140,
        121141, 121142, 122072, 122077, 122078,
      ],
      name: 'Red Diamond',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
