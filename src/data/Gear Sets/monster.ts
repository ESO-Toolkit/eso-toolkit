import { SkillsetData } from '../skillsets/Skillset';

export const balorghData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    balorgh: {
      name: 'Balorgh',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Weapon and Spell Damage', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you use an Ultimate ability, gain Weapon and Spell Damage equal to twice the amount of Ultimate spent and Physical and Spell Penetration equal to 23 times the amount for 12 seconds.',
          requirement: 'Use Ultimate ability',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const bloodspawnData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    bloodspawn: {
      name: 'Bloodspawn',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, you have a 6% chance to generate 13 Ultimate and increase Physical and Spell Resistance by 3306 for 5 seconds. This effect can occur every 5 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const chokethornData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    chokethorn: {
      name: 'Chokethorn',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you use a healing ability, you have a 15% chance to summon a strangler that heals you or an ally for 2313 Health every 1 second for 6 seconds. This effect can occur once every 10 seconds.',
          requirement: 'Use healing ability',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const domihausData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    domihaus: {
      name: 'Domihaus',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description: 'Adds 1096 Maximum Stamina. Adds 1096 Maximum Magicka.',
          requirement: '',
        },
        {
          name: '(2 items)',
          description:
            'When you deal damage, you create a ring for 10 seconds, dealing 2350 Flame Damage and 2350 Physical Damage every 1 second. Standing in the ring grants you 300 Weapon and Spell Damage. This effect can occur once every 15 seconds.',
          requirement: 'Deal damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const earthgoreData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    earthgore: {
      name: 'Earthgore',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 4% Healing Done', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you heal yourself or an ally under 50% Health, create a blood geyser that restores 11230 Health to them and nearby allies in a 6 meter radius. This effect can occur once every 20 seconds.',
          requirement: 'Heal under 50% Health',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const engineGuardianData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    engineGuardian: {
      name: 'Engine Guardian',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Health Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you use an ability that costs resources, summon a dwemer automation for 6 seconds that restores 550 Health, Magicka, or Stamina every 0.5 seconds. This effect can occur every 10 seconds.',
          requirement: 'Use an ability costing resources',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const encratisBehemothData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    encratisBehemoth: {
      name: "Encratis's Behemoth",
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Dealing Fire Damage grants you and 11 group members Minor Courage, increasing Weapon and Spell Damage by 215, or Minor Endurance, increasing Stamina Recovery by 129 for 10 seconds (depending if the target was ally or self, respectively). Effect can occur once every 12 seconds.',
          requirement: 'Deal Fire Damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const euphoticGatekeeperData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    euphoticGatekeeper: {
      name: 'Euphotic Gatekeeper',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'After completing a Fully-Charged Heavy Attack, create a pool that increases Stamina and Magicka Recovery by 300 and heals you and allies for 2323 Health every 1 second for 20 seconds. This effect can occur every 10 seconds.',
          requirement: 'Fully-Charged Heavy Attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const falgravnData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    falgravn: {
      name: 'Falgravn',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 4% Healing Taken', requirement: '' },
        {
          name: '(2 items)',
          description:
            'While in combat, if you or an ally falls below 50% Health, gain Major Aegis, reducing your damage taken by 10% for 8 seconds. This effect can occur once every 16 seconds.',
          requirement: 'Ally or self below 50% Health in combat',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const glorgolochTheDestroyerData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    glorgolochTheDestroyer: {
      name: 'Glorgoloch the Destroyer',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you Block, summon a field for 5 seconds, granting you and up to 3 allies a shield that absorbs 3582 damage. This can occur once every 10 seconds.',
          requirement: 'Block',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const grothdarrData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    grothdarr: {
      name: 'Grothdarr',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage in a 8 meter radius, create Lava Pools for 5 seconds, dealing 880 Flame Damage every 1 second to all enemies inside. This can occur once every 10 seconds and scales off your Max Magicka.',
          requirement: 'Deal area damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const iceheartData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    iceheart: {
      name: 'Iceheart',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 657 Critical Chance', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal Critical Damage, gain a damage shield that absorbs 5000 damage for 6 seconds and deal 800 Frost Damage to nearby enemies every 1 second for 6 seconds. This effect can occur once every 6 seconds.',
          requirement: 'Deal Critical Damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ilambrisData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    ilambris: {
      name: 'Ilambris',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal Flame or Shock Damage, you have a 33% chance to summon a meteor shower that deals 1341 Flame and 1341 Shock Damage to enemies within 4 meters every 1 second for 3 seconds. This can occur once every 8 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Deal Flame or Shock damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const kjalnarsNightmareData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    kjalnarsNightmare: {
      name: "Kjalnar's Nightmare",
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 657 Critical Chance', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Dealing damage when you are under 50% Health summons a Skeletal Dragon that fears nearby enemies for 5 seconds and deals 862 Magic Damage every 1 second for 5 seconds. This effect can occur every 10 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Deal damage under 50% Health',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ladyMalygdaData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    ladyMalygda: {
      name: 'Lady Malygda',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Offensive Penetration', requirement: '' },
        {
          name: '(2 items)',
          description:
            'After breaking free, gain Galvanize for 8 seconds, causing your Light and Heavy Attacks to drain 855 Stamina from enemies hit. This can occur once every 16 seconds.',
          requirement: 'Break free',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ladyThornData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    ladyThorn: {
      name: 'Lady Thorn',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Casting an ability that costs Health spawns a blood ball for 10 seconds, granting Major Vitality to group members who touch it. This can occur every 10 seconds.',
          requirement: 'Use Health-costing ability',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const leechingPlateMonsterData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    leechingPlateMonster: {
      name: 'Leeching Plate (Monster)',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, you have a 20% chance to summon a cloud of leeching poison beneath the attacker, dealing 853 Poison Damage every 1 second for 5 seconds and healing you for 100% of the damage caused. This can occur once every 5 seconds and scales off your Max Health.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const lordWardenData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    lordWarden: {
      name: 'Lord Warden',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description: 'Adds 2975 Spell and Physical Resistance',
          requirement: '',
        },
        {
          name: '(2 items)',
          description:
            'When you take damage, summon a shadow orb for 10 seconds that increases Spell and Physical Resistance for you and allies within 8 meters by 3180. This can occur once every 10 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const maarselokData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    maarselok: {
      name: 'Maarselok',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you bash an enemy, you spew a cone of corruption, dealing 941 Disease Damage to enemies over 5 seconds. The damage increases per enemy hit, up to 6 times. After 5 seconds, inflict Major Defile for 4 seconds. This effect can occur every 7 seconds and scales off your Max Stamina.',
          requirement: 'Bash an enemy',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const magmaIncarnateData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    magmaIncarnate: {
      name: 'Magma Incarnate',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description: 'Adds 129 Magicka Recovery. Adds 129 Stamina Recovery.',
          requirement: '',
        },
        {
          name: '(2 items)',
          description:
            'When you heal yourself or a group member with a single-target heal, grant Minor Courage and Minor Resolve to yourself and the group member healed for 10 seconds. This effect can occur once every 10 seconds per target.',
          requirement: 'Heal with single-target heal',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const malubethTheScourgerData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    malubethTheScourger: {
      name: 'Malubeth the Scourger',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 4% Healing Taken', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, you have a 6% chance to summon a beam that steals 4926 Health over 3 seconds from the attacker. This effect can occur once every 6 seconds and scales off your Max Health.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const mawOfTheInfernalData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    mawOfTheInfernal: {
      name: 'Maw of the Infernal',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Magicka', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with a Light or Heavy Attack, you have a 33% chance to summon a Daedroth for 15 seconds that attacks for 585 Flame Damage and breathes fire for 575 Flame Damage every 2 seconds. This effect can occur once every 15 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Deal Light or Heavy Attack damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const mightyChudanData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    mightyChudan: {
      name: 'Mighty Chudan',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Gain Major Resolve and Major Ward at all times, increasing your Physical and Spell Resistance by 5948.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const molagKenaData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    molagKena: {
      name: 'Molag Kena',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Weapon and Spell Damage', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with two consecutive Light Attacks, gain Overkill for 6 seconds, increasing Weapon and Spell Damage by 516 but increasing the cost of your abilities by 20%. This effect can occur once every 9 seconds.',
          requirement: 'Two consecutive Light Attacks',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const nightflameData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    nightflame: {
      name: 'Nightflame',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you heal an ally, summon a totem for 6 seconds that heals you and allies for 4326 Health every 1 second. This effect can occur once every 10 seconds and scales off your Max Magicka.',
          requirement: 'Heal an ally',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const nurcruxData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    nurcrux: {
      name: 'Nurcrux',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Dealing Critical Damage grants 5 Ultimate. This effect can occur once every 15 seconds.',
          requirement: 'Deal Critical Damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const overlordData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    overlord: {
      name: 'Overlord',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, gain a damage shield that absorbs 6000 damage for 6 seconds. This effect can occur once every 10 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const pirateSkeletonData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    pirateSkeleton: {
      name: 'Pirate Skeleton',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, you have a 6% chance to gain Major Protection for 3 seconds, reducing damage taken by 10%, but also become a Skeleton, reducing your Healing Received by 25%. This effect can occur once every 15 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const rogsAcquiescenceData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    rogsAcquiescence: {
      name: "Rogg's Acquiescence",
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Blocking an attack grants you and 3 group members Minor Resolve, increasing Physical and Spell Resistance by 2974 for 6 seconds. This effect can occur once every 13 seconds.',
          requirement: 'Block an attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const sanguineAltarData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    sanguineAltar: {
      name: 'Sanguine Altar',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Health Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you heal yourself or an ally, grant Major Vitality to yourself or that ally for 4 seconds, increasing Healing Received by 16%. This effect can occur every 6 seconds per target.',
          requirement: 'Heal self or ally',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const seleneData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    selene: {
      name: 'Selene',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal direct melee damage, you have a 15% chance to call a primal spirit that mauls the closest enemy in front of you for 13364 Physical Damage. This effect can occur once every 8 seconds and scales off your Max Stamina.',
          requirement: 'Direct melee damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const shadowrendData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    shadowrend: {
      name: 'Shadowrend',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, summon a shadowy Clannfear for 15 seconds. The Clannfear attacks for 1550 Magic Damage every 2 seconds and heals you for 100% of the damage it deals. This effect can occur once every 15 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const spawnOfMephalaData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    spawnOfMephala: {
      name: 'Spawn of Mephala',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with a fully-charged Heavy Attack, create a web under the target that deals 1340 Poison Damage over 10 seconds to all enemies within 4 meters. This effect can occur once every 10 seconds and scales off your Max Stamina.',
          requirement: 'Fully-charged Heavy Attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const stormfistData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    stormfist: {
      name: 'Stormfist',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage, you have a 10% chance to summon a thunderfist to pulverize enemies in front of you after 1 second for 912 Shock Damage and an additional 1540 Physical Damage over 2 seconds. This effect can occur once every 8 seconds and scales off your Max Stamina.',
          requirement: 'Deal damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const swampMotherData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    swampMother: {
      name: 'Swamp Mother',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with a fully-charged Heavy Attack, you and up to 2 allies gain Major Brutality and Major Sorcery for 10 seconds, increasing your Weapon and Spell Damage by 20%. This effect can occur every 10 seconds.',
          requirement: 'Fully-charged Heavy Attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const symphonyOfBladesData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    symphonyOfBlades: {
      name: 'Symphony of Blades',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 4% Healing Done', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you heal an ally who is under 50% of their primary resource, grant them Meridia’s Favor for 6 seconds, restoring 570 Magicka or Stamina every 1 second. This effect can occur every 18 seconds per target.',
          requirement: 'Heal ally under 50% resource',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const templarGuardianData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    templarGuardian: {
      name: 'Templar Guardian',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you use an ability that grants a damage shield, gain Minor Mending for 10 seconds, increasing your Healing Done by 8%. This effect can occur once every 10 seconds.',
          requirement: 'Apply damage shield',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const theTrollKingData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    theTrollKing: {
      name: 'The Troll King',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 4% Healing Done', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Healing an ally grants them Minor Mending, increasing Healing Done by 8% for 3 seconds. If you heal an ally under 50% Health, their Health Recovery is increased by 925 for 10 seconds. This effect can occur once every 10 seconds.',
          requirement: 'Heal an ally',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const tremorscaleData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    tremorscale: {
      name: 'Tremorscale',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with a Taunt ability, summon a duneripper that deals 1040 Physical Damage to all enemies within 4 meters and reduces their Physical Resistance by 2395 for 8 seconds. This effect can occur every 8 seconds and scales off your Max Stamina.',
          requirement: 'Deal damage with Taunt',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const twoFangedSnakeData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    twoFangedSnake: {
      name: 'Two-Fanged Snake',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Weapon Damage', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage, increase your Physical Penetration by 1000 and Spell Penetration by 1000 for 5 seconds, stacking up to 5 times.',
          requirement: 'Deal damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const unchainedAggressorData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    unchainedAggressor: {
      name: 'Unchained Aggressor',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Stamina Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you use Break Free, gain Major Berserk and Major Protection for 12 seconds, increasing your damage done by 10% and reducing your damage taken by 10%. This effect can occur once every 16 seconds.',
          requirement: 'Break Free',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const urgalargChiefBanesData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    urgalargChiefBane: {
      name: 'Urgalarg Chief-bane',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you inflict a status effect, instantly restore 500 Magicka. This effect can occur once every 4 seconds and scales off your Max Magicka.',
          requirement: 'Inflict status effect',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const velidrethData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    velidreth: {
      name: 'Velidreth',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Weapon and Spell Damage', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage, you have a 20% chance to spawn three disease spores in front of you after 1 second that deal 1685 Disease Damage to any enemy they hit. This effect can occur once every 8 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Deal damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const viperSetData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    viperSet: {
      name: "Viper's Sting (Monster)",
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Offensive Penetration', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal melee damage, you have a 33% chance to inflict Poison on the enemy, dealing 4000 Poison Damage over 4 seconds. This effect can occur once every 4 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Deal melee damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const vykosaData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    vykosa: {
      name: 'Vykosa',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you block an attack, grant you and five group members Minor Protection for 6 seconds, reducing your damage taken by 5%. This effect can occur once every 12 seconds.',
          requirement: 'Block an attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const zaanData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    zaan: {
      name: 'Zaan',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 657 Spell Critical', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Dealing Critical Damage with a Light or Medium attack creates a beam dealing 344 Flame Damage every 0.5s to your target for 6s. Beam breaks if target moves 10m away. This effect can occur every 18 seconds and scales off your highest Weapon or Spell Damage.',
          requirement: 'Critical Damage with Light/Medium Attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const zoalTheEverWakefulData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    zoalTheEverWakeful: {
      name: 'Zoal the Ever-Wakeful',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you interrupt an enemy, you reflect their next damaging projectile back at them within 5 seconds. This effect can occur once every 10 seconds.',
          requirement: 'Interrupt an enemy',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const baronThirskData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    baronThirsk: {
      name: 'Baron Thirsk',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take area damage, create a field for 5s reducing damage taken by 10% for you and up to 3 allies. Effect can occur every 10 seconds.',
          requirement: 'Take area damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const glirionData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    glirion: {
      name: 'Glirion the Redbeard',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Offensive Penetration', requirement: '' },
        {
          name: '(2 items)',
          description:
            'After using a gap closer, gain Major Evasion for 8 seconds, reducing damage from area attacks by 20%. Can occur every 8 seconds.',
          requirement: 'Use gap closer',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const ladyBelainData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    ladyBelain: {
      name: 'Lady Belain',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Magicka Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'After dodging an attack, gain a damage shield that absorbs 5000 damage for 6s. This effect can occur every 10 seconds.',
          requirement: 'Dodge an attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const chudanData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    chudan: {
      name: 'Chudan',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1487 Armor', requirement: '' },
        {
          name: '(2 items)',
          description:
            'Gain Major Resolve at all times, increasing your Physical and Spell Resistance by 5948.',
          requirement: 'Equipped',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const sellistrixData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    sellistrix: {
      name: 'Sellistrix',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1096 Maximum Stamina', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage, you have a 10% chance to create an earthquake under the enemy that erupts after 1.5 seconds, dealing 9000 Shock Damage to all enemies within 4 meters. This effect can occur once every 5 seconds and scales off your Max Stamina.',
          requirement: 'Deal damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const stonekeeperData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    stonekeeper: {
      name: 'Stonekeeper',
      icon: '',
      passives: [
        {
          name: '(1 item)',
          description:
            'Adds 548 Maximum Stamina, Adds 548 Maximum Magicka, Adds 603 Maximum Health',
          requirement: '',
        },
        {
          name: '(2 items)',
          description:
            'When you block an attack, you gain a stack of Stone’s Blessing for 10 seconds, allowing your next Heavy Attack to restore 535 Stamina and Magicka. After gaining 6 stacks, you restore 4285 Health. This effect can occur every 10 seconds.',
          requirement: 'Block an attack',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const stranglerData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    strangler: {
      name: 'Strangler',
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 129 Health Recovery', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you deal damage with a Light Attack, you have a 10% chance to apply Minor Maim to the enemy for 5 seconds, reducing their damage done by 5%. This effect can occur once every 10 seconds.',
          requirement: 'Deal Light Attack damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};

export const syvarraScalesData: SkillsetData = {
  weapon: 'Monster',
  skillLines: {
    syvarraScales: {
      name: "Syvarra's Scales",
      icon: '',
      passives: [
        { name: '(1 item)', description: 'Adds 1206 Maximum Health', requirement: '' },
        {
          name: '(2 items)',
          description:
            'When you take damage, you release a burst of scales, dealing 1542 Poison Damage to enemies within 8 meters every 3 seconds for 6 seconds. This effect can occur once every 10 seconds.',
          requirement: 'Take damage',
        },
      ],
      actives: [],
      ultimates: [],
    },
  },
};
