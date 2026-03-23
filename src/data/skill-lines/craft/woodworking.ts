import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Woodworking Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/woodworking
 */
export const woodworking: SkillLineData = {
  id: 0,
  name: 'Woodworking',
  class: 'craft',
  category: 'craft',
  skills: [
    {
      id: AbilityId.WOODWORKING,
      icon: 'ability_tradecraft_003',
      alternateIds: [47282, 47283, 47284, 47285, 47286, 47287, 48172, 48173, 48174, 70046],
      name: 'Woodworking',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_WOOD,
      icon: 'ability_smith_002',
      alternateIds: [47857, 47858, 47859],
      name: 'Keen Eye: Wood',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.LUMBERJACK_HIRELING,
      icon: 'ability_tradecraft_007',
      alternateIds: [48184, 48185, 48186],
      name: 'Lumberjack Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.WOOD_EXTRACTION,
      icon: 'ability_tradecraft_006',
      alternateIds: [48178, 48179, 48180],
      name: 'Wood Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    { id: AbilityId.CARPENTRY, icon: 'crafting_forester_plug_component_002', name: 'Carpentry', isPassive: true, isUltimate: false, maxRank: 3 },
    {
      id: AbilityId.RESIN_EXPERTISE,
      icon: 'ability_tradecraft_001',
      alternateIds: [48175, 48176, 48177],
      name: 'Resin Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
