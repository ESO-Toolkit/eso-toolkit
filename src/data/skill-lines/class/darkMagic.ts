/**
 * Dark Magic — Sorcerer Skill Line
 * Source: https://eso-hub.com/en/skills/sorcerer/dark-magic
 * Regenerated: 2025-11-14T20:33:08.843Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const darkMagic: SkillLineData = {
  id: 'class.dark-magic',
  name: 'Dark Magic',
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_monsoon',
  sourceUrl: 'https://eso-hub.com/en/skills/sorcerer/dark-magic',
  skills: [
    {
      id: ClassSkillId.SORCERER_NEGATE_MAGIC,
      name: 'Negate Magic',
      type: 'ultimate',
      icon: 'ability_sorcerer_monsoon',
      description:
        'Create a globe of magic suppression for 12 seconds, removing and preventing all enemy area of effect abilities from occurring in the area.\n\nEnemies within the globe are stunned, while enemy players will be silenced rather than stunned.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_NEGATE_MAGIC,
    },
    {
      id: ClassSkillId.SORCERER_ABSORPTION_FIELD,
      name: 'Absorption Field',
      type: 'ultimate',
      icon: 'ability_sorcerer_rushing_winds',
      description:
        'Create a globe of magic suppression for 12 seconds, removing and preventing all enemy area of effect abilities from occurring in the area.\n\nEnemies within the globe are stunned, while enemy players will be silenced rather than stunned.\n\nThe globe also heals you and your allies for 1038 Health every 1 second.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_NEGATE_MAGIC,
    },
    {
      id: ClassSkillId.SORCERER_SUPPRESSION_FIELD,
      name: 'Suppression Field',
      type: 'ultimate',
      icon: 'ability_sorcerer_crushing_monsoon',
      description:
        'Create a globe of magic suppression for 12 seconds, removing and preventing all enemy area of effect abilities from occurring in the area.\n\nEnemies within the globe are stunned, while enemy players will be silenced rather than stunned.\n\nThe globe also damages enemies for 1038 Magic Damage every 1 second.',
      isUltimate: true,
      baseSkillId: ClassSkillId.SORCERER_NEGATE_MAGIC,
    },
    {
      id: ClassSkillId.SORCERER_CRYSTAL_SHARD,
      name: 'Crystal Shard',
      type: 'active',
      icon: 'ability_sorcerer_thunderclap',
      description:
        'Conjure dark crystals to bombard an enemy, dealing 2404 Magic Damage. Your next non-Ultimate ability cast within 3 seconds costs 10% less.',
      baseSkillId: ClassSkillId.SORCERER_CRYSTAL_SHARD,
    },
    {
      id: ClassSkillId.SORCERER_CRYSTAL_FRAGMENTS,
      name: 'Crystal Fragments',
      type: 'active',
      icon: 'ability_sorcerer_thunderstomp',
      description:
        'Conjure dark crystals to bombard an enemy, dealing 2483 Magic Damage. Your next non-Ultimate ability cast within 3 seconds costs 10% less.\n\nWhile slotted on either bar, casting a non-Ultimate ability has a 33% chance of causing your next Crystal Fragments to be instant cast at half cost, dealing 4123 Magic Damage.',
      baseSkillId: ClassSkillId.SORCERER_CRYSTAL_SHARD,
    },
    {
      id: ClassSkillId.SORCERER_CRYSTAL_WEAPON,
      name: 'Crystal Weapon',
      type: 'active',
      icon: 'ability_sorcerer_crystalweapon',
      description:
        "Encase your weapon in dark crystals for 6 seconds, causing your next two Light or Heavy Attacks to deal additional damage and reduce the target's Armor by 1000 for 5 seconds. The first hit deals 2091 Physical Damage and the second deals 836 Physical Damage.\n\n After casting, your next non-Ultimate ability used within 3 seconds costs 10% less.",
      baseSkillId: ClassSkillId.SORCERER_CRYSTAL_SHARD,
    },
    {
      id: ClassSkillId.SORCERER_ENCASE,
      name: 'Encase',
      type: 'active',
      icon: 'ability_sorcerer_cyclone',
      description:
        'Call forth Daedric shards from the earth to immobilize enemies in front of you for 4 seconds.\n\nEnemies hit are afflicted with Major Maim, reducing their damage done by 10% for 10 seconds.',
      baseSkillId: ClassSkillId.SORCERER_ENCASE,
    },
    {
      id: ClassSkillId.SORCERER_SHATTERING_SPINES,
      name: 'Shattering Spines',
      type: 'active',
      icon: 'ability_sorcerer_twister',
      description:
        'Call forth Daedric shards from the earth to encase and immobilize all enemies in front of you for 4 seconds. After the effect ends the shards shatter, dealing 1979 Magic Damage to any enemy that was encased.\n\nEnemies hit are afflicted with Major Maim, reducing their damage done by 10% for 10 seconds.',
      baseSkillId: ClassSkillId.SORCERER_ENCASE,
    },
    {
      id: ClassSkillId.SORCERER_VIBRANT_SHROUD,
      name: 'Vibrant Shroud',
      type: 'active',
      icon: 'ability_sorcerer_crushing_winds',
      description:
        'Call forth a Daedric shroud from the Colored Rooms to heal you and your allies and enfeeble foes in front of you. \n\nYou and allies in the area are healed for 2700 Health and receive Minor Vitality, increasing your healing received and damage shield strength by 6% for 10 seconds.\n\nEnemies are afflicted with Major Maim, reducing their damage done by 10% for 10 seconds.',
      baseSkillId: ClassSkillId.SORCERER_ENCASE,
    },
    {
      id: ClassSkillId.SORCERER_RUNE_PRISON,
      name: 'Rune Prison',
      type: 'active',
      icon: 'ability_sorcerer_dark_fog',
      description:
        'Imprison an enemy in a constricting sphere of dark magic. After a short duration they are stunned for 3 seconds.\n\nThis stun cannot be blocked.',
      baseSkillId: ClassSkillId.SORCERER_RUNE_PRISON,
    },
    {
      id: ClassSkillId.SORCERER_DEFENSIVE_RUNE,
      name: 'Defensive Rune',
      type: 'active',
      icon: 'ability_sorcerer_weakening_fog',
      description:
        'Place a rune of protection on yourself for 2 minutes. While active, the next enemy to attack you is imprisoned in a constricting sphere of dark magic, stunning them after a short delay for 3 seconds.\n\nThis stun cannot be blocked.',
      baseSkillId: ClassSkillId.SORCERER_RUNE_PRISON,
    },
    {
      id: ClassSkillId.SORCERER_RUNE_CAGE,
      name: 'Rune Cage',
      type: 'active',
      icon: 'ability_sorcerer_dark_haze',
      description:
        'Imprison an enemy in a constricting sphere of dark magic. After a short duration they are stunned for 3 seconds. Deals 1799 Magic Damage if the stun lasts the full duration.\n\nThis stun cannot be blocked.',
      baseSkillId: ClassSkillId.SORCERER_RUNE_PRISON,
    },
    {
      id: ClassSkillId.SORCERER_DARK_EXCHANGE,
      name: 'Dark Exchange',
      type: 'active',
      icon: 'ability_sorcerer_dark_exchange',
      description:
        'Bargain with darkness to restore 8000 Health and 3600 Magicka instantly, and an additional 2400 Magicka over 20 seconds. \n\nThe exchange also grants you Minor Berserk for 20 seconds, increasing your damage done by 5%.',
      baseSkillId: ClassSkillId.SORCERER_DARK_EXCHANGE,
    },
    {
      id: ClassSkillId.SORCERER_DARK_CONVERSION,
      name: 'Dark Conversion',
      type: 'active',
      icon: 'ability_sorcerer_dark_conversion',
      description:
        'Bargain with darkness to restore 10000 Health and 4500 Magicka instantly, and an additional 3000 Magicka over 20 seconds.\n\nThe exchange also grants you Minor Berserk for 20 seconds, increasing your damage done by 5%.',
      baseSkillId: ClassSkillId.SORCERER_DARK_EXCHANGE,
    },
    {
      id: ClassSkillId.SORCERER_DARK_DEAL,
      name: 'Dark Deal',
      type: 'active',
      icon: 'ability_sorcerer_dark_deal',
      description:
        'Bargain with darkness to restore 8000 Health and 3600 Stamina instantly, and an additional 2400 Stamina over 10 seconds.\n\nThe exchange also grants you Minor Berserk for 20 seconds, increasing your damage done by 5%.',
      baseSkillId: ClassSkillId.SORCERER_DARK_EXCHANGE,
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_MINES,
      name: 'Daedric Mines',
      type: 'active',
      icon: 'ability_sorcerer_daedric_mines',
      description:
        'Surprise your foes by placing 3 volatile Daedric mines around you, which take 3 seconds to arm and last for 15 seconds.\n\nWhen a mine is triggered it explodes, dealing 2613 Magic Damage and immobilizing the enemy for 2 seconds. Enemies can only be damaged by your mines once every 2 seconds.',
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_MINES,
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_REFUGE,
      name: 'Daedric Refuge',
      type: 'active',
      icon: 'ability_sorcerer_daedric_minefield',
      description:
        "Carefully form 5 protective Daedric wards around you, which take 3 seconds to arm and last for 15 seconds.\n\nWhen a Daedric ward is triggered it grants you or the ally a damage shield that absorbs 3591 damage for 6 seconds. Targets can only be shielded by Daedric Refuge once every 2 seconds and the shield is capped at 43% of the target's Max Health.",
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_MINES,
    },
    {
      id: ClassSkillId.SORCERER_DAEDRIC_TOMB,
      name: 'Daedric Tomb',
      type: 'active',
      icon: 'ability_sorcerer_daedric_tomb',
      description:
        'Surprise your foes by placing 3 volatile Daedric mines at a target location, which arm instantly and last for 15 seconds.\n\nWhen a mine is triggered it explodes, dealing 2700 Magic Damage and immobilizing the enemy for 2 seconds. Enemies can only be damaged by your mines once every 2 seconds.',
      baseSkillId: ClassSkillId.SORCERER_DAEDRIC_MINES,
    },
    {
      id: ClassSkillId.SORCERER_UNHOLY_KNOWLEDGE,
      name: 'Unholy Knowledge',
      type: 'passive',
      icon: 'ability_sorcerer_045',
      description:
        'Reduces the Health, Magicka, and Stamina costs of your non Core Combat abilities by 6%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_BLOOD_MAGIC,
      name: 'Blood Magic',
      type: 'passive',
      icon: 'ability_sorcerer_026',
      description:
        'When you cast a Dark Magic ability with a cost, you heal for 1600 Health if you are not at full Health. This portion of the ability scales off your Max Health.\n\nIf your Health is full, the higher of your Max Magicka or Stamina is increased by 10% for 10 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_PERSISTENCE,
      name: 'Persistence',
      type: 'passive',
      icon: 'ability_sorcerer_054',
      description:
        'After blocking an attack, your next Health, Magicka, or Stamina ability costs 18% less.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_EXPLOITATION,
      name: 'Exploitation',
      type: 'passive',
      icon: 'ability_sorcerer_039',
      description:
        'When you cast a Dark Magic ability you grant Minor Prophecy to you and your group, increasing your Spell Critical rating by 1314 for 20 seconds.',
      isPassive: true,
    },
  ],
};
