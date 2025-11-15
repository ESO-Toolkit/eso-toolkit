import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

/**
 * Heavy Armor Skill Line
 *
 * The Heavy Armor skill-line is part of the "Armor" category in the Elder Scrolls Online.
 * The Heavy Armor skill-line has one active skill that you can activate during combat,
 * with the requirement that you have at least 5 Heavy Armor pieces equipped.
 * The Heavy Armor skill-line also has passives, some require you to wear several
 * Heavy Armor pieces, some already give you benefits from only wearing one Heavy Armor piece.
 *
 * Focus: Health, defense, and resistance bonuses with trade-offs for magical defense and mobility
 */
export const heavyArmor: SkillLineData = {
  id: 'heavy-armor',
  name: 'Heavy Armor',
  class: 'armor',
  category: 'armor',
  icon: 'https://eso-hub.com/storage/icons/ability_armor_016.png',
  skills: [
    {
      id: AbilityId.UNSTOPPABLE,
      name: 'Unstoppable',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Requires 5 pieces of heavy armor equipped. Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds. Also grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration.',
    },
    {
      id: 39197, // Immovable (morph)
      name: 'Immovable',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 23 seconds. Also grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration. Each piece of Heavy Armor worn increases the amount of damage you block and the potency of the snare by 5%.',
    },
    {
      id: 39205, // Unstoppable Brute (morph)
      name: 'Unstoppable Brute',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds. While this effect persists, each piece of Heavy Armor worn decreases the cost of Break Free by 5%. Also grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration.',
    },
    {
      id: 0,
      name: 'Heavy Armor Bonuses',
      type: 'passive',
      baseAbilityId: 0,
      icon: 'https://eso-hub.com/storage/icons/ability_armor_016.png',
      description:
        'Each piece of Heavy Armor does the following: Reduces damage taken from Martial attacks by 1%, Increases the amount of damage blocked by 1%, Increases damage done with Bash by 30, Reduces your damage taken while immune to crowd control by 1%',
    },
    {
      id: 0,
      name: 'Heavy Armor Penalties',
      type: 'passive',
      baseAbilityId: 0,
      icon: 'https://eso-hub.com/storage/icons/ability_armor_016.png',
      description:
        'Each piece of Heavy Armor does the following: Increases damage taken from Magical attacks by 1%, Reduces the Movement Speed bonus of Sprint by 1%, Increases the cost of Roll Dodge by 3%, Increases the size of your detection area while Sneaking by 10%',
    },
    {
      id: AbilityId.RESOLVE,
      name: 'Resolve',
      type: 'passive',
      baseAbilityId: AbilityId.RESOLVE,
      description:
        'Increases your Physical and Spell Resistance by 343 for each piece of Heavy Armor equipped.',
    },
    {
      id: AbilityId.CONSTITUTION,
      name: 'Constitution',
      type: 'passive',
      baseAbilityId: AbilityId.CONSTITUTION,
      description:
        'Increases your Health Recovery by 4% for each piece of Heavy Armor equipped. You restore 108 Magicka and Stamina when you take damage for each piece of Heavy Armor equipped. This effect can occur once every 4 seconds.',
    },
    {
      id: AbilityId.JUGGERNAUT,
      name: 'Juggernaut',
      type: 'passive',
      baseAbilityId: AbilityId.JUGGERNAUT,
      description: 'Increases your Max Health by 2% for each piece of Heavy Armor equipped.',
    },
    {
      id: AbilityId.REVITALIZE,
      name: 'Revitalize',
      type: 'passive',
      baseAbilityId: AbilityId.REVITALIZE,
      description:
        'Increases the Magicka or Stamina your Heavy Attacks restore by 4% for each piece of Heavy Armor worn.',
    },
    {
      id: AbilityId.RAPID_MENDING,
      name: 'Rapid Mending',
      type: 'passive',
      baseAbilityId: AbilityId.RAPID_MENDING,
      description: 'Increases your healing received by 1% for each piece of Heavy Armor worn.',
    },
  ],
};
