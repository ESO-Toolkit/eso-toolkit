/**
 * Restoring Light Skill Line
 * Class: Templar
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const restoringLight: SkillLineData = {
  id: 'templar-restoring-light',
  name: 'Restoring Light',
  class: 'Templar',
  category: 'class',
  icon: 'restoring-light-icon',
  skills: [
    // Ultimate
    {
      id: 22223,
      alternateIds: [
        22225, 27390, 27394, 27398, 27809, 44328, 44329, 44330, 50998, 66002, 66003, 66004, 107680,
        107681, 107682, 108700, 170546, 196782, 211124, 211126,
      ],
      name: 'Rite of Passage',
      type: 'ultimate',
      baseAbilityId: 22223,
    },
    {
      id: 22226,
      alternateIds: [22228, 26383, 27421, 27422, 27425, 27426, 27429, 27430],
      name: 'Practiced Incantation',
      type: 'ultimate',
      baseAbilityId: 22223,
    },
    {
      id: 22229,
      alternateIds: [22231, 26381, 27403, 27409, 27415, 54118, 54119, 54121],
      name: 'Remembrance',
      type: 'ultimate',
      baseAbilityId: 22223,
    },

    // Active Abilities
    {
      id: 22234,
      alternateIds: [22250, 27811],
      name: 'Rushed Ceremony',
      type: 'active',
      baseAbilityId: 22234,
    },
    {
      id: 22240,
      alternateIds: [22256, 44391, 44392, 44393, 44394],
      name: 'Breath of Life',
      type: 'active',
      baseAbilityId: 22234,
    },
    {
      id: 22237,
      alternateIds: [22253, 35632, 35641, 35642, 35643, 90637, 90638],
      name: 'Honor the Dead',
      type: 'active',
      baseAbilityId: 22234,
    },

    {
      id: 22253,
      alternateIds: [
        22304, 22307, 26287, 27245, 27248, 27250, 27254, 27256, 27260, 27335, 27341, 27343, 27806,
      ],
      name: 'Healing Ritual',
      type: 'active',
      baseAbilityId: 22253,
    },
    {
      id: 22256,
      alternateIds: [22314, 22318, 27371, 27375, 27379],
      name: 'Hasty Prayer',
      type: 'active',
      baseAbilityId: 22253,
    },
    {
      id: 22259,
      alternateIds: [22327, 22331, 27348, 27351, 27354, 88456, 88457, 88458, 88459],
      name: 'Ritual of Rebirth',
      type: 'active',
      baseAbilityId: 22253,
    },

    {
      id: 22262,
      alternateIds: [26209, 27807],
      name: 'Restoring Aura',
      type: 'active',
      baseAbilityId: 22262,
    },
    { id: 22265, name: 'Radiant Aura', type: 'active', baseAbilityId: 22262 },
    {
      id: 22268,
      alternateIds: [26821, 26823, 26824, 34366, 34369, 34370, 34371, 112934, 112935, 124700],
      name: 'Repentance',
      type: 'active',
      baseAbilityId: 22262,
    },

    {
      id: 22244,
      alternateIds: [
        22265, 22266, 26286, 26290, 27244, 27251, 27257, 27808, 80540, 80541, 80543, 80546,
      ],
      name: 'Cleansing Ritual',
      type: 'active',
      baseAbilityId: 22244,
    },
    {
      id: 22247,
      alternateIds: [
        22262, 22263, 26303, 26304, 26306, 27282, 27283, 27286, 27289, 27290, 27293, 27296, 27297,
        27300, 80553, 80555, 80556, 80557, 179525, 179534,
      ],
      name: 'Extended Ritual',
      type: 'active',
      baseAbilityId: 22244,
    },
    {
      id: 22250,
      alternateIds: [
        22259, 22260, 26298, 26299, 26301, 27262, 27267, 27270, 27274, 27276, 27280, 80172, 80174,
        80175, 80176, 80547, 80550, 80551, 80552, 91279, 91282, 91283, 91284, 91286, 143432,
      ],
      name: 'Ritual of Retribution',
      type: 'active',
      baseAbilityId: 22244,
    },

    {
      id: 22304,
      alternateIds: [22234, 27810, 33516, 46236, 46270, 46272, 101649, 112145],
      name: 'Rune Focus',
      type: 'active',
      baseAbilityId: 22304,
    },
    {
      id: 22306,
      alternateIds: [22240, 33524, 37009, 37023, 37024, 37025, 112166],
      name: 'Channeled Focus',
      type: 'active',
      baseAbilityId: 22304,
    },
    {
      id: 22307,
      alternateIds: [22237, 33525, 33526, 33527, 33528, 112167, 114842],
      name: 'Restoring Focus',
      type: 'active',
      baseAbilityId: 22304,
    },

    // Passive Abilities
    {
      id: 22314,
      alternateIds: [31751, 45206, 214666, 218899],
      icon: 'ability_templar_lingering_ritual',
      name: 'Mending',
      type: 'passive',
      baseAbilityId: 22314,
    },
    {
      id: 22315,
      alternateIds: [31757, 31759, 45207, 77082, 80195, 80230, 80261],
      icon: 'ability_templar_014',
      name: 'Sacred Ground',
      type: 'passive',
      baseAbilityId: 22315,
    },
    {
      id: 22316,
      alternateIds: [31760, 31762, 45208, 45210, 144134, 144136, 144137, 243838, 243841],
      icon: 'ability_templar_012',
      name: 'Light Weaver',
      type: 'passive',
      baseAbilityId: 22316,
    },
    {
      id: 22318,
      alternateIds: [31747, 31748, 31749, 31750, 45202, 45203, 45204, 45205],
      icon: 'ability_templar_lingering_ritual',
      name: 'Master Ritualist',
      type: 'passive',
      baseAbilityId: 22318,
    },
  ],
};
