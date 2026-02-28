/**
 * Siphoning — Nightblade Skill Line
 * Source: https://eso-hub.com/en/skills/nightblade/siphoning
 * Regenerated: 2025-11-14T20:33:08.838Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const siphoning: SkillLineData = {
  id: 'class.siphoning',
  name: 'Siphoning',
  class: 'Nightblade',
  category: 'class',
  icon: 'ability_nightblade_018',
  sourceUrl: 'https://eso-hub.com/en/skills/nightblade/siphoning',
  skills: [
    {
      id: ClassSkillId.NIGHTBLADE_SOUL_SHRED,
      name: 'Soul Shred',
      type: 'ultimate',
      icon: 'ability_nightblade_018',
      description:
        "Ravage nearby enemies' souls with a night rune, dealing 3486 Magic Damage and stunning them for 4 seconds. \n\nAn ally can target a ravaged enemy and activate the Soul Leech synergy, dealing 3122 Magic Damage to them and healing for the damage caused.",
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_SOUL_SHRED,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SOUL_TETHER,
      name: 'Soul Tether',
      type: 'ultimate',
      icon: 'ability_nightblade_018_a',
      description:
        "Ravage nearby enemies' souls with a night rune, dealing 3600 Magic Damage, healing for half the damage, and stunning them for 4 seconds. \n\nRavaged enemies are tethered to you for 8 seconds, and while they remain within 10 meters, you siphon 627 Health from them every second.\n\nAn ally can target a ravaged enemy and activate the Soul Leech synergy, dealing 3122 Magic Damage to them and healing for the damage caused.",
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_SOUL_SHRED,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SOUL_SIPHON,
      name: 'Soul Siphon',
      type: 'ultimate',
      icon: 'ability_nightblade_018_b',
      description:
        'Sanctify your soul and the souls of nearby allies with a night rune, healing for 3600 Health and an additional 9384 Health over 4 seconds.\n\nYou and your allies will also receive Major Vitality, increasing your healing received and damage shield strength by 12% for 4 seconds.\n\nAn ally can target a nearby enemy and activate the Soul Leech synergy, dealing 3122 Magic Damage to them and healing for the damage caused.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_SOUL_SHRED,
    },
    {
      id: ClassSkillId.NIGHTBLADE_STRIFE,
      name: 'Strife',
      type: 'active',
      icon: 'ability_nightblade_012',
      description:
        "Steal an enemy's life force, dealing 1548 Magic Damage and healing you or a nearby ally for 50% of the damage inflicted every 2 seconds for 10 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_STRIFE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SWALLOW_SOUL,
      name: 'Swallow Soul',
      type: 'active',
      icon: 'ability_nightblade_012_a',
      description:
        "Steal an enemy's life force, dealing 2160 Magic Damage and healing you for 35% of the damage inflicted every 2 seconds for 10 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_STRIFE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_FUNNEL_HEALTH,
      name: 'Funnel Health',
      type: 'active',
      icon: 'ability_nightblade_012_b',
      description:
        "Steal an enemy's life force, dealing 1600 Magic Damage and healing you or 3 other nearby allies for 50% of the damage inflicted every 2 seconds for 10 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_STRIFE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_CRIPPLE,
      name: 'Cripple',
      type: 'active',
      icon: 'ability_nightblade_006',
      description:
        "Sap an enemy's agility and wrack them with pain, dealing 4631 Magic Damage over 20 seconds and reducing their Movement Speed by 30% for 4 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_CRIPPLE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_CRIPPLING_GRASP,
      name: 'Crippling Grasp',
      type: 'active',
      icon: 'ability_nightblade_006_b',
      description:
        "Sap an enemy's agility and wrack them with pain, dealing 1199 Magic Damage and an additional 4350 Magic Damage over 20 seconds, immobilizing them for 2 seconds, and reducing their Movement Speed by 30% for 4 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_CRIPPLE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DEBILITATE,
      name: 'Debilitate',
      type: 'active',
      icon: 'ability_nightblade_006_a',
      description:
        "Sap an enemy's agility and wrack them with pain, dealing 4785 Magic Damage over 20 seconds and reducing their Movement Speed by 50% for 4 seconds.\n\nThis ability has a higher chance of applying the Overcharged status effect.",
      baseSkillId: ClassSkillId.NIGHTBLADE_CRIPPLE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SIPHONING_STRIKES,
      name: 'Siphoning Strikes',
      type: 'active',
      icon: 'ability_nightblade_003',
      description:
        'Channel a portion of your soul to convert Health to 2000 Magicka and Stamina.\n\nWhile slotted on either bar, your soul yearns for the warmth of life. All damage you deal heals you for 1250 Health, up to once every 1 second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SIPHONING_STRIKES,
    },
    {
      id: ClassSkillId.NIGHTBLADE_LEECHING_STRIKES,
      name: 'Leeching Strikes',
      type: 'active',
      icon: 'ability_nightblade_003_a',
      description:
        'Channel a portion of your soul to convert Health to 2000 Magicka and Stamina.\n\nWhile slotted on either bar, your soul yearns for the warmth of life. All damage you deal heals you for 1800 Health and reduces the cost of your next Leeching Strikes by 10%, stacking up to 10 times. This effect can occur once every 1 second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SIPHONING_STRIKES,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SIPHONING_ATTACKS,
      name: 'Siphoning Attacks',
      type: 'active',
      icon: 'ability_nightblade_003_b',
      description:
        'Channel a portion of your soul to convert Health to 2600 Magicka and Stamina.\n\nWhile slotted on either bar, your soul yearns for the warmth of life. All damage you deal heals you for 1250 Health and restores 200 Magicka and Stamina, up to once every 1 second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SIPHONING_STRIKES,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DRAIN_POWER,
      name: 'Drain Power',
      type: 'active',
      icon: 'ability_nightblade_013',
      description:
        "Siphon the vigor from your enemies' blood, dealing 1742 Magic Damage to all nearby enemies.\n\nIf an enemy is hit, you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_DRAIN_POWER,
    },
    {
      id: ClassSkillId.NIGHTBLADE_POWER_EXTRACTION,
      name: 'Power Extraction',
      type: 'active',
      icon: 'ability_nightblade_013_b',
      description:
        "Siphon the vigor from your enemies' blood, dealing 1742 Disease Damage to all nearby enemies.\n\nIf an enemy is hit you gain Major Brutality and Sorcery, and Minor Courage increasing your Weapon and Spell Damage by 20% and 215 for 30 seconds. Enemies hit have Minor Cowardice applied to them for 10 seconds, reducing their Weapon and Spell Damage by 215.",
      baseSkillId: ClassSkillId.NIGHTBLADE_DRAIN_POWER,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SAP_ESSENCE,
      name: 'Sap Essence',
      type: 'active',
      icon: 'ability_nightblade_013_a',
      description:
        "Siphon the vigor from your enemies' blood, dealing 1742 Magic Damage to all nearby enemies and healing you and your allies for 599 plus 20% more for each enemy hit.\n\nIf an enemy is hit, you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds.",
      baseSkillId: ClassSkillId.NIGHTBLADE_DRAIN_POWER,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MALEVOLENT_OFFERING,
      name: 'Malevolent Offering',
      type: 'active',
      icon: 'ability_nightblade_011',
      description:
        'Pour out your lifesblood and channel the arcane, healing yourself or an ally in front of you for 3486 Health, while draining 1080 Health from yourself over 3 seconds.',
      baseSkillId: ClassSkillId.NIGHTBLADE_MALEVOLENT_OFFERING,
    },
    {
      id: ClassSkillId.NIGHTBLADE_HEALTHY_OFFERING,
      name: 'Healthy Offering',
      type: 'active',
      icon: 'ability_nightblade_011_a',
      description:
        'Pour out your lifesblood and channel the arcane, healing yourself or an ally in front of you for 3600 Health, while draining 1080 Health from yourself over 3 seconds.\n\nAfter casting, gain Minor Mending for 10 seconds, increasing your healing done by 8%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_MALEVOLENT_OFFERING,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHREWD_OFFERING,
      name: 'Shrewd Offering',
      type: 'active',
      icon: 'ability_nightblade_011_b',
      description:
        'Pour out your lifesblood and channel the arcane, healing yourself or an ally in front of you for 3485 Health, while draining 810 Health from yourself over 2 seconds.',
      baseSkillId: ClassSkillId.NIGHTBLADE_MALEVOLENT_OFFERING,
    },
    {
      id: ClassSkillId.NIGHTBLADE_CATALYST,
      name: 'Catalyst',
      type: 'passive',
      icon: 'passive_sorcerer_046',
      description: 'After drinking a potion you gain 22 Ultimate.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MAGICKA_FLOOD,
      name: 'Magicka Flood',
      type: 'passive',
      icon: 'passive_sorcerer_008',
      description: 'Increases your Max Magicka and Stamina by 6%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SOUL_SIPHONER,
      name: 'Soul Siphoner',
      type: 'passive',
      icon: 'passive_sorcerer_036',
      description: 'Increases your healing done by 3% for each Siphoning ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_TRANSFER,
      name: 'Transfer',
      type: 'passive',
      icon: 'passive_sorcerer_002',
      description:
        'Casting a Siphoning ability while in combat generates 2 Ultimate. This effect can occur once every 4 seconds.',
      isPassive: true,
    },
  ],
};
