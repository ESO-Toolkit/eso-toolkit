import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const werewolf: SkillLineData = {
  id: 0,
  name: 'Werewolf',
  class: 'world',
  category: 'world',
  icon: 'ability_werewolf_001',
  sourceUrl: 'https://eso-hub.com/en/skills/world/werewolf',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.WEREWOLF_TRANSFORMATION,
      name: 'Werewolf Transformation',
      icon: 'ability_werewolf_001',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39075, // Morph of Werewolf Transformation
      name: 'Pack Leader',
      icon: 'ability_werewolf_001_a',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%, you take 10% less damage, and you summon two direwolves. You also grant yourself and nearby group members Minor Courage, increasing their Weapon and Spell Damage by 215. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39076, // Morph of Werewolf Transformation
      name: 'Werewolf Berserker',
      icon: 'ability_werewolf_001_b',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Light Attacks apply a bleed for 3716 Bleed Damage over 4 seconds, your Heavy Attacks deal their damage in an area, and your Max Stamina is increased by 30%. While slotted, your Stamina Recovery is increased by 15%.',
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
        'Pounce on an enemy with primal fury, dealing 1742 Bleed Damage and applying the Hemorrhaging status effect. Activating the ability again within the next 5 seconds causes you to rip into an enemy and deal 1296 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39105, // Morph of Pounce
      name: 'Brutal Pounce',
      icon: 'ability_werewolf_002_b',
      description:
        'Pounce on an enemy with primal fury, dealing 1799 Bleed Damage and applying the Hemorrhaging status effect to all nearby enemies. Activating the ability again within the next 5 seconds causes you to rip into all enemies in front of you to deal 1302 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health. Increases your Weapon and Spell Damage by 100 for each enemy hit, up to 6 times.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39104, // Morph of Pounce
      name: 'Feral Pounce',
      icon: 'ability_werewolf_002_a',
      description:
        'Pounce on an enemy with primal fury, dealing 1742 Bleed Damage and applying the Hemorrhaging status effect. Activating the ability again within the next 5 seconds causes you to rip into an enemy and deal 1302 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health. Dealing damage with either attack restores 100 Stamina and extends your Werewolf Transformation by 1 second.',
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
        "Invoke the Huntsman's blessing, healing you for 6198 Health. This ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58325, // Morph of Hircine's Bounty
      name: "Hircine's Fortitude",
      icon: 'ability_werewolf_004_c',
      description:
        "Invoke the Huntsman's blessing, healing you for 8002 Health. This portion of the ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. You also gain Minor Endurance and Minor Fortitude, increasing your Health and Stamina Recovery by 15% for 20 seconds. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58317, // Morph of Hircine's Bounty
      name: "Hircine's Rage",
      icon: 'ability_werewolf_004_b',
      description:
        "Invoke the Huntsman's blessing, healing you for 6197 Health. This portion of the ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina and gain Major Berserk, increasing your damage done by 10% for 10 seconds, but you also take 5% more damage. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
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
        'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and making them Terrified for 10 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39114, // Morph of Roar
      name: 'Deafening Roar',
      icon: 'ability_werewolf_003_a',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds and setting them Off Balance for 7 seconds. Your roar also leaves enemies dazed, applying Major Breach and Minor Maim, reducing their Physical and Spell Resistance by 5948 and damage done by 5% for 10 seconds. While slotted you gain Major Protection and your Heavy Attacks taunt enemies for 15 seconds.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39113, // Morph of Roar
      name: 'Ferocious Roar',
      icon: 'ability_werewolf_003_b',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and making them Terrified for 10 seconds. Your Heavy Attacks also are 33% faster for 10 seconds after casting. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Piercing Howl Line
    {
      id: AbilityId.PIERCING_HOWL,
      name: 'Piercing Howl',
      icon: 'ability_werewolf_005_a',
      description:
        'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58798, // Morph of Piercing Howl
      name: 'Howl of Agony',
      icon: 'ability_werewolf_005_c',
      description:
        'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified and 10% more to enemies that are Off Balance.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58742, // Morph of Piercing Howl
      name: 'Howl of Despair',
      icon: 'ability_werewolf_005_b',
      description:
        'Crush an enemy with a deafening howl, dealing 2999 Physical Damage. Enemies who are Terrified take 10% more damage from this attack. You or an ally targeting the enemy can activate the Feeding Frenzy synergy, which grants them Empower and Minor Force for 20 seconds, increasing their damage done with Heavy Attacks against monsters by 70% and their Critical Damage by 10%.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Active Abilities - Infectious Claws Line
    {
      id: AbilityId.INFECTIOUS_CLAWS,
      name: 'Infectious Claws',
      icon: 'ability_mage_065',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58864, // Morph of Infectious Claws
      name: 'Claws of Anguish',
      icon: 'ability_werewolf_006_b',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Afflicts enemies with Major Defile for 4 seconds, reducing their healing received and damage shield strength by 12%. Enemies hit by any part of the ability are afflicted with the Diseased status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58879, // Morph of Infectious Claws
      name: 'Claws of Life',
      icon: 'ability_werewolf_006_c',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2249 Disease Damage and an additional 3620 Disease Damage over 20 seconds. You are healed for 66% of the damage over time caused. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
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
      name: 'Devour',
      icon: 'ability_werewolf_007',
      description:
        'Allows you to devour corpses to increase the duration of your Werewolf Transformation and restore your Health. Every second you spend devouring a corpse adds 3 seconds to the duration of your Werewolf Transformation and restores 8% of your Max Health. Each corpse can be devoured for up to 4 seconds.',
      maxRank: 1,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.PURSUIT,
      alternateIds: [32636, 46142],
      name: 'Pursuit',
      icon: 'ability_werewolf_010',
      description:
        'Increases your Movement Speed by 30%. Increases the Stamina your Heavy Attacks restore by 50%.',
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
        'When you deal damage, the duration of your Werewolf Transformation is increased by 4 seconds. This effect can occur once every 5 seconds.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOODMOON,
      name: 'Bloodmoon',
      icon: 'ability_werewolf_008',
      description:
        'Allows you to infect another player with Lycanthropy once every week by returning to the Werewolf ritual site. Players already infected with Noxiphilic Sanguivoria cannot be infected with Lycanthropy.',
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
      name: 'Savage Strength',
      icon: 'ability_werewolf_009',
      description:
        'Increases your Weapon and Spell Damage by 18%. Grants you Major Resolve, increasing your Physical and Spell Resistance by 5948.',
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
      name: 'Call of the Pack',
      icon: 'ability_werewolf_006',
      description:
        'Reduces the cost of remaining in your Werewolf Transformation by 20% for each transformed werewolf or direwolf in your group, including yourself, up to a maximum of 80%.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
  ],
};
