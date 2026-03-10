/**
 * Draconic Power — Dragonknight Skill Line
 * Source: https://eso-hub.com/en/skills/dragonknight/draconic-power
 * Regenerated: 2026-03-09T00:00:00.000Z
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
        'Launch yourself at an enemy, dealing 3574 Flame Damage to all enemies in the area, knocking players back 4 meters and stunning them for 2 seconds. If the target is a monster they are instead knocked into the air and stunned for 3 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FEROCIOUS_LEAP,
      name: 'Ferocious Leap',
      type: 'ultimate',
      icon: 'ability_dragonknight_009_a',
      description:
        'Launch yourself at an enemy, dealing 3574 Flame Damage to all enemies in the area, knocking players back 4 meters and stunning them for 2 seconds. If the target is a monster they are instead knocked into the air and stunned for 3 seconds. Upon activation you gain a damage shield that absorbs 17173 damage for 10 seconds. This portion of the ability scales with your Max Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_TAKE_FLIGHT,
      name: 'Take Flight',
      type: 'ultimate',
      icon: 'ability_dragonknight_009_b',
      description:
        "Launch yourself at an enemy, dealing 4106 Flame Damage to all enemies in the area, knocking them back 4 meters, and stunning them for 2 seconds. If the target is a monster they are instead knocked into the air and stunned for 3 seconds. Upon activation you are filled with draconic fury for 15 seconds, increasing your damage done by 10%. This effect's potency doubles against monsters.",
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_LEAP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
      name: 'Dragonfire Breath',
      type: 'active',
      icon: 'ability_dragonknight_004',
      description:
        'Exhale a blast of draconic fire in front of you, dealing 1742 Flame Damage and an additional 2900 Flame Damage over 10 seconds to enemies in your path.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_NOXIOUS_BREATH,
      name: 'Disintegrating Dragonfire',
      type: 'active',
      icon: 'ability_dragonknight_004_a',
      description:
        'Exhale a blast of draconic fire in front of you, dealing 1799 Flame Damage, applying the Burning status effect, and an additional 2995 Flame Damage over 10 seconds to enemies in your path. The initial hit liquifies the armor of your enemies, applying Major Breach to enemies for the duration, reducing Physical and Spell Resistance by 5948.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ENGULFING_FLAMES,
      name: 'Engulfing Dragonfire',
      type: 'active',
      icon: 'ability_dragonknight_004_b',
      description:
        'Breathe forth an unending torrent of draconic fire, dealing 1386 Flame Damage every 0.5 seconds in a channeled attack over 4.8 seconds. Each tick increases the damage dealt by 5%, up to a maximum of 50%. While Take Flight is active you always deal maximum damage. This ability is considered direct damage.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_BREATH,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
      name: 'Chains of Flame',
      type: 'active',
      icon: 'ability_dragonknight_005',
      description:
        'Lash out with a flaming chain, pulling an enemy to you. The searing metal deals 1392 Flame Damage, applies the Burning status effect, and taunts them for 15 seconds if they are not already taunted. This attack cannot be dodged or reflected. Also inflicts Major Cowardice on the enemy, reducing Weapon and Spell Damage by 430 for 10 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_UNRELENTING_GRIP,
      name: 'Chains of Dominance',
      type: 'active',
      icon: 'ability_dragonknight_005_a',
      description:
        "Lash out with a chain bound in Draconic runes, pulling an enemy to you. The enchanted metal deals 1393 Flame Damage, applies the Burning status effect, and taunts them for 15 seconds if they are not already taunted. If the target cannot be pulled, you restore the ability's Magicka cost. This attack cannot be dodged or reflected. Also inflicts Major Cowardice on the enemy, reducing Weapon and Spell Damage by 430 for 15 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CHAINS_OF_DEVASTATION,
      name: 'Chains of Devastation',
      type: 'active',
      icon: 'ability_dragonknight_005_b',
      description:
        'Lash out with a chain bound in jagged links, pulling yourself to an enemy. The searing metal deals 1438 Flame Damage and applies the Burning status effect. This attack cannot be dodged or reflected. Hitting the target grants you Major Berserk for 6 seconds and Major Evasion for 10 seconds, increasing damage done by 10% reducing damage taken from area attacks by 20%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_FIERY_GRIP,
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
        'Call forth talons from the ground, dealing 1742 Flame Damage to enemies near you and immobilizing them for 4 seconds. Enemies hit are afflicted with Minor Maim, reducing damage done by 5% for 20 seconds. An ally near the talons can activate the Ignite synergy, dealing 2812 Flame Damage to all enemies held within them.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DARK_TALONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
      name: 'Dragon Blood',
      type: 'active',
      icon: 'ability_dragonknight_011',
      description:
        'Draw on your draconic blood to heal for 4132 Health, increasing by up to 50% additional healing based on your missing Health. This ability scales off your Max Health. You also gain Major Fortitude, increasing your Health Recovery by 30% for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_GREEN_DRAGON_BLOOD,
      name: 'Blood of the Green Dragon',
      type: 'active',
      icon: 'ability_dragonknight_011_b',
      description:
        'Draw on your draconic blood to heal for 4131 Health, increasing by up to 50% additional healing based on your missing Health. Heals for an additional 2555 Health over 5 seconds. This ability scales off your Max Health. You also gain Major Endurance and Fortitude and Minor Vitality, increasing Health and Stamina Recovery by 30% and increasing healing received and damage shield strength by 6% for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_COAGULATING_BLOOD,
      name: 'Blood of the Elder Dragon',
      type: 'active',
      icon: 'ability_dragonknight_011_a',
      description:
        'Draw on your draconic blood to heal yourself for 2999 and nearby allies for 1998 Health, increasing by up to 50% additional healing based on missing Health. Healed targets gain Major Fortitude and Minor Courage, increasing Health Recovery by 30% and Weapon and Spell Damage by 215 for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_DRAGON_BLOOD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
      name: 'Wing Buffet',
      type: 'active',
      icon: 'ability_dragonknight_008',
      description:
        'Unfurl draconic wings to knock back enemies around you 4 meters and stun them for 1.8 seconds. The winds from your buffet swirl around you, reducing your damage taken from projectiles by 50% for 6 seconds, while granting you Major Expedition for 4 seconds, increasing Movement Speed by 30%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_DRAGON_FIRE_SCALE,
      name: 'Protect the Brood',
      type: 'active',
      icon: 'ability_dragonknight_008_a',
      description:
        'Unfurl draconic wings to safeguard you and nearby group members for 6 seconds, reducing damage taken from projectiles by 50% for you and 25% for group members. You and your brood gain Minor Protection for 20 seconds, reducing damage taken by 5%. You gain Major Expedition for 4 seconds, increasing Movement Speed by 30%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_PLATE,
      name: 'Fleetstep Wings',
      type: 'active',
      icon: 'ability_dragonknight_008_b',
      description:
        'Unfurl draconic wings to knock back enemies around you 4 meters and stun them for 1.8 seconds. The enchanted winds summoned by your wings coalesce around you, reducing your damage taken from projectiles by 50% for 6 seconds, while granting you immunity to snares and immobilizations and Major Expedition for 4 seconds, increasing Movement Speed by 30%.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PROTECTIVE_SCALE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ELDER_DRAGON,
      name: 'Elder Dragon',
      type: 'passive',
      icon: 'ability_dragonknight_025',
      description:
        'The eldest Dragons are forces of nature. As are you. Activating a Draconic Power ability grants you and group members Minor Brutality for 20 seconds, increasing Weapon Damage by 10%. Increases your Health Recovery by up to 700, based on your missing Health. Current amount: 0',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LANDSLIDE,
      name: 'The Storm Voice',
      type: 'passive',
      icon: 'ability_dragonknight_031',
      description:
        'The syllables of that ancient tongue live in the mouth of every Dragonknight. When you cast an Ultimate ability, you restore 16 Health 16 Magicka, and 16 Stamina for each point of the Ultimate spent. Each Dragonknight ability slotted increases this value by 6. Current amount: 16 Health 16 Magicka 16 Stamina',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WORLD_IN_RUIN,
      name: 'World in Ruin',
      type: 'passive',
      icon: 'ability_sorcerer_010',
      description:
        'Dragons leave naught but ash and ruin in their wake. Increases your damage done with area and over time attacks by 7%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IRON_SKIN,
      name: 'Burnished Scales',
      type: 'passive',
      icon: 'ability_dragonknight_020',
      description:
        "A Dragon's scales will turn aside arrow, fire, and blade. Increases the amount of damage you block by 10%.",
      isPassive: true,
    },
  ],
};
