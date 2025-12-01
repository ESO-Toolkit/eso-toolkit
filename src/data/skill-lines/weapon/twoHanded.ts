/**
 * Two Handed Weapon Skill Line Data
 *
 * Data source: https://eso-hub.com/en/skills/weapon/two-handed
 * Last updated: 2025
 *
 * The Two-Handed skill-line is part of the "Weapons" category in the Elder Scrolls Online.
 * The Two-Handed skill-line is granted to you after killing an enemy with a Two-Handed weapon.
 * You can use any random Two-Handed weapon that you bought or picked up from a monster to uncover
 * the Two-Handed skill-line.
 */

import { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const twoHandedSkillLine: SkillLineData = {
  id: '0', // Two-Handed skill line ID
  name: 'Two Handed',
  class: 'Weapon',
  category: 'weapon',
  icon: '/images/skill-lines/weapon/two-handed.png',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.BERSERKER_STRIKE,
      name: 'Berserker Strike',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing Physical Damage to them and all nearby enemies. This attack ignores the target's Physical Resistance, and grants you Physical and Spell Resistance equal to the amount ignored from the initial target.",
    },
    {
      id: 83238, // Berserker Rage (morph)
      name: 'Berserker Rage',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing Physical Damage to them and all nearby enemies. This attack ignores the target's Resistance and grants you Physical and Spell Resistance equal to the amount ignored from the initial target. You are immune to all disabling, snare, and immobilization effects for the duration.",
    },
    {
      id: 83229, // Onslaught (morph)
      name: 'Onslaught',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing Physical Damage to them and all nearby enemies. This attack ignores the target's Resistance and grants you Physical and Spell Penetration for your direct damage attacks equal to 100% of the amount ignored from the initial target.",
    },

    // Scribing Abilities
    {
      id: AbilityId.SMASH,
      name: 'Smash',
      type: 'active',
      baseAbilityId: AbilityId.SMASH,
      description: 'Drag your weapon along the ground to smash a cone in front of you.',
    },

    // Active Abilities
    {
      id: AbilityId.UPPERCUT,
      name: 'Uppercut',
      type: 'active',
      baseAbilityId: AbilityId.UPPERCUT,
      description: 'Slam an enemy with an upward swing, dealing Physical Damage.',
    },
    {
      id: 38814, // Dizzying Swing (morph)
      name: 'Dizzying Swing',
      type: 'active',
      baseAbilityId: AbilityId.UPPERCUT,
      description:
        'Slam an enemy with an upward swing, dealing Physical Damage and setting them Off Balance. Hitting an enemy that is already Off Balance stuns them. Targets that are immune to Off Balance are snared.',
    },
    {
      id: 38807, // Wrecking Blow (morph)
      name: 'Wrecking Blow',
      type: 'active',
      baseAbilityId: AbilityId.UPPERCUT,
      description:
        'Slam an enemy with an upward swing, dealing Physical Damage. Grants you Empower and Major Berserk, increasing the damage of your Heavy Attacks against monsters and your damage done.',
    },
    {
      id: AbilityId.CRITICAL_CHARGE,
      name: 'Critical Charge',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Launch across the earth and smash an enemy, dealing Physical Damage. This attack is always a Critical Strike.',
    },
    {
      id: 38788, // Critical Rush (morph)
      name: 'Critical Rush',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Launch across the earth and smash an enemy, dealing Physical Damage. Deals up to 50% more damage based on the distance traveled. This attack is always a Critical Strike.',
    },
    {
      id: 38794, // Stampede (morph)
      name: 'Stampede',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Launch across the earth and smash an enemy, dealing Physical Damage to them and all nearby enemies. This attack is always a Critical Strike. After reaching your target, you sunder the ground beneath you, dealing Physical Damage to all enemies in the area every second.',
    },
    {
      id: AbilityId.CLEAVE,
      name: 'Cleave',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        'Focus your strength into a mighty swing, dealing Physical Damage to enemies in front of you. You also gain a damage shield that absorbs damage.',
    },
    {
      id: 38745, // Brawler (morph)
      name: 'Brawler',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        "Focus your strength into a mighty swing, dealing Physical Damage to enemies in front of you. You also gain a damage shield that absorbs damage. Each enemy hit increases the damage shield's strength.",
    },
    {
      id: 38754, // Carve (morph)
      name: 'Carve',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        'Focus your strength into a mighty swing, dealing Bleed Damage to enemies in front of you, and causing them to bleed for additional Bleed Damage over time. Hitting a target that is already bleeding from this ability extends the duration. You also gain a damage shield that absorbs damage.',
    },
    {
      id: AbilityId.REVERSE_SLASH,
      name: 'Reverse Slash',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Spin around and strike an enemy down, dealing Physical Damage. Deals up to 300% more damage to enemies with less than 50% Health.',
    },
    {
      id: 38846, // Executioner (morph)
      name: 'Executioner',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Spin around and strike an enemy down, dealing Bleed Damage. Deals up to 400% more damage to enemies with less than 50% Health.',
    },
    {
      id: 38839, // Reverse Slice (morph)
      name: 'Reverse Slice',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Spin around and strike an enemy down, dealing Physical Damage to them and all nearby enemies. Deals up to 300% more damage to enemies with less than 50% Health.',
    },
    {
      id: AbilityId.MOMENTUM,
      name: 'Momentum',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage, as well as gaining Minor Endurance, increasing your Stamina Recovery.',
    },
    {
      id: 38794, // Forward Momentum (morph)
      name: 'Forward Momentum',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage, as well as gaining Minor Endurance, increasing your Stamina Recovery. Activating this ability removes all snares and immobilizations from you and grants immunity to them.',
    },
    {
      id: 38802, // Rally (morph)
      name: 'Rally',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage, as well as gaining Minor Endurance, increasing your Stamina Recovery. You heal when Rally ends. The final heal is increased over time.',
    },

    // Passive Abilities
    {
      id: AbilityId.FORCEFUL,
      name: 'Forceful',
      type: 'passive',
      baseAbilityId: AbilityId.FORCEFUL,
      description:
        'With Two-Handed weapon equipped, your Light and Heavy Attacks damage up to 3 other nearby enemies for 100% of the damage inflicted to the primary target.',
    },
    {
      id: AbilityId.HEAVY_WEAPONS,
      name: 'Heavy Weapons',
      type: 'passive',
      baseAbilityId: AbilityId.HEAVY_WEAPONS,
      description:
        'With a Two-Handed weapon equipped, grants a bonus based on the type of weapon equipped: Swords increase your Weapon and Spell Damage. Axes increase your Critical Damage done. Maces increase your Offensive Penetration.',
    },
    {
      id: AbilityId.BALANCED_BLADE,
      name: 'Balanced Blade',
      type: 'passive',
      baseAbilityId: AbilityId.BALANCED_BLADE,
      description:
        'With Two-Handed weapon equipped, reduces the Stamina cost of your Two-Handed abilities.',
    },
    {
      id: AbilityId.FOLLOW_UP,
      name: 'Follow Up',
      type: 'passive',
      baseAbilityId: AbilityId.FOLLOW_UP,
      description:
        'With Two-Handed weapon equipped, when you complete a fully-charged Heavy Attack, your damage done with Two Handed attacks increases.',
    },
    {
      id: AbilityId.BATTLE_RUSH,
      name: 'Battle Rush',
      type: 'passive',
      baseAbilityId: AbilityId.BATTLE_RUSH,
      description:
        'With Two-Handed weapon equipped, increases your Stamina Recovery after killing a target.',
    },
  ],
};
