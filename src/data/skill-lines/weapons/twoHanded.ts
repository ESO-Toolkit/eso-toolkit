import { SkillsetData } from '../../skillsets/Skillset';

export const twoHandedData: SkillsetData = {
  weapon: 'Two Handed',
  skillLines: {
    twoHanded: {
      name: 'Two Handed',
      icon: '🪓',
      passives: [
        {
          name: 'Balanced Blade',
          description: 'Reduces the Stamina cost of your Two-Handed abilities by 15%.',
          requirement: 'WITH TWO-HANDED WEAPON EQUIPPED'
        },
        {
          name: 'Battle Rush',
          description: 'Increases your Stamina Recovery by 30% for 10 seconds after killing a target.',
          requirement: 'WITH TWO-HANDED WEAPON EQUIPPED'
        },
        {
          name: 'Follow Up',
          description: 'When you complete a fully-charged Heavy Attack, your damage done with Two Handed attacks increases by 10% for 4 seconds.',
          requirement: 'WITH TWO-HANDED WEAPON EQUIPPED'
        },
        {
          name: 'Forceful',
          description: 'Your Light and Heavy Attacks damage up to 3 other nearby enemies for 100% of the damage inflicted to the primary target.',
          requirement: 'WITH TWO-HANDED WEAPON EQUIPPED'
        },
        {
          name: 'Heavy Weapons',
          description: 'Grants a bonus based on the type of weapon equipped: Swords increase your Weapon and Spell Damage by 258. Axes increase your Critical Damage done by 12%. Maces increase your Offensive Penetration by 2974.',
          requirement: 'WITH A TWO-HANDED WEAPON EQUIPPED'
        }
      ],
      actives: [
        {
          name: 'Cleave',
          cost: '3510 Stamina',
          target: 'Cone',
          radius: '6 meters',
          description: 'Focus your strength into a mighty swing, dealing 1742 Physical Damage to enemies in front of you. You also gain a damage shield that absorbs 1742 damage for 6 seconds.',
          morphs: [
            {
              name: 'Brawler',
              cost: '3510 Stamina',
              target: 'Cone',
              radius: '6 meters',
              description: 'Focus your strength into a mighty swing, dealing 1742 Physical Damage to enemies in front of you. You also gain a damage shield that absorbs 1799 damage for 6 seconds. Each enemy hit increases the damage shield\'s strength by 50%, up to 300%.'
            },
            {
              name: 'Carve',
              cost: '3510 Stamina',
              target: 'Cone',
              radius: '6 meters',
              description: 'Focus your strength into a mighty swing, dealing 1742 Bleed Damage to enemies in front of you, and causing them to bleed for an additional 2868 Bleed Damage over 12 seconds. Hitting a target that is already bleeding from this ability extends the duration by 10 seconds, up to a maximum of 32. You also gain a damage shield that absorbs 1742 damage for 6 seconds.'
            }
          ]
        },
        {
          name: 'Critical Charge',
          cost: '3780 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Launch across the earth and smash an enemy, dealing 1392 Physical Damage. This attack is always a Critical Strike.',
          morphs: [
            {
              name: 'Critical Rush',
              cost: '3240 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description: 'Launch across the earth and smash an enemy, dealing 1393 Physical Damage. Deals up to 50% more damage based on the distance traveled. This attack is always a Critical Strike.'
            },
            {
              name: 'Stampede',
              cost: '4590 Stamina',
              target: 'Enemy',
              duration: '15 seconds',
              maxRange: '22 meters',
              radius: '5 meters',
              description: 'Launch across the earth and smash an enemy, dealing 1393 Physical Damage to them and all nearby enemies. This attack is always a Critical Strike. After reaching your target, you sunder the ground beneath you, dealing 319 Physical Damage to all enemies in the area every 1 second for 15 seconds.'
            }
          ]
        },
        {
          name: 'Momentum',
          cost: '3780 Stamina',
          target: 'Self',
          duration: '20 seconds',
          description: 'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 20 seconds.',
          morphs: [
            {
              name: 'Forward Momentum',
              cost: '3240 Stamina',
              target: 'Self',
              duration: '40 seconds',
              description: 'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 40 seconds. Activating this ability removes all snares and immobilizations from you and grants immunity to them for 4 seconds.'
            },
            {
              name: 'Rally',
              cost: '3780 Stamina',
              target: 'Self',
              duration: '20 seconds',
              description: 'Focus your strength and resolve to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%, as well as gaining Minor Endurance, increasing your Stamina Recovery by 15% for 20 seconds. You heal for 1199 Health when Rally ends. The final heal is increased by 15% every 1 second, up to a maximum of 300%.'
            }
          ]
        },
        {
          name: 'Reverse Slash',
          cost: '2430 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Spin around and strike an enemy down, dealing 1161 Physical Damage. Deals up to 300% more damage to enemies with less than 50% Health.',
          morphs: [
            {
              name: 'Executioner',
              cost: '2160 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Spin around and strike an enemy down, dealing 1161 Bleed Damage. Deals up to 400% more damage to enemies with less than 50% Health.'
            },
            {
              name: 'Reverse Slice',
              cost: '2430 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              radius: '5 meters',
              description: 'Spin around and strike an enemy down, dealing 1199 Physical Damage to them and all nearby enemies. Deals up to 300% more damage to enemies with less than 50% Health.'
            }
          ]
        },
        {
          name: 'Smash',
          cost: 'Determined by Highest Max Resource',
          castTime: '0.6 second',
          target: 'Cone',
          radius: '8 meters',
          description: 'Drag your weapon along the ground to smash a cone in front of you.'
        },
        {
          name: 'Uppercut',
          cost: '2700 Stamina',
          castTime: '0.8 second',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Slam an enemy with an upward swing, dealing 2672 Physical Damage.',
          morphs: [
            {
              name: 'Dizzying Swing',
              cost: '2700 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Slam an enemy with an upward swing, dealing 2760 Physical Damage and setting them Off Balance for 7 seconds. Hitting an enemy that is already Off Balance stuns them for 2 seconds. Targets that are immune to Off Balance are snared by 40% for 2 seconds.'
            },
            {
              name: 'Wrecking Blow',
              cost: '2700 Stamina',
              castTime: '0.8 second',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Slam an enemy with an upward swing, dealing 2760 Physical Damage. Grants you Empower and Major Berserk for 3 seconds, increasing the damage of your Heavy Attacks against monsters by 70% and your damage done by 10%.'
            }
          ]
        }
      ],
      ultimates: [
        {
          name: 'Berserker Strike',
          cost: '150 Ultimate',
          castTime: '0.4 second',
          target: 'Enemy',
          maxRange: '7 meters',
          radius: '5 meters',
          description: 'Strike at an enemy with a vicious blow, dealing 3486 Physical Damage to them and all nearby enemies. This attack ignores the target\'s Physical Resistance, and grants you Physical and Spell Resistance equal to the amount ignored from the initial target for 8 seconds.',
          morphs: [
            {
              name: 'Berserker Rage',
              cost: '150 Ultimate',
              castTime: '0.4 second',
              target: 'Enemy',
              maxRange: '7 meters',
              radius: '5 meters',
              description: 'Strike at an enemy with a vicious blow, dealing 3600 Physical Damage to them and all nearby enemies. This attack ignores the target\'s Resistance and grants you Physical and Spell Resistance equal to the amount ignored from the initial target for 8 seconds. You are immune to all disabling, snare, and immobilization effects for the duration.'
            },
            {
              name: 'Onslaught',
              cost: '150 Ultimate',
              castTime: '0.4 second',
              target: 'Enemy',
              maxRange: '7 meters',
              radius: '5 meters',
              description: 'Strike at an enemy with a vicious blow, dealing 3485 Physical Damage to them and all nearby enemies. This attack ignores the target\'s Resistance and grants you Physical and Spell Penetration for your direct damage attacks equal to 100% of the amount ignored from the initial target for 5 seconds.'
            }
          ]
        }
      ]
    }
  }
};