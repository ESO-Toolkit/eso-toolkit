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
  icon: '/images/skills/nightblade/assassination.png',
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
      name: 'Relentless Focus',
      type: 'active',
      baseAbilityId: 61902,
    },

    // Passive Abilities
    {
      id: 30957,
      name: 'Master Assassin',
      type: 'passive',
      baseAbilityId: 30957,
    },
    {
      id: 30962,
      name: 'Executioner',
      type: 'passive',
      baseAbilityId: 30962,
    },
    {
      id: 30963,
      name: 'Pressure Points',
      type: 'passive',
      baseAbilityId: 30963,
    },
    {
      id: 45054,
      name: 'Hemorrhage',
      type: 'passive',
      baseAbilityId: 45054,
    },
  ],
};
