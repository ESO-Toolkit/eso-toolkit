import { SkillsetData } from '../skillsets/Skillset';

// Wretched Vitality
export const wretchedVitalityLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    wretchedVitality: {
      name: 'Wretched Vitality',
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        { name: '(3 items)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        { name: '(4 items)', description: 'Adds 129 Weapon and Spell Damage', requirement: '' },
        {
          name: '(5 items)',
          description:
            'While in combat, applying a Major Buff/Debuff with a duration to a target grants you 260 Magicka and Stamina Recovery for 15s. Applying a Minor Buff/Debuff grants 130 Magicka and Stamina Recovery for 15s.',
          requirement: '',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const wretchedVitalityMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: wretchedVitalityLightData.skillLines,
};
export const wretchedVitalityHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: wretchedVitalityLightData.skillLines,
};

// Trainee
export const traineeLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    trainee: {
      name: 'Armor of the Trainee',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1454 Maximum Health', requirement: '' },
        { name: '(2 items)', description: 'Adds 1454 Maximum Magicka', requirement: '' },
        { name: '(3 items)', description: 'Adds 1454 Maximum Stamina', requirement: '' },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const traineeMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: traineeLightData.skillLines,
};
export const traineeHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: traineeLightData.skillLines,
};

// Twice-Born Star
export const twiceBornStarLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    twiceBornStar: {
      name: 'Twice-Born Star',
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 1206 Maximum Health', requirement: '' },
        { name: '(3 items)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        { name: '(4 items)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(5 items)',
          description: 'You can have two Mundus Stone boons at the same time.',
          requirement: '',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const twiceBornStarMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: twiceBornStarLightData.skillLines,
};
export const twiceBornStarHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: twiceBornStarLightData.skillLines,
};

// Shacklebreaker
export const shacklebreakerLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    shacklebreaker: {
      name: 'Shacklebreaker',
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        { name: '(3 items)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        { name: '(4 items)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(5 items)',
          description: 'Adds 1096 Maximum Stamina and 200 Weapon and Spell Damage.',
          requirement: '',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const shacklebreakerMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: shacklebreakerLightData.skillLines,
};
export const shacklebreakerHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: shacklebreakerLightData.skillLines,
};

// Clever Alchemist
export const cleverAlchemistLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    cleverAlchemist: {
      name: 'Clever Alchemist',
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 1206 Maximum Health', requirement: '' },
        { name: '(3 items)', description: 'Adds 1206 Maximum Health', requirement: '' },
        { name: '(4 items)', description: 'Adds 129 Weapon and Spell Damage', requirement: '' },
        {
          name: '(5 items)',
          description:
            'Drinking a potion during combat increases Weapon and Spell Damage by 675 for 20s.',
          requirement: 'Potion in combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const cleverAlchemistMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: cleverAlchemistLightData.skillLines,
};
export const cleverAlchemistHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: cleverAlchemistLightData.skillLines,
};

// Law of Julianos
export const julianosLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    julianos: {
      name: 'Law of Julianos',
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 657 Critical Chance', requirement: '' },
        { name: '(3 items)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        { name: '(4 items)', description: 'Adds 657 Critical Chance', requirement: '' },
        { name: '(5 items)', description: 'Adds 300 Weapon and Spell Damage.', requirement: '' },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const julianosMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: julianosLightData.skillLines,
};
export const julianosHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: julianosLightData.skillLines,
};

// Hunding's Rage
export const hundingsRageLightData: SkillsetData = {
  weapon: 'Light Armor',
  skillLines: {
    hundingsRage: {
      name: "Hunding's Rage",
      icon: '',
      passives: [
        { name: '(2 items)', description: 'Adds 657 Critical Chance', requirement: '' },
        { name: '(3 items)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        { name: '(4 items)', description: 'Adds 657 Critical Chance', requirement: '' },
        { name: '(5 items)', description: 'Adds 300 Weapon and Spell Damage.', requirement: '' },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
export const hundingsRageMediumData: SkillsetData = {
  weapon: 'Medium Armor',
  skillLines: hundingsRageLightData.skillLines,
};
export const hundingsRageHeavyData: SkillsetData = {
  weapon: 'Heavy Armor',
  skillLines: hundingsRageLightData.skillLines,
};
