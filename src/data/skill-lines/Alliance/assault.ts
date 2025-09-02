import { SkillsetData } from '../../skillsets/Skillset';

export const assaultData: SkillsetData = {
  weapon: 'Assault',
  skillLines: {
    assault: {
      name: 'Assault',
      icon: '⚔️',
      passives: [
        {
          name: 'Combat Frenzy',
          description: 'You generate 20 Ultimate when you kill an enemy player.',
          requirement: ''
        },
        {
          name: 'Continuous Attack',
          description: 'Increases your Weapon and Spell Damage by 10% and Health, Magicka, and Stamina Recovery by 20% for 10 minutes after you capture a Lumber Mill, Farm, Mine, or Keep. Gain Gallop at all times, increasing your Mount Speed by 15%.',
          requirement: ''
        },
        {
          name: 'Reach',
          description: 'Increases the range of long-range abilities by 5 meters while near a keep or outpost. Any ability with a range greater than 28 meters is affected.',
          requirement: ''
        }
      ],
      actives: [
        {
          name: 'Caltrops',
          cost: '2295 Stamina',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Hurl a ball of caltrops that scatter over the target area, dealing 280 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%.',
          morphs: [
            {
              name: 'Anti-Cavalry Caltrops',
              cost: '2295 Stamina',
              target: 'Ground',
              duration: '15 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description: 'Hurl a ball of caltrops that scatter over the target area, dealing 281 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%. The caltrops also drain the Mount Stamina of any enemy in the area.'
            },
            {
              name: 'Razor Caltrops',
              cost: '2295 Stamina',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description: 'Hurl a ball of caltrops that scatter over the target area, dealing 281 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%. Enemies who take damage from the caltrops have Major Breach applied to them, reducing their Physical and Spell Resistance by 5948 for 4.1 seconds.'
            }
          ]
        },
        {
          name: 'Magicka Detonation',
          cost: '3510 Magicka',
          castTime: '1 second',
          target: 'Enemy',
          duration: '4 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Curse an enemy with a magical bomb that explodes after 4 seconds, dealing 434 Magic Damage to all enemies in the area. Each enemy within the bomb\'s radius increases the damage by 100%, including the original target.',
          morphs: [
            {
              name: 'Inevitable Detonation',
              cost: '3510 Magicka',
              castTime: '1 second',
              target: 'Enemy',
              duration: '4 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description: 'Curse an enemy with a magical bomb that explodes after 4 seconds, dealing 449 Magic Damage to all enemies in the area. If the bomb is dispelled or removed early, the explosion is triggered immediately. Each enemy within the bomb\'s radius increases the damage by 100%.'
            },
            {
              name: 'Proximity Detonation',
              cost: '3510 Magicka',
              target: 'Area',
              duration: '8 seconds',
              radius: '8 goes',
              description: 'Activate a magical bomb on yourself that explodes after 8 seconds, dealing 449 Magic Damage to all enemies in the area. Each enemy within the bomb\'s radius increases the damage by 100%, including the original target.'
            }
          ]
        },
        {
          name: 'Rapid Maneuver',
          cost: '6426 Stamina',
          target: 'Area',
          duration: '8 seconds',
          radius: '28 meters',
          description: 'Mobilize your forces, granting Major Expedition to you and your group, increasing your Movement Speed by 30% for 8 seconds.',
          morphs: [
            {
              name: 'Charging Maneuver',
              cost: '6156 Stamina',
              target: 'Area',
              duration: '8 seconds',
              radius: '28 meters',
              description: 'Mobilize your forces, granting Major and Minor Expedition to you and your group, increasing your Movement Speed by 30% and 15% respectively, for 8 seconds.'
            },
            {
              name: 'Retreating Maneuver',
              cost: '6426 Stamina',
              target: 'Area',
              duration: '8 seconds',
              radius: '28 meters',
              description: 'Mobilize your forces, granting Major Expedition to you and your group, increasing your Movement Speed by 30% for 8 seconds. Attacks from behind deal 15% less damage while this effect persists.'
            }
          ]
        },
        {
          name: 'Trample',
          cost: 'Determined by Highest Max Resource',
          castTime: '1.5 second',
          target: 'Line',
          duration: '2 seconds',
          radius: '5 meters',
          description: 'Pierce the air with a shrill whistle, calling your mount forth to trample enemies in a line. This ability cannot be re-activated while your mount is already attacking.'
        },
        {
          name: 'Vigor',
          cost: '2984 Stamina',
          target: 'Area',
          duration: '10 seconds',
          radius: '8 meters',
          description: 'Let loose a battle cry, instilling yourself and nearby allies with resolve and healing them for 3480 Health over 10 seconds.',
          morphs: [
            {
              name: 'Echoing Vigor',
              cost: '2984 Stamina',
              target: 'Area',
              duration: '16 seconds',
              radius: '15 meters',
              description: 'Let loose a battle cry, instilling you and your allies with resolve and healing for 3480 Health over 16 seconds.'
            },
            {
              name: 'Resolving Vigor',
              cost: '2984 Stamina',
              target: 'Self',
              duration: '5 seconds',
              description: 'Let loose a battle cry, instilling yourself with resolve and healing for 5388 Health over 5 seconds. After casting you gain Minor Resolve, increasing your Physical and Spell Resistance by 2974, for 20 seconds.'
            }
          ]
        }
      ],
      ultimates: [
        {
          name: 'War Horn',
          cost: '250 Ultimate',
          target: 'Area',
          duration: '30 seconds',
          radius: '20 meters',
          description: 'Sound a war horn to rally your forces, increasing you and your group\'s Max Magicka and Max Stamina by 10% for 30 seconds.',
          morphs: [
            {
              name: 'Aggressive Horn',
              cost: '250 Ultimate',
              target: 'Area',
              duration: '30 seconds',
              radius: '20 meters',
              description: 'Sound a war horn to rally your forces, increasing you and your group\'s Max Magicka and Max Stamina by 10% for 30 seconds. You and your allies gain Major Force, increasing your Critical Damage by 20% for 10 seconds.'
            },
            {
              name: 'Sturdy Horn',
              cost: '250 Ultimate',
              target: 'Area',
              duration: '30 seconds',
              radius: '20 meters',
              description: 'Sound a war horn to rally your forces, increasing you and your group\'s Max Magicka and Max Stamina by 10% for 30 seconds. You and your allies gain 1320 Critical Resistance for 10 seconds, reducing incoming Critical Damage by 20%.'
            }
          ]
        }
      ]
    }
  }
};