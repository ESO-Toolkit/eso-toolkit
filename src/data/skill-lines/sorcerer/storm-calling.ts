/**
 * Storm Calling Skill Line
 * Class: Sorcerer
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const stormCalling: SkillLineData = {
  id: 'sorcerer-storm-calling',
  name: 'Storm Calling',
  class: 'Sorcerer',
  category: 'class',
  icon: 'storm-calling-icon',
  skills: [
    // Ultimate abilities
    {
      id: 24828,
      name: 'Overload',
      type: 'ultimate',
      baseAbilityId: 24828,
    },
    {
      id: 24834,
      name: 'Energy Overload',
      type: 'ultimate',
      baseAbilityId: 24828,
    },
    {
      id: 24830,
      name: 'Power Overload',
      type: 'ultimate',
      baseAbilityId: 24828,
    },

    // Active abilities
    {
      id: 23182,
      name: "Mages' Fury",
      type: 'active',
      baseAbilityId: 23182,
    },
    {
      id: 23200,
      name: 'Endless Fury',
      type: 'active',
      baseAbilityId: 23182,
    },
    {
      id: 23205,
      name: "Mages' Wrath",
      type: 'active',
      baseAbilityId: 23182,
    },
    {
      id: 23210,
      name: 'Lightning Form',
      type: 'active',
      baseAbilityId: 23210,
    },
    {
      id: 23231,
      name: 'Boundless Storm',
      type: 'active',
      baseAbilityId: 23210,
    },
    {
      id: 23213,
      name: 'Hurricane',
      type: 'active',
      baseAbilityId: 23210,
    },
    {
      id: 23217,
      name: 'Lightning Splash',
      type: 'active',
      baseAbilityId: 23217,
    },
    {
      id: 23229,
      name: 'Lightning Flood',
      type: 'active',
      baseAbilityId: 23217,
    },
    {
      id: 23235,
      name: 'Liquid Lightning',
      type: 'active',
      baseAbilityId: 23217,
    },
    {
      id: 23678,
      name: 'Surge',
      type: 'active',
      baseAbilityId: 23678,
    },
    {
      id: 23679,
      name: 'Critical Surge',
      type: 'active',
      baseAbilityId: 23678,
    },
    {
      id: 23681,
      name: 'Power Surge',
      type: 'active',
      baseAbilityId: 23678,
    },
    {
      id: 23236,
      name: 'Bolt Escape',
      type: 'active',
      baseAbilityId: 23236,
    },
    {
      id: 23274,
      name: 'Ball of Lightning',
      type: 'active',
      baseAbilityId: 23236,
    },
    {
      id: 23277,
      icon: 'ability_sorcerer_ball_of_lightning',
      name: 'Streak',
      type: 'active',
      baseAbilityId: 23236,
    },

    // Passive abilities
    {
      id: 23239,
      icon: 'ability_sorcerer_streak',
      alternateIds: [31419, 45188, 90683],
      name: 'Capacitor',
      type: 'passive',
      baseAbilityId: 23239,
    },
    {
      id: 23242,
      alternateIds: [31421, 45190],
      icon: 'ability_sorcerer_015',
      name: 'Energized',
      type: 'passive',
      baseAbilityId: 23242,
    },
    {
      id: 45583,
      icon: 'ability_sorcerer_065',
      alternateIds: [31422, 45192],
      name: 'Amplitude',
      type: 'passive',
      baseAbilityId: 45583,
    },
    {
      id: 23252,
      alternateIds: [31425, 45195],
      icon: 'ability_sorcerer_044',
      name: 'Expert Mage',
      type: 'passive',
      baseAbilityId: 23252,
    },
  ],
};
