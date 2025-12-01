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
      name: 'Recipe Quality',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
    {
      id: AbilityId.RECIPE_IMPROVEMENT,
      name: 'Recipe Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.GOURMAND, name: 'Gourmand', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.CONNOISSEUR,
      name: 'Connoisseur',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.CHEF, name: 'Chef', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.BREWER, name: 'Brewer', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.FORAGER_HIRELING,
      name: 'Forager Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
