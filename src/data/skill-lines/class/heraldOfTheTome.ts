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
        "Beam damage increases over time, snares enemies, repositionable. Every 0.5 seconds, the beam's damage increases by 7%. Snares enemies by 50% for 3 seconds.",
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
    },
    {
      id: ClassSkillId.ARCANIST_THE_TIDE_KING_S_GAZE,
      name: "The Tide King's Gaze",
      type: 'ultimate',
      icon: 'ability_arcanist_006_a',
      description:
        'Extended duration, beam automatically follows targets. Hunts for new target within 8 meters if initial target is slain.',
      isUltimate: true,
      baseSkillId: ClassSkillId.ARCANIST_THE_UNBLINKING_EYE,
    },
    {
      id: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
      name: 'Abyssal Impact',
      type: 'active',
      icon: 'ability_arcanist_003',
      description: 'Form tentacles that immobilize enemies and mark with Abyssal Ink.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_CEPHALIARCH_S_FLAIL,
      name: "Cephaliarch's Flail",
      type: 'active',
      icon: 'ability_arcanist_003_a',
      description: 'Stamina morph that heals you when hitting enemies.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_TENTACULAR_DREAD,
      name: 'Tentacular Dread',
      type: 'active',
      icon: 'ability_arcanist_003_b',
      description: 'Consumes Crux for increased damage and Abyssal Ink bonus.',
      baseSkillId: ClassSkillId.ARCANIST_ABYSSAL_IMPACT,
    },
    {
      id: ClassSkillId.ARCANIST_RUNEBLADES,
      name: 'Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001',
      description: 'Launch series of runes dealing escalating damage.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
    },
    {
      id: ClassSkillId.ARCANIST_ESCALATING_RUNEBLADES,
      name: 'Escalating Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001_b',
      description: 'Final rune explodes for AoE damage.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
      alternateIds: [188780],
    },
    {
      id: ClassSkillId.ARCANIST_WRITHING_RUNEBLADES,
      name: 'Writhing Runeblades',
      type: 'active',
      icon: 'ability_arcanist_001_a',
      description: 'Gains Critical rating based on active Crux.',
      baseSkillId: ClassSkillId.ARCANIST_RUNEBLADES,
    },
    {
      id: ClassSkillId.ARCANIST_FATECARVER,
      name: 'Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002',
      description: 'Channel beam of pure knowledge for sustained damage.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
    },
    {
      id: ClassSkillId.ARCANIST_EXHAUSTING_FATECARVER,
      name: 'Exhausting Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002_a',
      description: 'Adds snare and extends duration per Crux.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
    },
    {
      id: ClassSkillId.ARCANIST_PRAGMATIC_FATECARVER,
      name: 'Pragmatic Fatecarver',
      type: 'active',
      icon: 'ability_arcanist_002_b',
      description: 'Grants damage shield and interrupt immunity.',
      baseSkillId: ClassSkillId.ARCANIST_FATECARVER,
      alternateIds: [193398],
    },
    {
      id: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
      name: 'The Imperfect Ring',
      type: 'active',
      icon: 'ability_arcanist_004',
      description: 'Summon flawed rune for damage over time.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_FULMINATING_RUNE,
      name: 'Fulminating Rune',
      type: 'active',
      icon: 'ability_arcanist_004_b',
      description: 'Rune detonates after delay for Frost AoE damage.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_RUNE_OF_DISPLACEMENT,
      name: 'Rune of Displacement',
      type: 'active',
      icon: 'ability_arcanist_004_a',
      description: 'Pulls enemies in before applying damage over time.',
      baseSkillId: ClassSkillId.ARCANIST_THE_IMPERFECT_RING,
    },
    {
      id: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
      name: "Tome-Bearer's Inspiration",
      type: 'active',
      icon: 'ability_arcanist_005',
      description: 'Enhance weapon with pulsing runes for class ability damage.',
      baseSkillId: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
    },
    {
      id: ClassSkillId.ARCANIST_INSPIRED_SCHOLARSHIP,
      name: 'Inspired Scholarship',
      type: 'active',
      icon: 'ability_arcanist_005_a',
      description: 'Pulses every 3 seconds, generates Crux when none active.',
      baseSkillId: ClassSkillId.ARCANIST_TOME_BEARER_S_INSPIRATION,
    },
    {
      id: ClassSkillId.ARCANIST_RECUPERATIVE_TREATISE,
      name: 'Recuperative Treatise',
      type: 'active',
      icon: 'ability_arcanist_005_b',
      description: 'Pulses every 5 seconds, restores Magicka and Stamina.',
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
        'When you are restored Magicka or Stamina, increase your Weapon and Spell Damage by 284 for 10 seconds.',
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
        'Increase your Physical and Spell Penetration by 1240 per Herald of the Tome ability slotted.',
      isPassive: true,
    },
  ],
};
