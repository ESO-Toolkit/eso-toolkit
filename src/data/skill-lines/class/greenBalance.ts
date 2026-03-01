/**
 * Green Balance — Warden Skill Line
 * Source: https://eso-hub.com/en/skills/warden/green-balance
 * Regenerated: 2025-11-14T20:33:08.879Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const greenBalance: SkillLineData = {
  id: 'class.green-balance',
  name: 'Green Balance',
  class: 'Warden',
  category: 'class',
  icon: 'ability_warden_012',
  sourceUrl: 'https://eso-hub.com/en/skills/warden/green-balance',
  skills: [
    {
      id: ClassSkillId.WARDEN_SECLUDED_GROVE,
      name: 'Secluded Grove',
      type: 'ultimate',
      icon: 'ability_warden_012',
      description:
        'Swell a healing forest at the target location, instantly healing the most injured friendly target for 2787 Health. The forest continues to heal you and your allies in the area for 927 Health every 1 second for 6 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SECLUDED_GROVE,
    },
    {
      id: ClassSkillId.WARDEN_ENCHANTED_FOREST,
      name: 'Enchanted Forest',
      type: 'ultimate',
      icon: 'ability_warden_012_a',
      description:
        'Swell a healing forest at the target location, instantly healing the most injured friendly target for 2880 Health. The forest continues to heal you and your allies in the area for 958 Health every 1 second for 6 seconds.\n\nYou generate 20 Ultimate if the initial heal is used on a friendly target under 50% Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SECLUDED_GROVE,
    },
    {
      id: ClassSkillId.WARDEN_HEALING_THICKET,
      name: 'Healing Thicket',
      type: 'ultimate',
      icon: 'ability_warden_012_b',
      description:
        'Swell a healing forest at the target location, instantly healing the most injured friendly target for 2880 Health. The forest continues to heal you and your allies in the area for 958 every 1 second for 6 seconds.\n\nThe healing over time will continue to heal you or your allies for 4 seconds after leaving the forest.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SECLUDED_GROVE,
    },
    {
      id: ClassSkillId.WARDEN_FUNGAL_GROWTH,
      name: 'Fungal Growth',
      type: 'active',
      icon: 'ability_warden_008',
      description:
        'Seed a large area of mushrooms in front of you, healing you and your allies for 2613 Health.',
      baseSkillId: ClassSkillId.WARDEN_FUNGAL_GROWTH,
    },
    {
      id: ClassSkillId.WARDEN_ENCHANTED_GROWTH,
      name: 'Enchanted Growth',
      type: 'active',
      icon: 'ability_warden_008_b',
      description:
        'Seed a large area of mushrooms in front of you, healing you and your allies for 2700 Health. \n\nAny target healed gains Minor Intellect and Minor Endurance, increasing their Magicka and Stamina Recovery by 15% for 20 seconds.',
      baseSkillId: ClassSkillId.WARDEN_FUNGAL_GROWTH,
    },
    {
      id: ClassSkillId.WARDEN_SOOTHING_SPORES,
      name: 'Soothing Spores',
      type: 'active',
      icon: 'ability_warden_008_a',
      description:
        'Seed a large area of mushrooms in front of you, healing you and your allies for 2700 Health.\n\nHeals for 15% more on allies that are within 8 meters of you.',
      baseSkillId: ClassSkillId.WARDEN_FUNGAL_GROWTH,
    },
    {
      id: ClassSkillId.WARDEN_HEALING_SEED,
      name: 'Healing Seed',
      type: 'active',
      icon: 'ability_warden_007',
      description:
        'Summon a field of flowers which blooms after 6 seconds, healing you and allies in the area for 3486 Health.\n\nAn ally within the field can activate the Harvest synergy, healing for 3372 Health over 5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_HEALING_SEED,
    },
    {
      id: ClassSkillId.WARDEN_BUDDING_SEEDS,
      name: 'Budding Seeds',
      type: 'active',
      icon: 'ability_warden_007_b',
      description:
        'Summon a field of flowers which blooms after 6 seconds, healing you and allies in the area for 3485 Health.\n\nWhile the field grows, you and allies are healed for 410 Health every 1 second.  \n\nYou can activate this ability again to cause it to instantly bloom.\n\nAn ally within the field can activate the Harvest synergy, healing for 3372 Health over 5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_HEALING_SEED,
    },
    {
      id: ClassSkillId.WARDEN_CORRUPTING_POLLEN,
      name: 'Corrupting Pollen',
      type: 'active',
      icon: 'ability_warden_007_c',
      description:
        'Summon a field of flowers which blooms after 6 seconds, healing you and allies in the area for 3600 Health.\n\nEnemies who enter the field are afflicted with Major Defile and Minor Cowardice, reducing their healing received and damage shield strength by 12% and their Weapon and Spell Damage by 215.\n\nAn ally within the field can activate the Harvest synergy, healing for 3372 Health over 5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_HEALING_SEED,
    },
    {
      id: ClassSkillId.WARDEN_LIVING_VINES,
      name: 'Living Vines',
      type: 'active',
      icon: 'ability_warden_010',
      description:
        'Grow vines to embrace you or the lowest health ally in front of you for 10 seconds. The vines heal the target for 695 Health each time they take damage. This effect can occur once every 1 second.',
      baseSkillId: ClassSkillId.WARDEN_LIVING_VINES,
    },
    {
      id: ClassSkillId.WARDEN_LEECHING_VINES,
      name: 'Leeching Vines',
      type: 'active',
      icon: 'ability_warden_010_a',
      description:
        'Grow vines to embrace you or the lowest health ally in front of you for 10 seconds. The vines heal the target for 718 Health each time they take damage. This effect can occur once every 1 second.\n\nThe vines apply Minor Lifesteal to enemies that damage the target for 10 seconds, healing you and your allies for 600 Health every 1 second when damaging that enemy.',
      baseSkillId: ClassSkillId.WARDEN_LIVING_VINES,
    },
    {
      id: ClassSkillId.WARDEN_LIVING_TRELLIS,
      name: 'Living Trellis',
      type: 'active',
      icon: 'ability_warden_010_b',
      description:
        'Grow vines to embrace you or the lowest health ally in front of you for 10 seconds. The vines heal the target for 718 Health each time they take damage. This effect can occur once every 1 second.\n\nWhen the vines expire, they heal the target for an additional 1742 Health.',
      baseSkillId: ClassSkillId.WARDEN_LIVING_VINES,
    },
    {
      id: ClassSkillId.WARDEN_LOTUS_FLOWER,
      name: 'Lotus Flower',
      type: 'active',
      icon: 'ability_warden_009',
      description:
        'Embrace the lotus blessing, causing your Light Attacks to restore 1320 Health and your fully-charged Heavy Attacks to restore 3036 Health to you or a nearby ally for 20 seconds.\n\nWhile active you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.WARDEN_LOTUS_FLOWER,
    },
    {
      id: ClassSkillId.WARDEN_GREEN_LOTUS,
      name: 'Green Lotus',
      type: 'active',
      icon: 'ability_warden_009_a',
      description:
        'Embrace the lotus blessing, causing your Light Attacks to restore 1500 Health and your fully-charged Heavy Attacks to restore 3450 Health to you or 2 nearby allies for 20 seconds.\n\nWhile active you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.WARDEN_LOTUS_FLOWER,
    },
    {
      id: ClassSkillId.WARDEN_LOTUS_BLOSSOM,
      name: 'Lotus Blossom',
      type: 'active',
      icon: 'ability_warden_009_b',
      description:
        'Embrace the lotus blessing, causing your Light Attacks to restore 1320 Health and your fully-charged Heavy Attacks to restore 3036 Health to you or a nearby ally for 1 minute.\n\nWhile active you gain Major Prophecy and Savagery, increasing your Spell and Weapon Critical rating by 2629.',
      baseSkillId: ClassSkillId.WARDEN_LOTUS_FLOWER,
    },
    {
      id: ClassSkillId.WARDEN_NATURE_S_GRASP,
      name: "Nature's Grasp",
      type: 'active',
      icon: 'ability_warden_011',
      description:
        'Launch a vine to swing yourself to an ally, healing them for 3480 Health over 10 seconds. You gain 3 Ultimate when this effect completes if you are in combat.',
      baseSkillId: ClassSkillId.WARDEN_NATURE_S_GRASP,
    },
    {
      id: ClassSkillId.WARDEN_BURSTING_VINES,
      name: 'Bursting Vines',
      type: 'active',
      icon: 'ability_warden_011_a',
      description:
        'Launch a vine to swing yourself to an ally, instantly healing them for 2700 Health.  \n\nGain 10 Ultimate when healing an ally under 60% Health while you are in combat. This effect can occur every 4 seconds.',
      baseSkillId: ClassSkillId.WARDEN_NATURE_S_GRASP,
    },
    {
      id: ClassSkillId.WARDEN_NATURE_S_EMBRACE,
      name: "Nature's Embrace",
      type: 'active',
      icon: 'ability_warden_011_b',
      description:
        'Launch a vine to swing yourself to an ally, healing you and them for 3594 Health over 10 seconds. Gain 3 Ultimate when either of these effects complete while you are in combat.',
      baseSkillId: ClassSkillId.WARDEN_NATURE_S_GRASP,
    },
    {
      id: ClassSkillId.WARDEN_ACCELERATED_GROWTH,
      name: 'Accelerated Growth',
      type: 'passive',
      icon: 'passive_warden_008',
      description:
        'When you heal yourself or an ally under 40% Health with a Green Balance ability you gain Major Mending, increasing your healing done by 16% for 4 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_EMERALD_MOSS,
      name: 'Emerald Moss',
      type: 'passive',
      icon: 'passive_warden_005',
      description:
        'Increases your healing done with Green Balance abilities by 5% for each Green Balance ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_MATURATION,
      name: 'Maturation',
      type: 'passive',
      icon: 'passive_warden_007',
      description:
        'When you activate a heal on yourself or an ally you grant the target Minor Toughness, increasing their Max Health by 10% for 20 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_NATURE_S_GIFT,
      name: "Nature's Gift",
      type: 'passive',
      icon: 'passive_warden_006',
      description:
        'When you heal an ally with a Green Balance ability, you gain 277 Magicka or 277 Stamina, whichever resource pool is lower. This effect can occur once every 1 second.',
      isPassive: true,
    },
  ],
};
