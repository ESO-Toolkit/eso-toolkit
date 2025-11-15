/**
 * Green Balance - Warden Class Skill Line
 * Source: https://eso-hub.com/en/skills/warden/green-balance
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const greenBalance: SkillLineData = {
  id: 'warden-green-balance',
  name: 'Green Balance',
  class: 'Warden',
  category: 'class',
  icon: 'green-balance-icon',
  skills: [
    // Ultimate abilities
    { id: 85532, name: 'Secluded Grove', type: 'ultimate', baseAbilityId: 85532 },
    { id: 85536, name: 'Enchanted Forest', type: 'ultimate', baseAbilityId: 85532 },
    { id: 85540, name: 'Healing Thicket', type: 'ultimate', baseAbilityId: 85532 },

    // Active abilities - Fungal Growth
    { id: 85549, name: 'Fungal Growth', type: 'active', baseAbilityId: 85549 },
    { id: 85553, name: 'Enchanted Growth', type: 'active', baseAbilityId: 85549 },
    { id: 85557, name: 'Soothing Spores', type: 'active', baseAbilityId: 85549 },

    // Active abilities - Healing Seed
    { id: 85564, name: 'Healing Seed', type: 'active', baseAbilityId: 85564 },
    { id: 85570, name: 'Budding Seeds', type: 'active', baseAbilityId: 85564 },
    { id: 85574, name: 'Corrupting Pollen', type: 'active', baseAbilityId: 85564 },

    // Active abilities - Living Vines
    { id: 85578, name: 'Living Vines', type: 'active', baseAbilityId: 85578 },
    { id: 85582, name: 'Leeching Vines', type: 'active', baseAbilityId: 85578 },
    { id: 85586, name: 'Living Trellis', type: 'active', baseAbilityId: 85578 },

    // Active abilities - Lotus Flower
    { id: 85600, name: 'Lotus Flower', type: 'active', baseAbilityId: 85600 },
    { id: 85606, name: 'Green Lotus', type: 'active', baseAbilityId: 85600 },
    { id: 85610, name: 'Lotus Blossom', type: 'active', baseAbilityId: 85600 },

    // Active abilities - Nature's Grasp
    { id: 85619, name: "Nature's Grasp", type: 'active', baseAbilityId: 85619 },
    { id: 85623, name: 'Bursting Vines', type: 'active', baseAbilityId: 85619 },
    { id: 85627, name: "Nature's Embrace", type: 'active', baseAbilityId: 85619 },

    // Passive abilities
    { id: 85796, name: 'Accelerated Growth', type: 'passive', baseAbilityId: 85796 },
    { id: 85797, name: "Nature's Gift", type: 'passive', baseAbilityId: 85797 },
    { id: 85798, name: 'Emerald Moss', type: 'passive', baseAbilityId: 85798 },
    { id: 85799, name: 'Maturation', type: 'passive', baseAbilityId: 85799 },
  ],
};
