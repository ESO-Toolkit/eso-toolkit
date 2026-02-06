import type { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const magesGuild: SkillLineData = {
  id: 'mages-guild',
  name: 'Mages Guild',
  class: 'guild',
  category: 'guild',
  icon: 'https://eso-hub.com/storage/icons/class_003.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.METEOR,
      name: 'Meteor',
      type: 'ultimate',
      baseAbilityId: AbilityId.METEOR,
      description:
        'Call a comet down from the constellations to blast an enemy, dealing 4065 Flame Damage to all enemies in the area, knocking them down, and stunning them for 2 seconds. After impact, enemies in the target area take 1161 Flame Damage every 1 second for 11 seconds.',
    },
    {
      id: 40489, // Ice Comet (morph)
      name: 'Ice Comet',
      type: 'ultimate',
      baseAbilityId: AbilityId.METEOR,
      description:
        'Call a comet down from the constellations to blast an enemy, dealing 4620 Frost Damage to all enemies in the area, knocking them down, stunning them for 2 seconds, and reducing their Movement Speed by 50% for 5 seconds. After impact, enemies in the target area take 1319 Frost Damage every 1 second for 11 seconds. Increases the damage, deals Frost Damage, and reduces the Movement Speed of enemies hit.',
    },
    {
      id: 40493, // Shooting Star (morph)
      name: 'Shooting Star',
      type: 'ultimate',
      baseAbilityId: AbilityId.METEOR,
      description:
        'Call a comet down from the constellations to blast an enemy, dealing 4067 Flame Damage to all enemies in the area, knocking them down, and stunning them for 2 seconds. After impact, enemies in the target area take 1161 Flame Damage every 1 second for 11 seconds. You generate 10 Ultimate for each enemy hit by the initial blast, up to 6 times. You generate Ultimate for each enemy hit by the initial blast. Reduces the base cost as the ability ranks up.',
    },

    // Scribing ability
    {
      id: AbilityId.ULFSILD_CONTINGENCY,
      name: "Ulfsild's Contingency",
      type: 'active',
      baseAbilityId: AbilityId.ULFSILD_CONTINGENCY,
      description:
        'Imbue yourself with the magical runes of Ulfsild. These runes trigger when you cast an ability with a cost, causing a burst of magic around you.',
    },

    // Active abilities - Magelight
    {
      id: AbilityId.MAGELIGHT,
      name: 'Magelight',
      type: 'active',
      baseAbilityId: AbilityId.MAGELIGHT,
      description:
        'Summon a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
    },
    {
      id: 40478, // Inner Light (morph)
      name: 'Inner Light',
      type: 'active',
      baseAbilityId: AbilityId.MAGELIGHT,
      description:
        'Summon a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629 and your Max Magicka is increased by 5%. Also increases your Max Magicka while slotted.',
    },
    {
      id: 40483, // Radiant Magelight (morph)
      name: 'Radiant Magelight',
      type: 'active',
      baseAbilityId: AbilityId.MAGELIGHT,
      description:
        'Summon a mote of magelight, revealing stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629. You also prevent the stun from stealth attacks for you and nearby allies. Increases the radius of the reveal. You and nearby allies cannot be stunned from sneak attacks while slotted. Reduces the cost as the ability ranks up.',
    },

    // Active abilities - Entropy
    {
      id: AbilityId.ENTROPY,
      name: 'Entropy',
      type: 'active',
      baseAbilityId: AbilityId.ENTROPY,
      description: 'Bind an enemy with chaotic magic, dealing 4631 Magic Damage over 20 seconds.',
    },
    {
      id: 40457, // Degeneration (morph)
      name: 'Degeneration',
      type: 'active',
      baseAbilityId: AbilityId.ENTROPY,
      description:
        'Bind an enemy with chaotic magic, dealing 4642 Magic Damage over 20 seconds. Excess magic spills out from them, granting you Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 20 seconds. You gain Major Brutality and Sorcery for a time after casting. Reduces the cost as the ability ranks up.',
    },
    {
      id: 40452, // Structured Entropy (morph)
      name: 'Structured Entropy',
      type: 'active',
      baseAbilityId: AbilityId.ENTROPY,
      description:
        'Bind an enemy with chaotic magic, dealing 4642 Magic Damage over 20 seconds, and healing you for 435 every 2 seconds. Adds a heal over time when the damage over time is active.',
    },

    // Active abilities - Fire Rune
    {
      id: AbilityId.FIRE_RUNE,
      name: 'Fire Rune',
      type: 'active',
      baseAbilityId: AbilityId.FIRE_RUNE,
      description:
        'Inscribe a rune of cosmic fire on the earth, which takes 2 seconds to arm and lasts for 20 seconds. When triggered, the rune blasts all enemies in the target area for 2323 Flame Damage.',
    },
    {
      id: 40465, // Scalding Rune (morph)
      name: 'Scalding Rune',
      type: 'active',
      baseAbilityId: AbilityId.FIRE_RUNE,
      description:
        'Inscribe a rune of cosmic fire on the earth, which takes 2 seconds to arm and lasts for 20 seconds. When triggered, the rune blasts all enemies in the target area for 2323 Flame Damage and an additional 2871 Flame Damage over 22 seconds. The rune also deals additional damage over time.',
    },
    {
      id: 40470, // Volcanic Rune (morph)
      name: 'Volcanic Rune',
      type: 'active',
      baseAbilityId: AbilityId.FIRE_RUNE,
      description:
        'Inscribe a rune of cosmic fire on the earth, which takes 2 seconds to arm and lasts for 20 seconds. When triggered, the rune blasts all enemies in the target area for 2323 Flame Damage, knocks them into the air, and stuns them for 3 seconds. The rune knocks enemies into the air and stuns them. Reduces the cost as the ability ranks up.',
    },

    // Active abilities - Equilibrium
    {
      id: AbilityId.EQUILIBRIUM,
      name: 'Equilibrium',
      type: 'active',
      baseAbilityId: AbilityId.EQUILIBRIUM,
      description:
        'Barter with Oblivion to trade vitality for power, sacrificing your Health in exchange for 3000 Magicka. The exchange reduces your healing done and damage shield strength by 50% for 4 seconds.',
    },
    {
      id: 40441, // Balance (morph)
      name: 'Balance',
      type: 'active',
      baseAbilityId: AbilityId.EQUILIBRIUM,
      description:
        'Barter with Oblivion to trade vitality for power, sacrificing your Health in exchange for 3000 Magicka. After the exchange is complete, you gain Major Resolve for 30 seconds, increasing your Physical and Spell Resistance by 5948. The exchange reduces your healing done and damage shield strength by 50% for 4 seconds. After the exchange is complete, you gain Major Resolve, increasing your Physical and Spell Resistance.',
    },
    {
      id: 40445, // Spell Symmetry (morph)
      name: 'Spell Symmetry',
      type: 'active',
      baseAbilityId: AbilityId.EQUILIBRIUM,
      description:
        'Barter with Oblivion to trade vitality for power, sacrificing your Health in exchange for 3000 Magicka. After the exchange is complete, the cost of your next Magicka ability is reduced by 33% for 5 seconds. The exchange reduces your healing done and damage shield strength by 50% for 4 seconds. After the exchange is complete, the cost of your next Magicka ability is reduced.',
    },

    // Passive abilities
    {
      id: AbilityId.PERSUASIVE_WILL,
      name: 'Persuasive Will',
      type: 'passive',
      baseAbilityId: AbilityId.PERSUASIVE_WILL,
      description: 'Allows you to Persuade NPCs in conversation.',
    },
    {
      id: AbilityId.MAGE_ADEPT,
      name: 'Mage Adept',
      type: 'passive',
      baseAbilityId: AbilityId.MAGE_ADEPT,
      description: 'Reduces the Magicka and Health cost of your Mages Guild abilities by 15%.',
    },
    {
      id: AbilityId.EVERLASTING_MAGIC,
      name: 'Everlasting Magic',
      type: 'passive',
      baseAbilityId: AbilityId.EVERLASTING_MAGIC,
      description: 'Increases the duration of your Mages Guild abilities by 2 seconds.',
    },
    {
      id: AbilityId.MAGICKA_CONTROLLER,
      name: 'Magicka Controller',
      type: 'passive',
      baseAbilityId: AbilityId.MAGICKA_CONTROLLER,
      description:
        'Increases your Max Magicka and Magicka Recovery by 2% for each Mages Guild ability slotted.',
    },
    {
      id: AbilityId.MIGHT_OF_THE_GUILD,
      name: 'Might of the Guild',
      type: 'passive',
      baseAbilityId: AbilityId.MIGHT_OF_THE_GUILD,
      description:
        'Casting a Mages Guild ability grants you Empower, increasing the damage of your Heavy Attacks against monsters by 70% for 10 seconds.',
    },
  ],
};
