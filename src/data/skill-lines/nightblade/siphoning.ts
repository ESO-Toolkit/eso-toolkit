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
  icon: 'ability_nightblade_018',
  skills: [
    // Ultimate Abilities
    {
      id: 25091,
      alternateIds: [
        25093, 25168, 25169, 25863, 36157, 36158, 36159, 36163, 36164, 36165, 36168, 36169, 36170,
      ],
      name: 'Soul Shred',
      type: 'ultimate',
      baseAbilityId: 25091,
    },
    {
      id: 35508,
      alternateIds: [
        35511, 35613, 35614, 35615, 36173, 36175, 36177, 36180, 36182, 36184, 36187, 36189, 36191,
        106133, 106134, 241548,
      ],
      name: 'Soul Siphon',
      type: 'ultimate',
      baseAbilityId: 25091,
    },
    {
      id: 35460,
      alternateIds: [
        35461, 35462, 35463, 35464, 35465, 35466, 36178, 36185, 36192, 36195, 36197, 36198, 36199,
        36202, 36204, 36205, 36206, 36208, 36209, 36211, 36212, 36213, 36606, 36610, 36611, 36612,
        44345, 44346, 44347, 44349, 44350, 44352, 75094, 75281, 75282, 75283, 75284, 75285, 75286,
        75287, 123188, 129384, 137661, 164610, 164611, 164612, 174681, 174682, 174683, 174684,
        174685, 174686, 174687, 174688,
      ],
      name: 'Soul Tether',
      type: 'ultimate',
      baseAbilityId: 25091,
    },

    // Active Abilities
    {
      id: 33291,
      alternateIds: [33292, 35928, 35930, 35932, 55477, 55478, 60400, 60401, 115037],
      name: 'Strife',
      type: 'active',
      baseAbilityId: 33291,
    },
    {
      id: 34835,
      alternateIds: [
        34838, 34840, 34841, 35469, 35934, 35935, 35936, 35938, 35939, 35940, 35942, 35943, 35944,
        46181, 46182, 46183, 46184, 91206, 91207, 91208, 91209, 91210,
      ],
      name: 'Funnel Health',
      type: 'active',
      baseAbilityId: 33291,
    },
    {
      id: 34838,
      alternateIds: [34835, 34836, 35946, 35948, 35950],
      name: 'Swallow Soul',
      type: 'active',
      baseAbilityId: 33291,
    },

    {
      id: 37475,
      alternateIds: [33308, 100271, 100547, 100549, 100550, 108925, 108926],
      name: 'Malevolent Offering',
      type: 'active',
      baseAbilityId: 37475,
    },
    {
      id: 40127,
      alternateIds: [34727, 100310, 108932, 108933],
      name: 'Healthy Offering',
      type: 'active',
      baseAbilityId: 37475,
    },
    {
      id: 40126,
      alternateIds: [34721, 100317, 108927, 108929],
      name: 'Shrewd Offering',
      type: 'active',
      baseAbilityId: 37475,
    },

    {
      id: 33195,
      alternateIds: [
        33326, 33327, 33329, 33333, 33339, 37858, 37860, 37863, 37865, 37867, 37870, 55486, 55487,
        55488, 55490, 55493, 172824, 179209,
      ],
      name: 'Cripple',
      type: 'active',
      baseAbilityId: 33195,
    },
    {
      id: 36943,
      alternateIds: [
        36957, 36958, 36960, 36961, 36962, 36963, 36964, 36965, 37896, 37898, 37899, 37900, 37901,
        37902, 37903, 37905, 37907, 37908, 37909, 37910, 37911, 37912, 37914, 37916, 37917, 37918,
        37919, 37920, 37921, 55485, 55491, 55492, 173405, 173406, 179210, 179212,
      ],
      name: 'Crippling Grasp',
      type: 'active',
      baseAbilityId: 33195,
    },
    {
      id: 36957,
      alternateIds: [
        36943, 36945, 36947, 36950, 36955, 37862, 37869, 37872, 37874, 37877, 37878, 37880, 37882,
        37885, 37886, 37888, 37890, 37893, 37894, 51497, 51498, 51499, 62196,
      ],
      name: 'Debilitate',
      type: 'active',
      baseAbilityId: 33195,
    },

    {
      id: 33211,
      alternateIds: [
        33319, 33321, 37965, 37976, 37987, 53462, 53464, 96713, 96714, 96715, 96718, 96719, 96720,
        96721, 96722, 96723, 96724, 96725, 96726, 114957, 114958, 114970, 116521, 116522, 129717,
        129718,
      ],
      name: 'Siphoning Strikes',
      type: 'active',
      baseAbilityId: 33211,
    },
    {
      id: 36908,
      alternateIds: [
        36911, 36912, 37995, 37997, 38008, 38010, 38021, 38023, 53469, 95895, 95904, 95905, 95906,
        96689, 96691, 96692, 96696, 96702, 96703, 96704, 96705, 96706, 96707, 96708, 96709, 96710,
        114963, 114964, 114965, 215669, 215671, 215672,
      ],
      name: 'Leeching Strikes',
      type: 'active',
      baseAbilityId: 33211,
    },
    {
      id: 36901,
      alternateIds: [
        36935, 36937, 36938, 38031, 38036, 38042, 38047, 38053, 38058, 95908, 95909, 95910, 95911,
        114968, 114969, 215493, 215494, 215651, 215652,
      ],
      name: 'Siphoning Attacks',
      type: 'active',
      baseAbilityId: 33211,
    },

    {
      id: 33316,
      alternateIds: [33318, 37923, 37926, 37929],
      name: 'Drain Power',
      type: 'active',
      baseAbilityId: 33316,
    },
    {
      id: 36901,
      alternateIds: [36902, 37932, 37935, 37938, 55494, 55495, 55496],
      name: 'Power Extraction',
      type: 'active',
      baseAbilityId: 33316,
    },
    {
      id: 36891,
      alternateIds: [36898, 36899, 45655, 45656, 45657, 45658],
      name: 'Sap Essence',
      type: 'active',
      baseAbilityId: 33316,
    },

    // Passive Abilities
    {
      id: 33316,
      alternateIds: [36560, 45135, 63705, 63707],
      icon: 'ability_nightblade_013',
      name: 'Catalyst',
      type: 'passive',
      baseAbilityId: 33316,
    },
    {
      id: 33319,
      alternateIds: [36595, 45150, 243766, 243767],
      icon: 'ability_nightblade_003',
      name: 'Magicka Flood',
      type: 'passive',
      baseAbilityId: 33319,
    },
    {
      id: 33326,
      alternateIds: [36603, 45155],
      icon: 'ability_nightblade_006',
      name: 'Soul Siphoner',
      type: 'passive',
      baseAbilityId: 33326,
    },
    {
      id: 33398,
      alternateIds: [36587, 36589, 45145, 45146],
      icon: 'ability_nightblade_007',
      name: 'Transfer',
      type: 'passive',
      baseAbilityId: 33398,
    },
  ],
};
