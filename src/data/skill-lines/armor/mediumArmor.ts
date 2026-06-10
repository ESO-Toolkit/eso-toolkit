import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const mediumArmor: SkillLineData = {
  id: 'medium-armor',
  name: 'Medium Armor',
  class: 'armor',
  category: 'armor',
  icon: 'ability_armor_002',
  skills: [
    // Active Abilities
    {
      id: AbilityId.EVASION,
      name: 'Evasion',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Shroud yourself in mist to gain Major Evasion, reducing damage taken from area attacks by 20% for 20 seconds.',
    },
    {
      id: 39192, // Elude (morph)
      name: 'Elude',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Shroud yourself in mist to gain Major Evasion, reducing damage taken from area attacks by 20% for 20 seconds.\n\nWhile this effect is active, when you take damage from a direct area of effect attack you gain Major Expedition for 0 seconds, increasing your Movement Speed by 30%.\n\nEach piece of Medium Armor worn increases the duration of this ability.',
    },
    {
      id: 39195, // Shuffle (morph)
      name: 'Shuffle',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Shroud yourself in mist to gain Major Evasion, decreasing damage taken from area attacks by 20% for 20 seconds.\n\nEach piece of Medium Armor worn removes and grants immunity to snares and immobilizations for 1 second.',
    },

    // Passive Abilities
    {
      id: 150181,
      name: 'Medium Armor Bonuses',
      type: 'passive',
      baseAbilityId: 150181,
      icon: 'passive_armor2_medium',
      description:
        'Each piece of Medium Armor does the following:\n\nReduces the cost of Sprint by 1%\n\nReduces the cost of Sneak by 5%\n\nReduces the cost of Block by 3%\n\nReduces damage taken from Area of Effect attacks by 2% for 2 seconds after you use Roll Dodge\n\nIncreases Movement Speed by 2% while immune to crowd control',
    },
    {
      id: AbilityId.DEXTERITY,
      icon: 'ability_armor_008',
      alternateIds: [29743, 45563, 45564, 88545, 88546, 88547, 149156, 149160],
      name: 'Dexterity',
      type: 'passive',
      baseAbilityId: AbilityId.DEXTERITY,
      description:
        'Increases your Critical Damage and Healing done rating by 1% for every 2 pieces of Medium Armor equipped.',
    },
    {
      id: AbilityId.WIND_WALKER,
      icon: 'ability_armor_011',
      alternateIds: [29687, 45565, 56953, 56959],
      name: 'Wind Walker',
      type: 'passive',
      baseAbilityId: AbilityId.WIND_WALKER,
      description:
        'Increases your Stamina Recovery by 2% for each piece of Medium Armor equipped.\n\nReduces the Stamina cost of your abilities by 1% for each piece of Medium Armor equipped.',
    },
    {
      id: AbilityId.IMPROVED_SNEAK,
      icon: 'ability_armor_007',
      alternateIds: [29738, 29739, 45567, 45568, 85528],
      name: 'Improved Sneak',
      type: 'passive',
      baseAbilityId: AbilityId.IMPROVED_SNEAK,
      description:
        'Reduces the cost of Sneak by 4% for each piece of Medium Armor equipped.\n\nReduces the size of your detection area while Sneaking by 3% for each piece of Medium Armor equipped.',
    },
    {
      id: AbilityId.AGILITY,
      icon: 'ability_armor_010',
      alternateIds: [29686, 45572, 149165, 149166],
      name: 'Agility',
      type: 'passive',
      baseAbilityId: AbilityId.AGILITY,
      description:
        'Increases your Weapon and Spell Damage by 1% for each piece of Medium Armor worn.',
    },
    {
      id: AbilityId.ATHLETICS,
      icon: 'ability_armor_009',
      alternateIds: [29742, 45574],
      name: 'Athletics',
      type: 'passive',
      baseAbilityId: AbilityId.ATHLETICS,
      description:
        'Increases the Movement Speed bonus of Sprint by 2% for each piece of Medium Armor equipped.\n\nReduces the cost of Roll Dodge by 2% for each piece of Medium Armor equipped.',
    },
  ],
};
