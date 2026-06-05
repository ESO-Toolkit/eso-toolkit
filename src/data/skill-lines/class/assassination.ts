/**
 * Assassination — Nightblade Skill Line
 * Regenerated: 2025-11-14T20:33:08.826Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const assassination: SkillLineData = {
  id: 'class.assassination',
  name: 'Assassination',
  class: 'Nightblade',
  category: 'class',
  icon: 'ability_nightblade_007',
  skills: [
    {
      id: ClassSkillId.NIGHTBLADE_DEATH_STROKE,
      name: 'Death Stroke',
      type: 'ultimate',
      icon: 'ability_nightblade_007',
      description:
        'Ravage an enemy with a swift strike, dealing 3598 Magic Damage and causing them to take 20% more damage from your attacks for 8 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_DEATH_STROKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_INCAPACITATING_STRIKE,
      name: 'Incapacitating Strike',
      type: 'ultimate',
      icon: 'ability_nightblade_007_a',
      description:
        'Ravage an enemy with a swift strike, dealing 3718 Disease Damage and causing them to take 20% more damage from your attacks for 8 seconds.\n\nIf cast with 120 or more Ultimate, you instead deal 4089 Disease Damage, stun the enemy for 3 seconds, and increase the duration of the damage taken effect to 12 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_DEATH_STROKE,
      alternateIds: [113105],
    },
    {
      id: ClassSkillId.NIGHTBLADE_SOUL_HARVEST,
      name: 'Soul Harvest',
      type: 'ultimate',
      icon: 'ability_nightblade_007_b',
      description:
        'Ravage an enemy with a spinning attack, dealing 3718 Magic Damage and increasing your damage against them by 20% for 8 seconds.\n\nAlso afflicts the enemy with Major Defile, reducing their healing received and damage shield strength by 12%.\n\nWhile slotted on either bar, any time you kill an enemy you gain 7 Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_DEATH_STROKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_ASSASSIN_S_BLADE,
      name: "Assassin's Blade",
      type: 'active',
      icon: 'ability_nightblade_017',
      description:
        'Thrust a magic blade with lethal precision to stab an enemy, dealing 1161 Magic Damage. Deals 300% more damage to enemies below 25% Health.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASSASSIN_S_BLADE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_KILLER_S_BLADE,
      name: "Killer's Blade",
      type: 'active',
      icon: 'ability_nightblade_017_a',
      description:
        'Thrust a caustic blade with lethal precision to stab an enemy, dealing 1161 Disease Damage. Deals up to 400% more damage to enemies with less than 50% Health.\n\nHeals you for 2399 if the enemy dies within 2 seconds of being struck.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASSASSIN_S_BLADE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_IMPALE,
      name: 'Impale',
      type: 'active',
      icon: 'ability_nightblade_017_b',
      description:
        'Throw a magic blade with lethal precision to strike an enemy, dealing 1161 Magic Damage. Deals 330% more damage to enemies below 25% Health.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASSASSIN_S_BLADE,
      alternateIds: [34851],
    },
    {
      id: ClassSkillId.NIGHTBLADE_TELEPORT_STRIKE,
      name: 'Teleport Strike',
      type: 'active',
      icon: 'ability_nightblade_008',
      description:
        'Flash through the shadows and ambush an enemy, dealing 1551 Magic Damage and afflicting them with Minor Vulnerability for 10 seconds, increasing their damage taken by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_TELEPORT_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_AMBUSH,
      name: 'Ambush',
      type: 'active',
      icon: 'ability_nightblade_008_b',
      description:
        'Flash through the shadows and ambush an enemy, dealing 1603 Physical Damage and afflicting them with Minor Vulnerability for 10 seconds, increasing their damage taken by 5%.\n\nAlso grants you Empower and Minor Berserk for 10 seconds, increasing the damage of your Heavy Attacks against monsters by 70% and your damage done by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_TELEPORT_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_LOTUS_FAN,
      name: 'Lotus Fan',
      type: 'active',
      icon: 'ability_nightblade_008_a',
      description:
        'Flash through the shadows and ambush an enemy while unleashing a fan of knives, dealing 1603 Magic Damage to them and enemies around you.\n\nAll enemies hit take an additional 1985 Magic Damage over 5 seconds and are afflicted with Minor Vulnerability for 10 seconds, increasing their damage taken by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_TELEPORT_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MARK_TARGET,
      name: 'Mark Target',
      type: 'active',
      icon: 'ability_nightblade_014',
      description:
        "Expose an enemy's weaknesses to afflict them with Major Breach, reducing their Physical Resistance and Spell Resistance by 5948 for 20 seconds.\n\nWhen a marked enemy dies, you heal to full Health.\n\nYou can only have one Mark Target active at a time.",
      baseSkillId: ClassSkillId.NIGHTBLADE_MARK_TARGET,
    },
    {
      id: ClassSkillId.NIGHTBLADE_REAPER_S_MARK,
      name: "Reaper's Mark",
      type: 'active',
      icon: 'ability_nightblade_014_a',
      description:
        "Expose an enemy's weaknesses to afflict them with Major Breach, reducing their Physical Resistance and Spell Resistance by 5948 for 20 seconds.\n\nWhen a marked enemy dies, you heal to full Health and gain Major Berserk, increasing your damage done by 10% for 10 seconds.\n\nYou can only have one Reaper's Mark active at a time.",
      baseSkillId: ClassSkillId.NIGHTBLADE_MARK_TARGET,
    },
    {
      id: ClassSkillId.NIGHTBLADE_PIERCING_MARK,
      name: 'Piercing Mark',
      type: 'active',
      icon: 'ability_nightblade_014_b',
      description:
        "Expose an enemy's weaknesses to afflict them with Major Breach, reducing their Physical Resistance and Spell Resistance by 5948 for 1 minute.\n\nYou can detect marked enemies even if they use stealth or invisibility for 3 seconds. When a marked enemy dies, you heal to full Health.\n\nYou can only have one Piercing Mark active at a time.",
      baseSkillId: ClassSkillId.NIGHTBLADE_MARK_TARGET,
    },
    {
      id: ClassSkillId.NIGHTBLADE_VEILED_STRIKE,
      name: 'Veiled Strike',
      type: 'active',
      icon: 'ability_nightblade_002',
      description:
        'Slash an enemy, dealing 2249 Magic Damage. \n\nIf you strike an enemy from their flank you set them Off Balance.',
      baseSkillId: ClassSkillId.NIGHTBLADE_VEILED_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SURPRISE_ATTACK,
      name: 'Surprise Attack',
      type: 'active',
      icon: 'ability_nightblade_002_a',
      description:
        'Slash an enemy, dealing 2323 Physical Damage and applying the Sundered status effect.\n\nIf you strike an enemy from their flank you set them Off Balance. This attack will also be guaranteed to be a Critical Strike, up to once every 3 seconds.',
      baseSkillId: ClassSkillId.NIGHTBLADE_VEILED_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_CONCEALED_WEAPON,
      name: 'Concealed Weapon',
      type: 'active',
      icon: 'ability_nightblade_002_b',
      description:
        'Slash an enemy, dealing 2556 Magic Damage. \n\nIf you strike an enemy from their flank you set them Off Balance.\n\nWhen you leave Sneak or invisibility while in combat, increase your damage done with this ability by 10% for 12 seconds.\n\nWhile slotted on either bar, you gain Minor Expedition, increasing your Movement Speed by 15%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_VEILED_STRIKE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_GRIM_FOCUS,
      name: 'Grim Focus',
      type: 'active',
      icon: 'ability_nightblade_005',
      description:
        'When slotted on either bar, you gain Major Prophecy and Major Savagery, increasing your Spell and Weapon Critical rating by 2629.\n\nYour Light and Heavy Attacks now generate a stack of Grim Focus, up to 10 times. Fully-charged Heavy Attacks grant two stacks.\n\nWhen at 5 or more stacks, you can consume 5 to fire a spectral arrow to deal 4049 Magic Damage and heal for 33% of the damage dealt, if you are in melee range.',
      baseSkillId: ClassSkillId.NIGHTBLADE_GRIM_FOCUS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MERCILESS_RESOLVE,
      name: 'Merciless Resolve',
      type: 'active',
      icon: 'ability_nightblade_005_b',
      description:
        'When slotted on either bar, you gain Major Prophecy and Major Savagery, increasing your Spell and Weapon Critical rating by 2629.\n\nYour Light and Heavy Attacks now generate a stack of Merciless Resolve, up to 10 times. Fully-charged Heavy Attacks grant two stacks.\n\nWhen at 5 or more stacks, you can consume 5 to fire a spectral arrow to deal 4601 Magic Damage and heal for 50% of the damage dealt, if you are in melee range.',
      baseSkillId: ClassSkillId.NIGHTBLADE_GRIM_FOCUS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_RELENTLESS_FOCUS,
      name: 'Relentless Focus',
      type: 'active',
      icon: 'ability_nightblade_005_a',
      description:
        'When slotted on either bar, you gain Major Prophecy and Major Savagery, increasing your Spell and Weapon Critical rating by 2629.\n\nYour Light and Heavy Attacks now generate a stack of Relentless Focus, up to 10 times. Fully-charged Heavy Attacks grant two stacks.\n\nWhen at 4 or more stacks, you can consume 4 to fire a spectral arrow to deal 4183 Disease Damage and heal for 33% of the damage dealt, if you are in melee range.',
      baseSkillId: ClassSkillId.NIGHTBLADE_GRIM_FOCUS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_EXECUTIONER,
      alternateIds: [
        6224, 10770, 10771, 10772, 29006, 36630, 36633, 38819, 45048, 45050, 101434, 101435, 101436,
        101437, 108867, 108868,
      ],
      name: 'Executioner',
      type: 'passive',
      icon: 'passive_weapon_018',
      description:
        'When an enemy dies within 2 seconds of being damaged by you, you restore 1000 Magicka and Stamina.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_HEMORRHAGE,
      alternateIds: [
        26038, 36641, 45060, 59611, 61883, 61899, 102091, 105586, 105594, 105595, 105596, 108780,
        132927, 132929, 132934, 132935, 132936, 140619, 150720, 183807, 185316, 185317, 227845,
        239196, 239202, 239205,
      ],
      name: 'Hemorrhage',
      type: 'passive',
      icon: 'passive_weapon_017',
      description:
        'Increases your Critical Damage by 10%. Dealing Critical Damage grants you and your group Minor Savagery, increasing your Weapon Critical rating by 1314 for 20 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MASTER_ASSASSIN,
      alternateIds: [36616, 45038],
      name: 'Master Assassin',
      type: 'passive',
      icon: 'passive_weapon_026',
      description:
        'Increases your Critical Chance rating against enemies you are flanking by 724, increasing your chance to critically strike by |3.3%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_PRESSURE_POINTS,
      alternateIds: [36636, 36640, 45053, 45055, 88655, 88656],
      name: 'Pressure Points',
      type: 'passive',
      icon: 'passive_weapon_015',
      description:
        'Increases your Critical Chance rating by 274 for each Assassination ability slotted, increasing your chance to critically strike by 1.25% per ability.\n\nCurrent bonus: 0.',
      isPassive: true,
    },
  ],
};
