import { SkillsetData } from '../../skillsets/Skillset';

export const psijicOrderData: SkillsetData = {
  weapon: 'Psijic Order',
  skillLines: {
    psijicOrder: {
      name: 'Psijic Order',
      icon: '🌀',
      passives: [
        {
          name: 'Clairvoyance',
          description:
            'Reduces the time it takes to resurrect an ally by 25% per stage, and reduces the time you must wait to be resurrected by an ally by 25% per stage.',
          requirement: '',
        },
        {
          name: 'Spell Orb',
          description:
            'When you cast a Psijic Order ability, you have a 15% chance to spawn a spell orb for 10 seconds. The spell orb moves towards you and grants 300 Magicka Recovery and 300 Stamina Recovery when picked up.',
          requirement: '',
        },
        {
          name: 'Concentrated Barrier',
          description:
            'Casting a Psijic Order ability grants you a damage shield that absorbs up to 4800 damage for 6 seconds. This effect can occur once every 10 seconds.',
          requirement: '',
        },
        {
          name: 'Deliberation',
          description:
            'Reduces the cost of Psijic Order abilities by 15% and increases their duration by 1 second.',
          requirement: '',
        },
        {
          name: 'Meditate',
          description:
            'Increases your Health, Magicka, and Stamina Recovery by 30 for each Psijic Order ability slotted.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Time Stop',
          cost: '4320 Magicka',
          target: 'Enemy',
          duration: '8 seconds',
          maxRange: '28 meters',
          description:
            'Freeze an enemy in time for 8 seconds, stunning them and making them immune to all damage and effects. When the stun ends, they take 2323 Magic Damage.',
          morphs: [
            {
              name: 'Borrowed Time',
              cost: '4320 Magicka',
              target: 'Ally',
              duration: '8 seconds',
              maxRange: '28 meters',
              description:
                'Freeze an ally in time for 8 seconds, making them immune to all damage and effects. When the effect ends, they are healed for 4647 Health.',
            },
            {
              name: 'Time Freeze',
              cost: '4050 Magicka',
              target: 'Enemy',
              duration: '8 seconds',
              maxRange: '28 meters',
              description:
                'Freeze an enemy in time for 8 seconds, stunning them and making them immune to all damage and effects. When the stun ends, they take 2399 Magic Damage and are stunned again for 2 seconds.',
            },
          ],
        },
        {
          name: 'Undo',
          cost: '3510 Magicka',
          target: 'Self',
          description:
            'Step backwards through time, returning to your location and Health, Magicka, and Stamina values from 4 seconds ago.',
          morphs: [
            {
              name: 'Temporal Guard',
              cost: '3510 Magicka',
              target: 'Self',
              description:
                'Step backwards through time, returning to your location and Health, Magicka, and Stamina values from 4 seconds ago. Gain immunity to all damage and effects for 1 second after casting.',
            },
            {
              name: 'Recall',
              cost: '3510 Magicka',
              target: 'Self',
              description:
                'Step backwards through time, returning to your location and Health, Magicka, and Stamina values from 4 seconds ago. The cost of this ability is reduced by 33% for each negative effect removed.',
            },
          ],
        },
        {
          name: 'Meditate',
          cost: '1080 Health, Magicka, and Stamina per second',
          target: 'Self',
          channelTime: '6 seconds',
          description:
            'Focus your body and mind into a meditative trance, healing yourself for 1800 Health every 1 second for 6 seconds and gaining immunity to all damage and negative effects. You cannot move or take any other actions while channeling.',
          morphs: [
            {
              name: 'Deep Thoughts',
              cost: '1080 Health, Magicka, and Stamina per second',
              target: 'Self',
              channelTime: '6 seconds',
              description:
                'Focus your body and mind into a meditative trance, healing yourself for 1800 Health every 1 second for 6 seconds and gaining immunity to all damage and negative effects. For each second you channel, you gain 8 Ultimate. You cannot move or take any other actions while channeling.',
            },
            {
              name: 'Introspection',
              cost: '1080 Health per second',
              target: 'Self',
              channelTime: '6 seconds',
              description:
                'Focus your body and mind into a meditative trance, healing yourself for 1800 Health every 1 second for 6 seconds and gaining immunity to all damage and negative effects. For each second you channel, you gain 200 Magicka and 200 Stamina Recovery for 10 seconds. You cannot move or take any other actions while channeling.',
            },
          ],
        },
        {
          name: 'Race Against Time',
          cost: '4590 Magicka',
          target: 'Self',
          duration: '30 seconds',
          description:
            'Anchor yourself to the timeline, gaining Major Expedition and Major Force for 30 seconds, increasing your Movement Speed by 30% and Critical Damage done by 10%. You also become immune to all immobilization and snare effects.',
          morphs: [
            {
              name: 'Channeled Acceleration',
              cost: '4590 Magicka',
              target: 'Self',
              duration: '30 seconds',
              description:
                'Anchor yourself to the timeline, gaining Major Expedition and Major Force for 30 seconds, increasing your Movement Speed by 30% and Critical Damage done by 10%. You also become immune to all immobilization and snare effects. While slotted on either ability bar, your Spell and Weapon Critical rating is increased by 438.',
            },
            {
              name: 'Accelerate',
              cost: '4050 Magicka',
              target: 'Self',
              duration: '30 seconds',
              description:
                'Anchor yourself to the timeline, gaining Major Expedition and Major Force for 30 seconds, increasing your Movement Speed by 30% and Critical Damage done by 10%. You also become immune to all immobilization and snare effects for the first 6 seconds.',
            },
          ],
        },
        {
          name: 'Mend Wounds',
          cost: '4590 Magicka',
          target: 'Ally',
          channelTime: '3 seconds',
          maxRange: '28 meters',
          description:
            'Channel to heal yourself or an ally for 3600 Health over 3 seconds. You can move while channeling, but at 50% reduced speed.',
          morphs: [
            {
              name: 'Mend Spirit',
              cost: '4590 Magicka',
              target: 'Ally',
              channelTime: '3 seconds',
              maxRange: '28 meters',
              description:
                'Channel to heal yourself or an ally for 3600 Health and restore 2400 Magicka and Stamina over 3 seconds. You can move while channeling, but at 50% reduced speed.',
            },
            {
              name: 'Symbiosis',
              cost: '4590 Magicka',
              target: 'Ally',
              channelTime: '3 seconds',
              maxRange: '28 meters',
              description:
                'Channel to heal yourself or an ally for 3600 Health over 3 seconds. You are also healed for 50% of the amount. You can move while channeling, but at 50% reduced speed.',
            },
          ],
        },
      ],
      ultimates: [
        {
          name: 'Rite of Passage',
          cost: '200 Ultimate',
          target: 'Area',
          channelTime: '8 seconds',
          radius: '28 meters',
          description:
            'Channel for 8 seconds to create a portal for you and your allies, healing for 2160 Health every 2 seconds and reducing damage taken by 75%. You can move while channeling, but you cannot sprint or use other abilities. The portal moves with you and affects up to 6 allies.',
          morphs: [
            {
              name: 'Practiced Incantation',
              cost: '200 Ultimate',
              target: 'Area',
              channelTime: '8 seconds',
              radius: '28 meters',
              description:
                'Channel for 8 seconds to create a portal for you and your allies, healing for 2232 Health every 2 seconds and reducing damage taken by 75%. For each ally affected, you gain 8 Ultimate per tick. You can move while channeling, but you cannot sprint or use other abilities. The portal moves with you and affects up to 6 allies.',
            },
            {
              name: 'Safe Passage',
              cost: '200 Ultimate',
              target: 'Area',
              channelTime: '8 seconds',
              radius: '28 meters',
              description:
                'Channel for 8 seconds to create a portal for you and your allies, healing for 2160 Health every 2 seconds and reducing damage taken by 75%. At the end of the channel, you and affected allies gain immunity to all damage and negative effects for 3 seconds. You can move while channeling, but you cannot sprint or use other abilities. The portal moves with you and affects up to 6 allies.',
            },
          ],
        },
      ],
    },
  },
};
