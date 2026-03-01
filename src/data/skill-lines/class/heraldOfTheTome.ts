/**
 * Herald of the Tome — Arcanist Skill Line
 * Source: https://eso-hub.com/en/skills/arcanist/herald-of-the-tome
 * Regenerated: 2025-11-14T20:33:08.637Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const heraldOfTheTome: SkillLineData = {
  id: 'class.herald-of-the-tome',
  name: 'Herald of the Tome',
  class: 'Arcanist',
  category: 'class',
  icon: 'ability_arcanist_006',
  sourceUrl: 'https://eso-hub.com/en/skills/arcanist/herald-of-the-tome',
  skills: [
    {
      id: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
      name: 'The Unblinking Eye',
      type: 'ultimate',
      icon: 'ability_arcanist_006',
      description:
        "Tear open the fabric of the Aurbis to summon a scion of Hermaeus Mora. This being casts forth a beam that rends asunder reality for 6 seconds and deals 1115 Magic Damage to enemies within 5 meters every 0.5 seconds. The scion's beam can be repositioned by recasting The Unblinking Eye.",
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
    },
    {
      id: ClassSkillId.ARCANIST_THE_LANGUID_EYE,
      name: 'The Languid Eye',
      type: 'ultimate',
      icon: 'ability_arcanist_006_b',
      description:
        "Tear open the fabric of the Aurbis to summon a scion of Hermaeus Mora. This being casts forth a beam that rends asunder reality for 6 seconds that deals 1115 Magic Damage to enemies within 5 meters every 0.5 seconds and snares them by 50% for 3 seconds. Every 0.5 seconds, the beam's damage increases by 7%.\n\nThe scion's beam can be repositioned by recasting The Languid Eye.",
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
    },
    {
      id: ClassSkillId.ARCANIST_THE_TIDE_KING_S_GAZE,
      name: "The Tide King's Gaze",
      type: 'ultimate',
      icon: 'ability_arcanist_006_a',
      description:
        "Tear open the fabric of the Aurbis to summon a scion of Hermaeus Mora. This being casts forth a beam that rends asunder reality for 8 seconds that deals 1151 Magic Damage to enemies within 5 meters every 0.5 seconds. \n\nThe scion's beam automatically follows the initial target, and hunts for a new one within 8 meters if it is slain.",
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
    },
    {
      id: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
      name: 'Abyssal Impact',
      type: 'active',
      icon: 'ability_arcanist_003',
      description:
        'Infuse your arm with abyssal magic to form tentacles that lash out at your foes, dealing 1939 Physical Damage. Enemies are immobilized for 3 seconds and marked with Abyssal Ink for 20 seconds.\n\nYou deal 5% increased damage to enemies drenched in Abyssal Ink.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_CEPHALIARCH_S_FLAIL,
      name: "Cephaliarch's Flail",
      type: 'active',
      icon: 'ability_arcanist_003_a',
      description:
        'Infuse your arm with abyssal magic to form tentacles that lash out at your foes dealing 1939 Physical Damage and generating Crux. Enemies are immobilized for 3 seconds and marked with Abyssal Ink for 20 seconds.\n\nIf an enemy is hit, you for heal for 1000 Health, once per cast.\n\nYou deal 5% increased damage to enemies drenched in Abyssal Ink.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_TENTACULAR_DREAD,
      name: 'Tentacular Dread',
      type: 'active',
      icon: 'ability_arcanist_003_b',
      description:
        'Infuse your arm with abyssal magic to form tentacles that lash out at your foes, dealing 2002 Frost Damage. Enemies are immobilized for 3 seconds and marked with Abyssal Ink for 20 seconds.\n\nYou deal 5% increased damage to enemies drenched in Abyssal Ink.\n\nConsume all Crux and increase Tentacular Dread damage by 33% and damage to foes drenched in Abyssal Ink by 2% per Crux spent.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_RUNEBLADES,
      name: 'Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001',
      description:
        'Craft a series of Apocryphal runes before launching them at a foe, dealing 695 Magic Damage three times and generating Crux.\n\nThis ability deals 3% increased damage for each active Crux when cast.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
    },
    {
      id: ClassSkillId.ARCANIST_ESCALATING_RUNEBLADES,
      name: 'Escalating Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001_b',
      description:
        'Craft a series of Apocryphal runes before launching them at a foe, dealing 696 Magic Damage 766 Magic Damage, and 917 Magic Damage and generating Crux. The last rune explodes, dealing damage to all enemies within 8 meters of the target.\n\nThis ability deals 3% increased damage for each active Crux when cast.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
      alternateIds: [188780],
    },
    {
      id: ClassSkillId.ARCANIST_WRITHING_RUNEBLADES,
      name: 'Writhing Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001_a',
      description:
        'Craft a series of Apocryphal runes before launching them at a foe, dealing 718 Magic Damage three times and generating Crux. \n\nThis ability gains between 1095 and 2191 Weapon and Spell Critical rating and deals 3% increased damage for each active Crux when cast.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
    },
    {
      id: ClassSkillId.ARCANIST_FATECARVER,
      name: 'Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002',
      description:
        'Harness pure knowledge into a beam of energy that scars the world in front of you. Channel the beam for up to 4 seconds, dealing 879 Magic Damage every 0.3 seconds to up to 6 enemies.\n\nCasting Fatecarver consumes all Crux and increases damage done by 33% per Crux spent.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
    },
    {
      id: ClassSkillId.ARCANIST_EXHAUSTING_FATECARVER,
      name: 'Exhausting Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002_a',
      description:
        'Harness pure knowledge into a beam of energy that scars the world in front of you. Channel the beam for up to 4 seconds, dealing 879 Magic Damage every 0.3 seconds to up to 6 enemies and snares them by 15%.\n\nCasting Exhausting Fatecarver consumes all Crux and increases damage done by 33%, duration by 0.3 seconds, and snare by 15% per Crux spent.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
    },
    {
      id: ClassSkillId.ARCANIST_PRAGMATIC_FATECARVER,
      name: 'Pragmatic Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002_b',
      description:
        'Channel a beam of energy in front of you for up to 4 seconds, dealing 879 Magic Damage every 0.3 seconds to up to 6 enemies, and gain a damage shield that absorbs up to 3137 damage and grants interrupt immunity.\n\nCasting Pragmatic Fatecarver consumes all Crux and increases damage done by 33%, and decreases cost by 16% per Crux spent.\n\nThis ability is considered direct damage.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
      alternateIds: [193398],
    },
    {
      id: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
      name: 'The Imperfect Ring',
      type: 'active',
      icon: 'ability_arcanist_004',
      description:
        'Summon a flawed rune under an enemy that etches foes nearby with scrawled glyphs, dealing 4631 Magic Damage over 20 seconds.\n\nAn ally near the initial target can activate the Runebreak synergy, dealing 2698 Frost Damage to enemies within 7 meters.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_FULMINATING_RUNE,
      name: 'Fulminating Rune',
      type: 'active',
      icon: 'ability_arcanist_004_b',
      description:
        'Summon an explosive rune under an enemy that etches foes nearby with scrawled glyphs, dealing 4642 Magic Damage over 20 seconds.\n\nThe rune lingers on the initial target for 6 seconds before detonating, dealing 1438 Frost Damage to enemies within 7 meters. Rune detonation cannot be primed with Fulminating Rune again for 6 seconds.\n\nUp to 3 allies near the initial target can activate the Runebreak synergy, dealing 2698 Frost Damage to enemies within 7 meters.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_RUNE_OF_DISPLACEMENT,
      name: 'Rune of Displacement',
      type: 'active',
      icon: 'ability_arcanist_004_a',
      description:
        'Summon a discharging rune under an enemy. After 2 seconds the rune pulses, pulling in foes between 2 to 10 meters and etching them with scrawled glyphs that deal 4780 Magic Damage over 18 seconds.\n\nAn ally near the initial target can activate the Runebreak synergy, dealing 2698 Frost Damage to enemies within 7 meters.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
      name: "Tome-Bearer's Inspiration",
      type: 'active',
      icon: 'ability_arcanist_005',
      description:
        'Etch a series of runes onto your weapon that pulse with power once every 5 seconds. Each pulse enhances your class abilities, and striking an enemy with one deals an additional 1161 Magic Damage and generates Crux if you have none.\n\nWhile slotted on either ability bar, gain Major Brutality and Major Sorcery, increasing your Weapon and Spell Damage by 20%.',
      baseSkillId: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
    },
    {
      id: ClassSkillId.ARCANIST_INSPIRED_SCHOLARSHIP,
      name: 'Inspired Scholarship',
      type: 'active',
      icon: 'ability_arcanist_005_a',
      description:
        'Etch a series of runes onto your weapon that pulse with power once every 3 seconds. Each pulse enhances your class abilities, and striking an enemy with one deals an additional 935 Magic Damage and generates Crux if you have none.\n\nWhile slotted on either ability bar, gain Major Brutality and Major Sorcery, increasing your Weapon and Spell Damage by 20%.',
      baseSkillId: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
    },
    {
      id: ClassSkillId.ARCANIST_RECUPERATIVE_TREATISE,
      name: 'Recuperative Treatise',
      type: 'active',
      icon: 'ability_arcanist_005_b',
      description:
        'Etch a series of runes onto your weapon that pulse with power once every 5 seconds. Each pulse enhances your class abilities, and striking an enemy with one deals an additional 1161 Magic Damage, restores 600 Magicka and Stamina, and generates Crux if you have none.\n\nWhile slotted on either ability bar, gain Major Brutality and Major Sorcery, increasing your Weapon and Spell Damage by 20%.',
      baseSkillId: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
    },
    {
      id: ClassSkillId.ARCANIST_FATED_FORTUNE,
      name: 'Fated Fortune',
      type: 'passive',
      icon: 'passive_arcanist_04',
      description:
        'Warp fate when you generate or consume Crux, increasing your Critical Damage and Critical Healing by 12% for 7 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_HARNESSED_QUINTESSENCE,
      name: 'Harnessed Quintessence',
      type: 'passive',
      icon: 'passive_arcanist_02',
      description:
        'You master the warp and weft of your very soul. When you are restored Magicka or Stamina, increase your Weapon and Spell Damage by 284 for 10 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_PSYCHIC_LESION,
      name: 'Psychic Lesion',
      type: 'passive',
      icon: 'passive_arcanist_03',
      description:
        'Your attacks wound the mind with heretical knowledge, increasing damage dealt by Status Effects by 15% and Status Effect Chance by 55%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_SPLINTERED_SECRETS,
      name: 'Splintered Secrets',
      type: 'passive',
      icon: 'passive_arcanist_01',
      description:
        "What they don't know can kill them. Increase your Physical and Spell Penetration by 1240 per Herald of the Tome ability slotted.",
      isPassive: true,
    },
  ],
};
