/**
 * Winter's Embrace - Warden Class Skill Line
 * Source: https://eso-hub.com/en/skills/warden/winters-embrace
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const wintersEmbrace: SkillLineData = {
  id: 'warden-winters-embrace',
  name: "Winter's Embrace",
  class: 'Warden',
  category: 'class',
  icon: 'winters-embrace-icon',
  skills: [
    // Ultimate abilities
    {
      id: 86122,
      alternateIds: [86109, 86247, 86250, 94185, 94187, 94188, 94190, 94191, 94193],
      name: 'Sleet Storm',
      type: 'ultimate',
      baseAbilityId: 86122,
    },
    {
      id: 86126,
      alternateIds: [86113, 87542, 88858, 88860, 94196, 94198, 94199, 94201, 94202, 94204, 132429],
      name: 'Northern Storm',
      type: 'ultimate',
      baseAbilityId: 86122,
    },
    {
      id: 86130,
      alternateIds: [
        50556, 71101, 86117, 88861, 88863, 90943, 94206, 94207, 94211, 94213, 94214, 94218, 94220,
        94221, 94225,
      ],
      name: 'Permafrost',
      type: 'ultimate',
      baseAbilityId: 86122,
    },

    // Active abilities - Frost Cloak
    { id: 86135, name: 'Frost Cloak', type: 'active', baseAbilityId: 86135 },
    { id: 86139, name: 'Expansive Frost Cloak', type: 'active', baseAbilityId: 86135 },
    { id: 86143, name: 'Ice Fortress', type: 'active', baseAbilityId: 86135 },

    // Active abilities - Impaling Shards
    {
      id: 86147,
      alternateIds: [
        86161, 86238, 88783, 94065, 94067, 94068, 94070, 94071, 94073, 96807, 96808, 96809, 96810,
        96811, 96812, 96813, 96817, 96819, 96821, 96838, 96839, 96840, 96841, 96842, 96843, 96844,
        96845, 96846, 96847, 99065, 99066, 99067, 99068, 104829, 104830, 104831, 104832, 104833,
        104834, 104835, 104837, 104838, 104839, 104840, 104841, 104842, 104843, 104844, 104845,
        104847, 104848, 104849, 104850, 104851, 104852, 104853, 104854, 104856, 216849, 228852,
      ],
      name: 'Impaling Shards',
      type: 'active',
      baseAbilityId: 86147,
    },
    {
      id: 86151,
      alternateIds: [
        86165, 87443, 87448, 88791, 91224, 91225, 91227, 91228, 94081, 94082, 94084, 94085, 94086,
        94088, 94089, 94090, 94092,
      ],
      name: 'Gripping Shards',
      type: 'active',
      baseAbilityId: 86147,
    },
    { id: 86155, name: "Winter's Revenge", type: 'active', baseAbilityId: 86147 },

    // Active abilities - Arctic Wind
    {
      id: 86159,
      alternateIds: [86148, 90833, 94034, 94036, 94038, 130400, 176426],
      name: 'Arctic Wind',
      type: 'active',
      baseAbilityId: 86159,
    },
    {
      id: 86165,
      alternateIds: [
        86156, 90834, 94041, 94042, 94044, 94045, 94047, 94048, 105334, 130406, 130408, 130409,
        130410, 184276, 197348, 198845, 226810,
      ],
      name: 'Arctic Blast',
      type: 'active',
      baseAbilityId: 86159,
    },
    {
      id: 86169,
      alternateIds: [86152, 88776, 90835, 94050, 94053, 94056, 130402, 176422],
      name: 'Polar Wind',
      type: 'active',
      baseAbilityId: 86159,
    },

    // Active abilities - Crystallized Shield
    {
      id: 86175,
      alternateIds: [86135, 87224, 87225, 87226, 87227, 92069, 187758, 187759],
      name: 'Crystallized Shield',
      type: 'active',
      baseAbilityId: 86175,
    },
    {
      id: 86179,
      alternateIds: [86139, 88766, 88767, 88768, 88769, 92169, 93175, 94142, 94149, 94156, 175672],
      name: 'Crystallized Slab',
      type: 'active',
      baseAbilityId: 86175,
    },
    {
      id: 86183,
      alternateIds: [86143, 88771, 88773, 88774, 92170, 92171, 94161, 94168, 94175],
      name: 'Shimmering Shield',
      type: 'active',
      baseAbilityId: 86175,
    },

    // Active abilities - Frozen Gate
    {
      id: 86187,
      alternateIds: [86175, 86256, 86258, 86264, 87560, 87597, 89812, 90926, 90977, 100519, 108948],
      name: 'Frozen Gate',
      type: 'active',
      baseAbilityId: 86187,
    },
    {
      id: 86193,
      alternateIds: [86179, 92022, 92025, 92030, 92031, 92032, 92034, 92038, 92039, 100522, 108949],
      name: 'Frozen Device',
      type: 'active',
      baseAbilityId: 86187,
    },
    {
      id: 86197,
      alternateIds: [
        86183, 92051, 92052, 92053, 92055, 92058, 92060, 92061, 92062, 100526, 103076, 108950,
      ],
      name: 'Frozen Retreat',
      type: 'active',
      baseAbilityId: 86187,
    },

    // Passive abilities
    {
      id: 85804,
      alternateIds: [86191, 86192, 134679, 134680],
      icon: 'ability_warden_012_a',
      name: 'Glacial Presence',
      type: 'passive',
      baseAbilityId: 85804,
    },
    {
      id: 85805,
      alternateIds: [86189, 86190],
      icon: 'passive_warden_001',
      name: 'Frozen Armor',
      type: 'passive',
      baseAbilityId: 85805,
    },
    {
      id: 85806,
      alternateIds: [86193, 86194],
      icon: 'passive_warden_003',
      name: 'Icy Aura',
      type: 'passive',
      baseAbilityId: 85806,
    },
    {
      id: 85807,
      alternateIds: [86195, 86196, 228521, 228522, 228523, 228524, 228525, 228526],
      icon: 'ability_warden_012_b',
      name: 'Piercing Cold',
      type: 'passive',
      baseAbilityId: 85807,
    },
  ],
};
