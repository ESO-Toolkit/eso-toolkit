import { SkillsetData } from '../../skillsets/Skillset';

export const destructionStaffData: SkillsetData = {
  weapon: 'Destruction Staff',
  skillLines: {
    destructionStaff: {
      name: 'Destruction Staff',
      icon: '🔥❄️⚡️',
      passives: [
        {
          name: 'Ancient Knowledge',
          description:
            'Inferno Staves increases your damage done with damage over time and Status Effects by 12%. Lightning Staves increases your damage done with direct damage and channeled effects by 12%. Equipping an Ice Staff reduces the cost of blocking by 36% and increases the amount of damage you block by 20%.',
          requirement: 'WITH DESTRUCTION STAFF EQUIPPED',
        },
        {
          name: 'Destruction Expert',
          description:
            'When you kill an enemy with a Destruction Staff ability, you restore 3600 Magicka. When you absorb damage using a Destruction Staff Damage Shield, you restore 1800 Magicka. This effect can occur once every 10 seconds.',
          requirement: 'WITH DESTRUCTION STAFF EQUIPPED',
        },
        {
          name: 'Elemental Force',
          description: 'Increases your chance to apply status effects by 100%.',
          requirement: 'WITH DESTRUCTION STAFF EQUIPPED',
        },
        {
          name: 'Penetrating Magic',
          description:
            "Your Destruction Staff abilities ignore 2974 of the enemy's Spell Resistance.",
          requirement: 'WITH DESTRUCTION STAFF EQUIPPED',
        },
        {
          name: 'Tri Focus',
          description:
            'Fully-charged Inferno Staff Heavy Attacks deal an additional 4480 Flame Damage over 20 seconds. Fully-charged Lightning Staff Heavy Attacks damage nearby enemies for 100% of the damage done. Fully-charged Ice Staff Heavy Attacks grant you a damage shield that absorbs 5280 damage. This effect scales off your Max Health. While an Ice Staff is equipped, blocking costs Magicka instead of Stamina.',
          requirement: 'WITH DESTRUCTION STAFF EQUIPPED',
        },
      ],
      actives: [
        {
          name: 'Destructive Touch',
          cost: '2970 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '15 meters',
          description:
            "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 20 seconds. The initial hit always applies the element's status effect.",
          morphs: [
            {
              name: 'Destructive Clench',
              cost: '2970 Magicka',
              target: 'Enemy',
              maxRange: '15 meters',
              description:
                "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage. The initial hit always applies the element's status effect. Flame Clench also knocks the enemy back. Frost Clench deals less damage, has increased range, applies Major Maim, immobilizes, and taunts the enemy. Shock Clench converts the attack into an area of effect explosion.",
            },
            {
              name: 'Destructive Reach',
              cost: '2700 Magicka',
              target: 'Enemy',
              duration: '20 seconds',
              maxRange: '28 meters',
              description:
                "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 20 seconds. The initial hit always applies the element's status effect.",
            },
          ],
        },
        {
          name: 'Elemental Explosion',
          cost: 'Determined by Highest Max Resource',
          castTime: '2 seconds',
          target: 'Ground',
          maxRange: '28 meters',
          radius: '10 meters',
          description:
            'Channel the power in your staff to fling a bolt of volatile magic, causing an elemental explosion at the target location.',
        },
        {
          name: 'Force Shock',
          cost: '2700 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description:
            'Focus all the elemental energies with your staff and blast an enemy for 695 Flame Damage, 695 Frost Damage, and 695 Shock Damage.',
          morphs: [
            {
              name: 'Crushing Shock',
              cost: '2430 Magicka',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                'Focus all the elemental energies with your staff and blast an enemy for 696 Flame Damage, 696 Frost Damage, and 696 Shock Damage. Enemies hit while casting are interrupted, set Off Balance, and stunned for 3 seconds.',
            },
            {
              name: 'Force Pulse',
              cost: '2700 Magicka',
              target: 'Enemy',
              maxRange: '28 meters',
              radius: '8 meters',
              description:
                'Focus all the elemental energies with your staff and blast an enemy for 696 Flame Damage, 696 Frost Damage, and 696 Shock Damage. Up to 2 nearby enemies will take 2399 Magic Damage if they were already afflicted with a status effect.',
            },
          ],
        },
        {
          name: 'Impulse',
          cost: '3780 Magicka',
          target: 'Area',
          radius: '6 meters',
          description:
            "Release a surge of elemental energy, dealing 1742 Magic Damage to nearby enemies. Fire Impulse hits Burning enemies with Impulse Afterburn, which deals more damage based on their missing Health. Frost Impulse also provides Minor Protection. Shock Impulse's damage increases based on the number of enemies hit.",
          morphs: [
            {
              name: 'Elemental Ring',
              cost: '3780 Magicka',
              target: 'Ground',
              maxRange: '28 meters',
              radius: '6 meters',
              description:
                "Release a surge of elemental energy, dealing 1799 Magic Damage to enemies at the target location. Fire Ring hits Burning enemies with Ring Afterburn, which deals more damage based on their missing Health. Frost Ring also provides Minor Protection. Shock Ring's damage increases based on the number of enemies hit.",
            },
            {
              name: 'Pulsar',
              cost: '3780 Magicka',
              target: 'Area',
              radius: '6 meters',
              description:
                "Release a surge of elemental energy, dealing 1742 Magic Damage to nearby enemies and afflicting them with Minor Mangle, reducing their Max Health by 10% for 10 seconds. Flame Pulsar hits Burning enemies with Pulsar Afterburn, which deals more damage based on their missing Health. Frost Pulsar also provides Minor Protection. Storm Pulsar's damage increases based on the number of enemies hit.",
            },
          ],
        },
        {
          name: 'Wall of Elements',
          cost: '2970 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '18 meters',
          description:
            'Slam your staff down to create an elemental barrier in front of you, dealing 280 Magic Damage to enemies in the target area every 1 second. Wall of Fire deals additional damage to Burning enemies. Wall of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Wall of Storms sets Concussed enemies Off Balance.',
          morphs: [
            {
              name: 'Elemental Blockade',
              cost: '2970 Magicka',
              target: 'Area',
              duration: '15 seconds',
              radius: '18 meters',
              description:
                'Slam your staff down to create an elemental barrier in front of you, dealing 281 Magic Damage to enemies in the target area every 1 second. Blockade of Fire deals additional damage to Burning enemies. Blockade of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Blockade of Storms sets Concussed enemies Off Balance.',
            },
            {
              name: 'Unstable Wall of Elements',
              cost: '2970 Magicka',
              target: 'Area',
              duration: '10 seconds',
              radius: '18 meters',
              description:
                'Create an unstable elemental barrier in front of you, dealing 281 Magic Damage to enemies in the target area every 1 second before exploding for an additional 1199 Magic Damage. Unstable Wall of Fire deals additional damage to Burning enemies. Unstable Wall of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Unstable Wall of Storms sets Concussed enemies Off Balance.',
            },
          ],
        },
        {
          name: 'Weakness to Elements',
          cost: '',
          target: 'Enemy',
          duration: '30 seconds',
          maxRange: '28 meters',
          description:
            "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 30 seconds, reducing their Physical and Spell Resistance by 5948.",
          morphs: [
            {
              name: 'Elemental Drain',
              cost: '',
              target: 'Enemy',
              duration: '60 seconds',
              maxRange: '28 meters',
              description:
                "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 1 minute, reducing their Physical and Spell Resistance by 5948. Also applies Minor Magickasteal to the enemy for 1 minute, causing you and your allies to restore 168 Magicka every 1 second when damaging them.",
            },
            {
              name: 'Elemental Susceptibility',
              cost: '',
              target: 'Enemy',
              duration: '30 seconds',
              maxRange: '35 meters',
              description:
                "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 30 seconds, reducing their Physical and Spell Resistance by 5948. Every 7.5 seconds the enemy is afflicted with the Burning, Chilled, and Concussion status effect.",
            },
          ],
        },
      ],
      ultimates: [
        {
          name: 'Elemental Storm',
          cost: '250 Ultimate',
          target: 'Ground',
          duration: '7 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description:
            'Create a cataclysmic storm at the target location that builds for 2 seconds then lays waste to all enemies in the area, dealing 1742 Magic Damage every 1 second for 7 seconds.',
          morphs: [
            {
              name: 'Elemental Rage',
              cost: '250 Ultimate',
              target: 'Ground',
              duration: '7 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description:
                'Create a cataclysmic storm at the target location that builds for 2 seconds then lays waste to all enemies in the area, dealing 2249 Magic Damage every 1 second for 7 seconds. Fiery Rage increases the damage by 15%. Icy Rage immobilizes enemies hit for 3 seconds. Thunderous Rage increases the duration by 2 seconds.',
            },
            {
              name: 'Eye of the Storm',
              cost: '250 Ultimate',
              target: 'Area',
              duration: '7 seconds',
              radius: '8 meters',
              description:
                'Create a cataclysmic storm above you that builds for 2 seconds then lays waste to all enemies nearby, dealing 1799 Magic Damage every 1 second for 7 seconds.',
            },
          ],
        },
      ],
    },
  },
};
