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
  icon: 'ability_armor_001',
  skills: [
    {
      id: AbilityId.UNSTOPPABLE,
      name: 'Unstoppable',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds.\n\nAlso grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration.',
    },
    {
      id: 39197, // Immovable (morph)
      name: 'Immovable',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 23 seconds.\n\nAlso grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration.\n\nEach piece of Heavy Armor worn increases the amount of damage you block and the potency of the snare by 5%.',
    },
    {
      id: 39205, // Unstoppable Brute (morph)
      name: 'Unstoppable Brute',
      type: 'active',
      baseAbilityId: AbilityId.UNSTOPPABLE,
      description:
        'Intensify your physical presence to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds.\n\nWhile this effect persists, each piece of Heavy Armor worn decreases the cost of Break Free by 5%.\n\nAlso grants you immunity to knockback and disabling effects for 6 seconds, but reduces your Movement Speed by 65% for the duration.',
    },
    {
      id: 150184,
      name: 'Heavy Armor Bonuses',
      type: 'passive',
      baseAbilityId: 150184,
      icon: 'passive_armor2_heavy',
      description:
        'Each piece of Heavy Armor does the following:\n\nReduces damage taken from Martial attacks by 1%\n\nIncreases the amount of damage blocked by 1%\n\nIncreases damage done with Bash by 30\n\nReduces your damage taken while immune to crowd control by 1%',
    },
    {
      id: 152780,
      name: 'Heavy Armor Penalties',
      type: 'passive',
      baseAbilityId: 152780,
      icon: 'passive_armor2_heavy',
      description:
        'Each piece of Heavy Armor does the following:\n\nIncreases damage taken from Magical attacks by 1%\n\nReduces the Movement Speed bonus of Sprint by 1%\n\nIncreases the cost of Roll Dodge by 3%\n\nIncreases the size of your detection area while Sneaking by 10%',
    },
    {
      id: AbilityId.RESOLVE,
      icon: 'ability_dragonknight_020',
      alternateIds: [382, 29825, 45531, 45533, 88549, 88550, 88551, 126535, 138924],
      name: 'Resolve',
      type: 'passive',
      baseAbilityId: AbilityId.RESOLVE,
      description:
        'Increases your Physical and Spell Resistance by 114 for each piece of Heavy Armor equipped.',
    },
    {
      id: AbilityId.CONSTITUTION,
      icon: 'ability_armor_014',
      alternateIds: [
        29769, 45526, 58428, 58429, 58430, 58431, 58432, 58503, 88552, 88553, 200393, 200394,
        200395,
      ],
      name: 'Constitution',
      type: 'passive',
      baseAbilityId: AbilityId.CONSTITUTION,
      description:
        'Increases your Health Recovery by 2% for each piece of Heavy Armor equipped.\n\nYou restore 108 Magicka and Stamina when you take damage for each piece of Heavy Armor equipped. This effect can occur once every 8 seconds.',
    },
    {
      id: AbilityId.JUGGERNAUT,
      icon: 'ability_armor_012',
      alternateIds: [4130, 18383, 29804, 45546, 142110],
      name: 'Juggernaut',
      type: 'passive',
      baseAbilityId: AbilityId.JUGGERNAUT,
      description: 'Increases your Max Health by 1% for each piece of Heavy Armor equipped.',
    },
    {
      id: AbilityId.REVITALIZE,
      icon: 'ability_armor_013',
      alternateIds: [29773, 45528],
      name: 'Revitalize',
      type: 'passive',
      baseAbilityId: AbilityId.REVITALIZE,
      description:
        'Increases the Magicka or Stamina your Heavy Attacks restore by 2% for each piece of Heavy Armor worn.',
    },
    {
      id: AbilityId.RAPID_MENDING,
      icon: 'ability_armor_015',
      alternateIds: [29791, 45529, 79994, 79995, 102006, 102007],
      name: 'Rapid Mending',
      type: 'passive',
      baseAbilityId: AbilityId.RAPID_MENDING,
      description: 'Increases your healing received by 1% for every 2 pieces of Heavy Armor worn.',
    },
  ],
};
