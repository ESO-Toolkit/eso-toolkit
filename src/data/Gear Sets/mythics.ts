import { SkillsetData } from '../skillsets/Skillset';

export const oakensoulRingData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    oakensoulRing: {
      name: 'Oakensoul Ring',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While equipped, gain Major Courage, Major Brutality, Major Sorcery, Major Prophecy, Major Savagery, Major Resolve, Major Fortitude, Major Intellect, Major Endurance, Minor Protection, Minor Force, Minor Heroism, Minor Mending and Empower at all times, but lose the ability to swap weapon sets.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ringOfPaleOrderData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    ringOfPaleOrder: {
      name: 'Ring of the Pale Order',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Restore 20% of the damage you deal as Health, up to a cap, but you cannot be healed by anyone but yourself.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const markynRingOfMajestyData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    markynRingOfMajesty: {
      name: 'Markyn Ring of Majesty',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain 100 Weapon and Spell Damage and 1157 Armor for each set you are wearing for which you have at least 3 set pieces equipped.',
          requirement: 'Equipped, set piece count',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const seaSerpentsCoilData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    seaSerpentsCoil: {
      name: 'Sea-Serpent’s Coil',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            "While at full Health, increase your damage done by 10% but take 10% more damage. After taking damage, gain Serpent's Rebuke for 10 seconds which removes the damage and damage taken bonus and grants Major Expedition and Major Protection for the duration.",
          requirement: 'Equipped, Health state',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const deathDealersFeteData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    deathDealersFete: {
      name: 'Death Dealer’s Fete',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain a persistent stack of Escalating Fete every 2 seconds you are in combat, up to 30 stacks max. Each stack increases your Maximum Stamina, Magicka, and Health by 88.',
          requirement: 'Combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const gazeOfSithisData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    gazeOfSithis: {
      name: 'Gaze of Sithis',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain 3276 Armor, 10206 Maximum Health, and 1000 Health Recovery, but you cannot block.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const pearlsOfEhlnofeyData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    pearlsOfEhlnofey: {
      name: 'Pearls of Ehlnofey',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'When you attempt to cast a healing ability while under 25% Magicka, restore 1168 Magicka. Can occur once every 30 seconds.',
          requirement: 'Attempt heal under 25% Magicka',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const faunsLarkCladdingData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    faunsLarkCladding: {
      name: 'Faun’s Lark Cladding',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain 10% damage reduction, but lose 6575 Block Mitigation and cannot be snared or immobilized while blocking.',
          requirement: 'Blocking',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const thrassianStranglersData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    thrassianStranglers: {
      name: 'Thrassian Stranglers',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Killing an enemy grants a stack of Sload’s Call, increasing your Spell Damage by 150, but reduces your maximum Health by 1200 and can stack up to 20 times. Lose 1 stack every 5 seconds while out of combat.',
          requirement: 'Kill enemy',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const shapeshiftersChainData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    shapeshiftersChain: {
      name: "Shapeshifter's Chain",
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While you are transformed into a Werewolf or other shape-changing Ultimate, increase your Maximum Magicka, Stamina, and Health by 1200.',
          requirement: 'Shapeshifted',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ringOfTheWildHuntData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    ringOfTheWildHunt: {
      name: 'Ring of the Wild Hunt',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Increases your movement speed by 15%. While out of combat, increases it by an additional 45%.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const torcOfTonalConstancyData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    torcOfTonalConstancy: {
      name: 'Torc of Tonal Constancy',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While your Stamina is below 50%, increase Magicka Recovery by 450. While your Magicka is below 50%, increase Stamina Recovery by 450.',
          requirement: 'Below 50% resource',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const thrassianStranglersVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    thrassianStranglers: {
      name: 'Thrassian Stranglers',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Killing an enemy grants a stack of Sload’s Call, increasing your Spell Damage by 150 and reducing your Maximum Health by 1200, stacking up to 20 times. Lose 1 stack every 5 seconds while out of combat.',
          requirement: 'Kill enemy',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const spaulderOfRuinData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    spaulderOfRuin: {
      name: 'Spaulder of Ruin',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Casting Roll Dodge causes you to emit a burst of energy granting Major Courage for 20 seconds, increasing Weapon and Spell Damage by 430 to you and allies within 12 meters, but reduces your and their damage done by 10%.',
          requirement: 'Roll Dodge',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const syrabanesWardData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    syrabanesWard: {
      name: "Syrabane's Ward",
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Rolling Dodge grants you an 8 meter radius ward for 10 seconds that increases your Block Mitigation by 30%. 10 second cooldown.',
          requirement: 'Roll Dodge',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const dovRhaSabatonsData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    dovRhaSabatons: {
      name: 'Dov-rha Sabatons',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'When you use Sprint, deal 660 Shock Damage to all enemies in a line in front of you every 1 second and gain Major Expedition for 1 second per Sprint tick. Damage scales off your highest offensive stat. 15 second cooldown.',
          requirement: 'Use Sprint',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const altarsOfCelestialConvergenceData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    altarsOfCelestialConvergence: {
      name: 'Altar of Celestial Convergence',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Standing still in combat grants Celestial Convergence after 4 seconds, increasing your Weapon and Spell Critical by 800 and reducing damage taken by 8%. Moving removes the effect. 20 second cooldown after moving.',
          requirement: 'Stand still in combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const velothiUrMagesAmuletData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    velothiUrMagesAmulet: {
      name: "Velothi Ur-Mage's Amulet",
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Adds 3000 Maximum Magicka and increases your damage done with class abilities by 15%, but reduces your damage done with non-class abilities by 10%.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const pearlsOfEhlnofeyVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    pearlsOfEhlnofey: {
      name: 'Pearls of Ehlnofey',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'When you attempt to cast a healing ability while under 25% Magicka, restore 1168 Magicka. This effect can occur once every 30 seconds.',
          requirement: 'Attempt to heal under 25% Magicka',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const altarOfCelestialConvergenceVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    altarOfCelestialConvergence: {
      name: 'Altar of Celestial Convergence',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While standing still in combat for 4 seconds, gain 800 Critical Chance and reduce damage taken by 8%. Moving removes effect and prevents reactivation for 20 seconds.',
          requirement: 'Stand still in combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const zensRedressData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    zensRedress: {
      name: "Z'en's Redress",
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Your Light Attacks, Heavy Attacks, and abilities that deal damage over time apply a stack of Zen’s Redress, reducing the target’s damage done to you by 1% per stack up to 5%, for 6 seconds. Each stack can only be applied every 1 second.',
          requirement: 'Deal DoT or Light/Heavy Attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const malacathsBandOfBrutalityData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    malacathsBandOfBrutality: {
      name: "Malacath's Band of Brutality",
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description: 'Increase your damage done by 16% but you cannot deal critical damage.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const deathDealersFeteVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    deathDealersFete: {
      name: 'Death Dealer’s Fete',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain a persistent stack of Escalating Fete every 2 seconds you are in combat, up to 30 stacks max. Each stack increases your Maximum Stamina, Magicka, and Health by 88.',
          requirement: 'In combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const shapeshiftersChainFullData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    shapeshiftersChain: {
      name: 'Shapeshifter’s Chain',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While you are transformed, increases your Maximum Stamina and Magicka by 1200.',
          requirement: 'Transformed',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const spaulderOfRuinVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    spaulderOfRuin: {
      name: 'Spaulder of Ruin',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'While crouching, you grant up to 6 group members Major Courage, increasing their Weapon and Spell Damage by 430, but reduce your Weapon and Spell Damage by 430.',
          requirement: 'While crouching',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const gazeOfSithisVerifiedData: SkillsetData = {
  weapon: 'Mythic',
  skillLines: {
    gazeOfSithis: {
      name: 'Gaze of Sithis',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Gain 3276 Armor, 10206 Maximum Health, and 1000 Health Recovery, but you cannot block.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
