/**
 * Storm Calling — Sorcerer Skill Line
 * Source: https://eso-hub.com/en/skills/sorcerer/storm-calling
 * Regenerated: 2025-11-14T20:33:08.849Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const stormCalling: SkillLineData = {
  id: 'class.storm-calling',
  name: 'Storm Calling',
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_overload',
  sourceUrl: 'https://eso-hub.com/en/skills/sorcerer/storm-calling',
  skills: [
    {
      id: ClassSkillId.SORCERER_OVERLOAD,
      name: 'Overload',
      type: 'ultimate',
      icon: 'ability_sorcerer_overload',
      description:
        'Charge your fists with the power of the storm, replacing your Light and Heavy Attacks with new, stronger abilities.\n\nLight Attacks become lightning bolts, dealing 2323 Shock Damage to an enemy up to 28 meters away.  \n\nHeavy Attacks blast enemies in a 4 x 6 area for 2090 Shock Damage.\n\nAttacks deplete Ultimate until you run out, or the ability is toggled off.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_OVERLOAD,
    },
    {
      id: ClassSkillId.SORCERER_ENERGY_OVERLOAD,
      name: 'Energy Overload',
      type: 'ultimate',
      icon: 'ability_sorcerer_energy_overload',
      description:
        'Charge your fists with the power of the storm, replacing your Light and Heavy Attacks with new, stronger abilities.\n\nLight Attacks become lightning bolts, dealing 2399 Shock Damage to an enemy up to 28 meters away.\n\nHeavy Attacks blast enemies in a 4 x 6 area for 2160 Shock Damage.\n\nThe attacks restore 1200 Magicka and Stamina, and deplete Ultimate until you run out, or the ability is toggled off.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_OVERLOAD,
    },
    {
      id: ClassSkillId.SORCERER_POWER_OVERLOAD,
      name: 'Power Overload',
      type: 'ultimate',
      icon: 'ability_sorcerer_power_overload',
      description:
        'Charge your fists with the power of the storm, replacing your Light and Heavy Attacks with new, stronger abilities.\n\nLight Attacks become lightning bolts, dealing 2640 Shock Damage to an enemy up to 32 meters away.\n\nHeavy Attacks blast enemies in a 6 x 8 area for 2375 Shock Damage.\n\nAttacks deplete Ultimate until you run out, or the ability is toggled off.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_OVERLOAD,
    },
    {
      id: ClassSkillId.SORCERER_MAGES_FURY,
      name: "Mages' Fury",
      type: 'active',
      icon: 'ability_sorcerer_mage_fury',
      description:
        'Call down lightning to strike an enemy, dealing 870 Shock Damage.\n\nIf the enemy falls to or below 20% Health within 2 seconds of being struck, an explosion deals an additional 3195 Shock Damage to them and 695 Shock Damage to other enemies nearby.',
      baseSkillId: ClassSkillId.SORCERER_MAGES_FURY,
    },
    {
      id: ClassSkillId.SORCERER_ENDLESS_FURY,
      name: 'Endless Fury',
      type: 'active',
      icon: 'ability_sorcerer_endless_fury',
      description:
        'Call down lightning to strike an enemy, dealing 871 Shock Damage.\n\nIf the enemy falls to or below 20% Health within 2 seconds of being struck, an explosion deals an additional 3195 Shock Damage to them and 696 Shock Damage to other enemies nearby.\n\nIf any enemy is killed within 5 seconds of being hit with this ability, you restore 4860 Magicka.',
      baseSkillId: ClassSkillId.SORCERER_MAGES_FURY,
    },
    {
      id: ClassSkillId.SORCERER_MAGES_WRATH,
      name: "Mages' Wrath",
      type: 'active',
      icon: 'ability_sorcerer_mage_wraith',
      description:
        'Call down lightning to strike an enemy, dealing 871 Shock Damage.\n\nIf the enemy falls to or below 20% Health within 2 seconds of being struck, an explosion deals an additional 3195 Shock Damage to them and all nearby enemies.',
      baseSkillId: ClassSkillId.SORCERER_MAGES_FURY,
    },
    {
      id: ClassSkillId.SORCERER_LIGHTNING_FORM,
      name: 'Lightning Form',
      type: 'active',
      icon: 'ability_sorcerer_lightning_form',
      description:
        'Manifest yourself as pure lightning, zapping nearby enemies with electricity dealing 462 Shock Damage every 2 seconds for 20 seconds.  \n\nWhile in this form you also gain Major Resolve, increasing your Physical Resistance and Spell Resistance by 5948.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_FORM,
    },
    {
      id: ClassSkillId.SORCERER_BOUNDLESS_STORM,
      name: 'Boundless Storm',
      type: 'active',
      icon: 'ability_sorcerer_boundless_storm',
      description:
        'Manifest yourself as pure lightning, zapping nearby enemies with electricity dealing 463 Shock Damage every 2 seconds for 30 seconds.\n\nWhile in this form you also gain Major Resolve, increasing your Physical Resistance and Spell Resistance by 5948.\n\nActivating this grants you Major Expedition, increasing your Movement Speed by 30% for 4 seconds.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_FORM,
    },
    {
      id: ClassSkillId.SORCERER_HURRICANE,
      name: 'Hurricane',
      type: 'active',
      icon: 'ability_sorcerer_thundering_presence',
      description:
        'Manifest yourself as pure air, buffeting nearby enemies with wind dealing 478 Physical Damage every 2 seconds for 20 seconds. The winds grow in damage and size, increasing up to 120% more damage and up to 9 meters in size.\n\nWhile in this form you gain Major Resolve and Minor Expedition, increasing your Physical and Spell Resistance by 5948 and your Movement Speed by 15%.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_FORM,
      alternateIds: [
        23231, 23232, 23233, 30239, 30240, 30242, 30243, 30245, 30246, 33459, 50346, 50348, 50349,
        82061, 82063, 82064, 95288, 99841, 99843, 99844, 156612, 156817, 158172, 158181, 169507,
        169508, 243651,
      ],
    },
    {
      id: ClassSkillId.SORCERER_LIGHTNING_SPLASH,
      name: 'Lightning Splash',
      type: 'active',
      icon: 'ability_sorcerer_lightning_splash',
      description:
        'Create a nexus of storm energy at the target location, dealing 308 Shock Damage to enemies in the area every 1 second for 10 seconds.\n \nYou or an ally standing within the nexus can activate the Conduit synergy, dealing 2698 Shock Damage to enemies around them.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_SPLASH,
    },
    {
      id: ClassSkillId.SORCERER_LIGHTNING_FLOOD,
      name: 'Lightning Flood',
      type: 'active',
      icon: 'ability_sorcerer_lightning_flood',
      description:
        'Create a nexus of storm energy at the target location, dealing 415 Shock Damage to enemies in the area every 1 second for 10 seconds.\n \nYou or an ally standing within the nexus can activate the Conduit synergy, dealing 2698 Shock Damage to enemies around them.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_SPLASH,
    },
    {
      id: ClassSkillId.SORCERER_LIQUID_LIGHTNING,
      name: 'Liquid Lightning',
      type: 'active',
      icon: 'ability_sorcerer_liquid_lightning',
      description:
        'Create a nexus of storm energy at the target location, dealing 309 Shock Damage to enemies in the area every 1 second for 15 seconds.\n \nYou or an ally standing within the nexus can activate the Conduit synergy, dealing 2698 Shock Damage to enemies around them.',
      baseSkillId: ClassSkillId.SORCERER_LIGHTNING_SPLASH,
    },
    {
      id: ClassSkillId.SORCERER_SURGE,
      name: 'Surge',
      type: 'active',
      icon: 'ability_sorcerer_surge',
      description:
        "Invoke Meridia's name to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 33 seconds.\n\nWhile active, dealing Critical Damage heals you for 2550 Health. This effect can occur once every 1 second.",
      baseSkillId: ClassSkillId.SORCERER_SURGE,
    },
    {
      id: ClassSkillId.SORCERER_CRITICAL_SURGE,
      name: 'Critical Surge',
      type: 'active',
      icon: 'ability_sorcerer_critical_surge',
      description:
        "Invoke Meridia's name to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 33 seconds.\n\nWhile active, dealing Critical Damage heals you for 3300 Health. This effect can occur once every 1 second.",
      baseSkillId: ClassSkillId.SORCERER_SURGE,
    },
    {
      id: ClassSkillId.SORCERER_POWER_SURGE,
      name: 'Power Surge',
      type: 'active',
      icon: 'ability_sorcerer_power_surge',
      description:
        "Invoke Meridia's name to gain Major Brutality and Major Sorcery, increasing your Weapon Damage and Spell Damage by 20% for 33 seconds.\n\nWhile active, activating a Critical heal causes the ability to heal you and your allies around you for 2550 Health. This effect can occur once every 3 seconds.",
      baseSkillId: ClassSkillId.SORCERER_SURGE,
    },
    {
      id: ClassSkillId.SORCERER_BOLT_ESCAPE,
      name: 'Bolt Escape',
      type: 'active',
      icon: 'ability_sorcerer_bolt_escape',
      description:
        'Transform yourself into pure energy and flash forward, stunning enemies near your final location for 3 seconds. \n\nThis effect cannot be blocked.\n\nCasting again within 4 seconds costs 33% more Magicka.',
      baseSkillId: ClassSkillId.SORCERER_BOLT_ESCAPE,
    },
    {
      id: ClassSkillId.SORCERER_BALL_OF_LIGHTNING,
      name: 'Ball of Lightning',
      type: 'active',
      icon: 'ability_sorcerer_ball_of_lightning',
      description:
        'Transform yourself into pure energy and flash forward. After reaching your location, you become immune to snare and immobilize effects for 2 seconds. A ball of lightning is summoned at your end point, which intercepts up to 1 projectile attack made against you every 1 second for 3 seconds.\n\nCasting again within 4 seconds costs 33% more Magicka.',
      baseSkillId: ClassSkillId.SORCERER_BOLT_ESCAPE,
    },
    {
      id: ClassSkillId.SORCERER_STREAK,
      name: 'Streak',
      type: 'active',
      icon: 'ability_sorcerer_streak',
      description:
        'Transform yourself into pure energy and flash forward, dealing 1438 Shock Damage to enemies in your wake and stunning them for 3 seconds.\n\nThis effect cannot be blocked.\n\nCasting again within 4 seconds costs 33% more Magicka.',
      baseSkillId: ClassSkillId.SORCERER_BOLT_ESCAPE,
    },
    {
      id: ClassSkillId.SORCERER_AMPLITUDE,
      name: 'Amplitude',
      type: 'passive',
      icon: 'ability_sorcerer_049',
      description:
        'Increases your damage done against enemies by 1% for every 10% current Health they have.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_CAPACITOR,
      name: 'Capacitor',
      type: 'passive',
      icon: 'ability_sorcerer_013',
      description: 'Increases your Health, Magicka, and Stamina Recovery by 141.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_ENERGIZED,
      name: 'Energized',
      type: 'passive',
      icon: 'ability_sorcerer_015',
      description: 'Increases your Physical and Shock Damage by 5%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_EXPERT_MAGE,
      name: 'Expert Mage',
      type: 'passive',
      icon: 'ability_sorcerer_044',
      description:
        'Increases your Weapon and Spell Damage by 108 for each Sorcerer ability slotted.',
      isPassive: true,
    },
  ],
};
