/**
 * Assassination Skill Line - Nightblade Class
 *
 * The Assassination skill-line is part of the Nightblade toolkit and has a focus on offensive abilities.
 * In addition to powerful abilities, you can also select passives that increase your damage capabilities even further.
 *
 * Source: https://eso-hub.com/en/skills/nightblade/assassination
 */

import { SkillLineData } from '../../types/skill-line-types';

export const assassination: SkillLineData = {
  id: 'assassination',
  name: 'Assassination',
  class: 'Nightblade',
  category: 'class',
  icon: 'ability_nightblade_005_b',
  skills: [
    // Ultimate Abilities
    {
      id: 61919,
      name: 'Death Stroke',
      type: 'ultimate',
      baseAbilityId: 61919,
    },
    {
      id: 61927,
      name: 'Incapacitating Strike',
      type: 'ultimate',
      baseAbilityId: 61919,
    },
    {
      id: 61920,
      name: 'Soul Harvest',
      type: 'ultimate',
      baseAbilityId: 61919,
    },

    // Active Abilities - Veiled Strike
    {
      id: 61902,
      name: 'Veiled Strike',
      type: 'active',
      baseAbilityId: 61902,
    },
    {
      id: 61922,
      name: 'Concealed Weapon',
      type: 'active',
      baseAbilityId: 61902,
    },
    {
      id: 61919,
      name: 'Surprise Attack',
      type: 'active',
      baseAbilityId: 61902,
    },

    // Active Abilities - Teleport Strike
    {
      id: 18342,
      name: 'Teleport Strike',
      type: 'active',
      baseAbilityId: 18342,
    },
    {
      id: 25484,
      name: 'Ambush',
      type: 'active',
      baseAbilityId: 18342,
    },
    {
      id: 25493,
      name: 'Lotus Fan',
      type: 'active',
      baseAbilityId: 18342,
    },

    // Active Abilities - Assassin's Blade
    {
      id: 18426,
      name: "Assassin's Blade",
      type: 'active',
      baseAbilityId: 18426,
    },
    {
      id: 61388,
      name: 'Impale',
      type: 'active',
      baseAbilityId: 18426,
    },
    {
      id: 61393,
      name: "Killer's Blade",
      type: 'active',
      baseAbilityId: 18426,
    },

    // Active Abilities - Mark Target
    {
      id: 36968,
      name: 'Mark Target',
      type: 'active',
      baseAbilityId: 36968,
    },
    {
      id: 36967,
      name: 'Piercing Mark',
      type: 'active',
      baseAbilityId: 36968,
    },
    {
      id: 36970,
      name: "Reaper's Mark",
      type: 'active',
      baseAbilityId: 36968,
    },

    // Active Abilities - Grim Focus
    {
      id: 61902,
      name: 'Grim Focus',
      type: 'active',
      baseAbilityId: 61902,
    },
    {
      id: 61919,
      name: 'Merciless Resolve',
      type: 'active',
      baseAbilityId: 61902,
    },
    {
      id: 61927,
      icon: 'ability_nightblade_005_a',
      name: 'Relentless Focus',
      type: 'active',
      baseAbilityId: 61902,
    },

    // Passive Abilities
    {
      id: 30957,
      icon: 'ability_weapon_008',
      alternateIds: [36616, 45038],
      name: 'Master Assassin',
      type: 'passive',
      baseAbilityId: 30957,
    },
    {
      id: 30962,
      icon: 'ability_weapon_005',
      alternateIds: [
        6224, 10770, 10771, 10772, 29006, 36630, 36633, 38819, 45048, 45050,
        101434, 101435, 101436, 101437, 108867, 108868,
      ],
      name: 'Executioner',
      type: 'passive',
      baseAbilityId: 30962,
    },
    {
      id: 30963,
      alternateIds: [36636, 36640, 45053, 45055, 88655, 88656],
      icon: 'passive_weapon_015',
      name: 'Pressure Points',
      type: 'passive',
      baseAbilityId: 30963,
    },
    {
      id: 45054,
      icon: 'ability_mage_065',
      alternateIds: [
        26038, 36641, 45060, 59611, 61883, 61899, 102091, 105586, 105594, 105595,
        105596, 108780, 132927, 132929, 132934, 132935, 132936, 140619, 150720, 183807,
        185316, 185317, 227845, 239196, 239202, 239205,
      ],
      name: 'Hemorrhage',
      type: 'passive',
      baseAbilityId: 45054,
    },
  ],
};
