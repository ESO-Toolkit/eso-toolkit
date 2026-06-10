/**
 * Ardent Flame — Dragonknight Skill Line
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
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
      name: 'Dragonknight Standard',
      type: 'ultimate',
      icon: 'ability_dragonknight_006',
      description:
        'Call down a battle standard for 15 seconds, rallying you and allies inside the area, increasing Weapon and Spell Damage by 300 and reducing damage taken by 10%.\n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SHIFTING_STANDARD,
      name: 'Shifting Standard',
      type: 'ultimate',
      icon: 'ability_dragonknight_006_a',
      description:
        'Call down a battle standard, dealing 898 Flame Damage every 1 second for 25 seconds to enemies and applying Major Defile to them, reducing their healing received and damage shield strength by 12%.\n\nActivating this ability again allows you to move the standard to your location.\n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_STANDARD_OF_MIGHT,
      name: 'Standard of Might',
      type: 'ultimate',
      icon: 'ability_dragonknight_006_b',
      description:
        'Call down a battle standard for 15 seconds, rallying you and allies inside the area, increasing Weapon and Spell Damage by 300 and reducing damage taken by 10%. You gain an additional 15% damage done and reduced damage taken and 300 Weapon and Spell Damage.\n\nAn ally near the standard can activate the Shackle synergy, dealing 3375 Flame Damage to enemies in the area and immobilizing them for 5 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGONKNIGHT_STANDARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
      name: 'Searing Strike',
      type: 'active',
      icon: 'ability_dragonknight_003',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3475 Flame Damage over 10 seconds.\n\nThe initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_VENOMOUS_CLAW,
      name: 'Searing Claw',
      type: 'active',
      icon: 'ability_dragonknight_003_a',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3480 Flame Damage over 10 seconds.\n\nThe flame sears into the target, dealing 10% more damage every 2 seconds.\n\nThe initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_EMBERS,
      name: 'Burning Embers',
      type: 'active',
      icon: 'ability_dragonknight_003_b',
      description:
        'Slash your foe with a fiery claw, dealing 1161 Flame Damage and an additional 3480 Flame Damage over 10 seconds.\n\nYou heal for 3414 Health from the initial hit and 511 Health each subsequent tick, scaling off your Max Health.\n\nThe initial hit always applies the Burning status effect.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SEARING_STRIKE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INHALE,
      name: 'Core of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012',
      description:
        'Let the fire within draw heat to your core, restoring 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds.\n\nWhen this ability completes, you release this heat as a blast of fire that deals 2002 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAW_ESSENCE,
      name: 'Heart of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012_b',
      description:
        'Let the fire within draw heat to your heart, restoring 15% of your Max Health and 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds.\n\nWhen this ability completes, you release this heat as a blast of fire that deals 2004 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DEEP_BREATH,
      name: 'Soul of Flame',
      type: 'active',
      icon: 'ability_dragonknight_012_a',
      description:
        'Let the fire within draw heat to your soul, restoring 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds.\n\nMuch of this heat is drawn from enemies around you. Those that are casting are interrupted, set Off Balance, and stunned for 2 seconds.\n\nWhen this ability completes, you release this heat as a blast of fire that deals 2760 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      name: 'Hearthfire',
      type: 'active',
      icon: 'ability_dragonknight_016',
      description:
        'Throw out a kindled flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 434 Health every 1 second.\n\nHealed targets gain Minor Fortitude and Minor Heroism while inside, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CINDER_STORM,
      name: 'Fire Keeper',
      type: 'active',
      icon: 'ability_dragonknight_016a',
      description:
        'Throw out a purifying flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 449 Health every 1 second. This healing increases by 50% if you are in the area.\n\nHealed targets gain Minor Fortitude and Minor Heroism for 15 seconds, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ERUPTION,
      name: 'Hearth and Home',
      type: 'active',
      icon: 'ability_dragonknight_016b',
      description:
        'Throw out a protective flame for 15 seconds, healing you and allies inside for 619 Health every 1 second, scaling off your Max Health.\n\nHealed targets gain Minor Fortitude and Minor Heroism while inside, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds. You gain Major Protection while inside, reducing damage taken by 10%.\n\nEnemies inside have their Movement Speed reduced by 70%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
      name: 'Lava Whip',
      type: 'active',
      icon: 'ability_dragonknight_001',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage.\n\nHitting an Off Balance enemy grants 5 stacks of Volcanic Whip for 20 seconds, up to once every 20 seconds.\n\nVolcanic Whip replaces this ability and consumes a stack to instead deal 4338 Flame Damage to your target and all nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_WHIP,
      name: 'Molten Whip',
      type: 'active',
      icon: 'ability_dragonknight_001_b',
      description:
        'Lash an enemy with flame, dealing 2399 Flame Damage.\n\nActivating a different Dragonknight ability while in combat grants a stack of Seething Fury up to 3 times, increasing the damage of your next Molten Whip by 33%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAME_LASH,
      name: 'Flame Lash',
      type: 'active',
      icon: 'ability_dragonknight_001_a',
      description:
        'Lash an enemy with flame, dealing 2323 Flame Damage and healing for 799 Health.\n\nHitting an Off Balance enemy grants 5 stacks of Power Lash for 20 seconds, up to once every 20 seconds.\n\nActivating again consumes a stack to deal 4337 Flame Damage to your target and all nearby enemies and heals for 3200 Health.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_LAVA_WHIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INFERNO,
      name: 'Inferno',
      type: 'active',
      icon: 'ability_dragonknight_002',
      description:
        'Activate an aura of flames which launches a wave of flame around you every 5 seconds, dealing 1742 Flame Damage to enemies inside.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FLAMES_OF_OBLIVION,
      name: 'Incinerate',
      type: 'active',
      icon: 'ability_dragonknight_002_a',
      description:
        'Activate an aura of flames which launches a wave of flames every 5 seconds, dealing 1979 Flame Damage to enemies inside.\n\nEach hit has a 15% chance of applying Burning.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CAUTERIZE,
      name: 'Cauterize',
      type: 'active',
      icon: 'ability_dragonknight_002_b',
      description:
        'Activate an aura of embers which cauterizes the wounds of you or up to 6 nearby allies every 3 seconds, healing for 1199 Health.\n\nWhile slotted on either bar, you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INFERNO,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_COMBUSTION,
      alternateIds: [
        3463, 26319, 29424, 29597, 38756, 38757, 39300, 39301, 42030, 45011, 50215, 50216, 50343,
        50344, 50680, 50681, 50682, 51261, 51268, 51272, 51488, 51489, 67400, 67401, 67402, 67788,
        67789, 67790, 67791, 67792, 67793, 67794, 67795, 67796, 71624, 71625, 71626, 73002, 73003,
        83396, 83397, 83398, 85431, 85432, 85433, 85434, 85443, 95039, 95040, 108803, 108804,
        108806, 108809, 108815, 108816, 108817, 108818, 109681, 112302, 112304, 112324, 112326,
        112327, 112329, 112333, 112353, 112470, 112471, 112472, 112473, 115656, 118628, 118631,
        118635, 118636, 120947, 120948, 128574, 128575, 128576, 128578, 128579, 128580, 128581,
        128582, 128583, 133504, 133680, 133681, 134318, 134615, 134936, 140346, 199584, 199585,
        199586, 199587, 199588, 199589, 199590, 199591, 199592, 199593, 199594, 199595, 204180,
        211497, 221711, 221720, 221721, 221831, 223012, 223013, 223014, 223889, 223891, 223893,
        226975, 226979, 226985, 226987, 227006,
      ],
      name: 'Combustion',
      type: 'passive',
      icon: 'ability_sorcerer_011',
      description:
        'To you, flame is fuel.\n\nWhen you apply Burning to an enemy, you restore 225 Magicka and Stamina. This effect can occur once every 1 second.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SEARING_HEAT,
      name: 'Fan the Flames',
      type: 'passive',
      icon: 'ability_dragonknight_028',
      description:
        'Tend to your garden of flame, that it may flourish.\n\nIncreases your chances of applying the Burning status effect by 25% and its damage done by 12%. These values are influenced by the number of Dragonknight abilities slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WARMTH,
      name: 'Traumatic Burns',
      type: 'passive',
      icon: 'ability_dragonknight_023',
      description:
        'Fire cares not for love, or coin, or creed. It consumes.\n\nDealing direct damage with an Ardent Flame ability causes the target to take 5% increased Flame Damage and reduces their Movement Speed by 15% for 5 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_HEART,
      name: 'A Soul Ablaze',
      type: 'passive',
      icon: 'ability_weapon_001',
      description:
        'Dragons leave naught but ash and ruin in their wake.\n\nIncreases your damage done with area and over time attacks by 3%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WORLD_IN_RUIN,
      alternateIds: [29451, 45029],
      name: 'World in Ruin',
      type: 'passive',
      icon: 'ability_dragonknight_024',
      description:
        'The will to survive burns bright in your chest.\n\nIncreases your Healing Taken by 8%.',
      isPassive: true,
    },
  ],
};
