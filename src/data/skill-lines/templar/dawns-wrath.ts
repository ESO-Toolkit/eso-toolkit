/**
 * Dawn's Wrath Skill Line
 * Class: Templar
 * Source: https://eso-hub.com/en/skills/templar/dawns-wrath
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const dawnsWrath: SkillLineData = {
  id: 'templar-dawns-wrath',
  name: "Dawn's Wrath",
  class: 'Templar',
  category: 'class',
  icon: 'dawns-wrath-icon',
  skills: [
    // Ultimate
    { id: 21752, name: 'Nova', type: 'ultimate', baseAbilityId: 21752 },
    { id: 21755, name: 'Solar Disturbance', type: 'ultimate', baseAbilityId: 21752 },
    { id: 21758, name: 'Solar Prison', type: 'ultimate', baseAbilityId: 21752 },

    // Active Abilities
    { id: 21726, name: 'Sun Fire', type: 'active', baseAbilityId: 21726 },
    { id: 21729, name: 'Reflective Light', type: 'active', baseAbilityId: 21726 },
    { id: 21732, name: "Vampire's Bane", type: 'active', baseAbilityId: 21726 },

    { id: 21761, name: 'Solar Flare', type: 'active', baseAbilityId: 21761 },
    { id: 21765, name: 'Dark Flare', type: 'active', baseAbilityId: 21761 },
    { id: 21763, name: 'Solar Barrage', type: 'active', baseAbilityId: 21761 },

    { id: 21744, name: 'Backlash', type: 'active', baseAbilityId: 21744 },
    { id: 21747, name: 'Power of the Light', type: 'active', baseAbilityId: 21744 },
    { id: 21749, name: 'Purifying Light', type: 'active', baseAbilityId: 21744 },

    { id: 22057, name: 'Eclipse', type: 'active', baseAbilityId: 22057 },
    { id: 22110, name: 'Total Dark', type: 'active', baseAbilityId: 22057 },
    { id: 22057, name: 'Unstable Core', type: 'active', baseAbilityId: 22057 },

    { id: 63046, name: 'Radiant Destruction', type: 'active', baseAbilityId: 63046 },
    { id: 63050, name: 'Radiant Glory', type: 'active', baseAbilityId: 63046 },
    { id: 63052, name: 'Radiant Oppression', type: 'active', baseAbilityId: 63046 },

    // Passive Abilities
    { id: 21775, name: 'Enduring Rays', type: 'passive', baseAbilityId: 21775 },
    { id: 21777, name: 'Prism', type: 'passive', baseAbilityId: 21777 },
    { id: 21779, name: 'Illuminate', type: 'passive', baseAbilityId: 21779 },
    { id: 21781, name: 'Restoring Spirit', type: 'passive', baseAbilityId: 21781 },
  ],
};
