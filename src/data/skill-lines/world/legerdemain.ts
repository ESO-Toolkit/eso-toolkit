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
  icon: 'ability_legerdemain_lockpick',
  sourceUrl: 'https://eso-hub.com/en/skills/world/legerdemain',
  skills: [
    // Passive Skill 1: Improved Hiding - Stealth efficiency
    {
      id: AbilityId.IMPROVED_HIDING,
      alternateIds: [63799, 63800, 63801, 63802],
      name: 'Improved Hiding',
      icon: 'ability_legerdemain_improvedsneak',
      description: 'Reduces the cost of Sneak by 10%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 2: Light Fingers - Pickpocketing success
    {
      id: AbilityId.LIGHT_FINGERS,
      alternateIds: [63803, 63804, 63805, 63806],
      name: 'Light Fingers',
      icon: 'ability_legerdemain_lightfingers',
      description: 'Increases your chance of successfully Pickpocketing by 10%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 3: Trafficker - Fence interaction limit
    {
      id: AbilityId.TRAFFICKER,
      alternateIds: [63807, 63808, 63809, 63810],
      name: 'Trafficker',
      icon: 'ability_legerdemain_salesman',
      description: 'Increases the number of fence interactions you can use each day by 120%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 4: Locksmith - Lockpicking success
    {
      id: AbilityId.LOCKSMITH,
      alternateIds: [63811, 63812, 63813, 63814],
      name: 'Locksmith',
      icon: 'ability_legerdemain_lockpick',
      description: 'Improves your chances of forcing locks by 10%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },

    // Passive Skill 5: Kickback - Bounty payment reduction
    {
      id: AbilityId.KICKBACK,
      alternateIds: [63815, 63816, 63817, 63818],
      name: 'Kickback',
      icon: 'ability_legerdemain_sly',
      description: 'Reduces bounties you willingly pay to guards and fences by 10%.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
