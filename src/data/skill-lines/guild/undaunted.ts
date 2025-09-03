import { SkillsetData } from '../../skillsets/Skillset';

export const undauntedData: SkillsetData = {
  weapon: 'Undaunted',
  skillLines: {
    undaunted: {
      name: 'Undaunted',
      icon: '🛡️',
      passives: [
        {
          name: 'Undaunted Command',
          description:
            'Activating a synergy restores 4% of your Max Health, Stamina, and Magicka. Health 480 Stamina, and 480 Magicka.',
          requirement: '',
        },
        {
          name: 'Undaunted Mettle',
          description:
            'Increases your Max Health, Stamina, and Magicka by 2% per type of Armor (Heavy, Medium, Light) that you have equipped.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Blood Altar',
          cost: '4320 Health',
          target: 'Area',
          duration: '30 seconds',
          radius: '28 meters',
          description:
            'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 600 Health every 1 second when damaging them. Allies in the area can activate the Blood Funnel synergy, healing for 40% of their Max Health.',
          morphs: [
            {
              name: 'Overflowing Altar',
              cost: '4050 Health',
              target: 'Area',
              duration: '30 seconds',
              radius: '28 meters',
              description:
                'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 600 Health every 1 second when damaging them. Allies in the area can activate the Blood Feast synergy, healing for 65% of their Max Health.',
            },
            {
              name: 'Sanguine Altar',
              cost: '2160 Health',
              target: 'Area',
              duration: '40 seconds',
              radius: '28 meters',
              description:
                'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 600 Health every 1 second when damaging them. Allies in the area can activate the Blood Funnel synergy, healing for 40% of their Max Health.',
            },
          ],
        },
        {
          name: 'Bone Shield',
          cost: '3672 Stamina',
          target: 'Self',
          duration: '6 seconds',
          description:
            'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 4958 damage for 6 seconds. This ability scales off your Max Health. An ally near you can activate the Bone Wall synergy, granting the ally and up to 5 other allies a damage shield equal to 30% of their Max Health for 6 seconds.',
          morphs: [
            {
              name: 'Bone Surge',
              cost: '3672 Stamina',
              target: 'Self',
              duration: '6 seconds',
              description:
                'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 5121 damage for 6 seconds. This ability scales off your Max Health. An ally near you can activate the Spinal Surge synergy, granting up to 6 allies a damage shield that absorbs up to 30% of their Max Health for 6 seconds and Major Vitality, increasing their healing received and damage shield strength by 12%.',
            },
            {
              name: 'Spiked Bone Shield',
              cost: '3672 Stamina',
              target: 'Self',
              duration: '6 seconds',
              description:
                'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 4958 damage for 6 seconds and returns 100% of direct damage absorbed back to the enemy. This ability scales off your Max Health. An ally near you can activate the Bone Wall synergy, granting the ally and up to 5 other allies a damage shield equal to 30% of their Max Health for 6 seconds.',
            },
          ],
        },
        {
          name: 'Inner Fire',
          cost: '1620 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description:
            "Ignite the fires of hate in an enemy's heart, dealing 1045 Flame Damage and taunting them to attack you for 15 seconds. An ally targeting the taunted enemy can activate the Radiate synergy, dealing 1344 Flame Damage to them over 3 seconds then an additional 2249 Flame Damage to them and other nearby enemies.",
          morphs: [
            {
              name: 'Inner Beast',
              cost: '2295 Stamina',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                "Ignite the fires of hate in an enemy's heart, dealing 2160 Physical Damage, taunting them to attack you, and applying Minor Maim and Minor Vulnerability for 15 seconds, reducing their damage done and increasing their damage taken by 5%. An ally targeting the enemy can activate the Radiate synergy, dealing 1344 Flame Damage to them over 3 seconds then an additional 2249 Flame Damage to them and other nearby enemies.",
            },
            {
              name: 'Inner Rage',
              cost: '1620 Magicka',
              target: 'Enemy',
              maxRange: '28 meters',
              description:
                "Ignite the fires of hate in an enemy's heart, dealing 1079 Flame Damage and taunting them to attack you for 15 seconds. Up to 3 allies targeting the taunted enemy can activate the Radiate synergy, dealing 1344 Flame Damage to them over 3 seconds then an additional 2249 Flame Damage to them and other nearby enemies.",
            },
          ],
        },
        {
          name: 'Necrotic Orb',
          cost: '2970 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '8 meters',
          description:
            'Project a globe of annihilation that slowly floats forward for 10 seconds, dealing 316 Magic Damage every 1 second to nearby enemies. An ally near the globe can activate the Combustion synergy, causing the orb to explode for 2249 Magic Damage to nearby enemies and restore 3960 Magicka or Stamina to the ally, whichever maximum is higher.',
          morphs: [
            {
              name: 'Energy Orb',
              cost: '3780 Magicka',
              target: 'Area',
              duration: '10 seconds',
              radius: '8 meters',
              description:
                'Project a globe of regeneration that slowly floats forward, healing for 489 Health every 1 second to you and nearby allies. An ally near the globe can activate the Healing Combustion synergy, causing the orb to explode and heal for 2249 Health to nearby allies and restoring 3960 Magicka or Stamina to the activator, whichever maximum is higher.',
            },
            {
              name: 'Mystic Orb',
              cost: '2970 Magicka',
              target: 'Area',
              duration: '10 seconds',
              radius: '8 meters',
              description:
                'Project a globe of annihilation that slowly floats forward, dealing 326 Magic Damage every 1 second to nearby enemies. While the orb is active you gain 100 Health, Magicka, and Stamina Recovery. An ally near the globe can activate the Combustion synergy, causing the orb to explode for 2249 Magic Damage to nearby enemies and restore 3960 Magicka or Stamina to the ally, whichever maximum is higher.',
            },
          ],
        },
        {
          name: 'Trapping Webs',
          cost: '2984 Stamina',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '4 meters',
          description:
            'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 1742 Physical Damage. After 10 seconds the webs explode, dealing 2323 Poison Damage to enemies within. A ranged ally can activate the Spawn Broodling synergy on an affected enemy, dealing 2249 Poison Damage to them and summoning a spider to attack for 10 seconds. The spider bites enemies for 673 Physical Damage.',
          morphs: [
            {
              name: 'Shadow Silk',
              cost: '2984 Stamina',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '4 meters',
              description:
                'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 1799 Physical Damage. After 10 seconds the webs explode, dealing 2399 Poison Damage to enemies within. A ranged ally can activate the Black Widow synergy on an affected enemy, dealing 2249 Poison Damage to them and summoning a spider to attack for 10 seconds. The spider bites enemies for 673 Physical Damage and can poison them for 4488 Poison Damage over 10 seconds.',
            },
            {
              name: 'Tangling Webs',
              cost: '2984 Stamina',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '4 meters',
              description:
                'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 1742 Physical Damage. After 10 seconds the webs explode, dealing 2323 Poison Damage to enemies within. A ranged ally can activate the Arachnophobia synergy on an affected enemy, dealing 2249 Poison Damage to them, fearing them for 4 seconds, and summoning a spider to attack for 10 seconds. The spider bites enemies for 673 Physical Damage.',
            },
          ],
        },
      ],
      ultimates: [],
    },
  },
};
