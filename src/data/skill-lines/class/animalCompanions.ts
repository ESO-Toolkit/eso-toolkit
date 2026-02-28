/**
 * Animal Companions — Warden Skill Line
 * Source: https://eso-hub.com/en/skills/warden/animal-companions
 * Regenerated: 2025-11-14T20:33:08.874Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const animalCompanions: SkillLineData = {
  id: 'class.animal-companions',
  name: 'Animal Companions',
  class: 'Warden',
  category: 'class',
  icon: 'ability_warden_018',
  sourceUrl: 'https://eso-hub.com/en/skills/warden/animal-companions',
  skills: [
    {
      id: ClassSkillId.WARDEN_FERAL_GUARDIAN,
      name: 'Feral Guardian',
      type: 'ultimate',
      icon: 'ability_warden_018',
      description:
        "Rouse a grizzly to fight by your side. The grizzly swipes at an enemy, dealing 580 Magic Damage, and sometimes swipes all enemies in front of it, dealing 2323 Magic Damage and stunning them for 2 seconds.\n\nOnce summoned you can activate Guardian's Wrath for 75 Ultimate, causing the grizzly to maul an enemy for 3253 Magic Damage. Deals 100% more damage to enemies below 25% Health.",
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_FERAL_GUARDIAN,
    },
    {
      id: ClassSkillId.WARDEN_ETERNAL_GUARDIAN,
      name: 'Eternal Guardian',
      type: 'ultimate',
      icon: 'ability_warden_018_b',
      description:
        "Rouse a grizzly to fight by your side. The grizzly swipes an enemy, dealing 599 Magic Damage, and sometimes swipes all enemies in front of it, dealing 2399 Magic Damage and stunning them for 2 seconds.\n\nOnce summoned you can activate Guardian's Wrath for 75 Ultimate, causing the grizzly to maul an enemy for 3360 Magic Damage. Deals 150% more damage to enemies below 25% Health.\n\n The grizzly respawns when killed, once per minute.",
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_FERAL_GUARDIAN,
    },
    {
      id: ClassSkillId.WARDEN_WILD_GUARDIAN,
      name: 'Wild Guardian',
      type: 'ultimate',
      icon: 'ability_warden_018_c',
      description:
        "Rouse a grizzly to fight by your side. The grizzly swipes at an enemy, dealing 659 Bleed Damage, and sometimes swipes all enemies in front of it, dealing 2640 Bleed Damage and stunning them for 2 seconds.\n\nOnce summoned you can activate Guardian's Savagery for 75 Ultimate, to maul an enemy for 3697 Bleed Damage. Deals 100% more damage to enemies below 25% Health.\n\nThe damage has a higher chance to apply the Hemorrhaging status effect.",
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_FERAL_GUARDIAN,
      alternateIds: [92160, 92161, 92162, 92163],
    },
    {
      id: ClassSkillId.WARDEN_BETTY_NETCH,
      name: 'Betty Netch',
      type: 'active',
      icon: 'ability_warden_017_a',
      description:
        'Call a betty netch to your side, which grants you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 22 seconds.\n\nEvery 5 seconds, the netch removes 1 negative effect from you. If no negative effects are removed you instead increase your damage done by 5% for 5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_BETTY_NETCH,
    },
    {
      id: ClassSkillId.WARDEN_BLUE_BETTY,
      name: 'Blue Betty',
      type: 'active',
      icon: 'ability_warden_017',
      description:
        'Call a betty netch to your side, which restores 4416 Magicka to you over 25 seconds and grants you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.\n\nEvery 5 seconds, the netch removes 1 negative effect from you. If no negative effects are removed you instead increase your damage done by 5% for 5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_BETTY_NETCH,
    },
    {
      id: ClassSkillId.WARDEN_BULL_NETCH,
      name: 'Bull Netch',
      type: 'active',
      icon: 'ability_warden_017_b',
      description:
        'Call a bull netch to your side, which restores 4416 Stamina to you over 25 seconds and grants you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.\n\nEvery 5 seconds, the netch removes 1 negative effect from you. If no negative effects are removed you instead increase your damage done by 5% for 5 seconds',
      baseSkillId: ClassSkillId.WARDEN_BETTY_NETCH,
    },
    {
      id: ClassSkillId.WARDEN_DIVE,
      name: 'Dive',
      type: 'active',
      icon: 'ability_warden_013',
      description:
        'Command a cliff racer to dive bomb an enemy, dealing 2090 Magic Damage.\n\nIf you are more than 7 meters away from the target, you set them Off Balance for 7 seconds.',
      baseSkillId: ClassSkillId.WARDEN_DIVE,
    },
    {
      id: ClassSkillId.WARDEN_SCREAMING_CLIFF_RACER,
      name: 'Screaming Cliff Racer',
      type: 'active',
      icon: 'ability_warden_013_a',
      description:
        'Command a cliff racer to dive bomb an enemy, dealing 2160 Magic Damage.\n\nIf you are more than 7 meters away from the target, you set them Off Balance for 7 seconds.\n\nAfter dealing damage you increase your Weapon and Spell Damage by 100 for 10 seconds, which quadruples after damaging Off Balance enemies.',
      baseSkillId: ClassSkillId.WARDEN_DIVE,
    },
    {
      id: ClassSkillId.WARDEN_CUTTING_DIVE,
      name: 'Cutting Dive',
      type: 'active',
      icon: 'ability_warden_013_b',
      description:
        'Command a cliff racer to dive bomb an enemy, dealing 2091 Bleed Damage immediately and then causing them to bleed for 2140 Bleed Damage over 10 seconds.\n\nIf you are more than 7 meters away from the target, you set them Off Balance for 7 seconds.',
      baseSkillId: ClassSkillId.WARDEN_DIVE,
    },
    {
      id: ClassSkillId.WARDEN_SCORCH,
      name: 'Scorch',
      type: 'active',
      icon: 'ability_warden_015',
      description:
        'Stir a group of shalk that attack after 3 seconds, dealing 2509 Magic Damage to enemies in front of you.\n\nAfter the shalk complete their attack, they burrow underground for 6 seconds and then resurface again, dealing 3486 Magic Damage to enemies in front of you.',
      baseSkillId: ClassSkillId.WARDEN_SCORCH,
    },
    {
      id: ClassSkillId.WARDEN_DEEP_FISSURE,
      name: 'Deep Fissure',
      type: 'active',
      icon: 'ability_warden_015_a',
      description:
        'Stir a group of shalk that attack after 3 seconds, dealing 2591 Magic Damage to enemies in front of you.\n\nAfter the shalk complete their attack, they burrow underground for 6 seconds and then resurface again, dealing 3600 Magic Damage to enemies in front of you.\n\nEnemies damaged are afflicted with Major and Minor Breach, reducing their Physical and Spell Resistance by 5948 and 2974 for 10 seconds.',
      baseSkillId: ClassSkillId.WARDEN_SCORCH,
    },
    {
      id: ClassSkillId.WARDEN_SUBTERRANEAN_ASSAULT,
      name: 'Subterranean Assault',
      type: 'active',
      icon: 'ability_warden_015_b',
      description:
        'Stir a group of shalk that attack after 3 seconds, dealing 2591 Poison Damage to enemies in front of you.\n\nAfter the shalk complete their attack, they burrow underground for 3 seconds and then resurface again, dealing 2591 Poison Damage to enemies in front of you.',
      baseSkillId: ClassSkillId.WARDEN_SCORCH,
      alternateIds: [86019],
    },
    {
      id: ClassSkillId.WARDEN_SWARM,
      name: 'Swarm',
      type: 'active',
      icon: 'ability_warden_014',
      description:
        "Unleash a swarm of fetcherflies to relentlessly attack an enemy, dealing 4631 Magic Damage over 20 seconds.  \n\nThe fetcherflies rip through the enemy's flesh, afflicting them with Minor Vulnerability for the duration, increasing their damage taken by 5%.",
      baseSkillId: ClassSkillId.WARDEN_SWARM,
    },
    {
      id: ClassSkillId.WARDEN_FETCHER_INFECTION,
      name: 'Fetcher Infection',
      type: 'active',
      icon: 'ability_warden_014_a',
      description:
        "Unleash a swarm of fetcherflies to relentlessly attack an enemy, dealing 4785 Magic Damage over 20 seconds.\n\nEvery second cast of this ability deals 60% increased damage.\n\nThe fetcherflies rip through the enemy's flesh, afflicting them with Minor Vulnerability for the duration, increasing their damage taken by 5%.",
      baseSkillId: ClassSkillId.WARDEN_SWARM,
    },
    {
      id: ClassSkillId.WARDEN_GROWING_SWARM,
      name: 'Growing Swarm',
      type: 'active',
      icon: 'ability_warden_014_b',
      description:
        "Unleash a swarm of fetcherflies to relentlessly attack an enemy, causing them to bleed for 4785 Bleed Damage over 20 seconds. \n\nThe fetcherflies rip through the original enemy's flesh, afflicting them with Minor Vulnerability for the duration, increasing their damage taken by 5%.\n\nEnemies near the carrier take 435 Bleed Damage every 2 seconds for the duration.\n\nYou can only have one Growing Swarm active at a time.",
      baseSkillId: ClassSkillId.WARDEN_SWARM,
    },
    {
      id: ClassSkillId.WARDEN_FALCON_S_SWIFTNESS,
      name: "Falcon's Swiftness",
      type: 'active',
      icon: 'ability_warden_016',
      description:
        'Invoke the spirit of agility to gain Major Expedition for 6 seconds, increasing your Movement Speed by 30%.\n\nGain immunity to snares and immobilizations for 4 seconds.',
      baseSkillId: ClassSkillId.WARDEN_FALCON_S_SWIFTNESS,
    },
    {
      id: ClassSkillId.WARDEN_BIRD_OF_PREY,
      name: 'Bird of Prey',
      type: 'active',
      icon: 'ability_warden_016_a',
      description:
        'Invoke the spirit of agility to gain Major Expedition for 6 seconds, increasing your Movement Speed by 30%.\n\nGain immunity to snares and immobilizations for 4 seconds.\n\nWhile slotted you gain Minor Berserk, increasing your damage done by 5%.',
      baseSkillId: ClassSkillId.WARDEN_FALCON_S_SWIFTNESS,
    },
    {
      id: ClassSkillId.WARDEN_DECEPTIVE_PREDATOR,
      name: 'Deceptive Predator',
      type: 'active',
      icon: 'ability_warden_016_b',
      description:
        'Invoke the spirit of agility to gain Major Expedition for 6 seconds, increasing your Movement Speed by 30%.\n\nGain immunity to snares and immobilizations for 4 seconds.\n\nWhile slotted you gain Minor Evasion, reducing damage from area attacks by 10%.',
      baseSkillId: ClassSkillId.WARDEN_FALCON_S_SWIFTNESS,
    },
    {
      id: ClassSkillId.WARDEN_ADVANCED_SPECIES,
      name: 'Advanced Species',
      type: 'passive',
      icon: 'passive_warden_011',
      description:
        'Increases your Critical Damage by 5% for each Animal Companion ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_BOND_WITH_NATURE,
      name: 'Bond with Nature',
      type: 'passive',
      icon: 'passive_warden_010',
      description:
        'Anytime one of your Animal Companion skills end, you are healed for 1530 Health.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_FLOURISH,
      name: 'Flourish',
      type: 'passive',
      icon: 'passive_warden_012',
      description: 'Increases your Magicka and Stamina recovery by 20%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_SAVAGE_BEAST,
      name: 'Savage Beast',
      type: 'passive',
      icon: 'passive_warden_009',
      description:
        'Casting an Animal Companions ability while are in combat generates 4 Ultimate. This effect can occur once every 8 seconds.',
      isPassive: true,
    },
  ],
};
