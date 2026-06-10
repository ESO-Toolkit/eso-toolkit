/**
 * Shadow Skill Line - Nightblade Class
 */

import { SkillLineData } from '../../types/skill-line-types';

/**
 * The Shadow skill-line is part of the Nightblade toolkit and has a focus on
 * offensive abilities and stealth gameplay. In addition to powerful abilities,
 * you can also select passives that increase your support capabilities even
 * further. The Shadow skill-line is the second out of three Nightblade focused
 * skill-lines.
 */
export const shadow: SkillLineData = {
  id: '11',
  name: 'Shadow',
  class: 'nightblade',
  category: 'class',
  icon: 'ability_nightblade_004',
  skills: [
    // Ultimate Abilities (3 skills: 1 base + 2 morphs)
    {
      id: 25375,
      name: 'Consuming Darkness',
      type: 'ultimate',
      baseAbilityId: 25375,
    },
    {
      id: 36493,
      name: 'Bolstering Darkness',
      type: 'ultimate',
      baseAbilityId: 25375,
    },
    {
      id: 36485,
      name: 'Veil of Blades',
      type: 'ultimate',
      baseAbilityId: 25375,
    },

    // Active Abilities - Shadow Cloak Family
    {
      id: 25255,
      name: 'Shadow Cloak',
      type: 'active',
      baseAbilityId: 25255,
    },
    {
      id: 35414,
      name: 'Dark Cloak',
      type: 'active',
      baseAbilityId: 25255,
    },
    {
      id: 25375,
      name: 'Shadowy Disguise',
      type: 'active',
      baseAbilityId: 25255,
    },

    // Active Abilities - Blur Family
    {
      id: 25091,
      name: 'Blur',
      type: 'active',
      baseAbilityId: 25091,
    },
    {
      id: 35419,
      name: 'Mirage',
      type: 'active',
      baseAbilityId: 25091,
    },
    {
      id: 35414,
      name: 'Phantasmal Escape',
      type: 'active',
      baseAbilityId: 25091,
    },

    // Active Abilities - Path of Darkness Family
    {
      id: 33211,
      name: 'Path of Darkness',
      type: 'active',
      baseAbilityId: 33211,
    },
    {
      id: 36028,
      name: 'Refreshing Path',
      type: 'active',
      baseAbilityId: 33211,
    },
    {
      id: 36049,
      name: 'Twisting Path',
      type: 'active',
      baseAbilityId: 33211,
    },

    // Active Abilities - Aspect of Terror Family
    {
      id: 37470,
      name: 'Aspect of Terror',
      type: 'active',
      baseAbilityId: 37470,
    },
    {
      id: 37475,
      name: 'Manifestation of Terror',
      type: 'active',
      baseAbilityId: 37470,
    },
    {
      id: 37467,
      name: 'Mass Hysteria',
      type: 'active',
      baseAbilityId: 37470,
    },

    // Active Abilities - Summon Shade Family
    {
      id: 33195,
      name: 'Summon Shade',
      type: 'active',
      baseAbilityId: 33195,
    },
    {
      id: 35434,
      name: 'Dark Shade',
      type: 'active',
      baseAbilityId: 33195,
    },
    {
      id: 35441,
      icon: 'ability_nightblade_001_b',
      name: 'Shadow Image',
      type: 'active',
      baseAbilityId: 33195,
    },

    // Passive Abilities (4 skills)
    {
      id: 33195,
      icon: 'ability_nightblade_010',
      alternateIds: [36549, 45103, 69995, 69996, 69997, 69998],
      name: 'Refreshing Shadows',
      type: 'passive',
      baseAbilityId: 33195,
    },
    {
      id: 33211,
      icon: 'ability_nightblade_001',
      alternateIds: [18866, 45071, 88658, 88659, 228663],
      name: 'Shadow Barrier',
      type: 'passive',
      baseAbilityId: 33211,
    },
    {
      id: 33231,
      icon: 'ability_mage_065',
      alternateIds: [36532, 45084, 138925],
      name: 'Dark Vigor',
      type: 'passive',
      baseAbilityId: 33231,
    },
    {
      id: 33237,
      icon: 'ability_mage_065',
      alternateIds: [36552, 45115],
      name: 'Dark Veil',
      type: 'passive',
      baseAbilityId: 33237,
    },
  ],
};
