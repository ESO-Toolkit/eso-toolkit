/**
 * Restoring Light — Templar Skill Line
 * Source: https://eso-hub.com/en/skills/templar/restoring-light
 * Regenerated: 2025-11-14T20:33:08.869Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const restoringLight: SkillLineData = {
  id: 'class.restoring-light',
  name: 'Restoring Light',
  class: 'Templar',
  category: 'class',
  icon: 'ability_templar_rite_of_passage',
  sourceUrl: 'https://eso-hub.com/en/skills/templar/restoring-light',
  skills: [
    {
      id: ClassSkillId.TEMPLAR_RITE_OF_PASSAGE,
      name: 'Rite of Passage',
      type: 'ultimate',
      icon: 'ability_templar_rite_of_passage',
      description:
        'Channel the grace of the gods, healing you and nearby allies for 2787 Health every 1 second for 4 seconds.\n\nYou cannot move while channeling, but you gain immunity to all disabling effects.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RITE_OF_PASSAGE,
    },
    {
      id: ClassSkillId.TEMPLAR_REMEMBRANCE,
      name: 'Remembrance',
      type: 'ultimate',
      icon: 'ability_templar_remembrance',
      description:
        'Channel the grace of the gods, healing you and nearby allies for 2788 Health every 1 second for 4 seconds.\n\nGain Major Protection, reducing damage you take by 10% for 10 seconds.\n\nYou cannot move while channeling, but you gain immunity to all disabling effects.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RITE_OF_PASSAGE,
    },
    {
      id: ClassSkillId.TEMPLAR_PRACTICED_INCANTATION,
      name: 'Practiced Incantation',
      type: 'ultimate',
      icon: 'ability_templar_practiced_incantation',
      description:
        'Channel the grace of the gods, healing you and nearby allies for 2788 Health every 1 second for 8 seconds.\n\nWhile channeling this ability, you gain immunity to all disabling effects.',
      isUltimate: true,
      baseSkillId: ClassSkillId.TEMPLAR_RITE_OF_PASSAGE,
    },
    {
      id: ClassSkillId.TEMPLAR_RUSHED_CEREMONY,
      name: 'Rushed Ceremony',
      type: 'active',
      icon: 'ability_templar_rushed_ceremony',
      description:
        'Beacon your inner light, healing yourself or a wounded ally in front of you for 3486 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_RUSHED_CEREMONY,
    },
    {
      id: ClassSkillId.TEMPLAR_BREATH_OF_LIFE,
      name: 'Breath of Life',
      type: 'active',
      icon: 'ability_templar_breath_of_life',
      description:
        'Beacon your inner light, healing yourself or a wounded ally in front of you for 3485 Health.\n\nAlso heals one other injured target for 1199 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_RUSHED_CEREMONY,
    },
    {
      id: ClassSkillId.TEMPLAR_HONOR_THE_DEAD,
      name: 'Honor the Dead',
      type: 'active',
      icon: 'ability_templar_honor_the_dead',
      description:
        "Beacon your inner light, healing yourself or a wounded ally in front of you for 3485 Health. \n\nHealing anyone who is below 75% Health restores 18% of the ability's cost every 2 seconds over 6 seconds as Magicka.",
      baseSkillId: ClassSkillId.TEMPLAR_RUSHED_CEREMONY,
    },
    {
      id: ClassSkillId.TEMPLAR_HEALING_RITUAL,
      name: 'Healing Ritual',
      type: 'active',
      icon: 'ability_templar_healing_ritual',
      description: 'Focus your spiritual devotion, healing you and nearby allies for 2613 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_HEALING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_RITUAL_OF_REBIRTH,
      name: 'Ritual of Rebirth',
      type: 'active',
      icon: 'ability_templar_ritual_of_rebirth',
      description:
        "Focus your spiritual devotion, healing you and nearby allies for 2614 Health.\n\nYou heal a single ally outside this ability's radius for an additional 2700 Health.",
      baseSkillId: ClassSkillId.TEMPLAR_HEALING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_HASTY_PRAYER,
      name: 'Hasty Prayer',
      type: 'active',
      icon: 'ability_templar_lingering_ritual',
      description:
        'Focus your spiritual devotion, healing you and nearby allies for 2614 Health.\n\nAffected targets gain Minor Expedition, increasing their Movement Speed by 15% for 10 seconds.',
      baseSkillId: ClassSkillId.TEMPLAR_HEALING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_RESTORING_AURA,
      name: 'Restoring Aura',
      type: 'active',
      icon: 'ability_templar_restoring_sigil',
      description:
        'Champion the cause of divine glory to apply Minor Endurance, Minor Fortitude, and Minor Intellect to nearby group members for 20 seconds, increasing Health, Magicka, and Stamina Recovery by 15%.\n\nWhile slotted on either bar you gain these effects.',
      baseSkillId: ClassSkillId.TEMPLAR_RESTORING_AURA,
    },
    {
      id: ClassSkillId.TEMPLAR_RADIANT_AURA,
      name: 'Radiant Aura',
      type: 'active',
      icon: 'ability_templar_life_giving_sigil',
      description:
        'Champion the cause of divine glory to apply Minor Endurance, Minor Fortitude, and Minor Intellect to you and nearby group members for 1 minute, increasing your Health, Magicka, and Stamina Recovery by 15%.\n\nWhile slotted on either bar you gain these effects.',
      baseSkillId: ClassSkillId.TEMPLAR_RESTORING_AURA,
    },
    {
      id: ClassSkillId.TEMPLAR_REPENTANCE,
      name: 'Repentance',
      type: 'active',
      icon: 'ability_templar_persistant_sigil',
      description:
        'Consecrate the souls of the fallen, healing you and your allies for 3000 Health and restoring 3000 Stamina to you for each corpse nearby.\n\nWhile slotted on either bar, you gain Minor Fortitude, Minor Endurance, and Minor Intellect, increasing your Health, Stamina, and Magicka Recovery by 15%.',
      baseSkillId: ClassSkillId.TEMPLAR_RESTORING_AURA,
    },
    {
      id: ClassSkillId.TEMPLAR_RUNE_FOCUS,
      name: 'Rune Focus',
      type: 'active',
      icon: 'ability_templar_rune_focus',
      description:
        'Create a rune of celestial protection and gain Major Resolve for 20 seconds, increasing your Physical Resistance and Spell Resistance by 5948. \n\nWhile the rune is active you heal for 319 Health every 1 second, scaling off your Max Health. Standing within the rune increases the healing done by 200%.',
      baseSkillId: ClassSkillId.TEMPLAR_RUNE_FOCUS,
    },
    {
      id: ClassSkillId.TEMPLAR_CHANNELED_FOCUS,
      name: 'Channeled Focus',
      type: 'active',
      icon: 'ability_templar_channeled_focus',
      description:
        'Create a rune of celestial protection and gain Major Resolve for 25 seconds, increasing your Physical Resistance and Spell Resistance by 5948. You also recover 242 Magicka every 1 second over the duration.\n\nWhile the rune is active you heal for 319 Health every 1 second, scaling off your Max Health. Standing within the rune increases the healing done by 200%.',
      baseSkillId: ClassSkillId.TEMPLAR_RUNE_FOCUS,
    },
    {
      id: ClassSkillId.TEMPLAR_RESTORING_FOCUS,
      name: 'Restoring Focus',
      type: 'active',
      icon: 'ability_templar_uninterrupted_focus',
      description:
        'Create a rune of celestial protection and gain Major Resolve for 20 seconds, increasing your Physical Resistance and Spell Resistance by 5948. You also recover 242 Stamina every 1 second over the duration.\n\nWhile the rune is active you heal for 413 Health every 1 second, scaling off your Max Health. Standing within the rune increases the healing done by 200%.',
      baseSkillId: ClassSkillId.TEMPLAR_RUNE_FOCUS,
    },
    {
      id: ClassSkillId.TEMPLAR_CLEANSING_RITUAL,
      name: 'Cleansing Ritual',
      type: 'active',
      icon: 'ability_templar_cleansing_ritual',
      description:
        'Exalt in the sacred light of the Aedra, cleansing up to 2 harmful effects from yourself immediately and healing you and nearby allies for 843 Health every 2 seconds for 20 seconds.\n\nAllies in the area can activate the Purify synergy, cleansing all harmful effects from themselves and healing for 1912 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_CLEANSING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_EXTENDED_RITUAL,
      name: 'Extended Ritual',
      type: 'active',
      icon: 'ability_templar_extended_ritual',
      description:
        'Exalt in the sacred light of the Aedra, cleansing up to 5 harmful effects from yourself immediately and healing you and nearby allies for 844 Health every 2 seconds for 30 seconds.\n\nAllies in the area can activate the Purify synergy, cleansing all harmful effects from themselves and healing for 1912 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_CLEANSING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_RITUAL_OF_RETRIBUTION,
      name: 'Ritual of Retribution',
      type: 'active',
      icon: 'ability_templar_purifying_ritual',
      description:
        'Exalt in the sacred light of the Aedra, cleansing up to 2 harmful effects from yourself immediately.  While in the area, enemies take 435 Magic Damage every 2 seconds for 20 seconds which increases by 12% per tick.  \n\nAllies in the area can activate the Purify synergy, cleansing all harmful effects from themselves and healing for 1912 Health.',
      baseSkillId: ClassSkillId.TEMPLAR_CLEANSING_RITUAL,
    },
    {
      id: ClassSkillId.TEMPLAR_LIGHT_WEAVER,
      name: 'Light Weaver',
      type: 'passive',
      icon: 'ability_templar_012',
      description:
        'When you heal an ally under 50% Health with a Restoring Light ability, you grant them 2 Ultimate. Activating an ability with a cast or channel time while in combat causes you to automatically block all attacks at no cost for 2 seconds, up to once every 15 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_MASTER_RITUALIST,
      name: 'Master Ritualist',
      type: 'passive',
      icon: 'ability_templar_026',
      description:
        'Increases resurrection speed by 20%. Resurrected allies return with 100% more Health. Gives you a 50% chance to fill an empty Soul Gem after each successful resurrection.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_MENDING,
      name: 'Mending',
      type: 'passive',
      icon: 'ability_templar_004',
      description:
        "Increases your healing done by up to 13%, in proportion to the severity of the target's wounds.",
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_SACRED_GROUND,
      name: 'Sacred Ground',
      type: 'passive',
      icon: 'ability_templar_014',
      description:
        'While standing in your own Cleansing Ritual, Rune Focus, or Rite of Passage area effects and for up to 4 seconds after leaving them you gain Minor Mending, increasing your healing done by 8%. Also increases the amount of damage you can block by 10% for the duration.',
      isPassive: true,
    },
  ],
};
