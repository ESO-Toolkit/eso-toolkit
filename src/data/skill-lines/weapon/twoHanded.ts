/**
 * Two Handed Weapon Skill Line Data
 *
 * Last updated: 2026 (U49)
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
  icon: 'ability_2handed_006',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.BERSERKER_STRIKE,
      name: 'Berserker Strike',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing 3486 Physical Damage to them and all nearby enemies.\n\nThis attack ignores the target's Physical Resistance, and grants you Physical and Spell Resistance equal to the amount ignored from the initial target for 12 seconds.",
    },
    {
      id: 83238, // Berserker Rage (morph)
      name: 'Berserker Rage',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing 3600 Physical Damage to them and all nearby enemies.\n\nThis attack ignores the target's Resistance and grants you Physical and Spell Resistance equal to the amount ignored from the initial target for 12 seconds.\n\nYou are immune to all disabling, snare, and immobilization effects for the duration.",
    },
    {
      id: 83229, // Onslaught (morph)
      name: 'Onslaught',
      type: 'ultimate',
      baseAbilityId: AbilityId.BERSERKER_STRIKE,
      description:
        "Strike at an enemy with a vicious blow, dealing 3485 Physical Damage to them and all nearby enemies.\n\nThis attack ignores the target's Resistance and grants you Physical and Spell Penetration for direct damage attacks equal to 100% of the amount ignored from the initial target and if Battle Spirit is inactive you gain 100% Critical Chance for 8 seconds.",
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
      description: 'Slam an enemy with an upward swing, dealing 2672 Physical Damage.',
    },
    {
      id: 38814, // Dizzying Swing (morph)
      name: 'Dizzying Swing',
      type: 'active',
      baseAbilityId: AbilityId.UPPERCUT,
      description:
        'Slam an enemy with an upward swing, dealing 2760 Physical Damage and setting them Off Balance for 7 seconds. \n\nHitting an enemy that is already Off Balance stuns them for 2 seconds.\n\nTargets that are immune to Off Balance are snared by 40% for 2 seconds.',
    },
    {
      id: 38807, // Wrecking Blow (morph)
      name: 'Wrecking Blow',
      type: 'active',
      baseAbilityId: AbilityId.UPPERCUT,
      description:
        'Slam an enemy with an upward swing, dealing 2760 Physical Damage.\n\nGrants you Major Berserk and Empower for 3 seconds, increasing damage done by 10% and increasing damage done with Heavy Attacks against monsters by 70%.',
    },
    {
      id: AbilityId.CRITICAL_CHARGE,
      name: 'Critical Charge',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Launch across the earth and smash an enemy, dealing 1392 Physical Damage. \n\nThis attack is always a Critical Strike.',
    },
    {
      id: 38788, // Critical Rush (morph)
      name: 'Critical Rush',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Launch across the earth and smash an enemy, dealing 1393 Physical Damage to them and all nearby enemies. This attack is always a Critical Strike.\n\nAfter reaching your target, you sunder the ground beneath you, dealing 319 Physical Damage to all enemies in the area every 1 second for 15 seconds.',
    },
    {
      id: 38794, // Stampede (morph)
      name: 'Stampede',
      type: 'active',
      baseAbilityId: AbilityId.CRITICAL_CHARGE,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 1 minute.\n\nActivating this ability removes all snares and immobilizations from you and grants immunity to them for 4 seconds.',
    },
    {
      id: AbilityId.CLEAVE,
      name: 'Cleave',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        'Focus your strength into a mighty swing, dealing 1742 Physical Damage to enemies in front of you.\n\nYou also gain a damage shield that absorbs 1742 damage for 6 seconds.',
    },
    {
      id: 38745, // Brawler (morph)
      name: 'Brawler',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        'Focus your strength into a mighty swing, dealing 1742 Bleed Damage to enemies in front of you, and causing them to bleed for an additional 2868 Bleed Damage over 12 seconds. \n\nHitting a target that is already bleeding from this ability extends the duration by 10 seconds, up to a maximum of 32.\n\nYou also gain a damage shield that absorbs 1742 damage for 6 seconds.',
    },
    {
      id: 38754, // Carve (morph)
      name: 'Carve',
      type: 'active',
      baseAbilityId: AbilityId.CLEAVE,
      description:
        "Focus your strength into a mighty swing, dealing 1742 Physical Damage to enemies in front of you.\n\nYou also gain a damage shield that absorbs 1799 damage for 6 seconds. Each enemy hit increases the damage shield's strength by 50%, up to 300%.",
    },
    {
      id: AbilityId.REVERSE_SLASH,
      name: 'Reverse Slash',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Shift your grip and strike an enemy down, dealing 1161 Physical Damage. Deals up to 300% more damage to enemies with less than 50% Health.',
    },
    {
      id: 38846, // Executioner (morph)
      name: 'Executioner',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Flood an enemy with steel, battering them with four consecutive attacks that each deal 689 Bleed Damage and heal you for 33% of the damage caused.',
    },
    {
      id: 38839, // Reverse Slice (morph)
      name: 'Reverse Slice',
      type: 'active',
      baseAbilityId: AbilityId.REVERSE_SLASH,
      description:
        'Slice an enemy with both weapons to cause deep lacerations, dealing 718 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds.\n\nEnemies hit by the initial hit are afflicted with the Hemorrhaging status effect.\n\nYou also reduce their Movement Speed by 30% for 4 seconds.',
    },
    {
      id: AbilityId.MOMENTUM,
      name: 'Momentum',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 30 seconds.',
    },
    {
      id: 38794, // Forward Momentum (morph)
      name: 'Forward Momentum',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 1 minute.\n\nActivating this ability removes all snares and immobilizations from you and grants immunity to them for 4 seconds.',
    },
    {
      id: 38802, // Rally (morph)
      name: 'Rally',
      type: 'active',
      baseAbilityId: AbilityId.MOMENTUM,
      description:
        'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 30 seconds.\n\nYou heal for 1799 Health when Rally ends. The final heal is increased by 20% every 2 seconds, up to a maximum of 200%.',
    },

    // Passive Abilities
    {
      id: AbilityId.FORCEFUL,
      icon: 'ability_weapon_027',
      alternateIds: [29387, 30821, 45444, 45445, 61022, 61023],
      name: 'Forceful',
      type: 'passive',
      baseAbilityId: AbilityId.FORCEFUL,
      description:
        'Your Light and Heavy Attacks damage up to 3 other nearby enemies for 100% of the damage inflicted to the primary target.',
    },
    {
      id: AbilityId.HEAVY_WEAPONS,
      icon: 'passive_dragonknight_026',
      alternateIds: [29375, 29384, 29385, 45430, 45432, 45434],
      name: 'Heavy Weapons',
      type: 'passive',
      baseAbilityId: AbilityId.HEAVY_WEAPONS,
      description:
        'Grants a bonus based on the type of weapon equipped:\n\nSwords increase your Weapon and Spell Damage by 258.\n\nAxes increase your Critical Damage done by 12%.\n\nMaces increase your Offensive Penetration by 2974.',
    },
    {
      id: AbilityId.BALANCED_BLADE,
      icon: 'ability_dragonknight_028',
      alternateIds: [29388, 45443],
      name: 'Balanced Blade',
      type: 'passive',
      baseAbilityId: AbilityId.BALANCED_BLADE,
      description: 'Reduces the Stamina cost of your Two-Handed abilities by 15%.',
    },
    {
      id: AbilityId.FOLLOW_UP,
      icon: 'passive_dragonknight_016',
      alternateIds: [29389, 45446, 60860, 60888, 222020],
      name: 'Follow Up',
      type: 'passive',
      baseAbilityId: AbilityId.FOLLOW_UP,
      description:
        'When you complete a fully-charged Heavy Attack, your damage done with Two Handed attacks increases by 10% for 4 seconds.',
    },
    {
      id: AbilityId.BATTLE_RUSH,
      icon: 'ability_weapon_021',
      alternateIds: [29391, 29392, 45448, 45450],
      name: 'Battle Rush',
      type: 'passive',
      baseAbilityId: AbilityId.BATTLE_RUSH,
      description: 'Increases your Stamina Recovery by 30% for 10 seconds after killing a target.',
    },
  ],
};
