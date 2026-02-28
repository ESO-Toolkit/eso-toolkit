/**
 * Draconic Power — Dragonknight Skill Line
 * Source: https://eso-hub.com/en/skills/dragonknight/draconic-power
 * Regenerated: 2025-11-14T20:33:08.786Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const draconicPower: SkillLineData = {
  id: 'class.draconic-power',
  name: 'Draconic Power',
  class: 'Dragonknight',
  category: 'class',
  icon: 'ability_dragonknight_009',
  sourceUrl: 'https://eso-hub.com/en/skills/dragonknight/draconic-power',
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
      name: 'Dragon Leap',
      type: 'ultimate',
      icon: 'ability_dragonknight_009',
      description:
        'Launch yourself at an enemy, dealing 4241 Physical Damage to all enemies in the area, knocking them back 4 meters, and stunning them for 2 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FEROCIOUS_LEAP,
      name: 'Ferocious Leap',
      type: 'ultimate',
      icon: 'ability_dragonknight_009_a',
      description:
        'Launch yourself at an enemy, dealing 4241 Flame Damage to all enemies in the area, knocking them back, and stunning them for 2 seconds.\n\nAfter leaping you gain a damage shield that absorbs 16528 damage for 6 seconds. This portion of the ability scales with your Max Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_TAKE_FLIGHT,
      name: 'Take Flight',
      type: 'ultimate',
      icon: 'ability_dragonknight_009_b',
      description:
        'Launch yourself at an enemy, dealing 5037 Physical Damage to all enemies in the area, knocking them back, and stunning them for 2 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SPIKED_ARMOR,
      name: 'Spiked Armor',
      type: 'active',
      icon: 'ability_dragonknight_007',
      description:
        'Release your inner Dragon to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds.  \n\nWhile active, the armor returns 1 Flame Damage to any enemy that uses a direct damage attack against you in melee range, scaling off your Physical and Spell Resistance.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SPIKED_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_VOLATILE_ARMOR,
      name: 'Volatile Armor',
      type: 'active',
      icon: 'ability_dragonknight_007_a',
      description:
        'Release your inner Dragon to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds. \n\nYou release a spray of fiery spikes around you, causing enemies hit to take 11 Flame Damage over 20 seconds.\n\nWhile active, the armor returns 1 Flame Damage to any enemy that uses a direct damage attack against you in melee range.\n\nThis ability scales off your Physical and Spell Resistance.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SPIKED_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_HARDENED_ARMOR,
      name: 'Hardened Armor',
      type: 'active',
      icon: 'ability_dragonknight_007_b',
      description:
        'Release your inner Dragon to gain Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds. \n\nYou gain a damage shield that absorbs up to 5121 damage for 6 seconds, scaling off your Max Health.  \n\nWhile active, the armor returns 1 Flame Damage to any enemy that uses a direct damage attack against you in melee range, scaling off your Physical and Spell Resistance.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SPIKED_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DARK_TALONS,
      name: 'Dark Talons',
      type: 'active',
      icon: 'ability_dragonknight_010',
      description:
        'Call forth talons from the ground, dealing 1742 Flame Damage to enemies near you and immobilizing them for 4 seconds. \n\nAn ally near the talons can activate the Ignite synergy, dealing 2812 Flame Damage to all enemies held within them.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DARK_TALONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_TALONS,
      name: 'Burning Talons',
      type: 'active',
      icon: 'ability_dragonknight_010_b',
      description:
        'Call forth talons from the ground, dealing 1799 Flame Damage to enemies near you, an additional 1635 Flame Damage over 5 seconds, and immobilizing them for 4 seconds. \n\nAn ally near the talons can activate the Ignite synergy, dealing 2812 Flame Damage to all enemies held within them.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DARK_TALONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CHOKING_TALONS,
      name: 'Choking Talons',
      type: 'active',
      icon: 'ability_dragonknight_010_a',
      description:
        'Call forth talons from the ground, dealing 1742 Flame Damage to enemies near you and immobilizing them for 4 seconds. \n\nEnemies hit are afflicted with Minor Maim, reducing their damage done by 5% for 10 seconds. \n\nAn ally near the talons can activate the Ignite synergy, dealing 2812 Flame Damage to all enemies held within them.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DARK_TALONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
      name: 'Dragon Blood',
      type: 'active',
      icon: 'ability_dragonknight_011',
      description:
        'Draw on your draconic blood to heal for 33% of your missing Health.\n\nYou also gain Major Fortitude, increasing your Health Recovery by 30% for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_GREEN_DRAGON_BLOOD,
      name: 'Green Dragon Blood',
      type: 'active',
      icon: 'ability_dragonknight_011_b',
      description:
        'Draw on your draconic blood to heal for 33% of your missing Health and an additional 511 Health every 1 second over 5 seconds. The heal over time scales off of your Max Health.\n\nYou also gain Major Fortitude, Major Endurance, and Minor Vitality, increasing your Health Recovery and Stamina Recovery by 30% and healing received and damage shield strength by 6% for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
      alternateIds: [32744],
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_COAGULATING_BLOOD,
      name: 'Coagulating Blood',
      type: 'active',
      icon: 'ability_dragonknight_011_a',
      description:
        'Draw on your draconic blood to heal for 2999, increasing by up to 50% additional healing based on your missing Health.\n\nYou also gain Major Fortitude, increasing your Health Recovery by 30% for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
      name: 'Protective Scale',
      type: 'active',
      icon: 'ability_dragonknight_008',
      description:
        'Flex your scales, reducing your damage taken from projectiles by 50% for 6 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGON_FIRE_SCALE,
      name: 'Dragon Fire Scale',
      type: 'active',
      icon: 'ability_dragonknight_008_a',
      description:
        'Flex your scales, reducing damage taken from projectiles by 50% for 6 seconds. \n\nWhen you are hit with a projectile, you retaliate by launching a fiery orb at the attacker that deals 1799 Flame Damage. This effect can occur once every half second.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_PLATE,
      name: 'Protective Plate',
      type: 'active',
      icon: 'ability_dragonknight_008_b',
      description:
        'Flex your scales, reducing damage taken from projectiles by 50% for 6 seconds.\n\nGain immunity to snares and immobilizations for 4 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_INHALE,
      name: 'Inhale',
      type: 'active',
      icon: 'ability_dragonknight_012',
      description:
        'Channel draconic energy to suck in the air around you, dealing 870 Flame Damage to nearby enemies and healing you for 100% of the damage caused.\n\nAfter 2.5 seconds, you exhale fire, dealing 1742 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DEEP_BREATH,
      name: 'Deep Breath',
      type: 'active',
      icon: 'ability_dragonknight_012_a',
      description:
        'Channel draconic energy to suck in the air around you, dealing 870 Flame Damage to nearby enemies and healing you for 100% of the damage caused.\n\nAny enemy hit that is casting is interrupted, set Off Balance, and stunned for 2 seconds.\n\nAfter 2.5 seconds, you exhale fire, dealing 2249 Flame Damage to nearby enemies.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAW_ESSENCE,
      name: 'Draw Essence',
      type: 'active',
      icon: 'ability_dragonknight_012_b',
      description:
        "Channel draconic energy to suck in the air around you, dealing 870 Flame Damage to nearby enemies and healing you for 150% of the damage caused.\n\nAfter 2.5 seconds, you exhale fire, dealing 1742 Flame Damage to nearby enemies and restoring 10% of the ability's cost for each enemy hit as Magicka.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_INHALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BURNING_HEART,
      name: 'Burning Heart',
      type: 'passive',
      icon: 'ability_dragonknight_032',
      description:
        'While a Draconic Power ability is active, your healing received is increased by 9%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ELDER_DRAGON,
      name: 'Elder Dragon',
      type: 'passive',
      icon: 'ability_dragonknight_025',
      description: 'Increases your Health Recovery by 323 for each Draconic Power ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IRON_SKIN,
      name: 'Iron Skin',
      type: 'passive',
      icon: 'ability_dragonknight_021',
      description: 'Increases the amount of damage you block by 10%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SCALED_ARMOR,
      name: 'Scaled Armor',
      type: 'passive',
      icon: 'ability_dragonknight_020',
      description: 'Increases your Physical and Spell Resistance by 2974.',
      isPassive: true,
    },
  ],
};
