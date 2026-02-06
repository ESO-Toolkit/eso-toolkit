import type { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const darkBrotherhood: SkillLineData = {
  id: 0,
  name: 'Dark Brotherhood',
  class: 'guild',
  category: 'guild',
  icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
  skills: [
    {
      id: AbilityId.BLADE_OF_WOE,
      name: 'Blade of Woe',
      description:
        'Call the weapon of the Dark Brotherhood to your hand and deliver a killing blow to an unsuspecting target. Experience from this target is reduced by 75%. This ability does not work on players or difficult targets.',
      type: 'passive',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      maxRank: 1,
    },
    {
      id: AbilityId.SCALES_OF_PITILESS_JUSTICE,
      name: 'Scales of Pitiless Justice',
      description:
        'Bounty and Heat resulting from a witnessed Murder or Assault is reduced by 50%.',
      type: 'passive',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      maxRank: 1,
    },
    {
      id: AbilityId.PADOMAIC_SPRINT,
      name: 'Padomaic Sprint',
      description:
        'Grants Major Expedition, increasing your Movement Speed by 30% for 12 seconds after killing an enemy with Blade of Woe.',
      type: 'passive',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      maxRank: 1,
    },
    {
      id: AbilityId.SHADOWY_SUPPLIER,
      name: 'Shadowy Supplier',
      type: 'passive',
      maxRank: 4,
    },
    {
      id: AbilityId.SHADOW_RIDER,
      name: 'Shadow Rider',
      description: 'Aggression radius from hostile monsters is decreased by 50% while mounted.',
      type: 'passive',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      maxRank: 1,
    },
    {
      id: AbilityId.SPECTRAL_ASSASSIN,
      name: 'Spectral Assassin',
      description:
        '15% chance to shroud you when using the Blade of Woe, shielding you from being witnessed and receiving a Bounty.',
      type: 'passive',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      maxRank: 1,
    },
  ],
};
