import { SkillsetData } from '../../skillsets/Skillset';

export const magesGuildData: SkillsetData = {
  weapon: 'Mages Guild',
  skillLines: {
    magesGuild: {
      name: 'Mages Guild',
      icon: '🔮',
      passives: [
        {
          name: 'Mage Adept',
          description:
            'Gain 100 Weapon and Spell Damage. Increases by 100 per Mages Guild ability slotted.',
          requirement: '',
        },
        {
          name: 'Everlasting Magic',
          description: 'Increases the duration of beneficial magic effects by 20%.',
          requirement: '',
        },
        {
          name: 'Magicka Controller',
          description: 'Reduces the Magicka cost of your spells by 5%.',
          requirement: '',
        },
        {
          name: 'Might of the Guild',
          description:
            'Gain 20% more experience when you kill an enemy with a Mages Guild ability. When you cast a Mages Guild ability while you have 3 or more enemies within 8 meters of you, you gain 6 Ultimate.',
          requirement: '',
        },
        {
          name: 'Persuasive Will',
          description:
            'After casting a Mages Guild ability, you gain Major Prophecy for 20 seconds, increasing your Spell Critical rating by 2629.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Magelight',
          cost: '5130 Magicka',
          target: 'Self',
          duration: '120 seconds',
          description:
            'Create a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds and reducing their movement speed by 50%. Grants you and nearby allies Major Prophecy, increasing Spell Critical rating by 2629 for 120 seconds.',
          morphs: [
            {
              name: 'Inner Light',
              cost: '5130 Magicka',
              target: 'Self',
              duration: '120 seconds',
              description:
                'Create a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds and reducing their movement speed by 50%. Grants you and nearby allies Major Prophecy, increasing Spell Critical rating by 2629 for 120 seconds. While slotted, your Max Magicka is increased by 10%.',
            },
            {
              name: 'Radiant Magelight',
              cost: '4590 Magicka',
              target: 'Self',
              duration: '120 seconds',
              description:
                'Create a mote of magelight, revealing stealthed and invisible enemies around you for 8 seconds and reducing their movement speed by 50%. Grants you and nearby allies Major Prophecy, increasing Spell Critical rating by 2629 for 120 seconds. While slotted, you are immune to being stunned by other players.',
            },
          ],
        },
        {
          name: 'Entropy',
          cost: '2700 Magicka',
          target: 'Enemy',
          duration: '30 seconds',
          maxRange: '28 meters',
          description:
            'Bind an enemy with chaotic magic, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 30 seconds. You heal for 33% of all damage done by this effect.',
          morphs: [
            {
              name: 'Structured Entropy',
              cost: '2700 Magicka',
              target: 'Enemy',
              duration: '30 seconds',
              maxRange: '28 meters',
              description:
                'Bind an enemy with chaotic magic, dealing 1161 Magic Damage and an additional 3587 Magic Damage over 30 seconds. You heal for 33% of all damage done by this effect. While slotted on either ability bar, your Max Health is increased by 8%.',
            },
            {
              name: 'Degeneration',
              cost: '2700 Magicka',
              target: 'Enemy',
              duration: '30 seconds',
              maxRange: '28 meters',
              description:
                'Bind an enemy with chaotic magic, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 30 seconds. You heal for 33% of all damage done by this effect. Casting this spell again within 6 seconds will cause the first cast to instantly complete.',
            },
          ],
        },
        {
          name: 'Fire Rune',
          cost: '3780 Magicka',
          target: 'Ground',
          duration: '20 seconds',
          maxRange: '28 meters',
          radius: '2.5 meters',
          description:
            'Inscribe a burning rune at the target location, which lasts for 20 seconds. When triggered the rune explodes, dealing 2323 Flame Damage to all enemies in the target area and an additional 1161 Flame Damage over 20 seconds.',
          morphs: [
            {
              name: 'Volcanic Rune',
              cost: '3510 Magicka',
              target: 'Ground',
              duration: '20 seconds',
              maxRange: '28 meters',
              radius: '3.5 meters',
              description:
                'Inscribe a burning rune at the target location, which lasts for 20 seconds. When triggered the rune explodes, dealing 2399 Flame Damage to all enemies in the target area and an additional 1199 Flame Damage over 20 seconds.',
            },
            {
              name: 'Scalding Rune',
              cost: '3780 Magicka',
              target: 'Ground',
              duration: '20 seconds',
              maxRange: '28 meters',
              radius: '2.5 meters',
              description:
                'Inscribe a burning rune at the target location, which lasts for 20 seconds. When triggered the rune explodes, dealing 2323 Flame Damage to all enemies in the target area and an additional 2323 Flame Damage over 20 seconds.',
            },
          ],
        },
        {
          name: 'Equilibrium',
          cost: '25% Current Health',
          target: 'Self',
          description:
            'Exchange a portion of your Health for Magicka, converting 25% of your current Health into an equal amount of Magicka. The conversion is improved by 20% if your Health is higher than your Magicka.',
          morphs: [
            {
              name: 'Spell Symmetry',
              cost: '25% Current Health',
              target: 'Self',
              description:
                'Exchange a portion of your Health for Magicka, converting 25% of your current Health into an equal amount of Magicka. The conversion is improved by 20% if your Health is higher than your Magicka. After casting, you gain Major Resolve for 30 seconds, increasing your Physical and Spell Resistance by 5948.',
            },
            {
              name: 'Balance',
              cost: '25% Current Health',
              target: 'Self',
              description:
                'Exchange a portion of your Health for Magicka, converting 25% of your current Health into Magicka equal to 150% of the Health cost. The conversion is improved by 20% if your Health is higher than your Magicka.',
            },
          ],
        },
      ],
      ultimates: [
        {
          name: 'Meteor',
          cost: '200 Ultimate',
          target: 'Area',
          maxRange: '28 meters',
          radius: '8 meters',
          description:
            "Call down a meteor at the target location after 3.5 seconds, dealing 4171 Flame Damage to all enemies in the area and knocking them down for 2 seconds. The meteor's impact creates a burning ground effect that deals 870 Flame Damage every 1 second for 15 seconds.",
          morphs: [
            {
              name: 'Ice Comet',
              cost: '200 Ultimate',
              target: 'Area',
              maxRange: '28 meters',
              radius: '8 meters',
              description:
                "Call down a comet at the target location after 3.5 seconds, dealing 4313 Frost Damage to all enemies in the area and stunning them for 2 seconds. The comet's impact creates a frozen ground effect that deals 899 Frost Damage every 1 second for 15 seconds and reduces enemy movement speed by 50%.",
            },
            {
              name: 'Shooting Star',
              cost: '200 Ultimate',
              target: 'Area',
              maxRange: '28 meters',
              radius: '8 meters',
              description:
                "Call down a meteor at the target location after 3.5 seconds, dealing 4171 Flame Damage to all enemies in the area and knocking them down for 2 seconds. For each enemy hit by the initial impact, you restore 16 Ultimate. The meteor's impact creates a burning ground effect that deals 870 Flame Damage every 1 second for 15 seconds.",
            },
          ],
        },
      ],
    },
  },
};
