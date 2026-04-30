/**
 * Animal Companions - Warden Class Skill Line
 * Source: https://eso-hub.com/en/skills/warden/animal-companions
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const animalCompanions: SkillLineData = {
  id: 'warden-animal-companions',
  name: 'Animal Companions',
  class: 'Warden',
  category: 'class',
  icon: 'animal-companions-icon',
  skills: [
    // Ultimate abilities
    {
      id: 85982,
      alternateIds: [
        86074, 88657, 89367, 94368, 94372, 94376, 131306, 208392, 208393, 208394, 208395, 208396,
        208397, 208398, 208399,
      ],
      name: 'Feral Guardian',
      type: 'ultimate',
      baseAbilityId: 85982,
    },
    {
      id: 85986,
      alternateIds: [
        89166, 94384, 94389, 94394, 109982, 109983, 109990, 110002, 110006, 110384, 110401, 131307,
      ],
      name: 'Eternal Guardian',
      type: 'ultimate',
      baseAbilityId: 85982,
    },
    {
      id: 85990,
      alternateIds: [89207, 94400, 94404, 94408, 131308],
      name: 'Wild Guardian',
      type: 'ultimate',
      baseAbilityId: 85982,
    },

    // Active abilities - Dive
    {
      id: 86019,
      alternateIds: [
        5441, 74837, 84359, 85395, 85398, 85995, 88371, 88393, 90319, 90320, 92085, 92129, 95035,
        182701, 182703, 196867, 196868, 203104, 203105, 203106, 203107, 203108, 203109, 205242,
        208412, 208413, 215278, 215283,
      ],
      name: 'Dive',
      type: 'active',
      baseAbilityId: 86019,
    },
    {
      id: 86023,
      alternateIds: [85999, 130140, 131441],
      name: 'Cutting Dive',
      type: 'active',
      baseAbilityId: 86019,
    },
    {
      id: 86027,
      alternateIds: [86003, 87663, 178330],
      name: 'Screaming Cliff Racer',
      type: 'active',
      baseAbilityId: 86019,
    },

    // Active abilities - Scorch
    {
      id: 86009,
      alternateIds: [
        65584, 65587, 65589, 65591, 65593, 65595, 93418, 93422, 93425, 93595, 94409, 94410, 94411,
        94412, 94415, 94419, 134978, 150314, 178020, 178022, 181330, 201503, 202666, 203152, 210143,
        214715, 214728, 214736, 214747, 218884, 218893, 234639, 234640, 236704,
      ],
      name: 'Scorch',
      type: 'active',
      baseAbilityId: 86009,
    },
    {
      id: 86015,
      alternateIds: [
        91245, 91246, 91248, 91250, 93781, 93790, 94421, 94422, 94423, 94424, 94429, 94430, 94434,
        94435, 178028, 178029, 181331,
      ],
      name: 'Deep Fissure',
      type: 'active',
      baseAbilityId: 86009,
    },
    {
      id: 86017,
      alternateIds: [
        86014, 86019, 89053, 89056, 93794, 94440, 94441, 94442, 94445, 94451, 94457, 146915, 146916,
        146917, 146919, 146920, 178016,
      ],
      name: 'Subterranean Assault',
      type: 'active',
      baseAbilityId: 86009,
    },

    // Active abilities - Swarm
    {
      id: 86031,
      alternateIds: [
        73172, 73173, 73174, 73175, 73176, 73193, 78339, 78350, 78351, 78352, 78353, 78354, 86023,
        88478, 93091, 95036, 95038, 95043, 95045, 95046, 95047, 101703, 101726, 101727, 101728,
        149686, 215266,
      ],
      name: 'Swarm',
      type: 'active',
      baseAbilityId: 86031,
    },
    {
      id: 86037,
      alternateIds: [86027, 87687, 91416, 91501, 101904, 101910, 101932, 101933],
      name: 'Fetcher Infection',
      type: 'active',
      baseAbilityId: 86031,
    },
    {
      id: 86041,
      alternateIds: [
        86031, 89287, 89289, 93641, 93642, 93643, 93644, 93645, 93646, 95130, 95131, 95132, 95133,
        101944, 101948, 101950, 101951, 101952, 101953, 101954, 101955, 130170, 168105,
      ],
      name: 'Growing Swarm',
      type: 'active',
      baseAbilityId: 86031,
    },

    // Active abilities - Betty Netch
    {
      id: 86050,
      alternateIds: [
        86106, 87875, 87876, 93660, 93664, 93668, 114852, 131345, 186487, 187869, 223538,
      ],
      name: 'Betty Netch',
      type: 'active',
      baseAbilityId: 86050,
    },
    {
      id: 86054,
      alternateIds: [87933, 89106, 93677, 93679, 93682, 93684, 93687, 93689, 114854, 223540],
      name: 'Blue Betty',
      type: 'active',
      baseAbilityId: 86050,
    },
    {
      id: 86058,
      alternateIds: [86103, 89109, 91475, 93707, 93712, 93717, 114853, 131351, 223541],
      name: 'Bull Netch',
      type: 'active',
      baseAbilityId: 86050,
    },

    // Active abilities - Falcon's Swiftness
    { id: 86062, name: "Falcon's Swiftness", type: 'active', baseAbilityId: 86062 },
    {
      id: 86066,
      alternateIds: [86045, 177290],
      name: 'Bird of Prey',
      type: 'active',
      baseAbilityId: 86062,
    },
    {
      id: 86070,
      alternateIds: [86041, 177289],
      name: 'Deceptive Predator',
      type: 'active',
      baseAbilityId: 86062,
    },

    // Passive abilities
    {
      id: 85800,
      alternateIds: [86064, 86065, 88986, 88988, 159574],
      icon: 'ability_mage_065',
      name: 'Bond with Nature',
      type: 'passive',
      baseAbilityId: 85800,
    },
    {
      id: 85801,
      alternateIds: [86062, 86063, 88512, 88513],
      icon: 'ability_mage_065',
      name: 'Savage Beast',
      type: 'passive',
      baseAbilityId: 85801,
    },
    {
      id: 85802,
      alternateIds: [86066, 86067, 91890, 91944],
      icon: 'ability_mage_065',
      name: 'Flourish',
      type: 'passive',
      baseAbilityId: 85802,
    },
    {
      id: 85803,
      alternateIds: [86068, 86069],
      icon: 'ability_mage_065',
      name: 'Advanced Species',
      type: 'passive',
      baseAbilityId: 85803,
    },
  ],
};
