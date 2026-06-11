import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const werewolf: SkillLineData = {
  id: 0,
  name: 'Werewolf',
  class: 'world',
  category: 'world',
  icon: 'ability_werewolf_001',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.WEREWOLF_TRANSFORMATION,
      name: 'Werewolf Transformation',
      icon: 'ability_werewolf_001',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds.\n\nWhile transformed and in combat, abilities generate 15 Fury. When you have 1000, this ability becomes Rampage, which increases your damage done by 15%, Movement Speed by 20%, and removes the cost of all Werewolf abilities for 20 seconds.\n\nWhile slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39075, // Morph of Werewolf Transformation
      name: 'Pack Leader',
      icon: 'ability_werewolf_001_a',
      description:
        'Transform into an imposing beast, fearing nearby enemies for 3 seconds.\n\nYou also gain Major Protection, 15% increased Block Mitigation, and you and group members gain Minor Courage.\n\nYou summon two direwolves that deal 103 Physical Damage twice or 555 Physical Damage once every 2 seconds.\n\nWhile transformed in combat, abilities generate Fury. When you have 1000, this ability becomes Enduring Rampage, which gains 4000 Health Recovery in addition to its base effects.\n\nWhile slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39076, // Morph of Werewolf Transformation
      name: 'Werewolf Berserker',
      icon: 'ability_werewolf_001_b',
      description:
        'Transform into a berserk beast, fearing nearby enemies for 3 seconds.\n\nWhile transformed, you gain Major Berserk and your Light Attacks and Heavy Attacks apply a bleed for 1390 Bleed Damage over 4 seconds, or 695 Bleed Damage after 1 second against players.\n\nWhile transformed and in combat, abilities generate Fury. When you have 1000, this ability becomes Rampage, which increases your damage done, Movement Speed, and removes the cost of Werewolf abilities for 20 seconds.\n\nWhile slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    // Active Abilities - Pounce Line
    {
      id: AbilityId.POUNCE,
      name: 'Pounce',
      icon: 'ability_werewolf_002',
      description:
        'Pounce on an enemy with primal fury, dealing 1616 Bleed Damage and applying the Hemorrhaging status effect.\n\nWhen you are 7 meters or closer this ability becomes Carnage, which causes you to rip into an enemy and deal 1701 Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39105, // Morph of Pounce
      name: 'Brutal Pounce',
      icon: 'ability_werewolf_002_b',
      description:
        'Pounce on an enemy with primal fury, dealing 1669 Bleed Damage and applying the Hemorrhaging status effect to all nearby enemies.\n\nWhen you are 7 meters or closer this ability becomes Brutal Carnage, which causes you to rip into all enemies in front of you to deal 1764 Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health. The duration increases by 10 seconds if cast on the same enemy multiple times.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39104, // Morph of Pounce
      name: 'Feral Pounce',
      icon: 'ability_werewolf_002_a',
      description:
        'Pounce on an enemy with primal fury, dealing 1616 Bleed Damage and applying the Hemorrhaging status effect.\n\nWhen you are 7 meters or closer this ability becomes Feral Carnage, which causes you to rip into an enemy and deal 1708 Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health.\n\nDealing damage with either ability restores 200 Stamina and triggers Fury generation.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Hircine's Bounty Line
    {
      id: AbilityId.HIRCINES_BOUNTY,
      name: "Hircine's Bounty",
      icon: 'ability_werewolf_004_a',
      description:
        "Invoke the Huntsman's blessing, healing you for 5701 Health, scaling off your Max Health. You also restore 10% Stamina, increasing by up to 100% based on how high your current Health is.\n\nWhile slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58325, // Morph of Hircine's Bounty
      name: "Hircine's Fortitude",
      icon: 'ability_werewolf_004_c',
      description:
        "Invoke the Huntsman's blessing, healing you for 6478 Health, scaling off your Max Health. You also restore 12% Stamina, increasing by up to 100% based on how high your current Health is.\n\nWhile slotted you gain Major Brutality, Sorcery, and Vitality increasing Weapon and Spell Damage by 20% and healing received and damage shield strength by 12%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58317, // Morph of Hircine's Bounty
      name: "Hircine's Rage",
      icon: 'ability_werewolf_004_b',
      description:
        "Invoke the Huntsman's blessing, healing you for 3369 Health, granting double Fury, and increasing your damage done and taken by up to 12% for 20 seconds, based on how high your current Health is.\n\nYou also restore 10% Stamina, increasing by up to 100%, based on how high your current Health is.\n\nWhile slotted you gain Major Brutality and Sorcery and Minor Berserk.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Roar Line
    {
      id: AbilityId.ROAR,
      name: 'Roar',
      icon: 'ability_werewolf_003',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds and setting them Off Balance for 7 seconds. Grants you a stack of Blood Hunger, which empowers Gnash and Claw Fury.\n\nUp to 12 nearby allies can activate the Feeding Frenzy synergy, which grants 6% damage done and Minor Force for 30 seconds, increasing Critical Damage by 10%.\n\nWhile slotted you gain Major Prophecy and Savagery.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39114, // Morph of Roar
      name: 'Deafening Roar',
      icon: 'ability_werewolf_003_a',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and applying Major Cowardice and Maim for 15 seconds. Grants you a stack of Blood Hunger.\n\nUp to 12 nearby allies can activate the Feeding Frenzy synergy, which grants 6% damage done and Minor Force for 30 seconds.\n\nWhile slotted you gain Major Evasion and Minor Protection. Selecting this morph causes your Gnash to taunt enemies if cast while Bracing.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39113, // Morph of Roar
      name: 'Ferocious Roar',
      icon: 'ability_werewolf_003_b',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds and setting them Off Balance for 7 seconds. Grants two stacks of Blood Hunger, which empowers Gnash and Claw Fury.\n\nYou and up to 11 nearby allies gain Major Courage for 20 seconds and can activate the Feeding Frenzy synergy, which grants 6% damage done and Minor Force for 30 seconds.\n\nWhile slotted you gain Major Prophecy and Savagery.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Gnash Line (renamed from Piercing Howl in U50)
    {
      id: AbilityId.GNASH,
      name: 'Gnash',
      icon: 'ability_werewolf_005_a',
      description:
        'Bare your fangs and gnash your teeth into an enemy while ripping back, dealing 1345 Physical Damage on the initial lunge and 1345 Bleed Damage while ripping out.\n\nConsumes a stack of Blood Hunger to increase the initial damage done by 25%.\n\nThe second hit deals up to 125% more damage to enemies with less than 25% Health.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58798, // Morph of Gnash (renamed from Howl of Agony in U50)
      name: 'Bloody Gnash',
      icon: 'ability_werewolf_005_c',
      description:
        'Bare your fangs and gnash your teeth into an enemy while ripping back, dealing 1347 Physical Damage on the initial lunge and 1391 Bleed Damage while ripping out.\n\nConsumes a stack of Blood Hunger to increase the initial damage done by 25%. There is a 50% chance to retain Blood Hunger each cast.\n\nThe second hit deals up to 200% more damage to enemies with less than 25% Health and applies the Hemorrhaging status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58742, // Morph of Gnash (renamed from Howl of Despair in U50)
      name: 'Rip and Tear',
      icon: 'ability_werewolf_005_b',
      description:
        'Rip and tear into an enemy with your fangs, dealing 1347 Physical Damage while applying Major Breach for 15 seconds and the Sundered status effect on the initial rip and 1347 Bleed Damage while tearing out, when it is done.\n\nThe second hit deals up to 125% more damage to enemies with less than 25% Health and heals you for 3414, based off your Max Health.\n\nConsumes a stack of Blood Hunger to increase the initial damage and healing done by 25%.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Rending Claws Line (renamed from Infectious Claws in U50)
    {
      id: AbilityId.RENDING_CLAWS,
      name: 'Rending Claws',
      icon: 'ability_mage_065',
      description:
        'Shred up to 6 enemies in front of you with wild abandon, dealing 2020 Physical Damage and an additional 4035 Bleed Damage over 10 seconds. Reduced to 2421 Bleed Damage over 6 seconds against players.\n\nThe initial hit has a 15% chance of applying Sundered, while the damage over time has a 5% chance of applying Hemorrhaging.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58864, // Morph of Rending Claws (renamed from Claws of Anguish in U50)
      name: 'Claw Fury',
      icon: 'ability_werewolf_006_b',
      description:
        'Shred up to 6 enemies in front of you with furious intent, dealing 22230 Physical Damage in a channeled attack over 4.7 seconds.\n\nDealing damage with this ability generates 15 Fury and a stack of Blood Hunger, up to once per second.\n\nThis ability deals 25% more damage per stack of Blood Hunger, consumes all stacks when the ability ends, and is considered direct damage.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58879, // Morph of Rending Claws (renamed from Claws of Life in U50)
      name: 'Bloodclaws',
      icon: 'ability_werewolf_006_c',
      description:
        "Shred up to 6 enemies in front of you with blood soaked claws, dealing 2087 Physical Damage and an additional 4040 Bleed Damage over 10 seconds. Reduced to 2424 Bleed Damage over 6 seconds against players.\n\nYou heal for 40% of the initial hit's damage, while you heal for 1023 Health with the damage over time, based off your Max Health.\n\nThe initial hit grants a stack of Blood Hunger per enemy hit and has a 15% chance of applying Sundered, while the damage over time has a 5% chance of applying Hemorrhaging.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Passive Abilities
    {
      id: AbilityId.DEVOUR,
      alternateIds: [
        13380, 13381, 13382, 20541, 32634, 33208, 33209, 37233, 39506, 40124, 40125, 40515, 44051,
        44054, 44055, 53223, 53345, 60001, 60003, 66158, 66159, 66160, 69633, 69695, 73810, 73811,
        79242, 79910, 81253, 81254, 81706, 83012, 83169, 83256, 83257, 83750, 83752, 83753, 83754,
        83755, 83756, 83757, 83758, 84841, 84843, 84844, 85063, 85648, 85649, 87247, 87250, 87251,
        87252, 87253, 87385, 87386, 87987, 87988, 89064, 89066, 89067, 89068, 89069, 89070, 89071,
        89072, 89073, 89074, 91030, 91033, 91034, 91035, 91036, 91395, 91396, 91397, 91398, 91413,
        91414, 91721, 91723, 91724, 91725, 95186, 95187, 99157, 99158, 99159, 99160, 105104, 105105,
        105106, 105107, 105108, 111956, 112486, 113940, 113944, 113947, 113948, 113949, 113950,
        113951, 113953, 122465, 140322, 140323, 140326, 147613, 147614, 147615, 147616, 169865,
        169873, 189092, 189093, 189094, 189095, 189096, 189097, 189098, 189099, 189100, 189101,
        189104, 226766, 226767, 226768, 226769, 245420, 245423, 245424, 245425,
      ],
      name: 'Insatiable Hunger',
      icon: 'ability_werewolf_007',
      description:
        'Hunger gnaws at you. Like Storihbeg, shape it into a brutal weapon.\n\nGain the ability to devour corpses, for up to 4 seconds per corpse. Each second devouring you heal for 3200 Health, based off your Max Health, and restore 15 Ultimate.\n\nIf you are a Werewolf Berserker, each tick activates Fury generation.',
      maxRank: 1,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.PURSUIT,
      alternateIds: [32636, 46142],
      name: 'Master of the Chase',
      icon: 'ability_werewolf_010',
      description:
        'Give chase, hunter. Become pursuit unrelenting.\n\nIncreases your Movement Speed by 15%.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOOD_RAGE,
      alternateIds: [
        32637, 46135, 111924, 111925, 132914, 132921, 132922, 132923, 132924, 134369, 134370,
        134373, 134406, 134566, 134593, 134594, 134920, 134921, 134922, 139816, 139817, 140068,
        144208, 144209, 144210, 144211, 197580, 197581, 197582, 197583, 197584, 197585, 197586,
        197587, 197588,
      ],
      name: 'Blood Rage',
      icon: 'ability_werewolf_004',
      description:
        'Honor your pact and let loose your rage.\n\nIncreases the amount of Fury you generate by 5.\n\nFury is generated by using Werewolf abilities while in combat. Once you have 1000, you gain access to the Rampage Ultimate, which increases your damage done by 15%, Movement Speed by 20%, and removes the cost of all Werewolf abilities for 20 seconds.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOODMOON,
      name: 'Shadow of the Bloodmoon',
      icon: 'ability_werewolf_008',
      description:
        'The Great Hunt demands more participants. Become a shepard to the lamb who wishes to fight back.\n\nAllows you to infect another player with Lycanthropy once every week by returning to the Werewolf ritual site.\n\nPlayers already infected with Noxiphilic Sanguivoria cannot be infected with Lycanthropy.',
      maxRank: 1,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.SAVAGE_STRENGTH,
      alternateIds: [
        32638, 46139, 111928, 111929, 111932, 111933, 168022, 172383, 172384, 172385, 172386,
        173016,
      ],
      name: 'Feral Cruelty',
      icon: 'ability_werewolf_009',
      description:
        'Lorkh teaches through suffering. So too will your claws.\n\nIncreases your Weapon and Spell Damage by 12%, reducing to 5% against targets with Battle Spirit.\n\nGrants you Major Resolve, increasing your Physical and Spell Resistance by 5948.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.CALL_OF_THE_PACK,
      alternateIds: [
        4051, 13808, 14271, 14272, 14273, 15207, 26658, 26659, 32641, 45720, 45721, 45751, 45753,
        46137, 49257, 49258, 49259, 61616, 61617, 61618, 80277, 80282, 80283,
      ],
      name: 'Call of the Hunt',
      icon: 'ability_werewolf_006',
      description:
        "No beast can resist their master's call. Hunt as one and none shall escape.\n\nReduces the cost of remaining in your Werewolf Transformation by 8%, plus 8% for each transformed werewolf or direwolf in your group, including yourself, up to a maximum of 40%.",
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
  ],
};
