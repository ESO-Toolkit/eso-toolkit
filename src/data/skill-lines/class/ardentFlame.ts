/**
 * Ardent Flame — Dragonknight Skill Line
 * Source: https://eso-hub.com/en/skills/dragonknight/ardent-flame
 * Regenerated: 2026-03-09T00:00:00.000Z
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
        'Call down a battle standard for 15 seconds, rallying you and allies inside the area, increasing Weapon and Spell Damage by 300 and reducing damage taken by 10%. An ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
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
        'Call down a battle standard for 15 seconds, rallying you and allies inside the area, increasing Weapon and Spell Damage by 300 and reducing damage taken by 10%. You gain an additional 15% damage done and reduced damage taken and 300 Weapon and Spell Damage. An ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
      name: 'Searing Strike',
      type: 'active',
      icon: 'ability_dragonknight_003',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3475 Flame Damage over 10 seconds. The initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_VENOMOUS_CLAW,
      name: 'Searing Claw',
      type: 'active',
      icon: 'ability_dragonknight_003_a',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3480 Flame Damage over 10 seconds. The flame sears into the target, dealing 10% more damage every 2 seconds. The initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_EMBERS,
      name: 'Burning Embers',
      type: 'active',
      icon: 'ability_dragonknight_003_b',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3480 Flame Damage over 10 seconds. You heal for 3414 Health from the initial hit and 511 Health each subsequent tick, scaling off your Max Health. The initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INHALE,
      name: 'Core of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012',
      description:
        'Let the fire within draw heat to your core, restoring 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds. When this ability completes, you release this heat as a blast of fire that deals 2002 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAW_ESSENCE,
      name: 'Heart of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012_b',
      description:
        'Let the fire within draw heat to your heart, restoring 15% of your missing Health and 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds. When this ability completes, you release this heat as a blast of fire that deals 2004 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DEEP_BREATH,
      name: 'Soul of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012_a',
      description:
        'Let the fire within draw heat to your soul, restoring 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds. Much of this heat is drawn from enemies around you. Those that are casting are interrupted, set Off Balance, and stunned for 2 seconds. When this ability completes, you release this heat as a blast of fire that deals 2760 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      name: 'Hearthfire',
      type: 'active',
      icon: 'ability_dragonknight_016',
      description:
        'Throw out a kindled flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 434 Health every 1 second. Healed targets gain Minor Fortitude and Minor Heroism while inside, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CINDER_STORM,
      name: 'Fire Keeper',
      type: 'active',
      icon: 'ability_dragonknight_016a',
      description:
        'Throw out a purifying flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 449 Health every 1 second. This healing increases by 50% if you are in the area. Healed targets gain Minor Fortitude and Minor Heroism for 15 seconds, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ERUPTION,
      name: 'Hearth and Home',
      type: 'active',
      icon: 'ability_dragonknight_016b',
      description:
        'Throw out a protective flame for 15 seconds, healing you and allies inside for 619 Health every 1 second, scaling off your Max Health. Healed targets gain Minor Fortitude and Minor Heroism while inside, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds. You gain Major Protection while inside, reducing damage taken by 10%. Enemies inside have their Movement Speed reduced by 70%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
      name: 'Lava Whip',
      type: 'active',
      icon: 'ability_dragonknight_001',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage. Hitting an Off Balance enemy grants 5 stacks of Volcanic Whip for 20 seconds, up to once every 20 seconds. Volcanic Whip replaces this ability and consumes a stack to instead deal 4338 Flame Damage to your target and all nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_WHIP,
      name: 'Molten Whip',
      type: 'active',
      icon: 'ability_dragonknight_001_b',
      description:
        'Lash an enemy with flame, dealing 2399 Flame Damage. Activating a different Dragonknight ability while in combat grants a stack of Seething Fury up to 3 times, increasing the damage of your next Molten Whip by 33% and your damage done by 5%, or 2% against players, for 10 seconds. The damage done only activates if you are a Dragonknight.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAME_LASH,
      name: 'Flame Lash',
      type: 'active',
      icon: 'ability_dragonknight_001_a',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage and healing for 799 Health. Hitting an Off Balance enemy grants 5 stacks of Power Lash for 20 seconds, up to once every 20 seconds. Activating again consumes a stack to deal 4337 Flame Damage to your target and all nearby enemies and heals for 3200 Health. Consuming all stacks as a Dragonknight increases your damage done by 7%, double against monsters, for 45 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INFERNO,
      name: 'Inferno',
      type: 'active',
      icon: 'ability_dragonknight_002',
      description:
        'Activate an aura of flames which launches a wave of flame around you every 5 seconds, dealing 1742 Flame Damage to enemies inside. While slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAMES_OF_OBLIVION,
      name: 'Incinerate',
      type: 'active',
      icon: 'ability_dragonknight_002_a',
      description:
        'Activate an aura of flames which launches a wave of flames every 5 seconds, dealing 1979 Flame Damage to enemies inside. Each hit has a 15% chance of applying Burning. While slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CAUTERIZE,
      name: 'Cauterize',
      type: 'active',
      icon: 'ability_dragonknight_002_b',
      description:
        'Activate an aura of embers which cauterizes the wounds of you or up to 6 nearby allies every 3 seconds, healing for 1199 Health. While slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_COMBUSTION,
      name: 'Combustion',
      type: 'passive',
      icon: 'ability_sorcerer_011',
      description:
        'To you, flame is fuel. When you apply Burning to an enemy, you restore 225 Magicka and Stamina. This effect can occur once every 1 second.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_HEAT,
      name: 'Fan the Flames',
      type: 'passive',
      icon: 'ability_dragonknight_028',
      description:
        'Tend to your garden of flame, that it may flourish. Increases your chances of applying the Burning status effect by 50% and its damage done by 25%. These values are influenced by the number of Dragonknight abilities slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WARMTH,
      name: 'Traumatic Burns',
      type: 'passive',
      icon: 'ability_dragonknight_023',
      description:
        'Fire cares not for love, or coin, or creed. It consumes. Dealing direct damage with an Ardent Flame ability causes the target to take 5% increased Flame Damage and reduces their Movement Speed by 30% for 5 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_HEART,
      name: 'A Soul Ablaze',
      type: 'passive',
      icon: 'ability_weapon_001',
      description:
        'The will to survive burns bright in your chest. Increases your Healing Taken by 8%.',
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
