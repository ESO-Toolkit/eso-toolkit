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
    { id: AbilityId.METALWORKING, name: 'Metalworking', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.KEEN_EYE_ORE, name: 'Keen Eye: Ore', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.MINER_HIRELING, name: 'Miner Hireling', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.METAL_EXTRACTION, name: 'Metal Extraction', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.METALLURGY, name: 'Metallurgy', isPassive: true, isUltimate: false, maxRank: 3 },
    { id: AbilityId.TEMPER_EXPERTISE, name: 'Temper Expertise', isPassive: true, isUltimate: false, maxRank: 4 },
  ],
};
