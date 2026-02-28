/**
 * Daedric Summoning — Sorcerer Skill Line
 * Source: https://eso-hub.com/en/skills/sorcerer/daedric-summoning
 * Regenerated: 2025-11-14T20:33:08.854Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const daedricSummoning: SkillLineData = {
  id: 'class.daedric-summoning',
  name: 'Daedric Summoning',
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_storm_atronach',
  sourceUrl: 'https://eso-hub.com/en/skills/sorcerer/daedric-summoning',
  skills: [
    {
      id: ClassSkillId.SORCERER_SUMMON_STORM_ATRONACH,
      name: 'Summon Storm Atronach',
      type: 'ultimate',
      icon: 'ability_sorcerer_storm_atronach',
      description:
        'Summon an immobile storm atronach at the target location. Its arrival deals 2249 Shock Damage and stuns enemies for 3 seconds. The atronach zaps the closest enemy, dealing 1124 Shock Damage every 1 second.\n\nAn ally near the atronach can activate the Charged Lightning synergy, granting nearby allies Major Berserk for 10 seconds, increasing their damage done by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_SUMMON_STORM_ATRONACH,
    },
    {
      id: ClassSkillId.SORCERER_GREATER_STORM_ATRONACH,
      name: 'Greater Storm Atronach',
      type: 'ultimate',
      icon: 'ability_sorcerer_greater_storm_atronach',
      description:
        'Summon an immobile storm atronach at the target location. Its arrival deals 2249 Shock Damage and stuns enemies for 3 seconds. The atronach zaps the closest enemy, dealing 1509 Shock Damage every 1 second.\n\nAn ally near the atronach can activate the Charged Lightning synergy, granting nearby allies Major Berserk for 10 seconds, increasing their damage done by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_SUMMON_STORM_ATRONACH,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_CHARGED_ATRONACH,
      name: 'Summon Charged Atronach',
      type: 'ultimate',
      icon: 'ability_sorcerer_endless_atronachs',
      description:
        'Summon an immobile storm atronach at the target location. Its arrival deals 2323 Shock Damage and stuns enemies for 3 seconds. The atronach calls upon a lightning storm every 2 seconds, dealing 2323 Shock Damage to enemies around it. \n\nEnemies hit are afflicted with the Concussion status effect.\n\nAn ally near the atronach can activate the Charged Lightning synergy, granting nearby allies Major Berserk for 10 seconds, increasing their damage done by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_SUMMON_STORM_ATRONACH,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_UNSTABLE_FAMILIAR,
      name: 'Summon Unstable Familiar',
      type: 'active',
      icon: 'ability_sorcerer_unstable_fimiliar',
      description:
        "Command the powers of Oblivion to send a Daedric familiar to fight at your side. The familiar's attacks deal 347 Shock Damage.\n\nOnce summoned, you can activate the familiar's special ability for 3510 Magicka, dealing 421 Shock Damage every 2 seconds for 20 seconds to enemies near them.\n\nThe familiar remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_UNSTABLE_FAMILIAR,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_UNSTABLE_CLANNFEAR,
      name: 'Summon Unstable Clannfear',
      type: 'active',
      icon: 'ability_sorcerer_unstable_clannfear',
      description:
        "Command the powers of Oblivion to send a Daedric clannfear to fight at your side. The clannfear's headbutt deals 358 Physical Damage, while its tail spike hits nearby enemies for 358 Physical Damage after 1 second.  \n\nOnce summoned, you can activate the clannfear's special ability for 4320 Magicka, healing you for 5121 and the clannfear for 2560.\n\nThe clannfear remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_UNSTABLE_FAMILIAR,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_VOLATILE_FAMILIAR,
      name: 'Summon Volatile Familiar',
      type: 'active',
      icon: 'ability_sorcerer_speedy_familiar',
      description:
        "Command the powers of Oblivion to send a Daedric familiar to fight at your side. The familiar's attacks deal 358 Shock Damage.\n\nOnce summoned, you can activate the familiar's special ability for 3510 Magicka, dealing 435 Shock Damage every 2 seconds for 20 seconds to enemies near them. The second hit stuns enemies hit for 3 seconds.\n\nThe familiar remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_UNSTABLE_FAMILIAR,
      alternateIds: [77182],
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_CURSE,
      name: 'Daedric Curse',
      type: 'active',
      icon: 'ability_sorcerer_daedric_curse',
      description:
        'Curse an enemy with a destructive rune, dealing 2904 Magic Damage to the target and all other nearby enemies after 6 seconds.\n\nYou can have only one Daedric Curse active at a time.',
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_CURSE,
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_PREY,
      name: 'Daedric Prey',
      type: 'active',
      icon: 'ability_sorcerer_explosive_curse',
      description:
        'Curse an enemy with a destructive rune, dealing 2904 Magic Damage to the target and all other nearby enemies after 6 seconds.\n\nWhile the curse is active, your Daedric Summoning pets prioritize the target and deal an additional 50% damage to them.\n\nYou can have only one Daedric Prey active at a time.',
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_CURSE,
    },
    {
      id: ClassSkillId.SORCERER_HAUNTING_CURSE,
      name: 'Haunting Curse',
      type: 'active',
      icon: 'ability_sorcerer_velocious_curse',
      description:
        'Curse an enemy with a destructive rune, dealing 2999 Magic Damage to the target and all other nearby enemies after 3.5 seconds.\n\nThe curse will continue to haunt the enemy and explode a second time, dealing 2999 Magic Damage to the target and all other nearby enemies after an additional 8.5 seconds.\n\nYou can have only one Haunting Curse active at a time.',
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_CURSE,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_WINGED_TWILIGHT,
      name: 'Summon Winged Twilight',
      type: 'active',
      icon: 'ability_sorcerer_lightning_prey',
      description:
        "Call on Azura to send a winged twilight to fight at your side. The winged twilight's zap deals 347 Shock Damage and its kick deals 347 Shock Damage.\n\nOnce summoned, you can activate the winged twilight's special ability for 4590 Magicka, causing it to heal a friendly target for 3486 and itself for 1742.\n\nThe winged twilight remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_WINGED_TWILIGHT,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_TWILIGHT_MATRIARCH,
      name: 'Summon Twilight Matriarch',
      type: 'active',
      icon: 'ability_sorcerer_storm_prey',
      description:
        "Call on Azura to send a twilight matriarch to fight at your side. The twilight matriarch's zap deals 347 Shock Damage and its kick deals 347 Shock Damage.\n\nOnce summoned, you can activate the twilight matriarch's special ability for 4590 Magicka, causing it to heal 2 friendly targets for 3600 and itself for 1799.\n\nThe twilight matriarch remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_WINGED_TWILIGHT,
    },
    {
      id: ClassSkillId.SORCERER_SUMMON_TWILIGHT_TORMENTOR,
      name: 'Summon Twilight Tormentor',
      type: 'active',
      icon: 'ability_sorcerer_lightning_matriarch',
      description:
        "Call on Azura to send a twilight tormentor to fight at your side. The twilight tormentor's zap deals 478 Shock Damage and its kick deals 478 Shock Damage.\n\nOnce summoned, you can activate the twilight tormentor's special ability for 2700 Magicka, causing it to deal 60% more damage to enemies above 50% Health for 20 seconds.\n\nThe twilight tormentor remains until killed or unsummoned.",
      baseSkillId: ClassSkillId.SORCERER_SUMMON_WINGED_TWILIGHT,
      alternateIds: [77140],
    },
    {
      id: ClassSkillId.SORCERER_CONJURED_WARD,
      name: 'Conjured Ward',
      type: 'active',
      icon: 'ability_sorcerer_hurricane',
      description:
        'Conjure globes of Daedric energy for protection, granting a damage shield for you and your pets that absorbs 5454 damage for 6 seconds.\n\nThis ability scales off the higher of your Max Health or Magicka and the shield is capped at 55% of your Max Health.',
      baseSkillId: ClassSkillId.SORCERER_CONJURED_WARD,
    },
    {
      id: ClassSkillId.SORCERER_HARDENED_WARD,
      name: 'Hardened Ward',
      type: 'active',
      icon: 'ability_sorcerer_typhoon',
      description:
        'Conjure globes of Daedric energy for protection, granting a damage shield for you and your pets that absorbs 7323 damage for 6 seconds.\n\nThis ability scales off the higher of your Max Health or Magicka and the shield is capped at 72% of your Max Health.',
      baseSkillId: ClassSkillId.SORCERER_CONJURED_WARD,
    },
    {
      id: ClassSkillId.SORCERER_REGENERATIVE_WARD,
      name: 'Regenerative Ward',
      type: 'active',
      icon: 'ability_sorcerer_tempest',
      description:
        'Conjure globes of Daedric energy for protection, granting a damage shield for you and your pets that absorbs 5454 damage for 10 seconds, heals you for 826 Health, and grants Minor Intellect and Minor Endurance to you and nearby allies for 10 seconds.\n\nThis ability scales off the higher of your Max Health or Magicka and the shield is capped at 55% of your Max Health.',
      baseSkillId: ClassSkillId.SORCERER_CONJURED_WARD,
    },
    {
      id: ClassSkillId.SORCERER_BOUND_ARMOR,
      name: 'Bound Armor',
      type: 'active',
      icon: 'ability_sorcerer_bound_armor',
      description:
        'Protect yourself with the power of Oblivion, creating a suit of Daedric mail that increases your block mitigation by 36% for 3 seconds. The duration is based on your combined Physical and Spell Resistance.\n\nWhile slotted on either ability bar, you gain Minor Protection, reducing your damage taken by 5%.',
      baseSkillId: ClassSkillId.SORCERER_BOUND_ARMOR,
    },
    {
      id: ClassSkillId.SORCERER_BOUND_AEGIS,
      name: 'Bound Aegis',
      type: 'active',
      icon: 'ability_sorcerer_bound_aegis',
      description:
        'Protect yourself with the power of Oblivion, creating a suit of Daedric mail that increases your block mitigation by 50% for 3 seconds. The duration is based on your combined Physical and Spell Resistance.\n\nWhen slotted on either bar, you gain Minor Protection and Minor Resolve, reducing your damage taken by 5% and increasing your Armor by 2974.',
      baseSkillId: ClassSkillId.SORCERER_BOUND_ARMOR,
    },
    {
      id: ClassSkillId.SORCERER_BOUND_ARMAMENTS,
      name: 'Bound Armaments',
      type: 'active',
      icon: 'ability_sorcerer_bound_armaments',
      description:
        'When slotted on either bar, you gain Major Prophecy and Major Savagery, increasing your Critical Rating by 2629.\n\nYour Light and Heavy Attacks now generate a stack of Bound Armaments for 10 seconds, up to 8 times. Fully-charged Heavy Attacks grant two stacks.\n\nWhen at one or more stacks, you can arm up to 4 of them to strike your target for 863 Physical Damage every 0.3 seconds for each stack of Bound Armaments consumed.',
      baseSkillId: ClassSkillId.SORCERER_BOUND_ARMOR,
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_PROTECTION,
      name: 'Daedric Protection',
      type: 'passive',
      icon: 'ability_sorcerer_022',
      description:
        'Reduce your damage taken by 5% while you have a Daedric Summoning ability active.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_EXPERT_SUMMONER,
      name: 'Expert Summoner',
      type: 'passive',
      icon: 'ability_sorcerer_019',
      description:
        'Increases your Magicka and Stamina by 5%. Increases your Max Health by 5% if you have a permanent pet active.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_POWER_STONE,
      name: 'Power Stone',
      type: 'passive',
      icon: 'ability_sorcerer_057',
      description: 'Reduces the cost of your Ultimate abilities by 15%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_REBATE,
      name: 'Rebate',
      type: 'passive',
      icon: 'ability_sorcerer_056',
      description:
        "You restore 371 Magicka or Stamina when one of your non-Ultimate Daedric Summoning abilities end. The resource returned is dictated by the ability's cost.",
      isPassive: true,
    },
  ],
};
