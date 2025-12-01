/**
 * Siphoning Skill Line - Nightblade Class
 * Source: https://eso-hub.com/en/skills/nightblade/siphoning
 */

import { SkillLineData } from '../../types/skill-line-types';

/**
 * The Siphoning skill-line is part of the Nightblade toolkit and has a focus on
 * offensive drain abilities and sustain. In addition to powerful abilities, you can
 * also select passives that increase your support capabilities and ultimate
 * regeneration even further. The Siphoning skill-line is the third out of three
 * Nightblade focused skill-lines.
 */
export const siphoning: SkillLineData = {
  id: '12',
  name: 'Siphoning',
  class: 'nightblade',
  category: 'class',
  icon: 'https://assets.eso-hub.com/assets/skill-lines/siphoning.png',
  skills: [
    // Ultimate Abilities
    { id: 25091, name: 'Soul Shred', type: 'ultimate', baseAbilityId: 25091 },
    { id: 35508, name: 'Soul Siphon', type: 'ultimate', baseAbilityId: 25091 },
    { id: 35460, name: 'Soul Tether', type: 'ultimate', baseAbilityId: 25091 },

    // Active Abilities
    { id: 33291, name: 'Strife', type: 'active', baseAbilityId: 33291 },
    { id: 34835, name: 'Funnel Health', type: 'active', baseAbilityId: 33291 },
    { id: 34838, name: 'Swallow Soul', type: 'active', baseAbilityId: 33291 },

    { id: 37475, name: 'Malevolent Offering', type: 'active', baseAbilityId: 37475 },
    { id: 40127, name: 'Healthy Offering', type: 'active', baseAbilityId: 37475 },
    { id: 40126, name: 'Shrewd Offering', type: 'active', baseAbilityId: 37475 },

    { id: 33195, name: 'Cripple', type: 'active', baseAbilityId: 33195 },
    { id: 36943, name: 'Crippling Grasp', type: 'active', baseAbilityId: 33195 },
    { id: 36957, name: 'Debilitate', type: 'active', baseAbilityId: 33195 },

    { id: 33211, name: 'Siphoning Strikes', type: 'active', baseAbilityId: 33211 },
    { id: 36908, name: 'Leeching Strikes', type: 'active', baseAbilityId: 33211 },
    { id: 36901, name: 'Siphoning Attacks', type: 'active', baseAbilityId: 33211 },

    { id: 33316, name: 'Drain Power', type: 'active', baseAbilityId: 33316 },
    { id: 36901, name: 'Power Extraction', type: 'active', baseAbilityId: 33316 },
    { id: 36891, name: 'Sap Essence', type: 'active', baseAbilityId: 33316 },

    // Passive Abilities
    { id: 33316, name: 'Catalyst', type: 'passive', baseAbilityId: 33316 },
    { id: 33319, name: 'Magicka Flood', type: 'passive', baseAbilityId: 33319 },
    { id: 33326, name: 'Soul Siphoner', type: 'passive', baseAbilityId: 33326 },
    { id: 33398, name: 'Transfer', type: 'passive', baseAbilityId: 33398 },
  ],
};
