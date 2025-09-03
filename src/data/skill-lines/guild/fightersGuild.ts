import { SkillsetData } from '../../skillsets/Skillset';

export const fightersGuildData: SkillsetData = {
  weapon: 'Fighters Guild',
  skillLines: {
    fightersGuild: {
      name: 'Fighters Guild',
      icon: '⚔️',
      passives: [
        {
          name: 'Intimidating Presence',
          description:
            'Gain 100 Weapon and Spell Damage against Undead, Daedra, and Werewolves. Increases by 100 per Fighters Guild ability slotted.',
          requirement: '',
        },
        {
          name: 'Banish the Wicked',
          description: 'Deal 20% more damage to Undead, Daedra, and Werewolves.',
          requirement: '',
        },
        {
          name: 'Skilled Tracker',
          description:
            'Reduces the radius you can be detected while Sneaking by 2 meters. Gain 20% more experience when you kill Undead, Daedra, and Werewolves.',
          requirement: '',
        },
        {
          name: 'Bounty Hunter',
          description:
            'Gain 250 Weapon and Spell Damage for 30 seconds after killing an enemy player. This effect can stack up to 3 times.',
          requirement: '',
        },
        {
          name: 'Slayer',
          description:
            'When you kill an enemy, you gain 5 Ultimate. This effect can occur once every 10 seconds.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Circle of Protection',
          cost: '4590 Stamina',
          target: 'Area',
          duration: '20 seconds',
          radius: '8 meters',
          description:
            'Protect yourself and nearby allies with a circle of warding for 20 seconds, reducing damage from Undead, Daedra, and Werewolves by 10%. Enemies that enter the circle are snared by 50%.',
          morphs: [
            {
              name: 'Turn Evil',
              cost: '4590 Stamina',
              target: 'Area',
              duration: '20 seconds',
              radius: '8 meters',
              description:
                'Protect yourself and nearby allies with a circle of warding for 20 seconds, reducing damage from Undead, Daedra, and Werewolves by 10%. Enemies that enter the circle are snared by 50% and feared for 4 seconds the first time they enter.',
            },
            {
              name: 'Ring of Preservation',
              cost: '4320 Magicka',
              target: 'Area',
              duration: '20 seconds',
              radius: '8 meters',
              description:
                'Protect yourself and nearby allies with a circle of warding for 20 seconds, reducing damage from Undead, Daedra, and Werewolves by 10%. The circle also heals you and your allies for 554 Health every 2 seconds.',
            },
          ],
        },
        {
          name: 'Expert Hunter',
          cost: '2295 Stamina',
          target: 'Self',
          duration: '30 seconds',
          description:
            'Spawn a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds and marking them for 30 seconds. Marked enemies cannot return to stealth or invisibility for 4 seconds after taking damage. Grant you and nearby allies Major Savagery, increasing your Weapon Critical rating by 2629 for 30 seconds.',
          morphs: [
            {
              name: 'Evil Hunter',
              cost: '2295 Stamina',
              target: 'Self',
              duration: '30 seconds',
              description:
                'Spawn a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds and marking them for 30 seconds. Marked enemies cannot return to stealth or invisibility for 4 seconds after taking damage. Grant you and nearby allies Major Savagery and Major Prophecy, increasing your Weapon and Spell Critical rating by 2629 for 30 seconds.',
            },
            {
              name: 'Camouflaged Hunter',
              cost: '2295 Stamina',
              target: 'Self',
              duration: '30 seconds',
              description:
                'Spawn a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds and marking them for 30 seconds. Marked enemies cannot return to stealth or invisibility for 4 seconds after taking damage. While slotted, you gain Minor Berserk, increasing your damage done by 5%. Grant you and nearby allies Major Savagery, increasing your Weapon Critical rating by 2629 for 30 seconds.',
            },
          ],
        },
        {
          name: 'Silver Bolts',
          cost: '2700 Stamina',
          target: 'Enemy',
          maxRange: '28 meters',
          description:
            'Fire a Fighters Guild crossbow bolt to strike an enemy, dealing 1161 Physical Damage. Deals 40% more damage to Undead, Daedra, and Werewolves, and can knock them down for 3 seconds.',
          morphs: [
            {
              name: 'Silver Leash',
              cost: '2700 Stamina',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                'Fire a Fighters Guild crossbow bolt to strike an enemy, dealing 1161 Physical Damage and pulling them to you. Deals 40% more damage to Undead, Daedra, and Werewolves.',
            },
            {
              name: 'Silver Shards',
              cost: '2700 Stamina',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                'Fire a Fighters Guild crossbow bolt to strike an enemy, dealing 1161 Physical Damage. The bolt fragments on impact, dealing 348 Physical Damage to nearby enemies. Both attacks deal 40% more damage to Undead, Daedra, and Werewolves, and can knock them down for 3 seconds.',
            },
          ],
        },
        {
          name: 'Trap Beast',
          cost: '3240 Stamina',
          target: 'Ground',
          duration: '30 seconds',
          maxRange: '28 meters',
          radius: '2.5 meters',
          description:
            'Place a stealthed trap at the target location, which takes 1.5 seconds to arm and lasts for 30 seconds. When an enemy triggers the trap, they are immobilized for 8 seconds, revealed for 5 seconds, and you gain Minor Force, increasing your Critical Damage by 10% for 30 seconds.',
          morphs: [
            {
              name: 'Lightweight Beast Trap',
              cost: '2700 Stamina',
              target: 'Ground',
              duration: '30 seconds',
              maxRange: '28 meters',
              radius: '2.5 meters',
              description:
                'Place a stealthed trap at the target location, which takes 1.5 seconds to arm and lasts for 30 seconds. When an enemy triggers the trap, they are immobilized for 8 seconds, revealed for 5 seconds, and you gain Minor Force, increasing your Critical Damage by 10% for 30 seconds.',
            },
            {
              name: 'Barbed Trap',
              cost: '3240 Stamina',
              target: 'Ground',
              duration: '30 seconds',
              maxRange: '28 meters',
              radius: '2.5 meters',
              description:
                'Place a stealthed trap at the target location, which takes 1.5 seconds to arm and lasts for 30 seconds. When an enemy triggers the trap, they take 2323 Bleed Damage over 20 seconds, are immobilized for 8 seconds, revealed for 5 seconds, and you gain Minor Force, increasing your Critical Damage by 10% for 30 seconds.',
            },
          ],
        },
      ],
      ultimates: [
        {
          name: 'Dawnbreaker',
          cost: '125 Ultimate',
          target: 'Cone',
          radius: '10 meters',
          description:
            'Arm yourself with the power of the sun and strike enemies in front of you for 4171 Physical Damage. Deals 40% more damage to Undead, Daedra, and Werewolves. After casting, you gain Major Berserk for 10 seconds, increasing your damage done by 10%.',
          morphs: [
            {
              name: 'Flawless Dawnbreaker',
              cost: '125 Ultimate',
              target: 'Cone',
              radius: '10 meters',
              description:
                'Arm yourself with the power of the sun and strike enemies in front of you for 4313 Physical Damage. Deals 40% more damage to Undead, Daedra, and Werewolves. After casting, you gain Major Berserk for 10 seconds, increasing your damage done by 10%. While slotted on either ability bar, your Weapon and Spell Damage is increased by 258.',
            },
            {
              name: 'Dawnbreaker of Smiting',
              cost: '125 Ultimate',
              target: 'Cone',
              radius: '10 meters',
              description:
                'Arm yourself with the power of the sun and strike enemies in front of you for 4171 Physical Damage. Deals 40% more damage to Undead, Daedra, and Werewolves, and knocks them down for 2 seconds. After casting, you gain Major Berserk for 10 seconds, increasing your damage done by 10%.',
            },
          ],
        },
      ],
    },
  },
};
