/**
 * Grave Lord — Necromancer Skill Line
 * Source: https://eso-hub.com/en/skills/necromancer/grave-lord
 * Regenerated: 2025-11-14T20:33:08.804Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const graveLord: SkillLineData = {
  id: 'class.grave-lord',
  name: 'Grave Lord',
  class: 'Necromancer',
  category: 'class',
  icon: 'ability_necromancer_006',
  sourceUrl: 'https://eso-hub.com/en/skills/necromancer/grave-lord',
  skills: [
    {
      id: ClassSkillId.NECROMANCER_FROZEN_COLOSSUS,
      name: 'Frozen Colossus',
      type: 'ultimate',
      icon: 'ability_necromancer_006',
      description:
        'Unleash a frostbitten Flesh Colossus to pulverize enemies in the area. The Colossus smashes the ground three times over 3 seconds, dealing 3096 Frost Damage with each smash.\n\nDealing damage applies Major Vulnerability to any enemy hit for 12 seconds, increasing their damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_FROZEN_COLOSSUS,
    },
    {
      id: ClassSkillId.NECROMANCER_GLACIAL_COLOSSUS,
      name: 'Glacial Colossus',
      type: 'ultimate',
      icon: 'ability_necromancer_006_a',
      description:
        'Unleash a frostbitten Flesh Colossus to pulverize enemies in the area. The Colossus smashes the ground three times over 3 seconds, dealing 3098 Frost Damage with each smash. The final smash stuns all enemies hit for 4 seconds.\n\nDealing damage applies Major Vulnerability to any enemy hit for 17 seconds, increasing their damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_FROZEN_COLOSSUS,
    },
    {
      id: ClassSkillId.NECROMANCER_PESTILENT_COLOSSUS,
      name: 'Pestilent Colossus',
      type: 'ultimate',
      icon: 'ability_necromancer_006_b',
      description:
        'Unleash a pestilent Flesh Colossus to pulverize enemies in the area. The Colossus smashes the ground three times over 3 seconds, dealing 3200 3360, and 3528 Disease Damage with the first, second, and third smash.\n\nDealing damage applies the Diseased status effect and Major Vulnerability to any enemy hit for 12 seconds, increasing their damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_FROZEN_COLOSSUS,
    },
    {
      id: ClassSkillId.NECROMANCER_SACRIFICIAL_BONES,
      name: 'Sacrificial Bones',
      type: 'active',
      icon: 'ability_necromancer_002',
      description:
        'Summon a skeleton from the ground after 2.5 seconds. The skeleton leaps to you, sacrificing the fallen soul within and enhancing your necromantic energies for 10 seconds, increasing your damage done with Necromancer abilities and damage over time effects by 15%.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SACRIFICIAL_BONES,
    },
    {
      id: ClassSkillId.NECROMANCER_BLIGHTED_BLASTBONES,
      name: 'Blighted Blastbones',
      type: 'active',
      icon: 'ability_necromancer_002_a',
      description:
        'Summon a decaying skeleton from the ground after 2.5 seconds. The skeleton runs after the target and explodes when it gets close to them, dealing 3600 Disease Damage to all enemies nearby and applying the Diseased status effect and Major Defile to them for 4 seconds, reducing their healing received and damage shield strength by 12%.\n\nCreates a corpse on death.',
      baseSkillId: ClassSkillId.NECROMANCER_SACRIFICIAL_BONES,
    },
    {
      id: ClassSkillId.NECROMANCER_GRAVE_LORD_S_SACRIFICE,
      name: "Grave Lord's Sacrifice",
      type: 'active',
      icon: 'ability_necromancer_002_b',
      description:
        'Summon a skeleton from the ground after 2.5 seconds. The skeleton leaps to you, sacrificing the fallen soul within and mastering your necromantic energies for 20 seconds, increasing your damage done with Necromancer abilities and damage over time effects by 15%. While active, your third cast of Flame Skull damages in an 6 meter area.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SACRIFICIAL_BONES,
    },
    {
      id: ClassSkillId.NECROMANCER_FLAME_SKULL,
      name: 'Flame Skull',
      type: 'active',
      icon: 'ability_necromancer_001',
      description:
        'Lob an explosive skull at an enemy, dealing 2090 Flame Damage.\n\nEvery third cast of this ability deals 50% increased damage and creates a corpse near the enemy.',
      baseSkillId: ClassSkillId.NECROMANCER_FLAME_SKULL,
    },
    {
      id: ClassSkillId.NECROMANCER_RICOCHET_SKULL,
      name: 'Ricochet Skull',
      type: 'active',
      icon: 'ability_necromancer_001_b',
      description:
        'Lob an explosive skull at an enemy, dealing 2160 Flame Damage.\n\nEvery third cast of this ability deals 50% increased damage, creates a corpse near the initial enemy, and will bounce up to 2 times to other nearby enemies.',
      baseSkillId: ClassSkillId.NECROMANCER_FLAME_SKULL,
    },
    {
      id: ClassSkillId.NECROMANCER_VENOM_SKULL,
      name: 'Venom Skull',
      type: 'active',
      icon: 'ability_necromancer_001_a',
      description:
        'Lob an explosive skull at an enemy, dealing 2160 Poison Damage.\n\nEvery third cast of this ability deals 50% increased damage and creates a corpse near the enemy, up to once every 3 seconds.\n\nWhile slotted, casting any Necromancer ability while you are in combat will count towards the third cast.',
      baseSkillId: ClassSkillId.NECROMANCER_FLAME_SKULL,
    },
    {
      id: ClassSkillId.NECROMANCER_BONEYARD,
      name: 'Boneyard',
      type: 'active',
      icon: 'ability_necromancer_004',
      description:
        'Desecrate the ground at the target location, dealing 3080 Frost Damage over 10 seconds to enemies inside and applying Minor Vulnerability, increasing their damage taken by 5%.\n\nConsumes a corpse on cast to deal 30% more damage.\n\nAn ally in the area can activate the Grave Robber synergy, dealing 2249 Frost Damage to nearby enemies and healing for the damage done.',
      baseSkillId: ClassSkillId.NECROMANCER_BONEYARD,
    },
    {
      id: ClassSkillId.NECROMANCER_AVID_BONEYARD,
      name: 'Avid Boneyard',
      type: 'active',
      icon: 'ability_necromancer_004_b',
      description:
        'Desecrate the ground at the target location, dealing 3190 Frost Damage over 10 seconds to enemies inside and applying Minor Vulnerability, increasing their damage taken by 5%.\n\nConsumes a corpse on cast to deal 30% more damage.\n\nYou or an ally in the area can activate the Grave Robber synergy, dealing 2249 Frost Damage to enemies and healing for the damage done.',
      baseSkillId: ClassSkillId.NECROMANCER_BONEYARD,
    },
    {
      id: ClassSkillId.NECROMANCER_UNNERVING_BONEYARD,
      name: 'Unnerving Boneyard',
      type: 'active',
      icon: 'ability_necromancer_004_a',
      description:
        'Desecrate the ground at the target location, dealing 3190 Frost Damage over 10 seconds to enemies inside and applying Major Breach and Minor Vulnerability, reducing Physical and Spell Resistance by 5948 and increasing damage taken by 5% for 4.1 seconds each tick.\n\nConsumes a corpse on cast to deal 30% more damage.\n\nAn ally in the area can activate the Grave Robber synergy, dealing 2249 Frost Damage to nearby enemies and healing for the damage done.',
      baseSkillId: ClassSkillId.NECROMANCER_BONEYARD,
    },
    {
      id: ClassSkillId.NECROMANCER_SKELETAL_MAGE,
      name: 'Skeletal Mage',
      type: 'active',
      icon: 'ability_necromancer_003',
      description:
        'Unearth a skeletal mage from the dirt to fight by your side for 20 seconds, while granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%. The mage attacks the closest enemy every 2 seconds, dealing 462 Shock Damage.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SKELETAL_MAGE,
    },
    {
      id: ClassSkillId.NECROMANCER_SKELETAL_ARCANIST,
      name: 'Skeletal Arcanist',
      type: 'active',
      icon: 'ability_necromancer_003_b',
      description:
        'Unearth a skeletal mage from the dirt to fight by your side for 20 seconds, while granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%. The mage attacks the closest enemy every 2 seconds, dealing 478 Shock Damage to them and all other enemies nearby.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SKELETAL_MAGE,
    },
    {
      id: ClassSkillId.NECROMANCER_SKELETAL_ARCHER,
      name: 'Skeletal Archer',
      type: 'active',
      icon: 'ability_necromancer_003_a',
      description:
        'Unearth a skeletal archer from the dirt to fight by your side for 20 seconds, while granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%. The archer attacks the closest enemy every 2 seconds, dealing 463 Physical Damage.\n\nEach time the archer deals damage, it deals 15% more damage than the previous attack.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SKELETAL_MAGE,
    },
    {
      id: ClassSkillId.NECROMANCER_SHOCKING_SIPHON,
      name: 'Shocking Siphon',
      type: 'active',
      icon: 'ability_necromancer_005',
      description:
        'Violently drain the last spark of life from a corpse, dealing 6150 Shock Damage over 20 seconds to all enemies around the corpse and between you and the corpse. You also gain Major Savagery and Prophecy for 20 seconds, increasing your Weapon and Spell Critical rating by 2629.\n\nWhile slotted, your damage done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_SHOCKING_SIPHON,
    },
    {
      id: ClassSkillId.NECROMANCER_DETONATING_SIPHON,
      name: 'Detonating Siphon',
      type: 'active',
      icon: 'ability_necromancer_005_b',
      description:
        'Violently drain the last spark of life from a corpse, dealing 6180 Disease Damage over 20 seconds to all enemies around the corpse and between you and the corpse. You also gain Major Savagery and Prophecy for 20 seconds, increasing your Weapon and Spell Critical rating by 2629.\n\nWhen the siphon ends the corpse explodes, dealing an additional 1799 Disease Damage to all enemies nearby.\n\nWhile slotted, your damage done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_SHOCKING_SIPHON,
    },
    {
      id: ClassSkillId.NECROMANCER_MYSTIC_SIPHON,
      name: 'Mystic Siphon',
      type: 'active',
      icon: 'ability_necromancer_005_a',
      description:
        'Violently drain the last spark of life from a corpse, dealing 6180 Shock Damage over 20 seconds to all enemies around the corpse and between you and the corpse. You also gain Major Savagery and Prophecy for 20 seconds, increasing your Weapon and Spell Critical rating by 2629.\n\nWhile siphoning the corpse you gain 150 Health, Magicka, and Stamina Recovery.\n\nWhile slotted, your damage done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_SHOCKING_SIPHON,
    },
    {
      id: ClassSkillId.NECROMANCER_DEATH_KNELL,
      name: 'Death Knell',
      type: 'passive',
      icon: 'passive_necromancer_002',
      description: 'Increases your Critical Strike Chance against enemies under 33% Health by 20%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_DISMEMBER,
      name: 'Dismember',
      type: 'passive',
      icon: 'passive_necromancer_003',
      description:
        'While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 3271.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_RAPID_ROT,
      name: 'Rapid Rot',
      type: 'passive',
      icon: 'passive_necromancer_004',
      description: 'Increases your damage done with damage over time effects by 10%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_REUSABLE_PARTS,
      name: 'Reusable Parts',
      type: 'passive',
      icon: 'passive_necromancer_001',
      description:
        'When your Sacrificial Bones, Skeletal Mage, or Spirit Mender dies, the cost of your next Sacrificial Bones, Skeletal Mage, or Spirit Mender is reduced by 66%.',
      isPassive: true,
    },
  ],
};
