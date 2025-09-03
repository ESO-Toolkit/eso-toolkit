import { SkillsetData } from '../../skillsets/Skillset';

export const thievesGuildData: SkillsetData = {
  weapon: 'Thieves Guild',
  skillLines: {
    thievesGuild: {
      name: 'Thieves Guild',
      icon: '🗡️',
      passives: [
        {
          name: 'Finders Keepers',
          description: 'Increases your chance to successfully pickpocket by 10%.',
          requirement: '',
        },
        {
          name: 'Swiftly Forgotten',
          description:
            'Reduces the time it takes for your bounty to naturally decay while you are online by 115 seconds per stage.',
          requirement: '',
        },
        {
          name: 'Haggling',
          description: 'Reduces the cost of bribing guards by 10%.',
          requirement: '',
        },
        {
          name: 'Clemency',
          description: 'Reduces the bounty gained from witnessed crimes by 50%.',
          requirement: '',
        },
        {
          name: 'Timely Escape',
          description:
            'Reduces the radius that guards can detect you while you have a bounty by 10%.',
          requirement: '',
        },
      ],
      actives: [
        {
          name: 'Clemency',
          cost: '0',
          target: 'Self',
          cooldown: '3 minutes',
          description:
            'Reduces your bounty to zero. This ability can only be used once every 3 minutes.',
          morphs: [],
        },
      ],
      ultimates: [],
    },
  },
};
