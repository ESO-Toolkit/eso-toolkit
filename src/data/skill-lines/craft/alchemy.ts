import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Alchemy Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/alchemy
 */
export const alchemy: SkillLineData = {
  id: 0,
  name: 'Alchemy',
  class: 'craft',
  category: 'craft',
  skills: [
    {
      id: AbilityId.SOLVENT_PROFICIENCY,
      icon: 'ability_alchemy_001',
      alternateIds: [45542, 45543, 45547, 45550, 45551, 45552, 49163, 70042, 70043],
      name: 'Solvent Proficiency',
      isPassive: true,
      isUltimate: false,
      maxRank: 9,
    },
    {
      id: AbilityId.KEEN_EYE_REAGENTS,
      icon: 'ability_smith_002',
      alternateIds: [47840, 47841, 47842],
      name: 'Keen Eye: Reagents',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.MEDICINAL_USE,
      icon: 'ability_alchemy_004',
      alternateIds: [45569, 45571, 45573],
      name: 'Medicinal Use',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.CHEMISTRY, icon: 'ability_alchemy_006', name: 'Chemistry', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.LABORATORY_USE,
      icon: 'ability_alchemy_002',
      name: 'Laboratory Use',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.SNAKEBLOOD,
      icon: 'ability_alchemy_005',
      alternateIds: [47831, 47832, 47834],
      name: 'Snakeblood',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
