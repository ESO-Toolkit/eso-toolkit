/**
 * Soldier of Apocrypha — Arcanist Skill Line
 * Source: https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha
 * Regenerated: 2025-11-14T20:33:08.754Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const soldierOfApocrypha: SkillLineData = {
  id: 'class.soldier-of-apocrypha',
  name: 'Soldier of Apocrypha',
  class: 'Arcanist',
  category: 'class',
  icon: 'ability_mage_065',
  sourceUrl: 'https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha',
  skills: [
    {
      id: ClassSkillId.ARCANIST_GIBBERING_SHIELD,
      name: 'Gibbering Shield',
      type: 'ultimate',
      icon: 'ability_arcanist_012',
      description:
        'Gather the true strength of Apocrypha around you, forming protective tentacles and a damage shield that absorbs 60% of all damage for 10 seconds, up to a max of 31732 damage, scaling off your Max Health.\n\nWhen the shield collapses you lash out, dealing all of the damage absorbed as Magic Damage to enemies within 5 meters over 10 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_GIBBERING_SHIELD,
    },
    {
      id: ClassSkillId.ARCANIST_GIBBERING_SHELTER,
      name: 'Gibbering Shelter',
      type: 'ultimate',
      icon: 'ability_arcanist_012_b',
      description:
        'Gather the true strength of Apocrypha, forming a tentacle damage shield that absorbs 60% of all damage for 10 seconds, up to a max of 31733 damage.\n\nWhen the shield absorbs damage, pseudopods cascade out at up to 11 allies within 15 meters, granting them a damage shield for 4 seconds that absorbs up to 5462 damage. These shields can be applied once every 4 seconds. Both shields scale off your Max Health.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_GIBBERING_SHIELD,
    },
    {
      id: ClassSkillId.ARCANIST_SANCTUM_OF_THE_ABYSSAL_SEA,
      name: 'Sanctum of the Abyssal Sea',
      type: 'ultimate',
      icon: 'ability_arcanist_012_a',
      description:
        'Gather the true strength of Apocrypha as protective tentacles rise from the Abyssal Sea around you. The tentacles form a damage shield that absorbs 60% of all damage for 10 seconds, up to a max of 37697 damage, scaling off your Max Health.\n\nWhen the shield collapses you lash out, dealing all of the damage absorbed as Magic Damage to enemies within 5 meters over 10 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_GIBBERING_SHIELD,
    },
    {
      id: ClassSkillId.ARCANIST_FATEWOVEN_ARMOR,
      name: 'Fatewoven Armor',
      type: 'active',
      icon: 'ability_arcanist_009',
      description:
        'Forge defiant runic armor around you, granting Major Resolve for 20 seconds, increasing your Armor by 5948.\n\nWhile the armor persists, taking damage applies Minor Breach, reducing the Armor of your attacker by 2974 for 6 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_FATEWOVEN_ARMOR,
      alternateIds: [183648],
    },
    {
      id: ClassSkillId.ARCANIST_CRUXWEAVER_ARMOR,
      name: 'Cruxweaver Armor',
      type: 'active',
      icon: 'ability_arcanist_009_a',
      description:
        'Forge defiant runic armor around you, granting Major Resolve for 30 seconds, increasing your Armor by 5948.\n\nWhile the armor persists, taking damage applies Minor Breach, reducing the Armor of your attacker by 2974 for 6 seconds. Blows against your armor also generate Crux, up to once every 5 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_FATEWOVEN_ARMOR,
    },
    {
      id: ClassSkillId.ARCANIST_UNBREAKABLE_FATE,
      name: 'Unbreakable Fate',
      type: 'active',
      icon: 'ability_arcanist_009_b',
      description:
        'Forge defiant runic armor around you, granting 5% Block Mitigation and Major Resolve for 20 seconds, increasing your Armor by 5948 for 20 seconds.\n\nConsume Crux to gain 5% additional Block Mitigation per Crux spent.\n\nWhile the armor persists, taking damage applies Minor Breach, reducing the Armor of your attacker by 2974 for 6 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_FATEWOVEN_ARMOR,
    },
    {
      id: ClassSkillId.ARCANIST_RUNE_OF_ELDRITCH_HORROR,
      name: 'Rune of Eldritch Horror',
      type: 'active',
      icon: 'ability_arcanist_011',
      description:
        "Etch an incomprehensible rune on your enemy's mind, paralyzing them in fear after a 1 second delay, stunning them for 4 seconds. This terror applies Minor Vulnerability for 10 seconds, increasing their damage taken by 5%.\n\nIf used against a monster, the paralyze lasts for 8 seconds.\n\nThis ability cannot be dodged.",
      baseSkillId: ClassSkillId.ARCANIST_RUNE_OF_ELDRITCH_HORROR,
      alternateIds: [185918],
    },
    {
      id: ClassSkillId.ARCANIST_RUNE_OF_UNCANNY_ADORATION,
      name: 'Rune of Uncanny Adoration',
      type: 'active',
      icon: 'ability_arcanist_011_a',
      description:
        "Etch a blasphemous rune on your enemy's mind, charming them after a 1 second delay for 4 seconds. This eldritch attraction causes them to move towards the player and applies Minor Vulnerability for 10 seconds, increasing their damage taken by 5%.\n\nIf used against a monster, the charm lasts for 8 seconds.\n\nThis ability cannot be dodged.",
      baseSkillId: ClassSkillId.ARCANIST_RUNE_OF_ELDRITCH_HORROR,
    },
    {
      id: ClassSkillId.ARCANIST_RUNE_OF_THE_COLORLESS_POOL,
      name: 'Rune of the Colorless Pool',
      type: 'active',
      icon: 'ability_arcanist_011_b',
      description:
        "Etch an amorphous rune on your enemy's mind, paralyzing them in fear after a 1 second delay, stunning them for 4 seconds. This undimensioned phenomenon applies Minor Vulnerability and Minor Brittle for 20 seconds, increasing their damage taken by 5% and their Critical Damage taken by 10%.\n\nIf used against a monster, the paralyze lasts for 8 seconds.\n\nThis ability cannot be dodged.",
      baseSkillId: ClassSkillId.ARCANIST_RUNE_OF_ELDRITCH_HORROR,
    },
    {
      id: ClassSkillId.ARCANIST_RUNIC_DEFENSE,
      name: 'Runic Defense',
      type: 'active',
      icon: 'ability_arcanist_010',
      description:
        'Cast forth a complex rune granting you and your group members Minor Resolve for 20 seconds, increasing your Armor by 2974.\n\nYou gain Minor Protection for 20 seconds, reducing your damage taken by 5%.\n\nThe first time you are damaged while below 50% Health, the Minor Protection is consumed to heal you for 4800 Health, scaling off your Max Health.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_DEFENSE,
      alternateIds: [185912],
    },
    {
      id: ClassSkillId.ARCANIST_RUNEGUARD_OF_FREEDOM,
      name: 'Runeguard of Freedom',
      type: 'active',
      icon: 'ability_arcanist_010_b',
      description:
        'Cast forth a complex rune granting you and your group members Minor Resolve for 20 seconds, increasing your Armor by 2974.\n\nYou gain Minor Protection for 20 seconds, reducing your damage taken by 5%.\n\nThe first time you are damaged while below 50% Health, Minor Protection is consumed to heal you for 2400 Health, scaling off your Max Health, and gain 3300 Armor and Crowd Control Immunity for 7 seconds. This immunity can occur once every 30 seconds.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_DEFENSE,
    },
    {
      id: ClassSkillId.ARCANIST_RUNEGUARD_OF_STILL_WATERS,
      name: 'Runeguard of Still Waters',
      type: 'active',
      icon: 'ability_arcanist_010_a',
      description:
        'Cast forth a complex rune granting you and your group members Minor Resolve for 20 seconds, increasing your Armor by 2974. After 1 second, the spellweave immobilizes enemies within 7 meters for 3 seconds.\n\nYou gain Minor Protection for 20 seconds, reducing your damage taken by 5%.\n\nThe first time you are damaged while below 50% Health, the Minor Protection is consumed to heal you for 4800 Health, scaling off your Max Health.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_DEFENSE,
    },
    {
      id: ClassSkillId.ARCANIST_RUNIC_JOLT,
      name: 'Runic Jolt',
      type: 'active',
      icon: 'ability_arcanist_007',
      description:
        'Craft a defensive Apocryphal rune that deals 1161 Magic Damage and applies Minor Maim for 15 seconds, reducing their damage done by 5%.\n\nThe rune also taunts for 15 seconds if it would not cause taunt immunity, and generates Crux. While slotted, damage taken is reduced by 2% per active Crux.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_JOLT,
    },
    {
      id: ClassSkillId.ARCANIST_RUNIC_EMBRACE,
      name: 'Runic Embrace',
      type: 'active',
      icon: 'ability_arcanist_007_b',
      description:
        'Craft a rune that deals 1161 Magic Damage and heals you for 1706 Health, scaling off your Max Health.\n\nYou apply Minor Maim and Minor Lifesteal for 15 seconds, reducing enemy damage done by 5%, and healing you and your allies for 600 Health every 1 second when damaging them.\n\nThe rune taunts for 15 seconds if it would not cause taunt immunity, and generates Crux. While slotted, damage taken is reduced by 2% per active Crux.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_JOLT,
    },
    {
      id: ClassSkillId.ARCANIST_RUNIC_SUNDER,
      name: 'Runic Sunder',
      type: 'active',
      icon: 'ability_arcanist_007_a',
      description:
        'Craft a defensive Apocryphal rune that deals 1161 Physical Damage. The rune steals 2200 Armor and applies Minor Maim for 15 seconds, reducing their damage done by 5%.\n\nThe rune also taunts for 15 seconds if it would not cause taunt immunity, and generates Crux. While slotted, damage taken is reduced by 2% per active Crux.',
      baseSkillId: ClassSkillId.ARCANIST_RUNIC_JOLT,
    },
    {
      id: ClassSkillId.ARCANIST_RUNESPITE_WARD,
      name: 'Runespite Ward',
      type: 'active',
      icon: 'ability_arcanist_008',
      description:
        'Like the rune knights of old, summon a shield that absorbs 4800 damage for 6 seconds, scaling off your Max Health.\n\nThe first time you take direct damage, the shield retaliates and deals 0 Magic Damage to the attacker, scaling off your Armor.\n\nConsume Crux to heal yourself for 1600 Health, scaling off your Max Health, per Crux spent.',
      baseSkillId: ClassSkillId.ARCANIST_RUNESPITE_WARD,
    },
    {
      id: ClassSkillId.ARCANIST_IMPERVIOUS_RUNEWARD,
      name: 'Impervious Runeward',
      type: 'active',
      icon: 'ability_arcanist_008_b',
      description:
        'Like the rune knights of old, summon a shield that absorbs 9916 damage for 1 second, and then 2203 damage for 5 seconds if the first shield persists. Both shields scale off your Max Health.\n\nThe first time you take direct damage, the shield retaliates and deals 0 Magic Damage to the attacker, scaling off your Armor.\n\nConsume Crux to heal yourself for 1600 Health, scaling off your Max Health, per Crux spent.',
      baseSkillId: ClassSkillId.ARCANIST_RUNESPITE_WARD,
    },
    {
      id: ClassSkillId.ARCANIST_SPITEWARD_OF_THE_LUCID_MIND,
      name: 'Spiteward of the Lucid Mind',
      type: 'active',
      icon: 'ability_arcanist_008_a',
      description:
        'Like the rune knights of old, summon a shield that absorbs 4800 damage for 6 seconds, scaling off your Max Health.\n\nThe first time you take direct damage, the shield retaliates and deals 0 Magic Damage to the attacker, scaling off your Armor.\n\nConsume Crux to heal yourself 1600 Health, scaling off your Max Health, and refund 30% of Spiteward of the Lucid Mind cost per Crux spent.',
      baseSkillId: ClassSkillId.ARCANIST_RUNESPITE_WARD,
    },
    {
      id: ClassSkillId.ARCANIST_AEGIS_OF_THE_UNSEEN,
      name: 'Aegis of the Unseen',
      type: 'passive',
      icon: 'passive_arcanist_05',
      description:
        'Form a secret soldier within your mind, a defense against arcane forces without. While a beneficial Soldier of Apocrypha ability is active on you, increase your Armor by 3271.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_CIRCUMVENTED_FATE,
      name: 'Circumvented Fate',
      type: 'passive',
      icon: 'passive_arcanist_06',
      description:
        'Casting an Arcanist ability warps the weave of fate around you, granting you and your group members Minor Evasion for 20 seconds and reducing damage from area attacks by 10%. This effect can occur once every 5 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_IMPLACABLE_OUTCOME,
      name: 'Implacable Outcome',
      type: 'passive',
      icon: 'passive_arcanist_08',
      description:
        'The will of an Arcanist is absolute. When you consume Crux, gain 4 Ultimate. This effect can occur once every 8 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_WELLSPRING_OF_THE_ABYSS,
      name: 'Wellspring of the Abyss',
      type: 'passive',
      icon: 'passive_arcanist_07',
      description:
        'Apocryphal knowledge bubbles up from the depths of your psyche, increasing your Health, Magicka, and Stamina Recovery by 81 for each Soldier of Apocrypha ability slotted.',
      isPassive: true,
    },
  ],
};
