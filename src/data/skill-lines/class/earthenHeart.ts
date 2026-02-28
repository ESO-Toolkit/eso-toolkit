/**
 * Earthen Heart — Dragonknight Skill Line
 * Source: https://eso-hub.com/en/skills/dragonknight/earthen-heart
 * Regenerated: 2025-11-14T20:33:08.797Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const earthenHeart: SkillLineData = {
  id: 'class.earthen-heart',
  name: 'Earthen Heart',
  class: 'Dragonknight',
  category: 'class',
  icon: 'ability_dragonknight_018',
  sourceUrl: 'https://eso-hub.com/en/skills/dragonknight/earthen-heart',
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
      name: 'Magma Armor',
      type: 'ultimate',
      icon: 'ability_dragonknight_018',
      description:
        'Ignite the molten lava in your veins, limiting incoming damage to 3% of your Max Health and dealing 336 Flame Damage to nearby enemies each second for 10 seconds.\n\nWhile active, you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MAGMA_SHELL,
      name: 'Magma Shell',
      type: 'ultimate',
      icon: 'ability_dragonknight_018_a',
      description:
        'Ignite the molten lava in your veins, limiting incoming damage to 3% of your Max Health and dealing 347 Flame Damage to nearby enemies each second for 10 seconds. \n\nWhen activated, nearby allies gain a damage shield for 100% of their Max Health for 10 seconds.\n\nWhile active, you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CORROSIVE_ARMOR,
      name: 'Corrosive Armor',
      type: 'ultimate',
      icon: 'ability_dragonknight_018_b',
      description:
        'Oxidize the green Dragon blood in your veins, limiting incoming damage to 3% of your Max Health and dealing 347 Poison Damage to nearby enemies each second for 10 seconds. \n\nWhile active, this ability and your direct damage attacks ignore enemy Physical and Spell Resistance, but you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_STONEFIST,
      name: 'Stonefist',
      type: 'active',
      icon: 'ability_dragonknight_013',
      description:
        'Crush the earth beneath you, dealing 2323 Physical Damage to all enemies within 6 meters of you. Debris ripped from the ground is held around you for 10 seconds.\n\nActivating the ability again allows you to launch part of the debris at an enemy, dealing 2323 Physical Damage, up to 3 times. The final cast stuns enemies hit for 2.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_STONEFIST,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_STONE_GIANT,
      name: 'Stone Giant',
      type: 'active',
      icon: 'ability_dragonknight_013_a',
      description:
        'Crush the earth beneath you, dealing 2323 Physical Damage to all enemies within 6 meters of you. Debris ripped from the ground is held around you for 10 seconds.\n\nActivating the ability again allows you to launch part of the debris at an enemy, dealing 2323 Physical Damage, up to 3 times. The final cast stuns for 2.5 seconds.\n\nEach hit applies Stagger, increasing damage taken by 65 per stack for 5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_STONEFIST,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHARD,
      name: 'Obsidian Shard',
      type: 'active',
      icon: 'ability_dragonknight_013_b',
      description:
        'Slam an enemy with molten rock, dealing 448 Flame Damage and causing the rock to explode, splashing magma around.\n\nYou then pull back on the magma to heal yourself or up to 2 allies near the enemy for 3240 Health.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_STONEFIST,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
      name: 'Molten Weapons',
      type: 'active',
      icon: 'ability_dragonknight_015',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IGNEOUS_WEAPONS,
      name: 'Igneous Weapons',
      type: 'active',
      icon: 'ability_dragonknight_015_a',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 1 minute.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_ARMAMENTS,
      name: 'Molten Armaments',
      type: 'active',
      icon: 'ability_dragonknight_015_b',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds.\n\nYou also gain Empower for the duration, increasing the damage of your Heavy Attacks against monsters by 70%.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
      name: 'Obsidian Shield',
      type: 'active',
      icon: 'ability_dragonknight_017',
      description:
        'Call the earth to your defense, granting a damage shield for you and nearby allies that absorbs 1321 damage. This portion of the ability scales off your Max Health.\n\nYou also gain Major Mending, increasing your healing done by 16% for 2.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FRAGMENTED_SHIELD,
      name: 'Fragmented Shield',
      type: 'active',
      icon: 'ability_dragonknight_017a',
      description:
        'Call the earth to your defense, creating a damage shield for you and nearby allies that absorbs 1365 damage. This portion of the ability scales off your Max Health.\n\nYou also gain Major Mending, increasing your healing done by 16% for 6.7 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IGNEOUS_SHIELD,
      name: 'Igneous Shield',
      type: 'active',
      icon: 'ability_dragonknight_017b',
      description:
        'Call the earth to your defense, granting a damage shield for nearby allies that absorbs 1365 damage. Your own damage shield absorbs 3414 damage. This portion of the ability scales off your Max Health.\n\nYou also gain Major Mending, increasing your healing done by 16% for 2.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PETRIFY,
      name: 'Petrify',
      type: 'active',
      icon: 'ability_dragonknight_014',
      description:
        'Encase an enemy in molten rock, stunning them for 2.5 seconds. When the stun ends, they take 1161 Flame Damage.\n\nThis stun cannot be blocked or dodged.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FOSSILIZE,
      name: 'Fossilize',
      type: 'active',
      icon: 'ability_dragonknight_014_a',
      description:
        'Encase an enemy in molten rock, stunning them for 2.5 seconds. When the stun ends, they take 1199 Flame Damage and are immobilized for 3 seconds.\n\nThis stun cannot be blocked or dodged.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SHATTERING_ROCKS,
      name: 'Shattering Rocks',
      type: 'active',
      icon: 'ability_dragonknight_014b',
      description:
        'Encase an enemy in molten rock, stunning them for 2.5 seconds.\n\nWhen the stun ends, they take 1199 Flame Damage and you are healed for 2323 Health.\n\nThis stun cannot be blocked or dodged.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      name: 'Ash Cloud',
      type: 'active',
      icon: 'ability_dragonknight_016',
      description:
        'Summon a scorching cloud of ash at the target location for 15 seconds, reducing enemy Movement Speed by 70% and healing you and your allies for 434 Health every 1 second.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CINDER_STORM,
      name: 'Cinder Storm',
      type: 'active',
      icon: 'ability_dragonknight_016a',
      description:
        'Summon a scorching cloud of ash at the target location for 15 seconds, reducing enemy Movement Speed by 70% and healing you and your allies for 674 every 1 second.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ERUPTION,
      name: 'Eruption',
      type: 'active',
      icon: 'ability_dragonknight_016b',
      description:
        'Summon a scorching cloud of ash at the target location for 15 seconds, dealing 1799 Flame Damage immediately, reducing enemy Movement Speed by 70%, and dealing 319 Flame Damage in the area every 1 second.\n\nThe eruptive damage can occur once every 10 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      alternateIds: [32710],
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BATTLE_ROAR,
      name: 'Battle Roar',
      type: 'passive',
      icon: 'ability_dragonknight_031',
      description:
        'When you cast an Ultimate ability, you restore 37 Health 37 Magicka, and 37 Stamina for each point of the Ultimate spent.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ETERNAL_MOUNTAIN,
      name: 'Eternal Mountain',
      type: 'passive',
      icon: 'ability_dragonknight_023',
      description: 'Increases duration of your Earthen Heart abilities by 20%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_HELPING_HANDS,
      name: 'Helping Hands',
      type: 'passive',
      icon: 'ability_sorcerer_007',
      description:
        'When you cast an Earthen Heart ability with a cost, you restore 1120 Stamina. This effect cannot activate when using a Stamina costing ability and must cost more than the restored value.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOUNTAIN_S_BLESSING,
      name: "Mountain's Blessing",
      type: 'passive',
      icon: 'ability_dragonknight_024',
      description:
        'When you cast an Earthen Heart ability, you and your group gain Minor Brutality for 20 seconds, increasing your Weapon Damage by 10%. If you are in combat, you also generate 3 Ultimate. This effect can occur once every 6 seconds.',
      isPassive: true,
    },
  ],
};
