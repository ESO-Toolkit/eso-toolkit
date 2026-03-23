import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Provisioning Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/provisioning
 */
export const provisioning: SkillLineData = {
  id: 0,
  name: 'Provisioning',
  skills: [
    {
      id: AbilityId.RECIPE_QUALITY,
      alternateIds: [44625, 44630, 44631, 69953],
      name: 'Recipe Quality',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
    {
      id: AbilityId.RECIPE_IMPROVEMENT,
      alternateIds: [44590, 44595, 44597, 44598, 44599, 44650],
      name: 'Recipe Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.GOURMAND, name: 'Gourmand', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.CONNOISSEUR,
      alternateIds: [44612, 44614, 44615],
      name: 'Connoisseur',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.CHEF, name: 'Chef', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.BREWER, name: 'Brewer', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.FORAGER_HIRELING,
      alternateIds: [44634, 44640, 44641],
      name: 'Forager Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
