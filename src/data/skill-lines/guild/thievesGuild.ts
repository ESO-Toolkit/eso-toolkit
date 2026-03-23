import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const thievesGuild: SkillLineData = {
  id: 0,
  name: 'Thieves Guild',
  class: 'guild',
  category: 'guild',
  icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
  skills: [
    {
      id: AbilityId.FINDERS_KEEPERS,
      name: 'Finders Keepers',
      description:
        'Thieves Troves are caches that are located all over Tamriel. They can only be opened by members of the Thieves Guild.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SWIFTLY_FORGOTTEN,
      alternateIds: [76454, 76455, 76456, 76457, 77331, 77332, 77333],
      name: 'Swiftly Forgotten',
      description:
        'Bounty is decreased by 115 after 3 minutes. Heat is decreased by 64 after 3 seconds.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.HAGGLING,
      alternateIds: [76458, 76459, 76460, 76461],
      name: 'Haggling',
      description: 'Stolen items sold at a fence are worth 10% more. Does not apply to Laundering.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.CLEMENCY,
      name: 'Clemency',
      description:
        'When a guard accosts you, you may use Clemency once per day. If used, the Guard will not arrest you or take your money and stolen goods. Additionally, Guards will not attempt to accost you for 1 minute after you use Clemency unless you commit other crimes.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.TIMELY_ESCAPE,
      name: 'Timely Escape',
      description:
        'When you have Bounty and are in combat, you have a chance to spot a "Footpad" in a town with a Refuge. Interacting with the Footpad will transport the player safely into the nearest Refuge.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.VEIL_OF_SHADOWS,
      alternateIds: [76453, 77329],
      name: 'Veil of Shadows',
      description:
        'Decreases detection range of Witnesses and Guards by 10%. Witnesses and Guards are thus less likely to notice criminal actions, though this has no impact on the range from which Guards will accost you.',
      icon: 'https://eso-hub.com/storage/icons/passive_guild_32.webp',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
  ],
};
