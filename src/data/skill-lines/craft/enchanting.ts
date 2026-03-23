import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Enchanting Craft Skills
 * Source: https://eso-hub.com/en/skills/craft/enchanting
 */
export const enchanting: SkillLineData = {
  id: 0,
  name: 'Enchanting',
  skills: [
    {
      id: AbilityId.ASPECT_IMPROVEMENT,
      alternateIds: [46758, 46759, 46760, 46763],
      name: 'Aspect Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 4,
    },
    {
      id: AbilityId.POTENCY_IMPROVEMENT,
      alternateIds: [46727, 46729, 46731, 46735, 46736, 46740, 49112, 49113, 49114, 70045],
      name: 'Potency Improvement',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.KEEN_EYE_RUNE_STONES,
      alternateIds: [47851, 47852, 47853],
      name: 'Keen Eye: Rune Stones',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.ENCHANTER_HIRELING,
      alternateIds: [46770, 46771, 46772],
      name: 'Enchanter Hireling',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
    {
      id: AbilityId.RUNESTONE_EXTRACTION,
      alternateIds: [46767, 46768, 46769],
      name: 'Runestone Extraction',
      isPassive: true,
      isUltimate: false,
      maxRank: 3,
    },
  ],
};
