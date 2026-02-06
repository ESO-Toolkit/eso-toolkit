import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

/**
 * Legerdemain Skill Line Data
 * Justice System thievery and criminal activity skill line
 * All skills are passive abilities that improve efficiency in:
 * - Stealth (Sneak cost reduction)
 * - Pickpocketing (success rate improvement)
 * - Fencing (daily limit increases)
 * - Lockpicking (force lock success improvement)
 * - Bounty management (bounty payment reduction)
 */
export const legerdemain: SkillLineData = {
  id: 0,
  name: 'Legerdemain',
  class: 'world',
  category: 'world',
  icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_001.png',
  skills: [
    // Passive Skill 1: Improved Hiding - Stealth efficiency
    {
      id: AbilityId.IMPROVED_HIDING,
      name: 'Improved Hiding',
      icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_001.png',
      description: 'Reduces the cost of Sneak by 40%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 2: Light Fingers - Pickpocketing success
    {
      id: AbilityId.LIGHT_FINGERS,
      name: 'Light Fingers',
      icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_002.png',
      description: 'Increases your chances of successfully Pickpocketing by 50%',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 3: Trafficker - Fence interaction limit
    {
      id: AbilityId.TRAFFICKER,
      name: 'Trafficker',
      icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_003.png',
      description: 'Increases the number of fence interactions you can use each day by 180%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 4: Locksmith - Lockpicking success
    {
      id: AbilityId.LOCKSMITH,
      name: 'Locksmith',
      icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_004.png',
      description: 'Improves your chances of forcing locks by 70%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 5: Kickback - Bounty payment reduction
    {
      id: AbilityId.KICKBACK,
      name: 'Kickback',
      icon: 'https://eso-hub.com/storage/icons/ability_world_legerdemain_005.png',
      description: 'Reduces bounties you willingly pay to guards and fences by 40%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
