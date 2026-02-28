/**
 * Bone Tyrant — Necromancer Skill Line
 * Source: https://eso-hub.com/en/skills/necromancer/bone-tyrant
 * Regenerated: 2025-11-14T20:33:08.812Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const boneTyrant: SkillLineData = {
  id: 'class.bone-tyrant',
  name: 'Bone Tyrant',
  class: 'Necromancer',
  category: 'class',
  icon: 'ability_necromancer_012',
  sourceUrl: 'https://eso-hub.com/en/skills/necromancer/bone-tyrant',
  skills: [
    {
      id: ClassSkillId.NECROMANCER_BONE_GOLIATH_TRANSFORMATION,
      name: 'Bone Goliath Transformation',
      type: 'ultimate',
      icon: 'ability_necromancer_012',
      description:
        'Become a horrific Bone Goliath, increasing your Max Health by 30000 for 20 seconds and immediately restoring 30000 Health. \n\nWhile transformed, your damaging Light Attacks restore 319 Health and your fully-charged Heavy Attacks restore 800 Health. This ability scales off your Max Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_BONE_GOLIATH_TRANSFORMATION,
    },
    {
      id: ClassSkillId.NECROMANCER_PUMMELING_GOLIATH,
      name: 'Pummeling Goliath',
      type: 'ultimate',
      icon: 'ability_necromancer_012_a',
      description:
        'Become a destructive Pummeling Goliath, increasing your Max Health by 30000 for 20 seconds and immediately restoring 30000 Health. \n\nWhile transformed, your damaging Light Attacks restore 319 Health and your fully-charged Heavy Attacks restore 800 Health. This ability scales off your Max Health. \n\nYour Bash attacks can hit multiple targets in front of you and deal 1799 Physical Damage.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_BONE_GOLIATH_TRANSFORMATION,
    },
    {
      id: ClassSkillId.NECROMANCER_RAVENOUS_GOLIATH,
      name: 'Ravenous Goliath',
      type: 'ultimate',
      icon: 'ability_necromancer_012_b',
      description:
        'Become a horrific Ravenous Goliath, increasing your Max Health by 30000 for 20 seconds and immediately restoring 30000 Health. \n\nWhile transformed, your damaging Light Attacks restore 319 Health and your fully-charged Heavy Attacks restore 800 Health. You deal 826 Magic Damage to nearby enemies every second and heal for that amount. These abilities scale off your Max Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_BONE_GOLIATH_TRANSFORMATION,
    },
    {
      id: ClassSkillId.NECROMANCER_BONE_ARMOR,
      name: 'Bone Armor',
      type: 'active',
      icon: 'ability_necromancer_008',
      description:
        'Wrap yourself in hardened bone, granting you Major Resolve and Minor Resolve for 20 seconds, increasing your Physical Resistance and Spell Resistance by 5948 and 2974.\n\nIf cast during combat, you can cast a corpse consuming ability on yourself. This effect can occur once every 10 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_ARMOR,
    },
    {
      id: ClassSkillId.NECROMANCER_BECKONING_ARMOR,
      name: 'Beckoning Armor',
      type: 'active',
      icon: 'ability_necromancer_008_a',
      description:
        'Wrap yourself in hardened bone, granting you Major Resolve and Minor Resolve for 20 seconds, increasing your Physical Resistance and Spell Resistance by 5948 and 2974.\n\nWhile active, ranged attackers will be pulled to you once every 2 seconds and become taunted for 15 seconds if they are not already taunted.\n\nIf cast during combat, you can cast a corpse consuming ability on yourself. This effect can occur once every 10 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_ARMOR,
    },
    {
      id: ClassSkillId.NECROMANCER_SUMMONER_S_ARMOR,
      name: "Summoner's Armor",
      type: 'active',
      icon: 'ability_necromancer_008_b',
      description:
        'Wrap yourself in hardened bone, granting you Major Resolve and Minor Resolve for 30 seconds, increasing your Physical Resistance and Spell Resistance by 5948 and 2974.\n\nWhile active, reduce the cost of Blastbones, Skeletal Mage, and Spirit Mender by 15%.\n\nIf cast during combat, you can cast a corpse consuming ability on yourself. This effect can occur once every 10 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_ARMOR,
    },
    {
      id: ClassSkillId.NECROMANCER_BITTER_HARVEST,
      name: 'Bitter Harvest',
      type: 'active',
      icon: 'ability_necromancer_011',
      description:
        'Sap the lingering life from fresh corpses, granting you 2 Ultimate and healing 660 Health every 1 second for 2 seconds per corpse consumed. This ability scales off your Max Health.\n\nWhile slotted, your damage taken is reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_BITTER_HARVEST,
    },
    {
      id: ClassSkillId.NECROMANCER_DEADEN_PAIN,
      name: 'Deaden Pain',
      type: 'active',
      icon: 'ability_necromancer_011_a',
      description:
        'Sap the lingering life from fresh corpses, granting you 2 Ultimate and healing 682 Health every 1 second for 4 seconds per corpse consumed. While you have the heal effect, you gain Major Protection, reducing the damage you take by 10%. This ability scales off your Max Health.\n\nWhile slotted, your damage taken is reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_BITTER_HARVEST,
    },
    {
      id: ClassSkillId.NECROMANCER_NECROTIC_POTENCY,
      name: 'Necrotic Potency',
      type: 'active',
      icon: 'ability_necromancer_011_b',
      description:
        'Sap the lingering life from fresh corpses, granting you 6 Ultimate and healing 682 Health every 1 second for 2 seconds per additional corpse. This ability scales off your Max Health.\n\nWhile slotted, your damage taken is reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_BITTER_HARVEST,
    },
    {
      id: ClassSkillId.NECROMANCER_BONE_TOTEM,
      name: 'Bone Totem',
      type: 'active',
      icon: 'ability_necromancer_010',
      description:
        'Summon an effigy of bone at your feet for 11 seconds that grants Minor Protection to you and your allies, reducing damage taken by 5%. Enemies in the area are afflicted with Major Cowardice, reducing their Weapon and Spell Damage by 430.\n\nAfter 2 seconds, the totem begins fearing nearby enemies every 2 seconds, causing them to cower in place for 4 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_TOTEM,
    },
    {
      id: ClassSkillId.NECROMANCER_AGONY_TOTEM,
      name: 'Agony Totem',
      type: 'active',
      icon: 'ability_necromancer_010_b',
      description:
        'Summon an effigy of bone at your feet for 13 seconds that grants Minor Protection to you and your allies, reducing damage taken by 5%. Enemies in the area are afflicted with Major Cowardice.\n\nAfter 2 seconds, the totem begins fearing nearby enemies every 2 seconds, causing them to cower in place for 4 seconds.\n\nAllies can activate the Pure Agony synergy, dealing 2100 Magic Damage over 5 seconds to enemies.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_TOTEM,
    },
    {
      id: ClassSkillId.NECROMANCER_REMOTE_TOTEM,
      name: 'Remote Totem',
      type: 'active',
      icon: 'ability_necromancer_010_a',
      description:
        'Summon an effigy of bone for 11 seconds that grants Minor Protection to you and your allies, reducing damage taken by 5%. Enemies in the area are afflicted with Major Cowardice, reducing their Weapon and Spell Damage by 430.\n\nAfter 2 seconds, the totem begins fearing nearby enemies every 2 seconds, causing them to cower in place for 4 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_BONE_TOTEM,
    },
    {
      id: ClassSkillId.NECROMANCER_DEATH_SCYTHE,
      name: 'Death Scythe',
      type: 'active',
      icon: 'ability_necromancer_007',
      description:
        "Slice into your enemy's life force, dealing 1742 Magic Damage.\n\nYou heal for 2400 Health for the first enemy hit, and an additional 800 for each additional enemy hit, up to five times. The healing of this ability scales off your Max Health.",
      baseSkillId: ClassSkillId.NECROMANCER_DEATH_SCYTHE,
    },
    {
      id: ClassSkillId.NECROMANCER_HUNGRY_SCYTHE,
      name: 'Hungry Scythe',
      type: 'active',
      icon: 'ability_necromancer_007_a',
      description:
        "Slice into your enemy's life force, dealing 1742 Magic Damage.  \n\nYou heal for 2400 Health for the first enemy hit, and an additional 800 for each additional enemy, up to five times. After dealing damage, you heal for 991 Health every 2 seconds over 10 seconds. The healing of this ability scales off your Max Health.",
      baseSkillId: ClassSkillId.NECROMANCER_DEATH_SCYTHE,
    },
    {
      id: ClassSkillId.NECROMANCER_RUINOUS_SCYTHE,
      name: 'Ruinous Scythe',
      type: 'active',
      icon: 'ability_necromancer_007_b',
      description:
        "Slice into your enemy's life force, dealing 1799 Bleed Damage, applying the Hemorrhaging status effect, and setting them Off Balance for 7 seconds.\n\nYou heal for 2400 Health for the first enemy hit, and an additional 800 for each additional enemy, up to five times. The healing of this ability scales off your Max Health.",
      baseSkillId: ClassSkillId.NECROMANCER_DEATH_SCYTHE,
    },
    {
      id: ClassSkillId.NECROMANCER_GRAVE_GRASP,
      name: 'Grave Grasp',
      type: 'active',
      icon: 'ability_necromancer_009',
      description:
        'Summon three patches of skeletal claws from the ground in front of you. Enemies in the first area are snared by 30% for 5 seconds, immobilized in the second area for 4 seconds, and stunned in the final area for 3 seconds.\n\nEach patch applies Minor Maim to enemies hit for 10 seconds, reducing their damage done by 5%.',
      baseSkillId: ClassSkillId.NECROMANCER_GRAVE_GRASP,
    },
    {
      id: ClassSkillId.NECROMANCER_EMPOWERING_GRASP,
      name: 'Empowering Grasp',
      type: 'active',
      icon: 'ability_necromancer_009_a',
      description:
        'Summon three patches of skeletal claws from the ground in front of you. Enemies in the first area are snared by 30% for 5 seconds, immobilized in the second area for 4 seconds, and stunned in the final area for 3 seconds.\n\nEach area applies Major Maim to enemies and Empower to your allies for 10 seconds, reducing enemy damage done by 10% and allied Heavy Attack Damage against monsters by 70%.',
      baseSkillId: ClassSkillId.NECROMANCER_GRAVE_GRASP,
    },
    {
      id: ClassSkillId.NECROMANCER_GHOSTLY_EMBRACE,
      name: 'Ghostly Embrace',
      type: 'active',
      icon: 'ability_necromancer_009_b',
      description:
        'Summon three patches of skeletal claws from the ground in front of you, each dealing 898 Frost Damage.\n\nThe first area applies the Chilled status effect, the second area deals an additional 1635 Frost Damage over 5 seconds, and the final area creates a corpse if at least one enemy was hit.',
      baseSkillId: ClassSkillId.NECROMANCER_GRAVE_GRASP,
    },
    {
      id: ClassSkillId.NECROMANCER_DEATH_GLEANING,
      name: 'Death Gleaning',
      type: 'passive',
      icon: 'passive_necromancer_005',
      description:
        'Whenever an enemy you are in combat with dies within 28 meters of you, restore 666 Magicka and Stamina.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_DISDAIN_HARM,
      name: 'Disdain Harm',
      type: 'passive',
      icon: 'passive_necromancer_006',
      description:
        'Reduce the damage you take from damage over time abilities by 15% while you have a Bone Tyrant ability active.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_HEALTH_AVARICE,
      name: 'Health Avarice',
      type: 'passive',
      icon: 'passive_necromancer_007',
      description: 'Increase your Healing Received by 3% for each Bone Tyrant ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_LAST_GASP,
      name: 'Last Gasp',
      type: 'passive',
      icon: 'passive_necromancer_008',
      description: 'Increase your Max Health by 2412.',
      isPassive: true,
    },
  ],
};
