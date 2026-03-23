import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Blacksmithing Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/blacksmithing
 */
export const blacksmithing: SkillLineData = {
  id: 0,
  name: 'Blacksmithing',
  skills: [
    {
      id: AbilityId.METALWORKING,
      alternateIds: [47276, 47277, 47278, 47279, 47280, 47281, 48157, 48158, 48159, 70041],
      name: 'Metalworking',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_ORE,
      alternateIds: [47854, 47855, 47856],
      name: 'Keen Eye: Ore',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.MINER_HIRELING,
      alternateIds: [48169, 48170, 48171],
      name: 'Miner Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.METAL_EXTRACTION,
      alternateIds: [48163, 48164, 48165],
      name: 'Metal Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.METALLURGY,
      alternateIds: [48160, 48161, 48162, 58784],
      name: 'Metallurgy',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.TEMPER_EXPERTISE,
      alternateIds: [48166, 48167, 48168],
      name: 'Temper Expertise',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
  ],
};
