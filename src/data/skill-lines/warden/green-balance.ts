/**
 * Green Balance - Warden Class Skill Line
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
    {
      id: 85532,
      alternateIds: [85533, 85534],
      name: 'Secluded Grove',
      type: 'ultimate',
      baseAbilityId: 85532,
    },
    {
      id: 85536,
      alternateIds: [85804, 86357, 88747, 88748, 93985, 93988, 93991],
      name: 'Enchanted Forest',
      type: 'ultimate',
      baseAbilityId: 85532,
    },
    {
      id: 85540,
      alternateIds: [85807, 88750, 91819, 93997, 93999, 94001],
      name: 'Healing Thicket',
      type: 'ultimate',
      baseAbilityId: 85532,
    },

    // Active abilities - Fungal Growth
    {
      id: 85549,
      alternateIds: [
        85536, 175974, 175975, 176826, 176827, 176828, 176903, 176904, 176907, 176908, 176909,
      ],
      name: 'Fungal Growth',
      type: 'active',
      baseAbilityId: 85549,
    },
    { id: 85553, name: 'Enchanted Growth', type: 'active', baseAbilityId: 85549 },
    {
      id: 85557,
      alternateIds: [85863, 87938],
      name: 'Soothing Spores',
      type: 'active',
      baseAbilityId: 85549,
    },

    // Active abilities - Healing Seed
    {
      id: 85564,
      alternateIds: [85578, 85582, 85585, 179531],
      name: 'Healing Seed',
      type: 'active',
      baseAbilityId: 85564,
    },
    {
      id: 85570,
      alternateIds: [85840, 85841, 85842, 85922, 85925, 92214, 92215, 93536, 96497, 129434],
      name: 'Budding Seeds',
      type: 'active',
      baseAbilityId: 85564,
    },
    {
      id: 85574,
      alternateIds: [85845, 85846, 85847, 93859, 93865, 93871],
      name: 'Corrupting Pollen',
      type: 'active',
      baseAbilityId: 85564,
    },

    // Active abilities - Living Vines
    {
      id: 85578,
      alternateIds: [85552, 85559, 186600, 187512],
      name: 'Living Vines',
      type: 'active',
      baseAbilityId: 85578,
    },
    {
      id: 85582,
      alternateIds: [85850, 88712, 93887, 93891, 93895],
      name: 'Leeching Vines',
      type: 'active',
      baseAbilityId: 85578,
    },
    {
      id: 85586,
      alternateIds: [85851, 88721, 88723],
      name: 'Living Trellis',
      type: 'active',
      baseAbilityId: 85578,
    },

    // Active abilities - Lotus Flower
    {
      id: 85600,
      alternateIds: [
        85539, 85550, 94558, 94559, 94562, 94563, 94564, 94565, 94566, 94567, 94568, 94569, 94570,
        96395, 96396, 96398, 96399, 96400, 96401,
      ],
      name: 'Lotus Flower',
      type: 'active',
      baseAbilityId: 85600,
    },
    {
      id: 85606,
      alternateIds: [
        85854, 87058, 94571, 94572, 94576, 94579, 94589, 96387, 96388, 96389, 96390, 96391, 96392,
      ],
      name: 'Green Lotus',
      type: 'active',
      baseAbilityId: 85600,
    },
    {
      id: 85610,
      alternateIds: [85855, 96404, 96405, 96406, 96407, 96408, 96409],
      name: 'Lotus Blossom',
      type: 'active',
      baseAbilityId: 85600,
    },

    // Active abilities - Nature's Grasp
    { id: 85619, name: "Nature's Grasp", type: 'active', baseAbilityId: 85619 },
    {
      id: 85623,
      alternateIds: [85859, 85860, 88739, 93949, 93950, 93951, 93952, 93953, 93954],
      name: 'Bursting Vines',
      type: 'active',
      baseAbilityId: 85619,
    },
    { id: 85627, name: "Nature's Embrace", type: 'active', baseAbilityId: 85619 },

    // Passive abilities
    {
      id: 85796,
      alternateIds: [85882, 85883],
      icon: 'ability_mage_065',
      name: 'Accelerated Growth',
      type: 'passive',
      baseAbilityId: 85796,
    },
    {
      id: 85797,
      icon: 'ability_mage_069',
      name: "Nature's Gift",
      type: 'passive',
      baseAbilityId: 85797,
    },
    {
      id: 85798,
      alternateIds: [85876, 85877],
      icon: 'ability_mage_065',
      name: 'Emerald Moss',
      type: 'passive',
      baseAbilityId: 85798,
    },
    {
      id: 85799,
      alternateIds: [85880, 85881],
      icon: 'ability_mage_065',
      name: 'Maturation',
      type: 'passive',
      baseAbilityId: 85799,
    },
  ],
};
