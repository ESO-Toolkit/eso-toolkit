/**
 * Curative Runeforms — Arcanist Skill Line
 * Source: https://eso-hub.com/en/skills/arcanist/curative-runeforms
 * Regenerated: 2025-11-14T20:33:08.767Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const curativeRuneforms: SkillLineData = {
  id: 'class.curative-runeforms',
  name: 'Curative Runeforms',
  class: 'Arcanist',
  category: 'class',
  icon: 'ability_mage_065',
  sourceUrl: 'https://eso-hub.com/en/skills/arcanist/curative-runeforms',
  skills: [
    {
      id: ClassSkillId.ARCANIST_VITALIZING_GLYPHIC,
      name: 'Vitalizing Glyphic',
      type: 'ultimate',
      icon: 'ability_arcanist_018',
      description:
        'Summon an Apocryphal glyphic, which you and your allies can heal. The glyphic spawns at 30% Health and grows stronger the more you heal it.\n\nThe power within the glyphic grants up to 200 Weapon and Spell Damage and heals you and your allies around it for up to 927 Health every 1 second in proportion to its Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_VITALIZING_GLYPHIC,
    },
    {
      id: ClassSkillId.ARCANIST_GLYPHIC_OF_THE_TIDES,
      name: 'Glyphic of the Tides',
      type: 'ultimate',
      icon: 'ability_arcanist_018_a',
      description:
        'Summon an Apocryphal glyphic, which you and your allies can heal. The glyphic spawns at 53% Health and grows stronger the more you heal it.\n\nThe power within the glyphic grants up to 200 Weapon and Spell Damage and heals you and your allies around it for up to 928 Health every 1 second in proportion to its Health.\n\nAt full Health the glyphic grants Major Protection, reducing damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_VITALIZING_GLYPHIC,
    },
    {
      id: ClassSkillId.ARCANIST_RESONATING_GLYPHIC,
      name: 'Resonating Glyphic',
      type: 'ultimate',
      icon: 'ability_arcanist_018_b',
      description:
        'Summon an Apocryphal glyphic while in combat, which you and your allies can damage. The glyphic spawns at 70% Health and grows stronger the more you damage it. \n\nThe glyphic grants up to 200 Weapon and Spell Damage and heals you and your allies around it for up to 958 Health every 1 second in proportion to its Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_VITALIZING_GLYPHIC,
    },
    {
      id: ClassSkillId.ARCANIST_RUNEMEND,
      name: 'Runemend',
      type: 'active',
      icon: 'ability_arcanist_013',
      description:
        'Craft a series of precise Apocryphal runes, then propel them at yourself or an ally in front of you. The runes heal for 1161 Health three times and generate Crux.\n\nEach active Crux reduces the cost of this ability by 3%.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEMEND,
    },
    {
      id: ClassSkillId.ARCANIST_AUDACIOUS_RUNEMEND,
      name: 'Audacious Runemend',
      type: 'active',
      icon: 'ability_arcanist_013_b',
      description:
        'Craft a series of virtuous Apocryphal runes, then propel them at yourself or an ally in front of you. The runes heal for 1199 Health three times and generate Crux. \n\nHealing a target under 50% Health grants them Minor Heroism for 6 seconds, generating 1 Ultimate every 1.5 seconds.\n\nEach active Crux reduces the cost of this ability by 3%.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEMEND,
    },
    {
      id: ClassSkillId.ARCANIST_EVOLVING_RUNEMEND,
      name: 'Evolving Runemend',
      type: 'active',
      icon: 'ability_arcanist_013_a',
      description:
        'Craft a series of adaptive Apocryphal runes, then propel them at yourself or an ally in front of you. The runes heal for 1161 Health three times, an additional 1302 Health over 6 seconds, and generate Crux.\n\nEach active Crux reduces the cost of this ability by 3%.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEMEND,
    },
    {
      id: ClassSkillId.ARCANIST_REMEDY_CASCADE,
      name: 'Remedy Cascade',
      type: 'active',
      icon: 'ability_arcanist_014',
      description:
        'Channel the abyssal sea to coalesce a beam of restorative energy. The beam heals you and your allies in its path for 11310 Health over 4.5 seconds.\n\nConsume Crux to also restore 728 Magicka and Stamina per Crux spent to your allies over 4.5 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_REMEDY_CASCADE,
      alternateIds: [198309],
    },
    {
      id: ClassSkillId.ARCANIST_CASCADING_FORTUNE,
      name: 'Cascading Fortune',
      type: 'active',
      icon: 'ability_arcanist_014_a',
      description:
        "Channel the abyssal sea to coalesce a beam that heals you and your allies in its path for 11674 Health over 4.5 seconds.\n\nThe beam heals for up to 50% more in proportion to the severity of the target's wounds as you reweave fate itself.\n\nConsume Crux to also restore 728 Magicka and Stamina per Crux spent to your allies over 4.5 seconds.",
      baseSkillId: ClassSkillId.ARCANIST_REMEDY_CASCADE,
    },
    {
      id: ClassSkillId.ARCANIST_CURATIVE_SURGE,
      name: 'Curative Surge',
      type: 'active',
      icon: 'ability_arcanist_014_b',
      description:
        'Channel the abyssal sea to coalesce a beam that heals you and your allies in its path for 11674 Health over 4.5 seconds.\n\nThe beam gradually grows stronger the longer you channel it, healing for up to 192% more at the end of its duration.\n\nConsume Crux to also restore 728 Magicka and Stamina per Crux spent to your allies over 4.5 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_REMEDY_CASCADE,
    },
    {
      id: ClassSkillId.ARCANIST_CHAKRAM_SHIELDS,
      name: 'Chakram Shields',
      type: 'active',
      icon: 'ability_arcanist_015',
      description:
        'Carve the runes of the Blind Man to call forth spinning mystical discs. Discs surround you or up to 4 allies in front of you, granting a shield that absorbs 3159 damage for 6 seconds.\n\nDiscs prefer your reticle target, or low-Health targets without shields.',
      baseSkillId: ClassSkillId.ARCANIST_CHAKRAM_SHIELDS,
      alternateIds: [183447],
    },
    {
      id: ClassSkillId.ARCANIST_CHAKRAM_OF_DESTINY,
      name: 'Chakram of Destiny',
      type: 'active',
      icon: 'ability_arcanist_015_a',
      description:
        "Carve the Fate Crone's runes to create spinning mystical discs and generate Crux. Discs surround you or up to 4 allies in front of you, granting a shield that absorbs 3160 damage for 6 seconds. \n\nRecasting on a target already shielded grants a new shield that is 30% stronger.\n\nDiscs prefer your reticle target, or low-Health targets without shields.",
      baseSkillId: ClassSkillId.ARCANIST_CHAKRAM_SHIELDS,
    },
    {
      id: ClassSkillId.ARCANIST_TIDAL_CHAKRAM,
      name: 'Tidal Chakram',
      type: 'active',
      icon: 'ability_arcanist_015_b',
      description:
        "Carve the Baron of Breakers' runes to create spinning discs. Discs surround you or up to 4 allies in front of you, granting a shield that absorbs 3264 damage for 6 seconds.\n\nConsume Crux to cause the shields to heal for 33% of the shield's remaining strength every 1 second per Crux spent.\n\nDiscs prefer your reticle target, or low-Health targets without shields.",
      baseSkillId: ClassSkillId.ARCANIST_CHAKRAM_SHIELDS,
    },
    {
      id: ClassSkillId.ARCANIST_ARCANIST_S_DOMAIN,
      name: "Arcanist's Domain",
      type: 'active',
      icon: 'ability_arcanist_017',
      description:
        'Draw forth your tome and invoke the vigoratum of Hermaeus Mora to conjure a vortex of eldritch power. Entering this vortex grants you and your allies Minor Courage, Minor Fortitude, Minor Intellect, and Minor Endurance, increasing your Weapon and Spell Damage by 215 and your Health, Magicka, and Stamina Recovery by 15%.',
      baseSkillId: ClassSkillId.ARCANIST_ARCANIST_S_DOMAIN,
    },
    {
      id: ClassSkillId.ARCANIST_RECONSTRUCTIVE_DOMAIN,
      name: 'Reconstructive Domain',
      type: 'active',
      icon: 'ability_arcanist_017_b',
      description:
        'Draw forth your tome and invoke the leviathanum of the Abyssal Sea to conjure a vortex of eldritch power. Entering this vortex grants you and your allies Minor Courage, Minor Fortitude, Minor Intellect, and Minor Endurance, increasing your Weapon and Spell Damage by 215 and your Health, Magicka, and Stamina Recovery by 15%.\n\nThe vortex also heals you and your allies for 4631 Health over 20 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_ARCANIST_S_DOMAIN,
    },
    {
      id: ClassSkillId.ARCANIST_ZENAS_EMPOWERING_DISC,
      name: "Zenas' Empowering Disc",
      type: 'active',
      icon: 'ability_arcanist_017_a',
      description:
        'Draw forth your tome and invoke the enigmatum of Morian Zenas to conjure a vortex of eldritch power. Entering this vortex grants you and your allies Minor Courage, Minor Fortitude, Minor Intellect, and Minor Endurance, increasing your Weapon and Spell Damage by 215 and your Health, Magicka, and Stamina Recovery by 15%.\n\nThese effects cling to you and your allies for up to 10 seconds after leaving the vortex.',
      baseSkillId: ClassSkillId.ARCANIST_ARCANIST_S_DOMAIN,
    },
    {
      id: ClassSkillId.ARCANIST_APOCRYPHAL_GATE,
      name: 'Apocryphal Gate',
      type: 'active',
      icon: 'ability_arcanist_016',
      description:
        'Breach the world walls to create a portal at a target location. Its twin appears directly before you. Crossing the threshold allows you to teleport from one to the other for as long as the portals remain open. \n\nApocryphal Gate generates Crux each time you teleport.',
      baseSkillId: ClassSkillId.ARCANIST_APOCRYPHAL_GATE,
    },
    {
      id: ClassSkillId.ARCANIST_FLEET_FOOTED_GATE,
      name: 'Fleet-Footed Gate',
      type: 'active',
      icon: 'ability_arcanist_016_a',
      description:
        'Breach the world walls to create a portal at a target location. Its twin appears directly before you. Crossing the threshold allows you to teleport from one to the other for as long as the portals remain open. \n\nAfter teleporting, you gain Major Expedition for 5 seconds, increasing your Movement Speed by 30%.\n\nFleet-Footed Gate generates Crux each time you teleport.',
      baseSkillId: ClassSkillId.ARCANIST_APOCRYPHAL_GATE,
    },
    {
      id: ClassSkillId.ARCANIST_PASSAGE_BETWEEN_WORLDS,
      name: 'Passage Between Worlds',
      type: 'active',
      icon: 'ability_arcanist_016_b',
      description:
        'Breach the world walls to create a portal at a target location. Its twin appears directly before you. Crossing the threshold allows you to teleport from one to the other for as long as the portals remain open. \n\nAllies standing within either portal can activate the Passage synergy, allowing them to teleport to the opposite portal.\n\nPassage Between Worlds generates Crux each time you teleport.',
      baseSkillId: ClassSkillId.ARCANIST_APOCRYPHAL_GATE,
    },
    {
      id: ClassSkillId.ARCANIST_ERUDITION,
      name: 'Erudition',
      type: 'passive',
      icon: 'passive_arcanist_11',
      description:
        'Knowledge is power. Your excessive scholarship increases your Magicka and Stamina Recovery by 18%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_HEALING_TIDES,
      name: 'Healing Tides',
      type: 'passive',
      icon: 'passive_arcanist_09',
      description:
        'Your mastery of weaving fate and abyssal water increases your healing done by 4% for each active Crux.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_HIDEOUS_CLARITY,
      name: 'Hideous Clarity',
      type: 'passive',
      icon: 'passive_arcanist_10',
      description:
        "You've stared too long into the abyss. When you generate Crux, you restore 225 Magicka and Stamina.",
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_INTRICATE_RUNEFORMS,
      name: 'Intricate Runeforms',
      type: 'passive',
      icon: 'passive_arcanist_12',
      description:
        'Your status as illuminatus reduces the cost and increases the strength of your damage shields by 10%.',
      isPassive: true,
    },
  ],
};
