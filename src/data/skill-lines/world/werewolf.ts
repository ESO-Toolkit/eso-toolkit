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
        'Transform into a beast, fearing nearby enemies for 3 seconds. Costs 100 Ultimate to activate and drains 100 Ultimate every 10 seconds while in combat; you continue to generate Ultimate while transformed. Activating Werewolf abilities in combat builds Fury. At 1000 Fury you can unleash Rampage, increasing your Movement Speed by 20% and your damage done by 15% and removing the cost of your Werewolf abilities for 20 seconds. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39075, // Morph of Werewolf Transformation
      name: 'Pack Leader',
      icon: 'ability_werewolf_001_a',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, you can block 30% more damage, you gain Major Protection, reducing your damage taken by 10%, and you summon two direwolves. You also grant yourself and nearby group members Minor Courage, increasing their Weapon and Spell Damage by 215. Your Rampage becomes Enduring Rampage, also granting 4000 Health Recovery. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39076, // Morph of Werewolf Transformation
      name: 'Werewolf Berserker',
      icon: 'ability_werewolf_001_b',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, you gain Major Berserk, increasing your damage done by 10%, and your Light and Heavy Attacks apply a bleed that stacks up to 5 times. Each tick of devouring a corpse also generates Fury. While slotted, your Stamina Recovery is increased by 15%.',
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
        'Pounce on an enemy with primal fury, dealing Bleed Damage and applying the Hemorrhaging status effect. While within 7 meters of your target this ability becomes Carnage, ripping into the enemy to deal Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39105, // Morph of Pounce
      name: 'Brutal Pounce',
      icon: 'ability_werewolf_002_b',
      description:
        'Pounce on an enemy with primal fury, dealing Bleed Damage and applying the Hemorrhaging status effect to all enemies within 7 meters. While within 7 meters of your target this ability becomes Brutal Carnage, ripping into all enemies in front of you to deal Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health. The damage over time stacks up to 3 times, each stack increasing its duration by 10 seconds.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39104, // Morph of Pounce
      name: 'Feral Pounce',
      icon: 'ability_werewolf_002_a',
      description:
        'Pounce on an enemy with primal fury, dealing Bleed Damage and applying the Hemorrhaging status effect. While within 7 meters of your target this ability becomes Feral Carnage, ripping into the enemy to deal Bleed Damage over 12 seconds, dealing up to 450% more damage to enemies under 100% Health. Dealing damage with either attack restores 200 Stamina and generates Fury, up to once every 4 seconds.',
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
        "Invoke the Huntsman's blessing, healing you based on your Max Health, then restoring 10% of your Max Stamina, increased by 1% for every 1% of your current Health, up to a maximum of 20%. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58325, // Morph of Hircine's Bounty
      name: "Hircine's Fortitude",
      icon: 'ability_werewolf_004_c',
      description:
        "Invoke the Huntsman's blessing, healing you based on your Max Health, then restoring 12% of your Max Stamina, increased by 1% for every 1% of your current Health, up to a maximum of 24%. While slotted you gain Major Vitality, increasing your healing received and damage shield strength by 12%, and Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58317, // Morph of Hircine's Bounty
      name: "Hircine's Rage",
      icon: 'ability_werewolf_004_b',
      description:
        "Invoke the Huntsman's blessing, healing you based on your Weapon and Spell Damage, then restoring 10% of your Max Stamina, increased by 1% for every 1% of your current Health, up to a maximum of 20%. You also increase your damage done and damage taken for 20 seconds by up to 12% based on your current Health, and generate double Fury. While slotted you gain Minor Berserk, increasing your damage done by 5%, and Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
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
        'Roar with bloodlust to fear nearby enemies within 10 meters for 4 seconds and set them Off Balance for 7 seconds. You gain a stack of Blood Hunger for 30 seconds, up to 4 times, empowering your Gnash and Claw Fury. Exposes the Feeding Frenzy synergy, granting nearby allies 6% increased damage done and Minor Force for 30 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39114, // Morph of Roar
      name: 'Deafening Roar',
      icon: 'ability_werewolf_003_a',
      description:
        'Roar with bloodlust to fear nearby enemies within 10 meters for 4 seconds and set them Off Balance for 7 seconds. Your roar applies Major Maim and Major Cowardice, reducing enemy damage done by 10% and Weapon and Spell Damage by 430 for 15 seconds, and grants you a stack of Blood Hunger. Casting Gnash while Bracing taunts the enemy. Exposes the Feeding Frenzy synergy, granting nearby allies 6% increased damage done and Minor Force for 30 seconds. While slotted you gain Major Evasion and Minor Protection.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39113, // Morph of Roar
      name: 'Ferocious Roar',
      icon: 'ability_werewolf_003_b',
      description:
        'Roar with bloodlust to fear nearby enemies within 10 meters for 4 seconds and set them Off Balance for 7 seconds. You gain 2 stacks of Blood Hunger and grant yourself and up to 11 nearby group members Major Courage, increasing their Weapon and Spell Damage by 430 for 20 seconds. Exposes the Feeding Frenzy synergy, which you can also activate yourself, granting 6% increased damage done and Minor Force for 30 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
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
        'Bare your fangs and bite an enemy within 7 meters twice, dealing Physical Damage followed by Bleed Damage, each hit with a 10% chance to apply the Sundered or Hemorrhaging status effect. The second bite deals up to 125% more damage to enemies under 25% Health. Consumes a stack of Blood Hunger, if available, to deal 25% more damage with the first bite.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58798, // Morph of Gnash (renamed from Howl of Agony in U50)
      name: 'Bloody Gnash',
      icon: 'ability_werewolf_005_c',
      description:
        'Bare your fangs and bite an enemy within 7 meters twice, dealing Physical Damage followed by Bleed Damage. The first bite has a 10% chance to apply the Sundered status effect and the second bite always applies the Hemorrhaging status effect. The second bite deals up to 200% more damage to enemies under 25% Health. Consumes a stack of Blood Hunger, if available, to deal 25% more damage with the first bite, with a 50% chance to not consume the stack.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58742, // Morph of Gnash (renamed from Howl of Despair in U50)
      name: 'Rip and Tear',
      icon: 'ability_werewolf_005_b',
      description:
        'Bare your fangs and bite an enemy within 7 meters twice, dealing Physical Damage followed by Bleed Damage. The first bite always applies the Sundered status effect and inflicts Major Breach, reducing their Physical and Spell Resistance by 5948 for 15 seconds. The second bite heals you based on your Max Health and deals up to 125% more damage to enemies under 25% Health. A stack of Blood Hunger, if available, is consumed to increase the healing by 25%.',
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
        'Shred up to 6 enemies in front of you with your claws, dealing Physical Damage and an additional Bleed Damage over 10 seconds. The initial hit has a 15% chance to apply the Sundered status effect and the bleed has a 5% chance to apply the Hemorrhaging status effect each tick.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58864, // Morph of Rending Claws (renamed from Claws of Anguish in U50)
      name: 'Claw Fury',
      icon: 'ability_werewolf_006_b',
      description:
        'Channel a flurry of slashes for 4.8 seconds, striking up to 6 enemies in front of you up to 13 times, dealing Physical Damage. Deals 25% more damage for each stack of Blood Hunger you hold, and generates Fury and a stack of Blood Hunger up to once per second while dealing damage. All Blood Hunger stacks are removed when the channel ends.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58879, // Morph of Rending Claws (renamed from Claws of Life in U50)
      name: 'Bloodclaws',
      icon: 'ability_werewolf_006_c',
      description:
        'Shred up to 6 enemies in front of you with your claws, dealing Physical Damage and an additional Bleed Damage over 10 seconds. You are healed for 40% of the initial hit damage done, and the bleed heals you based on your Max Health when it damages an enemy. The initial hit has a 15% chance to apply the Sundered status effect and the bleed has a 5% chance to apply the Hemorrhaging status effect each tick.',
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
        'Allows you to devour corpses to restore your Health and Ultimate. Every second you spend devouring a corpse restores 20% of your Max Health and 15 Ultimate, and devouring disables the maintenance cost of your Werewolf Transformation for 12 seconds. Each corpse can be devoured for up to 4 seconds.',
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
        'Increases your Movement Speed by 30%. At rank 2, also increases the Stamina your Heavy Attacks restore by 50%.',
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
      description: 'Increases the Fury you generate by 10 per source.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOODMOON,
      name: 'Shadow of the Bloodmoon',
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
      name: 'Feral Cruelty',
      icon: 'ability_werewolf_009',
      description:
        'Increases your Weapon and Spell Damage by 25%. Grants you Major Resolve, increasing your Physical and Spell Resistance by 5948.',
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
        'Reduces the Ultimate cost of maintaining your Werewolf Transformation by 16%, plus an additional 16% for each transformed werewolf or direwolf in your group, including yourself, up to a maximum of 80%.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
  ],
};
