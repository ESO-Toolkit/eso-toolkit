import type { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const dualWieldSkillLine: SkillLineData = {
  id: '0',
  name: 'Dual Wield',
  class: 'Weapon',
  category: 'weapon',
  icon: '/images/skill-lines/weapon/dual-wield.png',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.LACERATE,
      name: 'Lacerate',
      type: 'ultimate',
      baseAbilityId: AbilityId.LACERATE,
      description:
        'Slash enemies in front of you, causing them to bleed for 6960 Bleed Damage over 8 seconds and healing you for 50% of the damage done. Each tick applies the Hemorrhaging status effect.',
    },
    {
      id: 83600, // Rend (morph)
      name: 'Rend',
      type: 'ultimate',
      baseAbilityId: AbilityId.LACERATE,
      description:
        'Slash enemies in front of you, causing them to bleed for 12942 Bleed Damage over 16 seconds and healing you for 50% of the damage done. Each tick applies the Hemorrhaging status effect.',
    },
    {
      id: 83625, // Thrive in Chaos (morph)
      name: 'Thrive in Chaos',
      type: 'ultimate',
      baseAbilityId: AbilityId.LACERATE,
      description:
        'Slash enemies in front of you, causing them to bleed for 6965 Bleed Damage over 8 seconds and healing you for 50% of the damage done. Each enemy hit increases your damage done by 6% for 15 seconds. This effect can stack up to 6 times. Each tick applies the Hemorrhaging status effect.',
    },

    // Scribing Abilities
    {
      id: AbilityId.TRAVELING_KNIFE,
      name: 'Traveling Knife',
      type: 'active',
      baseAbilityId: AbilityId.TRAVELING_KNIFE,
      description:
        'Twirl and throw an enchanted dagger at an enemy, which returns to you after a short delay and hits additional enemies in the path.',
    },

    // Active Abilities
    {
      id: AbilityId.FLURRY,
      name: 'Flurry',
      type: 'active',
      baseAbilityId: AbilityId.FLURRY,
      description:
        'Flood an enemy with steel, battering them with four consecutive attacks that each deal 667 Physical Damage.',
    },
    {
      id: 38846, // Bloodthirst (morph)
      name: 'Bloodthirst',
      type: 'active',
      baseAbilityId: AbilityId.FLURRY,
      description:
        'Flood an enemy with steel, battering them with four consecutive attacks that each deal 689 Bleed Damage and heal you for 33% of the damage caused.',
    },
    {
      id: 38857, // Rapid Strikes (morph)
      name: 'Rapid Strikes',
      type: 'active',
      baseAbilityId: AbilityId.FLURRY,
      description:
        'Flood an enemy with steel, battering them with four consecutive attacks that each deal 689 Physical Damage. Each hit increases the damage of the subsequent hit by 5%.',
    },
    {
      id: AbilityId.TWIN_SLASHES,
      name: 'Twin Slashes',
      type: 'active',
      baseAbilityId: AbilityId.TWIN_SLASHES,
      description:
        'Slice an enemy with both weapons to cause deep lacerations, dealing 580 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds.',
    },
    {
      id: 38845, // Blood Craze (morph)
      name: 'Blood Craze',
      type: 'active',
      baseAbilityId: AbilityId.TWIN_SLASHES,
      description:
        'Slice an enemy with both weapons to cause deep lacerations, dealing 580 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds. You heal for 358 Health anytime this ability deals damage.',
    },
    {
      id: 38842, // Rending Slashes (morph)
      name: 'Rending Slashes',
      type: 'active',
      baseAbilityId: AbilityId.TWIN_SLASHES,
      description:
        'Slice an enemy with both weapons to cause deep lacerations, dealing 718 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds. Enemies hit by the initial hit are afflicted with the Hemorrhaging status effect. You also reduce their Movement Speed by 30% for 4 seconds.',
    },
    {
      id: AbilityId.WHIRLWIND,
      name: 'Whirlwind',
      type: 'active',
      baseAbilityId: AbilityId.WHIRLWIND,
      description:
        'Launch yourself into a lethal spin, dealing 1742 Physical Damage to nearby enemies. Deals up to 33% more damage to enemies with less than 50% Health.',
      alternateIds: [28591],
    },
    {
      id: 38891, // Steel Tornado (morph)
      name: 'Steel Tornado',
      type: 'active',
      baseAbilityId: AbilityId.WHIRLWIND,
      description:
        'Launch yourself into a lethal spin, releasing a flurry of blades around you that deals 1742 Physical Damage to nearby enemies. Deals up to 33% more damage to enemies with less than 50% Health.',
    },
    {
      id: 38901, // Whirling Blades (morph)
      name: 'Whirling Blades',
      type: 'active',
      baseAbilityId: AbilityId.WHIRLWIND,
      description:
        'Launch yourself into a lethal spin, dealing 1799 Physical Damage to nearby enemies. Deals up to 100% more damage to enemies with less than 50% Health.',
    },
    {
      id: AbilityId.BLADE_CLOAK,
      name: 'Blade Cloak',
      type: 'active',
      baseAbilityId: AbilityId.BLADE_CLOAK,
      description:
        'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 20 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 421 Physical Damage to all enemies within 5 meters.',
    },
    {
      id: 38910, // Deadly Cloak (morph)
      name: 'Deadly Cloak',
      type: 'active',
      baseAbilityId: AbilityId.BLADE_CLOAK,
      description:
        'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 20 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 567 Physical Damage to all enemies within 5 meters.',
      alternateIds: [38906],
    },
    {
      id: 38914, // Quick Cloak (morph)
      name: 'Quick Cloak',
      type: 'active',
      baseAbilityId: AbilityId.BLADE_CLOAK,
      description:
        'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 30 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 422 Physical Damage to all enemies within 5 meters. You also gain Major Expedition for 4 seconds, increasing your Movement Speed by 30%.',
    },
    {
      id: AbilityId.HIDDEN_BLADE,
      name: 'Hidden Blade',
      type: 'active',
      baseAbilityId: AbilityId.HIDDEN_BLADE,
      description:
        'Fire a secret dagger from your sleeve at an enemy, dealing 1392 Physical Damage and granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 20 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds.',
    },
    {
      id: 38944, // Flying Blade (morph)
      name: 'Flying Blade',
      type: 'active',
      baseAbilityId: AbilityId.HIDDEN_BLADE,
      description:
        'Fire a secret dagger from your sleeve at an enemy, dealing 1438 Physical Damage and marking them for 5 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds. Reactivating this ability on them allows you to jump to a marked enemy free of cost, dealing 2160 Physical Damage. Casting grants you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 40 seconds.',
    },
    {
      id: 38948, // Shrouded Daggers (morph)
      name: 'Shrouded Daggers',
      type: 'active',
      baseAbilityId: AbilityId.HIDDEN_BLADE,
      description:
        'Fire a secret dagger from your sleeve that bounces up to 3 times to nearby enemies, dealing 1799 Physical Damage per hit. If enemies hit are casting they are interrupted, set Off Balance, and stunned for 3 seconds. You also gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 20 seconds.',
    },

    // Passive Abilities
    {
      id: AbilityId.SLAUGHTER,
      name: 'Slaughter',
      type: 'passive',
      baseAbilityId: AbilityId.SLAUGHTER,
      description: 'WHILE DUAL WIELDING Increases damage with Dual Wield abilities by 20% against enemies with under 25% Health.',
    },
    {
      id: AbilityId.DUAL_WIELD_EXPERT,
      name: 'Dual Wield Expert',
      type: 'passive',
      baseAbilityId: AbilityId.DUAL_WIELD_EXPERT,
      description: "WHILE DUAL WIELDING Increases Weapon and Spell Damage by 6% of off-hand weapon's damage.",
    },
    {
      id: AbilityId.CONTROLLED_FURY,
      name: 'Controlled Fury',
      type: 'passive',
      baseAbilityId: AbilityId.CONTROLLED_FURY,
      description: 'WHILE DUAL WIELDING Reduces the Stamina cost of Dual Wield abilities by 15%.',
    },
    {
      id: AbilityId.RUFFIAN,
      name: 'Ruffian',
      type: 'passive',
      baseAbilityId: AbilityId.RUFFIAN,
      description:
        'WHILE USING DUAL WIELD ATTACKS Gives you a 15% damage bonus when attacking stunned, immobilized, or silenced enemies.',
    },
    {
      id: AbilityId.TWIN_BLADE_AND_BLUNT,
      name: 'Twin Blade and Blunt',
      type: 'passive',
      baseAbilityId: AbilityId.TWIN_BLADE_AND_BLUNT,
      description:
        'WHILE DUAL WIELDING Grants a bonus based on the type of weapon equipped: Each axe increases your Critical Damage done by 6%. Each mace increases your Offensive Penetration by 1487. Each sword increases your Weapon and Spell Damage by 129. Each dagger increases your Critical Chance rating by 657.',
    },
  ],
};
