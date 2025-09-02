import { SkillsetData } from '../../skillsets/Skillset';

export const bowData: SkillsetData = {
  weapon: 'Bow',
  skillLines: {
    bow: {
      name: 'Bow',
      icon: '🏹',
      passives: [
        {
          name: 'Accuracy',
          description: 'Increases your Critical Chance rating by 1314.',
          requirement: 'WITH BOW EQUIPPED',
        },
        {
          name: 'Hasty Retreat',
          description:
            'Grants you Major Expedition for 4 seconds after you use Roll Dodge. Major Expedition increases your Movement Speed by 30%.',
          requirement: 'WITH BOW EQUIPPED',
        },
        {
          name: 'Hawk Eye',
          description:
            'Dealing damage with a Light or Heavy Attack increases the damage of your Bow abilities by 5% for 5 seconds, stacking up to 5 times.',
          requirement: 'WITH BOW EQUIPPED',
        },
        {
          name: 'Ranger',
          description: 'Reduces the Stamina cost of Bow abilities by 15%.',
          requirement: 'WITH BOW EQUIPPED',
        },
        {
          name: 'Vinedusk Training',
          description:
            'Increases your damage done by 5% against enemies 15 meters or closer. Increases your Critical Chance rating by 1314 against enemies further than 15 meters.',
          requirement: 'WITH BOW EQUIPPED',
        },
      ],
      actives: [
        {
          name: 'Arrow Spray',
          cost: '3510 Stamina',
          target: 'Area',
          radius: '20 meters',
          description:
            'Fire a burst of arrows in one shot, dealing 1742 Physical Damage to enemies in front of you.',
          morphs: [
            {
              name: 'Acid Spray',
              cost: '3510 Stamina',
              target: 'Area',
              duration: '4 seconds',
              radius: '20 meters',
              description:
                'Fire a burst of arrows in one shot, dealing 1742 Poison Damage to enemies in front of you, and dealing an additional 1635 Poison Damage over 5 seconds.',
            },
            {
              name: 'Bombard',
              cost: '3240 Stamina',
              target: 'Area',
              duration: '4 seconds',
              radius: '20 meters',
              description:
                'Fire a burst of arrows in one shot, dealing 1742 Physical Damage to enemies in front of you. Enemies hit are immobilized for 4 seconds.',
            },
          ],
        },
        {
          name: 'Volley',
          cost: '2700 Stamina',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '5 meters',
          description:
            'Launch a multitude of arrows into the sky to rain down, dealing 342 Physical Damage to enemies in the target area every 1 second for 8 seconds, after a 2 second delay.',
          morphs: [
            {
              name: 'Arrow Barrage',
              cost: '2700 Stamina',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '7 meters',
              description:
                'Launch a multitude of arrows into the sky to rain down, dealing 460 Physical Damage to enemies in the target area every 1 second for 8 seconds, after a 2 second delay.',
            },
            {
              name: 'Endless Hail',
              cost: '2700 Stamina',
              target: 'Ground',
              duration: '15 seconds',
              maxRange: '28 meters',
              radius: '5 meters',
              description:
                'Launch a multitude of arrows into the sky to rain down, dealing 343 Physical Damage to enemies in the target area every 1 second for 13 seconds, after a 2 second delay.',
            },
          ],
        },
        {
          name: 'Scatter Shot',
          cost: '3780 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description:
            'Blast an enemy with an explosive arrow, dealing 1392 Physical Damage, knocking them back 8 meters.',
          morphs: [
            {
              name: 'Draining Shot',
              cost: '3780 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description:
                'Blast an enemy with an enchanted arrow, dealing 1393 Physical Damage and reducing their Movement Speed by 60% for 3 seconds. If the enemy is hit, you heal for 2399.',
            },
            {
              name: 'Magnum Shot',
              cost: '3510 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description:
                'Blast an enemy with an explosive arrow, dealing 1727 Physical Damage and knocking them back 8 meters.',
            },
          ],
        },
        {
          name: 'Snipe',
          cost: '2700 Stamina',
          castTime: '0.8 second',
          target: 'Enemy',
          maxRange: '35 meters',
          description:
            "Plant a masterfully aimed arrow in an enemy's vital spot, dealing 2404 Physical Damage.",
          morphs: [
            {
              name: 'Focused Aim',
              cost: '2430 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '40 meters',
              description:
                "Plant a masterfully aimed arrow in an enemy's vital spot, dealing 2404 Physical Damage and applying the Sundered status effect.",
            },
            {
              name: 'Lethal Arrow',
              cost: '2700 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '35 meters',
              description:
                "Plant a masterfully aimed arrow in an enemy's vital spot, dealing 2483 Poison Damage and applying the Poisoned status effect. Also afflicts enemy with Minor Defile, which reduces their healing received and damage shield strength by 6% for 4 seconds.",
            },
          ],
        },
        {
          name: 'Poison Arrow',
          cost: '2700 Stamina',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '28 meters',
          description:
            'Shoot an arrow coated in Baandari poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds.',
          morphs: [
            {
              name: 'Poison Injection',
              cost: '2700 Stamina',
              target: 'Enemy',
              duration: '20 seconds',
              maxRange: '28 meters',
              description:
                'Shoot an arrow coated in Baandari poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds. Deals up to 120% more damage to enemies under 50% Health.',
            },
            {
              name: 'Venom Arrow',
              cost: '2430 Stamina',
              target: 'Enemy',
              duration: '20 seconds',
              maxRange: '28 meters',
              description:
                'Shoot an arrow coated in Shadowscale poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds. After casting you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage for 20 seconds.',
            },
          ],
        },
        {
          name: 'Vault',
          radius: '6 meters',
          cost: 'Determined by Highest Max Resource',
          description:
            'Fire a burst at your feet while flipping backwards 15 meters. Casting again within 4 seconds increases the cost by 33%.',
        },
      ],
      ultimates: [
        {
          name: 'Rapid Fire',
          cost: '175 Ultimate',
          castTime: '4 seconds',
          target: 'Enemy',
          maxRange: '28 meters',
          description:
            'Unleash a barrage of arrows at an enemy, dealing 17415 Physical Damage over 4 seconds. You can move at full speed and are immune to all disabling effects while channeling this attack. This ability is considered direct damage.',
          morphs: [
            {
              name: 'Ballista',
              cost: '175 Ultimate',
              target: 'Enemy',
              duration: '5 seconds',
              maxRange: '25 meters',
              description:
                'Create a turret to unleash a barrage of arrows at an enemy, dealing 15587 Physical Damage over 5 seconds.',
            },
            {
              name: 'Toxic Barrage',
              cost: '175 Ultimate',
              castTime: '4 seconds',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                'Unleash a barrage of arrows at an enemy, dealing 17415 Poison Damage over 4 seconds. After dealing damage you poison the enemy, dealing an additional 9990 Poison Damage over 8 seconds after a 1 second delay. You can move at full speed and are immune to all disabling effects while channeling this attack. This ability is considered direct damage.',
            },
          ],
        },
      ],
    },
  },
};
