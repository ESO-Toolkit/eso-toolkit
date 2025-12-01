import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const werewolf: SkillLineData = {
  id: 0,
  name: 'Werewolf',
  class: 'world',
  category: 'world',
  icon: 'https://eso-hub.com/storage/icons/ability_werewolf_werewolf_transformation.png',
  skills: [
    // Ultimate Abilities
    {
      id: AbilityId.WEREWOLF_TRANSFORMATION,
      name: 'Werewolf Transformation',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_werewolf_transformation.png',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39075, // Morph of Werewolf Transformation
      name: 'Pack Leader',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_pack_leader.png',
      description:
        'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%, you take 10% less damage, and you summon two direwolves. You also grant yourself and nearby group members Minor Courage, increasing their Weapon and Spell Damage by 215. While slotted, your Stamina Recovery is increased by 15%.',
      maxRank: 4,
      isUltimate: true,
      isPassive: false,
    },
    {
      id: 39076, // Morph of Werewolf Transformation
      name: 'Werewolf Berserker',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_werewolf_berserker.png',
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
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_pounce.png',
      description:
        'Pounce on an enemy with primal fury, dealing 1742 Bleed Damage and applying the Hemorrhaging status effect. Activating the ability again within the next 5 seconds causes you to rip into an enemy and deal 1296 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39105, // Morph of Pounce
      name: 'Brutal Pounce',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_brutal_pounce.png',
      description:
        'Pounce on an enemy with primal fury, dealing 1799 Bleed Damage and applying the Hemorrhaging status effect to all nearby enemies. Activating the ability again within the next 5 seconds causes you to rip into all enemies in front of you to deal 1302 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health. Increases your Weapon and Spell Damage by 100 for each enemy hit, up to 6 times.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39104, // Morph of Pounce
      name: 'Feral Pounce',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_feral_pounce.png',
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
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_hircines_bounty.png',
      description:
        "Invoke the Huntsman's blessing, healing you for 6198 Health. This ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58325, // Morph of Hircine's Bounty
      name: "Hircine's Fortitude",
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_hircines_fortitude.png',
      description:
        "Invoke the Huntsman's blessing, healing you for 8002 Health. This portion of the ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. You also gain Minor Endurance and Minor Fortitude, increasing your Health and Stamina Recovery by 15% for 20 seconds. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58317, // Morph of Hircine's Bounty
      name: "Hircine's Rage",
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_hircines_rage.png',
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
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_roar.png',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and making them Terrified for 10 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39114, // Morph of Roar
      name: 'Deafening Roar',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_deafening_roar.png',
      description:
        'Roar with bloodlust to fear nearby enemies for 4 seconds and setting them Off Balance for 7 seconds. Your roar also leaves enemies dazed, applying Major Breach and Minor Maim, reducing their Physical and Spell Resistance by 5948 and damage done by 5% for 10 seconds. While slotted you gain Major Protection and your Heavy Attacks taunt enemies for 15 seconds.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 39113, // Morph of Roar
      name: 'Ferocious Roar',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_ferocious_roar.png',
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
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_piercing_howl.png',
      description:
        'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58798, // Morph of Piercing Howl
      name: 'Howl of Agony',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_howl_of_agony.png',
      description:
        'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified and 10% more to enemies that are Off Balance.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58742, // Morph of Piercing Howl
      name: 'Howl of Despair',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_howl_of_despair.png',
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
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_infectious_claws.png',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58864, // Morph of Infectious Claws
      name: 'Claws of Anguish',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_claws_of_anguish.png',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Afflicts enemies with Major Defile for 4 seconds, reducing their healing received and damage shield strength by 12%. Enemies hit by any part of the ability are afflicted with the Diseased status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    {
      id: 58879, // Morph of Infectious Claws
      name: 'Claws of Life',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_claws_of_life.png',
      description:
        'Shred enemies in front of you with your tainted claws, dealing 2249 Disease Damage and an additional 3620 Disease Damage over 20 seconds. You are healed for 66% of the damage over time caused. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
      maxRank: 4,
      isUltimate: false,
      isPassive: false,
    },
    // Passive Abilities
    {
      id: AbilityId.DEVOUR,
      name: 'Devour',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_devour.png',
      description:
        'Allows you to devour corpses to increase the duration of your Werewolf Transformation and restore your Health. Every second you spend devouring a corpse adds 3 seconds to the duration of your Werewolf Transformation and restores 8% of your Max Health. Each corpse can be devoured for up to 4 seconds.',
      maxRank: 1,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.PURSUIT,
      name: 'Pursuit',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_pursuit.png',
      description:
        'Increases your Movement Speed by 30%. Increases the Stamina your Heavy Attacks restore by 50%.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOOD_RAGE,
      name: 'Blood Rage',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_blood_rage.png',
      description:
        'When you deal damage, the duration of your Werewolf Transformation is increased by 4 seconds. This effect can occur once every 5 seconds.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.BLOODMOON,
      name: 'Bloodmoon',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_bloodmoon.png',
      description:
        'Allows you to infect another player with Lycanthropy once every week by returning to the Werewolf ritual site. Players already infected with Noxiphilic Sanguivoria cannot be infected with Lycanthropy.',
      maxRank: 1,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.SAVAGE_STRENGTH,
      name: 'Savage Strength',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_savage_strength.png',
      description:
        'Increases your Weapon and Spell Damage by 18%. Grants you Major Resolve, increasing your Physical and Spell Resistance by 5948.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
    {
      id: AbilityId.CALL_OF_THE_PACK,
      name: 'Call of the Pack',
      icon: 'https://eso-hub.com/storage/icons/ability_werewolf_call_of_the_pack.png',
      description:
        'Reduces the cost of remaining in your Werewolf Transformation by 20% for each transformed werewolf or direwolf in your group, including yourself, up to a maximum of 80%.',
      maxRank: 2,
      isUltimate: false,
      isPassive: true,
    },
  ],
};
