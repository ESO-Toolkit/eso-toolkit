/**
 * Dawn's Wrath — Templar Skill Line
 * Source: https://eso-hub.com/en/skills/templar/dawn-s-wrath
 * Regenerated: 2025-11-14T20:33:08.864Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const dawnsWrath: SkillLineData = {
  id: 'class.dawn-s-wrath',
  name: "Dawn's Wrath",
  class: 'Templar',
  category: 'class',
  icon: 'ability_templar_nova',
  sourceUrl: 'https://eso-hub.com/en/skills/templar/dawn-s-wrath',
  skills: [
    {
      id: ClassSkillId.TEMPLAR_NOVA,
      name: 'Nova',
      type: 'ultimate',
      icon: 'ability_templar_nova',
      description:
        'Call down a fragment of the sun, dealing 1161 Magic Damage every 1 second for 8 seconds to enemies in the area and afflicting them with Major Maim, reducing their damage done by 10%.\n\nAn ally near the fragment can activate the Supernova synergy, dealing 2607 Magic Damage to all enemies in the area and stunning them for 3 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_NOVA,
    },
    {
      id: ClassSkillId.TEMPLAR_SOLAR_PRISON,
      name: 'Solar Prison',
      type: 'ultimate',
      icon: 'ability_templar_solar_prison',
      description:
        'Call down a fragment of the sun, dealing 1199 Magic Damage every 1 second for 8 seconds to enemies in the area and afflicting them with Major Maim, reducing their damage done by 10%.\n\nAn ally near the fragment can activate the Gravity Crush synergy, dealing 5215 Magic Damage to all enemies in the area and stunning them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_NOVA,
    },
    {
      id: ClassSkillId.TEMPLAR_SOLAR_DISTURBANCE,
      name: 'Solar Disturbance',
      type: 'ultimate',
      icon: 'ability_templar_solar_disturbance',
      description:
        'Call down a fragment of the sun, dealing 1161 Magic Damage every 1 second for 8 seconds to enemies in the area and applying Major Maim to them for 10 seconds, reducing their damage done by 10%.\n\nAn ally near the fragment can activate the Supernova synergy, dealing 2607 Magic Damage to all enemies in the area and stunning them for 3 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_NOVA,
    },
    {
      id: ClassSkillId.TEMPLAR_SUN_FIRE,
      name: 'Sun Fire',
      type: 'active',
      icon: 'ability_templar_sun_fire',
      description:
        'Blast an enemy with a charge of radiant heat, dealing 1161 Flame Damage, and an additional 3470 Flame Damage over 20 seconds.\n\nUpon activation you gain Major Savagery and Major Prophecy for 20 seconds, increasing your Weapon and Spell Critical rating by 2629.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_FIRE,
    },
    {
      id: ClassSkillId.TEMPLAR_VAMPIRE_S_BANE,
      name: "Vampire's Bane",
      type: 'active',
      icon: 'ability_templar_vampire_bane',
      description:
        'Blast an enemy with a charge of radiant heat, dealing 1161 Flame Damage, and an additional 5370 Flame Damage over 30 seconds.\n\nUpon activation you gain Major Savagery and Major Prophecy for 30 seconds, increasing your Weapon and Spell Critical rating by 2629.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_FIRE,
    },
    {
      id: ClassSkillId.TEMPLAR_REFLECTIVE_LIGHT,
      name: 'Reflective Light',
      type: 'active',
      icon: 'ability_templar_reflective_light',
      description:
        'Blast up to three enemies with a charge of radiant heat, dealing 1199 Flame Damage, an additional 3470 Flame Damage over 20 seconds, and reducing their Movement Speed by 40% for 3 seconds.\n\nUpon activation you gain Major Savagery and Major Prophecy for 20 seconds, increasing your Weapon and Spell Critical rating by 2629.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_FIRE,
    },
    {
      id: ClassSkillId.TEMPLAR_SOLAR_FLARE,
      name: 'Solar Flare',
      type: 'active',
      icon: 'ability_templar_solar_flare',
      description:
        'Conjure a ball of solar energy to heave at an enemy, dealing 2404 Magic Damage and increasing your damage done with class abilities by 5% for 10 seconds.\n\nAlso grants you Empower for 10 seconds, increasing the damage of your Heavy Attacks against monsters by 70%.',
      baseSkillId: ClassSkillId.TEMPLAR_SOLAR_FLARE,
    },
    {
      id: ClassSkillId.TEMPLAR_DARK_FLARE,
      name: 'Dark Flare',
      type: 'active',
      icon: 'ability_templar_dark_flare',
      description:
        'Conjure a ball of solar energy to heave at an enemy, dealing 2483 Magic Damage and increasing your damage done with class abilities by 5% for 10 seconds.\n\nAfflicts the target and enemies within 8 meters with Major Defile, reducing their healing received and damage shield strength by 12% for 4 seconds.\n \nAlso grants you Empower for 10 seconds, increasing the damage of your Heavy Attacks against monsters by 70%.',
      baseSkillId: ClassSkillId.TEMPLAR_SOLAR_FLARE,
    },
    {
      id: ClassSkillId.TEMPLAR_SOLAR_BARRAGE,
      name: 'Solar Barrage',
      type: 'active',
      icon: 'ability_templar_solar_power',
      description:
        'Conjure solar energy to blast enemies around you, dealing 435 Magic Damage every 2 seconds and increasing your damage done with class abilities by 5% for 20 seconds.\n\nWhile this ability is active you gain Empower, increasing the damage of your Heavy Attacks against monsters by 70%.',
      baseSkillId: ClassSkillId.TEMPLAR_SOLAR_FLARE,
    },
    {
      id: ClassSkillId.TEMPLAR_BACKLASH,
      name: 'Backlash',
      type: 'active',
      icon: 'ability_templar_backlash',
      description:
        'Summon an expanding beam of pure sunlight to doom an enemy, dealing 1161 Magic Damage immediately and marking them for 6 seconds.\n\nAfter the duration ends, the sunlight bursts, dealing 1284 Magic Damage to the enemy, which increases based on the amount of damage you dealt to them over the duration, up to 200%.\n\nYou can have only one Backlash active at a time.',
      baseSkillId: ClassSkillId.TEMPLAR_BACKLASH,
    },
    {
      id: ClassSkillId.TEMPLAR_PURIFYING_LIGHT,
      name: 'Purifying Light',
      type: 'active',
      icon: 'ability_templar_purifying_light',
      description:
        'Summon an expanding beam of pure sunlight to doom an enemy, dealing 1161 Magic Damage immediately and marking them for 6 seconds.\n\nAfter the duration ends, the sunlight bursts, dealing 1285 Magic Damage, which increases based on the amount of damage you dealt to them over the duration, up to 200%. Also heals you and nearby allies in the area for 599 Health every 2 seconds, over 10 seconds.\n\nYou can have only one Purifying Light at a time.',
      baseSkillId: ClassSkillId.TEMPLAR_BACKLASH,
    },
    {
      id: ClassSkillId.TEMPLAR_POWER_OF_THE_LIGHT,
      name: 'Power of the Light',
      type: 'active',
      icon: 'ability_templar_power_of_the_light',
      description:
        'Summon an expanding beam of pure sunlight to doom an enemy, dealing 1161 Physical Damage immediately and marking them for 6 seconds.\n\nAfter the duration ends, the sunlight bursts, dealing 1285 Physical Damage to the enemy, which increases based on the amount of damage you dealt to them over the duration, up to 200%.\n\nYou can have only one Power of the Light active at a time, and each hit of the ability applies the Sundered status effect.',
      baseSkillId: ClassSkillId.TEMPLAR_BACKLASH,
    },
    {
      id: ClassSkillId.TEMPLAR_ECLIPSE,
      name: 'Eclipse',
      type: 'active',
      icon: 'ability_templar_eclipse',
      description:
        'Envelop an enemy in a lightless sphere for 4 seconds, that harms them with growing intensity anytime they use a direct damage attack. Limited to one.\n\nTheir first attack reduces their Movement Speed by 30% for 4 seconds, their second attack immobilizes them for 3 seconds, and their third attack stuns them for 3 seconds. The effects can activate once every 1 second.',
      baseSkillId: ClassSkillId.TEMPLAR_ECLIPSE,
    },
    {
      id: ClassSkillId.TEMPLAR_UNSTABLE_CORE,
      name: 'Unstable Core',
      type: 'active',
      icon: 'ability_templar_total_dark',
      description:
        'Envelop an enemy in a lightless sphere for 4 seconds, that harms them with growing intensity anytime they deal direct damage. Limited to one.\n\nTheir first attack reduces their Movement Speed by 30% for 4 seconds and deals 449 Magic Damage, their second attack immobilizes them for 3 seconds and deals 898 Magic Damage, and their third attack stuns them for 3 seconds and deals 1799 Magic Damage. The effects can activate once every 1 second.',
      baseSkillId: ClassSkillId.TEMPLAR_ECLIPSE,
    },
    {
      id: ClassSkillId.TEMPLAR_LIVING_DARK,
      name: 'Living Dark',
      type: 'active',
      icon: 'ability_templar_unstable_core',
      description:
        'Envelop yourself in a lightless sphere for 10 seconds to protect yourself. Anytime you take direct damage, the sphere lashes back at the attacker, reducing their Movement Speed by 40% for 3 seconds and healing you for 2066 Health. These effects can occur once every half second.',
      baseSkillId: ClassSkillId.TEMPLAR_ECLIPSE,
    },
    {
      id: ClassSkillId.TEMPLAR_RADIANT_DESTRUCTION,
      name: 'Radiant Destruction',
      type: 'active',
      icon: 'ability_templar_over_exposure',
      description:
        'Burn an enemy with a ray of holy fire, dealing 7248 Magic Damage over 3.8 seconds. Deals up to 500% more damage to enemies below 33% Health.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.TEMPLAR_RADIANT_DESTRUCTION,
    },
    {
      id: ClassSkillId.TEMPLAR_RADIANT_GLORY,
      name: 'Radiant Glory',
      type: 'active',
      icon: 'ability_templar_under_exposure',
      description:
        'Burn an enemy with a ray of holy fire, dealing 7482 Magic Damage over 3.8 seconds. Deals up to 500% more damage to enemies below 33% Health.\n\nYou heal for 15% of the damage inflicted.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.TEMPLAR_RADIANT_DESTRUCTION,
    },
    {
      id: ClassSkillId.TEMPLAR_RADIANT_OPPRESSION,
      name: 'Radiant Oppression',
      type: 'active',
      icon: 'ability_templar_stendarr_aura',
      description:
        'Burn an enemy with a ray of holy fire, dealing 7482 Magic Damage over 3.8 seconds. Deals up to 500% more damage to enemies below 40% Health.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.TEMPLAR_RADIANT_DESTRUCTION,
    },
    {
      id: ClassSkillId.TEMPLAR_ENDURING_RAYS,
      name: 'Enduring Rays',
      type: 'passive',
      icon: 'ability_templar_020',
      description:
        'Increases the duration of your Sun Fire, Eclipse, Solar Flare, and Nova abilities by 2 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_ILLUMINATE,
      name: 'Illuminate',
      type: 'passive',
      icon: 'ability_templar_012',
      description:
        "Casting a Dawn's Wrath ability grants Minor Sorcery to you and your group for 20 seconds, increasing your Spell Damage by 10%.",
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_PRISM,
      name: 'Prism',
      type: 'passive',
      icon: 'ability_templar_031',
      description:
        "Casting a Dawn's Wrath ability while in combat generates 3 Ultimate. This effect can occur once every 6 seconds.",
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_RESTORING_SPIRIT,
      name: 'Restoring Spirit',
      type: 'passive',
      icon: 'ability_templar_014',
      description:
        'Reduces the Health, Magicka, Stamina, and Ultimate costs of your abilities by 5%.',
      isPassive: true,
    },
  ],
};
