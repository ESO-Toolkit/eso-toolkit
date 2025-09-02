import { SkillsetData } from '../../skillsets/Skillset';

export const oneHandAndShieldData: SkillsetData = {
  weapon: 'One Hand and Shield',
  skillLines: {
    oneHandAndShield: {
      name: 'One Hand and Shield',
      icon: '🗡️🛡️',
      passives: [
        {
          name: 'Battlefield Mobility',
          description: 'Reduces the Movement Speed penalty of Bracing. Current penalty: 36%.',
          requirement: 'WITH ONE HAND WEAPON AND SHIELD EQUIPPED'
        },
        {
          name: 'Deadly Bash',
          description: 'Improves your standard Bash attacks, causing them to deal 500 more damage and cost 50% less Stamina.',
          requirement: 'WITH ONE HAND WEAPON AND SHIELD EQUIPPED'
        },
        {
          name: 'Deflect Bolts',
          description: 'Increases the amount of damage you can block from projectiles and ranged attacks by 14%.',
          requirement: 'WITH ONE HAND WEAPON AND SHIELD EQUIPPED'
        },
        {
          name: 'Fortress',
          description: 'Reduces the Stamina cost of your One Hand and Shield abilities by 15% and reduces the cost of blocking by 36%.',
          requirement: 'WITH ONE HAND WEAPON AND SHIELD EQUIPPED'
        },
        {
          name: 'Sword and Board',
          description: 'Increases your Weapon and Spell Damage by 5% and the amount of damage you can block by 20%.',
          requirement: 'WITH ONE HAND WEAPON AND SHIELD EQUIPPED'
        }
      ],
      actives: [
        {
          name: 'Defensive Posture',
          cost: '4320 Stamina',
          target: 'Self',
          duration: '6 seconds',
          description: 'Bolster your defenses, gaining a damage shield that absorbs up to 4958 damage for 6 seconds. This portion of the ability scales off your Max Health. You reflect the next harmful direct damage projectile cast at you. This effect can occur once per cast.',
          morphs: [
            {
              name: 'Absorb Missile',
              cost: '4320 Stamina',
              target: 'Self',
              duration: '6 seconds',
              description: 'Bolster your defenses, gaining a damage shield that absorbs up to 4958 damage for 6 seconds. While the shield persists, you are healed for 2560 Health the next time a harmful direct damage projectile hits you. This effect can occur once per cast. This ability scales off your Max Health.'
            },
            {
              name: 'Defensive Stance',
              cost: '4320 Stamina',
              target: 'Self',
              duration: '6 seconds',
              description: 'Bolster your defenses, gaining a damage shield that absorbs up to 4958 damage for 6 seconds. This portion of the ability scales off your Max Health. You reflect the next harmful direct damage projectile cast at you, once per cast. While slotted and you have a shield equipped, the amount of damage you can block is increased by 10% and the cost of blocking is reduced by 10%.'
            }
          ]
        },
        {
          name: 'Low Slash',
          cost: '2970 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Surprise an enemy with a deep lunge, dealing 1392 Physical Damage and afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds.',
          morphs: [
            {
              name: 'Deep Slash',
              cost: '2970 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              radius: '6 meters',
              description: 'Surprise an enemy with a sweeping lunge, dealing 1799 Physical Damage to them and other nearby enemies, afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds. Enemies hit also have their Movement Speed reduced by 30% for 4 seconds.'
            },
            {
              name: 'Heroic Slash',
              cost: '2970 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Surprise an enemy with a deep lunge, dealing 1438 Physical Damage and afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds. You gain Minor Heroism, granting you 1 Ultimate every 1.5 seconds for 15 seconds.'
            }
          ]
        },
        {
          name: 'Power Bash',
          cost: '2700 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Strike an enemy full-force with your shield, dealing 2323 Physical Damage. This ability\'s damage is considered Bash damage and interrupts the enemy if they are casting.',
          morphs: [
            {
              name: 'Power Slam',
              cost: '2700 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Strike an enemy full-force with your shield, dealing 2399 Physical Damage. While slotted, blocking any attack grants you Resentment, which reduces the cost of your next Power Slam cast within 10 seconds by 50%. This ability\'s damage is considered Bash damage and interrupts the enemy if they are casting.'
            },
            {
              name: 'Reverberating Bash',
              cost: '2700 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Strike an enemy full-force with your shield, dealing 1161 Physical Damage and stunning them for 3 seconds. After the stun ends, the enemy takes an additional 1161 Physical Damage. This ability\'s damage is considered Bash damage and interrupts the enemy if they are casting.'
            }
          ]
        },
        {
          name: 'Puncture',
          cost: '1350 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Thrust your weapon with disciplined precision at an enemy, dealing 1161 Physical Damage and taunting them to attack you for 15 seconds. Also inflicts Major Breach on the enemy, reducing their Physical and Spell Resistance by 5948 for 15 seconds.',
          morphs: [
            {
              name: 'Pierce Armor',
              cost: '1350 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Thrust your weapon with disciplined precision at an enemy, dealing 1199 Physical Damage and taunting them to attack you for 15 seconds. Also inflicts Minor Breach and Major Breach on the enemy, reducing their Physical Resistance and Spell Resistance by 2974 and 5948 for 15 seconds.'
            },
            {
              name: 'Ransack',
              cost: '1350 Stamina',
              target: 'Enemy',
              maxRange: '7 meters',
              description: 'Thrust your weapon with disciplined precision at an enemy, dealing 1199 Physical Damage and taunting them to attack you for 15 seconds. Also inflicts Major Breach on the enemy, reducing their Physical and Spell Resistance by 5948 for 15 seconds. You also gain Minor Protection, reducing your damage taken by 5% for 15 seconds.'
            }
          ]
        },
        {
          name: 'Shield Charge',
          cost: '3780 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Rush an enemy and ram them, dealing 1392 Physical Damage and stunning them for 3 seconds.',
          morphs: [
            {
              name: 'Invasion',
              cost: '3510 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description: 'Rush an enemy and ram them, dealing 1393 Physical Damage and stunning them for 4 seconds. Stuns up to 50% longer based on the distance traveled.'
            },
            {
              name: 'Shielded Assault',
              cost: '3780 Stamina',
              target: 'Enemy',
              maxRange: '22 meters',
              description: 'Rush an enemy and ram them, dealing 1393 Physical Damage and stunning them for 3 seconds. You gain a damage shield after the attack, absorbing 5121 damage for 6 seconds. This portion of the ability scales off your Max Health.'
            }
          ]
        },
        {
          name: 'Shield Throw',
          cost: 'Determined by Highest Max Resource',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Hurl your shield at an enemy, which then returns to you.'
        }
      ],
      ultimates: [
        {
          name: 'Shield Wall',
          cost: '135 Ultimate',
          target: 'Self',
          duration: '6 seconds',
          description: 'Reinforce your shield, allowing you to automatically block all attacks at no cost for 6 seconds.',
          morphs: [
            {
              name: 'Shield Discipline',
              cost: '135 Ultimate',
              target: 'Self',
              duration: '8 seconds',
              description: 'Reinforce your shield, allowing you to automatically block all attacks at no cost for 8 seconds. Your One Hand and Shield non-Ultimate abilities cost nothing while this effect persists.'
            },
            {
              name: 'Spell Wall',
              cost: '135 Ultimate',
              target: 'Self',
              duration: '7 seconds',
              description: 'Reinforce your shield, allowing you to automatically block all attacks at no cost and reflect all projectiles cast at you for 7 seconds.'
            }
          ]
        }
      ]
    }
  }
};