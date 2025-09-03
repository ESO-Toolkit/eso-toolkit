import { SkillsetData } from '../../skillsets/Skillset';

export const darkBrotherhoodData: SkillsetData = {
  weapon: 'Dark Brotherhood',
  skillLines: {
    darkBrotherhood: {
      name: 'Dark Brotherhood',
      icon: '🗡️',
      passives: [
        {
          name: 'Apprentice Assassin',
          description: 'Allows you to assassinate innocents.',
          requirement: '',
        },
        {
          name: 'Seasoned Assassin',
          description: 'Decreases the delay before you can assassinate someone by 50%.',
          requirement: '',
        },
        {
          name: 'Shadow Rider',
          description: 'Reduces the radius guards can detect you while mounted by 50%.',
          requirement: '',
        },
        {
          name: 'Padomaic Sprint',
          description:
            'Reduces the bounty from assault, murder, and theft by 64 and allows you to flee on foot 50% longer before guards give up their chase.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Blade of Woe',
          cost: '0',
          target: 'Enemy',
          description:
            'Allows you to assassinate innocent NPCs when sneaking behind them. This ability becomes available after completing the Dark Brotherhood quest line.',
          morphs: [],
        },
      ],
      ultimates: [],
    },
  },
};
