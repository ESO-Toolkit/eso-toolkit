/**
 * Aedric Spear — Templar Skill Line
 * Source: https://eso-hub.com/en/skills/templar/aedric-spear
 * Regenerated: 2025-11-14T20:33:08.859Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const aedricSpear: SkillLineData = {
  id: 'class.aedric-spear',
  name: 'Aedric Spear',
  class: 'Templar',
  category: 'class',
  icon: 'ability_templar_radial_sweep',
  sourceUrl: 'https://eso-hub.com/en/skills/templar/aedric-spear',
  skills: [
    {
      id: ClassSkillId.TEMPLAR_RADIAL_SWEEP,
      name: 'Radial Sweep',
      type: 'ultimate',
      icon: 'ability_templar_radial_sweep',
      description:
        'Swing your Aedric spear around with holy vengeance, dealing 2323 Magic Damage to all nearby enemies and an additional 1161 Magic Damage every 2 seconds for 6 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RADIAL_SWEEP,
    },
    {
      id: ClassSkillId.TEMPLAR_CRESCENT_SWEEP,
      name: 'Crescent Sweep',
      type: 'ultimate',
      icon: 'ability_templar_crescent_sweep',
      description:
        'Swing your Aedric spear around with holy vengeance, dealing 2399 Magic Damage to all nearby enemies and an additional 1161 Magic Damage every 2 seconds for 6 seconds.\n\nEnemies in your path will be hit for 60% more damage.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RADIAL_SWEEP,
    },
    {
      id: ClassSkillId.TEMPLAR_EVERLASTING_SWEEP,
      name: 'Everlasting Sweep',
      type: 'ultimate',
      icon: 'ability_templar_empowering_sweep',
      description:
        'Swing your Aedric spear around with holy vengeance, dealing 2399 Physical Damage to all nearby enemies and an additional 1161 Physical Damage every 2 seconds for 10 seconds. The duration is extended by 2 seconds for each enemy hit.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RADIAL_SWEEP,
    },
    {
      id: ClassSkillId.TEMPLAR_PIERCING_JAVELIN,
      name: 'Piercing Javelin',
      type: 'active',
      icon: 'ability_templar_returning_spear',
      description:
        "Hurl your spear at an enemy with godlike strength, dealing 1392 Magic Damage and knocking them back 8 meters.\n\nThis ability ignores the enemy's Resistances and cannot be blocked.",
      baseSkillId: ClassSkillId.TEMPLAR_PIERCING_JAVELIN,
    },
    {
      id: ClassSkillId.TEMPLAR_AURORA_JAVELIN,
      name: 'Aurora Javelin',
      type: 'active',
      icon: 'ability_templar_ripping_spear',
      description:
        "Hurl your spear at an enemy with godlike strength, dealing 1438 Magic Damage and knocking them back 8 meters.\n\nThis ability ignores the enemy's Resistances and cannot be blocked.\n\nThe spear deals an additional 2% damage for every 1 meter you are away from the target, up to a maximum of 40%.",
      baseSkillId: ClassSkillId.TEMPLAR_PIERCING_JAVELIN,
    },
    {
      id: ClassSkillId.TEMPLAR_BINDING_JAVELIN,
      name: 'Binding Javelin',
      type: 'active',
      icon: 'ability_templar_light_spear',
      description:
        "Hurl your spear at an enemy with godlike strength, dealing 1393 Physical Damage and stunning them for 4 seconds.\n\nThis ability ignores the enemy's Resistances and cannot be blocked.",
      baseSkillId: ClassSkillId.TEMPLAR_PIERCING_JAVELIN,
    },
    {
      id: ClassSkillId.TEMPLAR_PUNCTURING_STRIKES,
      name: 'Puncturing Strikes',
      type: 'active',
      icon: 'ability_templar_trained_attacker',
      description:
        'Launch a relentless assault, striking up to 6 enemies in front of you three times with your Aedric spear. The spear deals 889 Magic Damage per strike and reduces enemy Movement Speed by 40% for 0.5 seconds.',
      baseSkillId: ClassSkillId.TEMPLAR_PUNCTURING_STRIKES,
    },
    {
      id: ClassSkillId.TEMPLAR_PUNCTURING_SWEEP,
      name: 'Puncturing Sweep',
      type: 'active',
      icon: 'ability_templar_reckless_attacks',
      description:
        'Launch a relentless assault, striking up to 6 enemies in front of you three times with your Aedric spear. The spear deals 919 Magic Damage per strike and reduces enemy Movement Speed by 40% for 0.5 seconds.\n\nYou heal for 25% of the damage done with this ability.',
      baseSkillId: ClassSkillId.TEMPLAR_PUNCTURING_STRIKES,
    },
    {
      id: ClassSkillId.TEMPLAR_BITING_JABS,
      name: 'Biting Jabs',
      type: 'active',
      icon: 'ability_templar_recovery',
      description:
        'Launch a relentless assault, striking up to 6 enemies in front of you three times with your Aedric spear. The spear deals 919 Physical Damage per strike and reduces enemy Movement Speed by 40% for 0.5 seconds. Each strike has a 10% chance of applying the Sundered status effect.\n\nActivating this ability grants you Major Brutality and Major Sorcery, increasing your Weapon and Spell Damage by 20% for 10 seconds.',
      baseSkillId: ClassSkillId.TEMPLAR_PUNCTURING_STRIKES,
    },
    {
      id: ClassSkillId.TEMPLAR_SUN_SHIELD,
      name: 'Sun Shield',
      type: 'active',
      icon: 'ability_templar_sun_shield',
      description:
        'Surround yourself with solar rays, dealing 1742 Magic Damage to nearby enemies and applying Minor Maim to them for 10 seconds, reducing their damage done by 5%.\n\nThe rays then protect you, granting a damage shield that absorbs up to 4800 damage for 6 seconds, increasing by 10% for each enemy hit, up to 60%. This portion of the ability scales off your Max Health.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_SHIELD,
    },
    {
      id: ClassSkillId.TEMPLAR_BLAZING_SHIELD,
      name: 'Blazing Shield',
      type: 'active',
      icon: 'ability_templar_blazing_shield',
      description:
        'Surround yourself with solar rays, applying Minor Maim to nearby enemies for 10 seconds, reducing their damage done by 5%.\n\nYou gain a damage shield that absorbs up to 4800 damage for 6 seconds, increasing by 10% for each enemy hit, up to 60%. This ability scales off your Max Health.\n\nWhen the shield expires it explodes, dealing 33% of damage absorbed as Magic Damage to nearby enemies.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_SHIELD,
    },
    {
      id: ClassSkillId.TEMPLAR_RADIANT_WARD,
      name: 'Radiant Ward',
      type: 'active',
      icon: 'ability_templar_radiant_ward',
      description:
        'Surround yourself with solar rays, dealing 1742 Magic Damage to nearby enemies and applying Minor Maim to them for 10 seconds, reducing their damage done by 5%.\n\nThe rays then protect you, granting a damage shield that absorbs up to 4958 damage for 6 seconds, increasing by 20% for each enemy hit, up to 120%. This portion of the ability scales off your Max Health.',
      baseSkillId: ClassSkillId.TEMPLAR_SUN_SHIELD,
    },
    {
      id: ClassSkillId.TEMPLAR_SPEAR_SHARDS,
      name: 'Spear Shards',
      type: 'active',
      icon: 'ability_templar_sun_strike',
      description:
        'Send your spear into the heavens to bring down a shower of divine wrath, dealing 1742 Magic Damage to enemies in the area and an additional 166 Magic Damage every 1 second for 10 seconds.\n\nAn ally near the spear can activate the Blessed Shards synergy, restoring 3960 Magicka or Stamina, whichever maximum is higher.',
      baseSkillId: ClassSkillId.TEMPLAR_SPEAR_SHARDS,
    },
    {
      id: ClassSkillId.TEMPLAR_BLAZING_SPEAR,
      name: 'Blazing Spear',
      type: 'active',
      icon: 'ability_templarsun_thrust',
      description:
        'Send your spear into the heavens to bring down a shower of divine wrath, dealing 1742 Magic Damage to enemies in the area and an additional 276 Magic Damage every 1 second for 10 seconds. Enemies hit by the initial hit are immobilized for 4 seconds.\n\nAn ally near the spear can activate the Blessed Shards synergy, restoring 3960 Magicka or Stamina, whichever maximum is higher.',
      baseSkillId: ClassSkillId.TEMPLAR_SPEAR_SHARDS,
    },
    {
      id: ClassSkillId.TEMPLAR_LUMINOUS_SHARDS,
      name: 'Luminous Shards',
      type: 'active',
      icon: 'ability_templar_light_strike',
      description:
        'Send your spear into the heavens to bring down a shower of divine wrath, dealing 1742 Magic Damage to enemies in the area and an additional 165 Magic Damage every 1 second for 10 seconds.\n\nYou or an ally near the spear can activate the Holy Shards synergy, which restores 3960 Magicka and Stamina.',
      baseSkillId: ClassSkillId.TEMPLAR_SPEAR_SHARDS,
    },
    {
      id: ClassSkillId.TEMPLAR_FOCUSED_CHARGE,
      name: 'Focused Charge',
      type: 'active',
      icon: 'ability_templar_focused_charge',
      description:
        'Charge with your divine lance to impale an enemy, dealing 1392 Magic Damage while taunting them to attack you for 15 seconds. If the enemy hit was casting, they are interrupted, set Off Balance, and stunned for 3 seconds.\n\nYou also gain Major Protection for 7 seconds, reducing your damage taken by 10%.',
      baseSkillId: ClassSkillId.TEMPLAR_FOCUSED_CHARGE,
    },
    {
      id: ClassSkillId.TEMPLAR_TOPPLING_CHARGE,
      name: 'Toppling Charge',
      type: 'active',
      icon: 'ability_templar_toppling_charge',
      description:
        'Charge with your divine lance to impale an enemy, dealing 1393 Magic Damage while taunting them to attack you for 15 seconds. The enemy hit is stunned for 3 seconds, set Off Balance, and if they were casting, they are interrupted.\n\nYou also gain Major Protection for 7 seconds, reducing your damage taken by 10%.',
      baseSkillId: ClassSkillId.TEMPLAR_FOCUSED_CHARGE,
    },
    {
      id: ClassSkillId.TEMPLAR_EXPLOSIVE_CHARGE,
      name: 'Explosive Charge',
      type: 'active',
      icon: 'ability_templar_double_tipped_charge',
      description:
        'Charge with your divine lance to impale all enemies in the area, dealing 1799 Magic Damage while taunting the first enemy hit to attack you for 15 seconds. Any enemy hit that was casting is interrupted, set Off Balance, and stunned for 3 seconds.\n\n You also gain Major Protection for 15 seconds, reducing your damage taken by 10%.',
      baseSkillId: ClassSkillId.TEMPLAR_FOCUSED_CHARGE,
    },
    {
      id: ClassSkillId.TEMPLAR_BALANCED_WARRIOR,
      name: 'Balanced Warrior',
      type: 'passive',
      icon: 'ability_templar_032',
      description: 'Increases your Weapon Damage, Spell Damage, and Armor by 6%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_BURNING_LIGHT,
      name: 'Burning Light',
      type: 'passive',
      icon: 'ability_templar_028',
      description:
        'When you deal damage you generate a stack of Burning Light for 3 seconds. After reaching 4 stacks, you deal 500 Magic Damage to your target. This effect can stack once every half second and scales off the higher of your Weapon or Spell Damage.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_PIERCING_SPEAR,
      name: 'Piercing Spear',
      type: 'passive',
      icon: 'ability_templar_022',
      description:
        'Increases your Critical Damage by 12%. Increases your damage done to blocking players by 12%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_SPEAR_WALL,
      name: 'Spear Wall',
      type: 'passive',
      icon: 'ability_templar_027',
      description:
        'Gain Minor Berserk and Minor Protection for 6 seconds, increasing damage done and reducing damage taken by 5%.',
      isPassive: true,
    },
  ],
};
