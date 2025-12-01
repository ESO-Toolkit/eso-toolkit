import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const support: SkillLineData = {
  id: 1,
  name: 'Support',
  class: 'alliance-war',
  category: 'alliance',
  icon: 'https://eso-hub.com/storage/icons/ability_ava_010.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.BARRIER,
      name: 'Barrier',
      description:
        'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11621 damage for 30 seconds.',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40239, // Morph of Barrier
      name: 'Replenishing Barrier',
      description:
        'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11620 damage. Each time a ward dissolves, you restore 1500 Magicka.',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40237, // Morph of Barrier
      name: 'Reviving Barrier',
      description:
        'Invoke defensive tactics to protect yourself and nearby group members with wards that each absorb up to 11620 damage for 30 seconds. The wards also heal you and your group members for 5370 Health over 15 seconds.',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    // Scribing abilities
    {
      id: AbilityId.BANNER_BEARER,
      name: 'Banner Bearer',
      description: 'Bring out a banner to inspire yourself and nearby group members.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    // Active abilities
    {
      id: AbilityId.SIEGE_SHIELD,
      name: 'Siege Shield',
      description:
        'Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40226, // Morph of Siege Shield
      name: 'Propelling Shield',
      description:
        'Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies. Also increases the range of abilities with a range greater than 28 meters by 7 meters. Does not affect Leap, Move Position, and Pull abilities.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40229, // Morph of Siege Shield
      name: 'Siege Weapon Shield',
      description:
        "Create a protective sphere over your location that reduces damage taken from siege weapons by 50% for you and nearby allies. The sphere also protects you and your allies' siege weapons, reducing damage from enemy siege weapons by 75%.",
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.PURGE,
      name: 'Purge',
      description:
        'Cleanse yourself and your group, removing up to 3 negative effects immediately.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40234, // Morph of Purge
      name: 'Cleanse',
      description:
        'Cleanse yourself and your group, removing 3 negative effects immediately. For every negative effect removed, the target is healed for 5% of their Max Health.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40232, // Morph of Purge
      name: 'Efficient Purge',
      description:
        'Cleanse yourself and your group, removing up to 3 negative effects immediately.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.GUARD,
      name: 'Guard',
      description:
        'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. The bond will remain until you recast the spell or move more than 15 meters away from your ally.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 61536, // Morph of Guard
      name: 'Mystic Guard',
      description:
        'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. You and your bonded ally also gain Minor Vitality, increasing your healing received and damage shield strength by 6%. The bond will remain until you recast the spell or move more than 15 meters away from your ally.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 61529, // Morph of Guard
      name: 'Stalwart Guard',
      description:
        'Create a lifebond between you and an allied player. While bonded 30% of the damage they take is instead redistributed to you. You and your bonded ally also gain Minor Force, increasing your Critical Damage by 10%. The bond will remain until you recast the spell or move more than 15 meters away from your ally.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.REVEALING_FLARE,
      name: 'Revealing Flare',
      description:
        'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 61524, // Morph of Revealing Flare
      name: 'Blinding Flare',
      description:
        'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 5 seconds. Exposed enemies are stunned for 4 seconds, and cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 61519, // Morph of Revealing Flare
      name: 'Lingering Flare',
      description:
        'Launch a blinding flare, revealing stealthed and invisible enemies in the target area for 10 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    // Passive abilities
    {
      id: AbilityId.MAGICKA_AID,
      name: 'Magicka Aid',
      description: 'Increases your Magicka Recovery by 10% for each Support ability slotted.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.COMBAT_MEDIC,
      name: 'Combat Medic',
      description: 'Increases your healing done by 20% when you are near a Keep.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.BATTLE_RESURRECTION,
      name: 'Battle Resurrection',
      description:
        'Reduces the time it takes you to resurrect another player by 30% while you are in a PvP area.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
