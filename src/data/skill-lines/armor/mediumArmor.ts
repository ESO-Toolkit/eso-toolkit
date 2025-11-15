import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const mediumArmor: SkillLineData = {
  id: 'medium-armor',
  name: 'Medium Armor',
  class: 'armor',
  category: 'armor',
  icon: '/icons/skills/armor/medium_armor.png',
  skills: [
    // Active Abilities
    {
      id: AbilityId.EVASION,
      name: 'Evasion',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Requires 5 pieces of medium armor equipped. Shroud yourself in mist to gain Major Evasion, reducing damage taken from area attacks by 20% for 20 seconds.',
    },
    {
      id: 39192, // Elude (morph)
      name: 'Elude',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Shroud yourself in mist to gain Major Evasion, reducing damage taken from area attacks by 20% for 20 seconds. While this effect is active, when you take damage from a direct area of effect attack you gain Major Expedition for 0 seconds, increasing your Movement Speed by 30%. Each piece of Medium Armor worn increases the duration of this ability.',
    },
    {
      id: 39195, // Shuffle (morph)
      name: 'Shuffle',
      type: 'active',
      baseAbilityId: AbilityId.EVASION,
      description:
        'Shroud yourself in mist to gain Major Evasion, decreasing damage taken from area attacks by 20% for 20 seconds. Each piece of Medium Armor worn removes and grants immunity to snares and immobilizations for 1 second.',
    },

    // Passive Abilities
    {
      id: 0,
      name: 'Medium Armor Bonuses',
      type: 'passive',
      baseAbilityId: 0,
      icon: '/icons/skills/armor/medium_armor.png',
      description:
        'Each piece of Medium Armor does the following: Reduces the cost of Sprint by 1%, Reduces the cost of Sneak by 5%, Reduces the cost of Block by 3%, Reduces damage taken from Area of Effect attacks by 2% for 2 seconds after you use Roll Dodge, Increases Movement Speed by 2% while immune to crowd control.',
    },
    {
      id: AbilityId.DEXTERITY,
      name: 'Dexterity',
      type: 'passive',
      baseAbilityId: AbilityId.DEXTERITY,
      description:
        'Increases your Critical Damage and Healing done rating by 2% for every piece of Medium Armor equipped.',
    },
    {
      id: AbilityId.WIND_WALKER,
      name: 'Wind Walker',
      type: 'passive',
      baseAbilityId: AbilityId.WIND_WALKER,
      description:
        'Increases your Stamina Recovery by 4% per piece of Medium Armor equipped. Reduces the Stamina cost of your abilities by 2% per piece of Medium Armor equipped.',
    },
    {
      id: AbilityId.IMPROVED_SNEAK,
      name: 'Improved Sneak',
      type: 'passive',
      baseAbilityId: AbilityId.IMPROVED_SNEAK,
      description:
        'Reduces the cost of Sneak by 7% for each piece of Medium Armor equipped. Reduces the size of your detection area while Sneaking by 5% for each piece of Medium Armor equipped.',
    },
    {
      id: AbilityId.AGILITY,
      name: 'Agility',
      type: 'passive',
      baseAbilityId: AbilityId.AGILITY,
      description:
        'Increases your Weapon and Spell Damage by 2% for each piece of Medium Armor worn.',
    },
    {
      id: AbilityId.ATHLETICS,
      name: 'Athletics',
      type: 'passive',
      baseAbilityId: AbilityId.ATHLETICS,
      description:
        'Increases the Movement Speed bonus of Sprint by 3% for each piece of Medium Armor equipped. Reduces the cost of Roll Dodge by 4% for each piece of Medium Armor equipped.',
    },
  ],
};
