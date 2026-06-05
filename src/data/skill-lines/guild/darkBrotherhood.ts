import type { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const darkBrotherhood: SkillLineData = {
  id: 0,
  name: 'Dark Brotherhood',
  class: 'guild',
  category: 'guild',
  icon: 'ability_darkbrotherhood_passive_002',
  skills: [
    {
      id: AbilityId.BLADE_OF_WOE,
      alternateIds: [
        76325, 77101, 77374, 78219, 80477, 80603, 146297, 146299, 146300, 146301, 169629,
      ],
      name: 'Blade of Woe',
      description:
        'Call the weapon of the Dark Brotherhood to your hand and deliver a killing blow to an unsuspecting target. Experience from this target is reduced by 75%.\n\nThis ability does not work on players or difficult targets.',
      type: 'passive',
      icon: 'achievement_darkbrotherhood_003',
      maxRank: 1,
    },
    {
      id: AbilityId.SCALES_OF_PITILESS_JUSTICE,
      alternateIds: [77392, 77394, 77395, 79275, 79865, 79866],
      name: 'Scales of Pitiless Justice',
      description:
        'Bounty and Heat resulting from a witnessed Murder or Assault is reduced by 50%.',
      type: 'passive',
      icon: 'ability_darkbrotherhood_passive_002',
      maxRank: 1,
    },
    {
      id: AbilityId.PADOMAIC_SPRINT,
      alternateIds: [77397, 77398, 77399, 79868, 80393],
      name: 'Padomaic Sprint',
      description:
        'Grants Major Expedition, increasing your Movement Speed by 30% for 12 seconds after killing an enemy with Blade of Woe.',
      type: 'passive',
      icon: 'ability_darkbrotherhood_passive_004',
      maxRank: 1,
    },
    {
      id: AbilityId.SHADOWY_SUPPLIER,
      icon: 'ability_darkbrotherhood_passive_003',
      name: 'Shadowy Supplier',
      type: 'passive',
      maxRank: 4,
    },
    {
      id: AbilityId.SHADOW_RIDER,
      icon: 'ability_darkbrotherhood_passive_005',
      name: 'Shadow Rider',
      description:
        "A contact from the Brotherhood provides beneficial items once per day. This contact is located in Outlaw Refuges, the Gold Coast Dark Brotherhood Sanctuary, and the Hew's Bane Thieves Den.",
      type: 'passive',
      maxRank: 1,
    },
    {
      id: AbilityId.SPECTRAL_ASSASSIN,
      alternateIds: [77401, 80636, 151926],
      name: 'Spectral Assassin',
      description:
        '15% chance to shroud you when using the Blade of Woe, shielding you from being witnessed and receiving a Bounty.',
      type: 'passive',
      icon: 'ability_darkbrotherhood_passive_006',
      maxRank: 1,
    },
  ],
};
