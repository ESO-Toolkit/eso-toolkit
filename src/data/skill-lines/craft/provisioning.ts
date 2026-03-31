import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Provisioning Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/provisioning
 */
export const provisioning: SkillLineData = {
  id: 0,
  name: 'Provisioning',
  class: 'craft',
  category: 'craft',
  skills: [
    {
      id: AbilityId.RECIPE_QUALITY,
      icon: 'ability_provisioner_006',
      alternateIds: [44625, 44630, 44631, 69953],
      name: 'Recipe Quality',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
    {
      id: AbilityId.RECIPE_IMPROVEMENT,
      icon: 'ability_provisioner_001',
      alternateIds: [44590, 44595, 44597, 44598, 44599, 44650],
      name: 'Recipe Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.GOURMAND,
      alternateIds: [44609, 44610],
      icon: 'ability_provisioner_004',
      name: 'Gourmand',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.CONNOISSEUR,
      icon: 'ability_provisioner_005',
      alternateIds: [44612, 44614, 44615],
      name: 'Connoisseur',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.CHEF,
      alternateIds: [44617, 44619],
      icon: 'ability_provisioner_002',
      name: 'Chef',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.BREWER,
      alternateIds: [44621, 44624],
      icon: 'ability_provisioner_003',
      name: 'Brewer',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.FORAGER_HIRELING,
      icon: 'ability_provisioner_007',
      alternateIds: [44634, 44640, 44641],
      name: 'Forager Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
