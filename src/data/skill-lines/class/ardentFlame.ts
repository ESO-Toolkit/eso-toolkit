/**
 * Ardent Flame — Dragonknight Skill Line
 * Source: https://eso-hub.com/en/skills/dragonknight/ardent-flame
 * Regenerated: 2025-11-14T20:33:08.778Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const ardentFlame: SkillLineData = {
  id: 'class.ardent-flame',
  name: 'Ardent Flame',
  class: 'Dragonknight',
  category: 'class',
  icon: 'ability_dragonknight_006',
  sourceUrl: 'https://eso-hub.com/en/skills/dragonknight/ardent-flame',
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
      name: 'Dragonknight Standard',
      type: 'ultimate',
      icon: 'ability_dragonknight_006',
      description:
        'Call down a battle standard, dealing 870 Flame Damage every 1 second for 16 seconds to enemies and applying Major Defile to them, reducing their healing received and damage shield strength by 12%. \n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SHIFTING_STANDARD,
      name: 'Shifting Standard',
      type: 'ultimate',
      icon: 'ability_dragonknight_006_a',
      description:
        'Call down a battle standard, dealing 898 Flame Damage every 1 second for 25 seconds to enemies and applying Major Defile to them, reducing their healing received and damage shield strength by 12%. \n\nActivating this ability again allows you to move the standard to your location.\n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_STANDARD_OF_MIGHT,
      name: 'Standard of Might',
      type: 'ultimate',
      icon: 'ability_dragonknight_006_b',
      description:
        'Call down a battle standard, dealing 870 Flame Damage every 1 second for 16 seconds to enemies and applying Major Defile to them, reducing their healing received and damage shield strength by 12%. \n\nStanding in the area increases your damage done and reduces damage taken by 15%.\n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
      name: 'Fiery Breath',
      type: 'active',
      icon: 'ability_dragonknight_004',
      description:
        'Exhale a flaming blast to enemies in front of you, dealing 1742 Flame Damage and an additional 2900 Flame Damage over 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_NOXIOUS_BREATH,
      name: 'Noxious Breath',
      type: 'active',
      icon: 'ability_dragonknight_004_a',
      description:
        'Exhale a corrosive blast to enemies in front of you, dealing 1799 Poison Damage immediately, applying the Poisoned status effect, and an additional 2980 Poison Damage over 20 seconds. \n\nThe initial hit applies the Major Breach to enemies for the duration, reducing their Physical and Spell Resistance by 5948.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ENGULFING_FLAMES,
      name: 'Engulfing Flames',
      type: 'active',
      icon: 'ability_dragonknight_004_b',
      description:
        'Exhale a flaming blast to enemies in front of you, dealing 1799 Flame Damage and an additional 2980 Flame Damage over 20 seconds. \n\nAffected enemies take more damage from all Flame Damage attacks based on your Weapon or Spell Damage, and Max Magicka or Stamina, with a maximum of 6% bonus damage taken.\n\nCurrent value 2%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
      name: 'Searing Strike',
      type: 'active',
      icon: 'ability_dragonknight_003',
      description:
        'Slash an enemy with flame, dealing 1161 Flame Damage and an additional 3470 Flame Damage over 20 seconds.\n\nEnemies hit by the initial hit are afflicted with the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_VENOMOUS_CLAW,
      name: 'Venomous Claw',
      type: 'active',
      icon: 'ability_dragonknight_003_a',
      description:
        'Rake an enemy with your claw, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds.\n\nThe poison seeps into the target and deals increased damage the longer it lasts, dealing 12% more damage every 2 seconds.\n\nEnemies hit by the initial hit are afflicted with the Poisoned status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_EMBERS,
      name: 'Burning Embers',
      type: 'active',
      icon: 'ability_dragonknight_003_b',
      description:
        'Slash an enemy with flame, dealing 1161 Flame Damage and an additional 3470 Flame Damage over 20 seconds. \n\nYou heal for 100% of the damage done with this ability.  \n\nEnemies hit by the initial hit are afflicted with the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
      name: 'Fiery Grip',
      type: 'active',
      icon: 'ability_dragonknight_005',
      description:
        'Launch a fiery chain to grasp and pull an enemy to you, dealing 1392 Flame Damage and taunting them for 15 seconds if they are not already taunted.\n\nHitting the target grants you Major Expedition, increasing your Movement Speed by 30% for 4 seconds.\n\nThis attack cannot be dodged or reflected.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_UNRELENTING_GRIP,
      name: 'Unrelenting Grip',
      type: 'active',
      icon: 'ability_dragonknight_005_a',
      description:
        "Launch a fiery chain to grasp and pull an enemy to you, dealing 1438 Flame Damage and taunting them for 15 seconds if they are not already taunted.\n\nHitting the target grants you Major Expedition, increasing your Movement Speed by 30% for 4 seconds.\n\nIf the target cannot be pulled, you restore 100% of the ability's cost as Magicka.\n\nThis attack cannot be dodged or reflected.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CHAINS_OF_DEVASTATION,
      name: 'Chains of Devastation',
      type: 'active',
      icon: 'ability_dragonknight_005_b',
      description:
        'Launch a fiery chain to grasp and pull yourself to an enemy, dealing 1438 Flame Damage.\n\nHitting the target grants you Major Expedition and Major Berserk, increasing your Movement Speed by 30% and your damage done by 10% for 4 seconds.\n\nThis attack cannot be dodged or reflected.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
      name: 'Lava Whip',
      type: 'active',
      icon: 'ability_dragonknight_001',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage.\n\nIf you strike an enemy that is immobilized or stunned, you set them Off Balance.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_WHIP,
      name: 'Molten Whip',
      type: 'active',
      icon: 'ability_dragonknight_001_b',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage.\n\nIf you strike an enemy that is is immobilized or stunned, you set them Off Balance.\n\nWhenever you activate a different Ardent Flame ability while in combat, you gain a stack of Seething Fury, increasing the damage of your next Molten Whip by 20% and your Weapon and Spell Damage by 100 for 15 seconds. This effect stacks up to 3 times.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAME_LASH,
      name: 'Flame Lash',
      type: 'active',
      icon: 'ability_dragonknight_001_a',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage.\n\nIf you strike an enemy that is immobilized or stunned, you set them Off Balance.\n\nTargeting an Off Balance or immobilized enemy changes this ability into Power Lash, allowing you to lash an enemy at half cost to deal 2760 Flame Damage and healing you for 2760 Health.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INFERNO,
      name: 'Inferno',
      type: 'active',
      icon: 'ability_dragonknight_002',
      description:
        'Activate an aura of flames which launches a fireball at the nearest enemy every 5 seconds, dealing 1742 Flame Damage.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAMES_OF_OBLIVION,
      name: 'Flames of Oblivion',
      type: 'active',
      icon: 'ability_dragonknight_002_a',
      description:
        'Activate an aura of flames which launches a fireball at 3 enemies every 5 seconds, dealing 1799 Flame Damage.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CAUTERIZE,
      name: 'Cauterize',
      type: 'active',
      icon: 'ability_dragonknight_002_b',
      description:
        'Activate an aura of embers which cauterizes the wounds of you or up to 4 nearby allies every 3 seconds, healing for 1199 Health.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_COMBUSTION,
      name: 'Combustion',
      type: 'passive',
      icon: 'ability_sorcerer_011',
      description:
        'Increases the damage of your Burning and Poisoned status effects by 33%. When you apply Burning or Poisoned to an enemy, you restore 423 Magicka and Stamina. This effect can occur once every 3 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_HEAT,
      name: 'Searing Heat',
      type: 'passive',
      icon: 'ability_dragonknight_028',
      description:
        'Increases the damage over time of your Fiery Breath, Searing Strike, and Dragonknight Standard abilities by 25% and the duration by 4 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WARMTH,
      name: 'Warmth',
      type: 'passive',
      icon: 'ability_dragonknight_023',
      description:
        'When you deal direct damage with an Ardent Flame ability, your damage over time attacks deal 6% increased damage to the target, and reduce their Movement Speed by 30% for 3 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WORLD_IN_RUIN,
      name: 'World in Ruin',
      type: 'passive',
      icon: 'ability_dragonknight_024',
      description: 'Increases the damage of your Flame and Poison attacks by 5%.',
      isPassive: true,
    },
  ],
};
