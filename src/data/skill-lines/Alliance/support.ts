import { SkillsetData } from '../../skillsets/Skillset';

export const supportData: SkillsetData = {
  weapon: 'Support',
  skillLines: {
    support: {
      name: 'Support',
      icon: '🛡️',
      passives: [
        {
          name: 'Battle Resurrection',
          description: 'Reduces the time it takes you to resurrect another player by 30% while you are in a PvP area.',
          requirement: ''
        },
        {
          name: 'Combat Medic',
          description: 'Increases your healing done by 20% when you are near a Keep.',
          requirement: ''
        },
        {
          name: 'Magicka Aid',
          description: 'Increases your Magicka Recovery by 10% for each Support ability slotted.',
          requirement: ''
        }
      ],
      actives: [
        {
          name: 'Guard',
          cost: '3402 Stamina',
          target: 'Ally',
          maxRange: '15 meters',
          description: 'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. The bond will remain until you recast the spell or move more than 15 meters away from your ally.',
          morphs: [
            {
              name: 'Mystic Guard',
              cost: '3132 Stamina',
              target: 'Ally',
              maxRange: '15 meters',
              description: 'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. You and your bonded ally also gain Minor Vitality, increasing your healing received and damage shield strength by 6%. The bond will remain until you recast the spell or move more than 15 meters away from your ally.'
            },
            {
              name: 'Stalwart Guard',
              cost: '3132 Stamina',
              target: 'Ally',
              maxRange: '15 meters',
              description: 'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. You and your bonded ally also gain Minor Force, increasing your Critical Damage by 10%. The bond will remain until you recast the spell or move more than 15 meters away from your ally.'
            }
          ]
        },
        {
          name: 'Purge',
          cost: '7830 Magicka',
          target: 'Area',
          radius: '18 meters',
          description: 'Cleanse yourself and your group, removing up to 3 negative effects immediately.',
          morphs: [
            {
              name: 'Cleanse',
              cost: '7830 Magicka',
              target: 'Area',
              radius: '18 meters',
              description: 'Cleanse yourself and your group, removing 3 negative effects immediately. For every negative effect removed, the target is healed for 5% of their Max Health.'
            },
            {
              name: 'Efficient Purge',
              cost: '5400 Magicka',
              target: 'Area',
              radius: '18 meters',
              description: 'Cleanse yourself and your group, removing up to 3 negative effects immediately.'
            }
          ]
        },
        {
          name: 'Revealing Flare',
          cost: '5130 Magicka',
          target: 'Ground',
          duration: '5 seconds',
          maxRange: '28 meters',
          radius: '10 meters',
          description: 'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.',
          morphs: [
            {
              name: 'Blinding Flare',
              cost: '5130 Magicka',
              target: 'Ground',
              duration: '5 seconds',
              maxRange: '28 meters',
              radius: '10 meters',
              description: 'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 5 seconds. Exposed enemies are stunned for 4 seconds, and cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.'
            },
            {
              name: 'Lingering Flare',
              cost: '5130 Magicka',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '10 meters',
              description: 'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 10 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.'
            }
          ]
        },
        {
          name: 'Siege Shield',
          cost: '8100 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '10 meters',
          description: 'Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies.',
          morphs: [
            {
              name: 'Propelling Shield',
              cost: '7830 Magicka',
              target: 'Area',
              duration: '20 seconds',
              radius: '10 meters',
              description: 'Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies. Also increases the range of abilities with a range greater than 28 meters by 7 meters. Does not affect Leap, Move Position, and Pull abilities.'
            },
            {
              name: 'Siege Weapon Shield',
              cost: '8100 Magicka',
              target: 'Area',
              duration: '20 seconds',
              radius: '10 meters',
              description: 'Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies. The sphere also protects you and your allies\' siege weapons, reducing damage from enemy siege weapons by 75%.'
            }
          ]
        },
        {
          name: 'Banner Bearer',
          cost: 'Determined by Highest Max Resource',
          target: 'Area',
          radius: '8 meters',
          description: 'Bring out a banner to inspire yourself and nearby group members.'
        }
      ],
      ultimates: [
        {
          name: 'Barrier',
          cost: '250 Ultimate',
          target: 'Area',
          duration: '30 seconds',
          radius: '12 meters',
          description: 'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11621 damage for 30 seconds.',
          morphs: [
            {
              name: 'Replenishing Barrier',
              cost: '250 Ultimate',
              target: 'Area',
              duration: '30 seconds',
              radius: '12 meters',
              description: 'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11620 damage. Each time a ward dissolves, you restore 1500 Magicka.'
            },
            {
              name: 'Reviving Barrier',
              cost: '250 Ultimate',
              target: 'Area',
              duration: '30 seconds',
              radius: '12 meters',
              description: 'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11620 damage for 30 seconds. The wards also heal you and your group members for 5370 Health over 15 seconds.'
            }
          ]
        }
      ]
    }
  }
};