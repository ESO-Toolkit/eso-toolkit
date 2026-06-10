/**
 * Dawn's Wrath Skill Line
 * Class: Templar
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
    {
      id: 21752,
      alternateIds: [
        21753, 21976, 21995, 24045, 24046, 24047, 24048, 24056, 24057, 24058, 24059, 24064, 24065,
        24066, 24067, 27803, 32081, 40428, 41022, 50202, 50205, 56878, 61522, 63358, 63359, 63365,
        63366, 63372, 63373, 63379, 63380, 63386, 63387, 63393, 63394, 63401, 63402, 63409, 63410,
        63417, 63418, 149335, 172823, 179088, 179090, 179092, 179202, 179207, 187582, 192607,
      ],
      name: 'Nova',
      type: 'ultimate',
      baseAbilityId: 21752,
    },
    {
      id: 21755,
      alternateIds: [
        21758, 21759, 22000, 22001, 24310, 24311, 24312, 24313, 24316, 24317, 24318, 24319, 24322,
        24323, 24324, 24325, 52927, 52928, 52929, 52931, 52933,
      ],
      name: 'Solar Disturbance',
      type: 'ultimate',
      baseAbilityId: 21752,
    },
    {
      id: 21758,
      alternateIds: [
        21755, 21756, 21757, 22002, 22003, 24289, 24290, 24291, 24293, 24296, 24297, 24298, 24300,
        24302, 24303, 24304, 24306,
      ],
      name: 'Solar Prison',
      type: 'ultimate',
      baseAbilityId: 21752,
    },

    // Active Abilities
    {
      id: 21726,
      alternateIds: [
        21727, 21728, 24161, 24162, 24169, 24170, 24172, 24173, 27801, 111778, 123074, 135064,
      ],
      name: 'Sun Fire',
      type: 'active',
      baseAbilityId: 21726,
    },
    {
      id: 21729,
      alternateIds: [21732, 21733, 21734, 24185, 24186, 24188, 24189, 24196, 24197, 123075, 135067],
      name: 'Reflective Light',
      type: 'active',
      baseAbilityId: 21726,
    },
    { id: 21732, name: "Vampire's Bane", type: 'active', baseAbilityId: 21726 },

    {
      id: 21761,
      alternateIds: [
        22057, 27802, 52911, 113533, 113534, 149047, 149048, 154577, 154578, 164968, 222475, 222476,
        222477, 222478, 222479, 222480, 222481, 222482, 222483, 222484,
      ],
      name: 'Solar Flare',
      type: 'active',
      baseAbilityId: 21761,
    },
    {
      id: 21765,
      alternateIds: [22110, 52907, 52909],
      name: 'Dark Flare',
      type: 'active',
      baseAbilityId: 21761,
    },
    {
      id: 21763,
      alternateIds: [22095, 100218, 100223, 100224, 100225, 100226, 100227, 100228, 100229],
      name: 'Solar Barrage',
      type: 'active',
      baseAbilityId: 21761,
    },

    {
      id: 21744,
      alternateIds: [
        21761, 22643, 22644, 22645, 26411, 26431, 27213, 27214, 27215, 27217, 27221, 27222, 27223,
        27225, 27228, 27230, 27231, 27233, 27804, 48932, 48933, 60531, 60532, 60533, 60534, 63398,
        89821, 89822, 89823, 89824, 162615, 163760, 164141, 164884, 166058, 166289, 229609, 242105,
        242297,
      ],
      name: 'Backlash',
      type: 'active',
      baseAbilityId: 21744,
    },
    {
      id: 21747,
      alternateIds: [
        21763, 21767, 25797, 25799, 27567, 27568, 27570, 27573, 27574, 27576, 27579, 27582, 27583,
        27585, 27588, 27591, 27592, 27594, 89716, 89828, 89829, 89830, 110700,
      ],
      name: 'Power of the Light',
      type: 'active',
      baseAbilityId: 21744,
    },
    {
      id: 21749,
      alternateIds: [
        21765, 21907, 21908, 25800, 25802, 27535, 27536, 27537, 27539, 27544, 27546, 27550, 27551,
        27552, 27553, 27556, 27559, 27560, 27561, 27562, 27565, 33087, 52912, 52914, 52915, 52916,
        52917, 52918, 52919, 68581, 89684, 89825, 89826, 89827, 114467, 114468, 114469, 114470,
        114471, 114472, 114473,
      ],
      name: 'Purifying Light',
      type: 'active',
      baseAbilityId: 21744,
    },

    {
      id: 22057,
      alternateIds: [
        21776, 27805, 32975, 32978, 33049, 33050, 33530, 33531, 63573, 68657, 68695, 68701, 68708,
        99583, 99584, 100212, 100214, 100216, 127769, 127770, 127771, 127772, 129880,
      ],
      name: 'Eclipse',
      type: 'active',
      baseAbilityId: 22057,
    },
    {
      id: 22110,
      alternateIds: [63096, 63097, 63098, 68728, 68729, 68738, 68742, 68745, 68748, 68753, 68757],
      name: 'Total Dark',
      type: 'active',
      baseAbilityId: 22057,
    },
    {
      id: 22057,
      alternateIds: [
        22004, 22005, 27308, 27310, 27312, 52806, 52808, 52920, 52921, 75396, 75397, 100210, 100211,
        127786, 127787, 127788, 127789, 127790, 127791, 127792, 127793, 129879,
      ],
      name: 'Unstable Core',
      type: 'active',
      baseAbilityId: 22057,
    },

    {
      id: 63046,
      alternateIds: [
        63029, 63952, 63953, 63954, 63955, 63957, 63959, 63960, 63962, 63963, 63964, 91276, 91277,
        91278, 98804, 98805, 99314, 99315, 99316, 99317, 108271, 114478, 114479, 114480,
      ],
      name: 'Radiant Destruction',
      type: 'active',
      baseAbilityId: 63046,
    },
    {
      id: 63050,
      alternateIds: [63044, 63956, 69118, 99324, 99325, 99327, 99331, 211094],
      name: 'Radiant Glory',
      type: 'active',
      baseAbilityId: 63046,
    },
    {
      id: 63052,
      alternateIds: [63046, 63961, 99335, 99364, 99365, 99366, 104549, 104552, 104553, 104554],
      name: 'Radiant Oppression',
      type: 'active',
      baseAbilityId: 63046,
    },

    // Passive Abilities
    {
      id: 21775,
      alternateIds: [31739, 45214],
      icon: 'ability_mage_065',
      name: 'Enduring Rays',
      type: 'passive',
      baseAbilityId: 21775,
    },
    {
      id: 21777,
      alternateIds: [31744, 31746, 45216, 45217],
      icon: 'ability_debuff_stun',
      name: 'Prism',
      type: 'passive',
      baseAbilityId: 21777,
    },
    {
      id: 21779,
      alternateIds: [31743, 45215, 111218, 112977],
      icon: 'ability_mage_065',
      name: 'Illuminate',
      type: 'passive',
      baseAbilityId: 21779,
    },
    {
      id: 21781,
      alternateIds: [31721, 45212, 88446, 88447],
      icon: 'ability_templar_014',
      name: 'Restoring Spirit',
      type: 'passive',
      baseAbilityId: 21781,
    },
  ],
};
