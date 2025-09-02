import { SkillsetData } from '../../skillsets/Skillset';

export const dualWieldData: SkillsetData = {
  weapon: 'Dual Wield',
  skillLines: {
    dualWield: {
      name: 'Dual Wield',
      icon: '⚔️',
      passives: [
        {
          name: 'Controlled Fury',
          description: 'Reduces the Stamina cost of Dual Wield abilities by 15%.',
          requirement: 'WHILE DUAL WIELDING'
        },
        {
          name: 'Dual Wield Expert',
          description: 'Increases Weapon and Spell Damage by 6% of off-hand weapon\'s damage.',
          requirement: 'WHILE DUAL WIELDING'
        },
        {
          name: 'Ruffian',
          description: 'Gives you a 15% damage bonus when attacking stunned, immobilized, or silenced enemies.',
          requirement: 'WHILE USING DUAL WIELD ATTACKS'
        },
        {
          name: 'Slaughter',
          description: 'Increases damage with Dual Wield abilities by 20% against enemies with under 25% Health.',
          requirement: 'WHILE DUAL WIELDING'
        },
        {
          name: 'Twin Blade and Blunt',
          description: 'Grants a bonus based on the type of weapon equipped: Each axe increases your Critical Damage done by 6%. Each mace increases your Offensive Penetration by 1487. Each sword increases your Weapon and Spell Damage by 129. Each dagger increases your Critical Chance rating by 657.',
          requirement: 'WHILE DUAL WIELDING'
        }
      ],
      actives: [
        {
          name: 'Blade Cloak',
          cost: '3780 Stamina',
          target: 'Area',
          duration: '20 seconds',
          radius: '5 meters',
          description: 'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 20 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 421 Physical Damage to all enemies within 5 meters.',
          morphs: [
            {
              name: 'Deadly Cloak',
              cost: '3780 Stamina',
              target: 'Area',
              duration: '20 seconds',
              radius: '5 meters',
              description: 'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 20 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 567 Physical Damage to all enemies within 5 meters.'
            },
            {
              name: 'Quick Cloak',
              cost: '3780 Stamina',
              target: 'Area',
              duration: '30 seconds',
              radius: '5 meters',
              description: 'Envelop yourself in a protective cloak of razors, gaining Major Evasion for 30 seconds, reducing damage from area attacks by 20%. Every 2 seconds the shrapnel will pulse, dealing 422 Physical Damage to all enemies within 5 meters. You also gain Major Expedition for 4 seconds, increasing your Movement Speed by 30%.'
            }
          ]
        },
        {
          name: 'Flurry',
          cost: '2700 Stamina',
          castTime: '0.8 second',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Flood an enemy with steel, battering them with four consecutive attacks that each deal 667 Physical Damage.',
          morphs: [
            {
              name: 'Bloodthirst',
              cost: '2700 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Flood an enemy with steel, battering them with four consecutive attacks that each deal 689 Bleed Damage and heal you for 33% of the damage caused.'
            },
            {
              name: 'Rapid Strikes',
              cost: '2430 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Flood an enemy with steel, battering them with four consecutive attacks that each deal 689 Physical Damage. Each hit increases the damage of the subsequent hit by 5%.'
            }
          ]
        },
        {
          name: 'Hidden Blade',
          cost: '3780 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Fire a secret dagger from your sleeve at an enemy, dealing 1392 Physical Damage and granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 20 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds.',
          morphs: [
            {
              name: 'Flying Blade',
              cost: '3780 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description: 'Fire a secret dagger from your sleeve at an enemy, dealing 1438 Physical Damage and marking them for 5 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds. Reactivating this ability on them allows you to jump to a marked enemy free of cost, dealing 2160 Physical Damage. Casting grants you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 40 seconds.'
            },
            {
              name: 'Shrouded Daggers',
              cost: '3780 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              radius: '8 meters',
              description: 'Fire a secret dagger from your sleeve that bounces up to 3 times to nearby enemies, dealing 1799 Physical Damage per hit. If enemies hit are casting they are interrupted, set Off Balance, and stunned for 3 seconds. You also gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 20 seconds.'
            }
          ]
        },
        {
          name: 'Traveling Knife',
          cost: 'Determined by Highest Max Resource',
          target: 'Enemy',
          maxRange: '15 meters',
          description: 'Twirl and throw an enchanted dagger at an enemy, which returns to you after a short delay and hits additional enemies in the path.'
        },
        {
          name: 'Twin Slashes',
          cost: '2700 Stamina',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '7 meters',
          description: 'Slice an enemy with both weapons to cause deep lacerations, dealing 580 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds.',
          morphs: [
            {
              name: 'Blood Craze',
              cost: '2700 Stamina',
              target: 'Enemy',
              duration: '20 seconds',
              maxRange: '7 meters',
              description: 'Slice an enemy with both weapons to cause deep lacerations, dealing 580 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds. You heal for 358 Health anytime this ability deals damage.'
            },
            {
              name: 'Rending Slashes',
              cost: '2700 Stamina',
              target: 'Enemy',
              duration: '20 seconds',
              maxRange: '7 meters',
              description: 'Slice an enemy with both weapons to cause deep lacerations, dealing 718 Bleed Damage with each weapon and causing them to bleed for an additional 3470 Bleed Damage over 20 seconds. Enemies hit by the initial hit are afflicted with the Hemorrhaging status effect. You also reduce their Movement Speed by 30% for 4 seconds.'
            }
          ]
        },
        {
          name: 'Whirlwind',
          cost: '3510 Stamina',
          target: 'Area',
          radius: '6 meters',
          description: 'Launch yourself into a lethal spin, dealing 1742 Physical Damage to nearby enemies.',
          morphs: [
            {
              name: 'Steel Tornado',
              cost: '3240 Stamina',
              target: 'Area',
              radius: '9 meters',
              description: 'Launch yourself into a lethal spin, releasing a flurry of blades around you that deals 1742 Physical Damage to nearby enemies.'
            },
            {
              name: 'Whirling Blades',
              cost: '3510 Stamina',
              target: 'Area',
              radius: '6 meters',
              description: 'Launch yourself into a lethal spin, dealing 1799 Physical Damage to nearby enemies. Deals up to 100% more damage to enemies with less than 50% Health.'
            }
          ]
        }
      ],
      ultimates: [
        {
          name: 'Lacerate',
          cost: '150 Ultimate',
          castTime: '0.5 second',
          target: 'Area',
          duration: '8 seconds',
          radius: '8 meters',
          description: 'Slash enemies in front of you, causing them to bleed for 6960 Bleed Damage over 8 seconds and healing you for 50% of the damage done. Each tick applies the Hemorrhaging status effect.',
          morphs: [
            {
              name: 'Rend',
              cost: '150 Ultimate',
              castTime: '0.5 second',
              target: 'Area',
              duration: '16 seconds',
              radius: '8 meters',
              description: 'Slash enemies in front of you, causing them to bleed for 12942 Bleed Damage over 16 seconds and healing you for 50% of the damage done. Each tick applies the Hemorrhaging status effect.'
            },
            {
              name: 'Thrive in Chaos',
              cost: '150 Ultimate',
              castTime: '0.5 second',
              target: 'Cone',
              duration: '8 seconds',
              radius: '15 meters',
              description: 'Slash enemies in front of you, causing them to bleed for 6965 Bleed Damage over 8 seconds and healing you for 50% of the damage done. Each enemy hit increases your damage done by 6% for 15 seconds. This effect can stack up to 6 times. Each tick applies the Hemorrhaging status effect.'
            }
          ]
        }
      ]
    }
  }
};