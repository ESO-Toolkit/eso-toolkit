/**
 * Shadow — Nightblade Skill Line
 * Source: https://eso-hub.com/en/skills/nightblade/shadow
 * Regenerated: 2025-11-14T20:33:08.833Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const shadow: SkillLineData = {
  id: 'class.shadow',
  name: 'Shadow',
  class: 'Nightblade',
  category: 'class',
  icon: 'ability_nightblade_015',
  sourceUrl: 'https://eso-hub.com/en/skills/nightblade/shadow',
  skills: [
    {
      id: ClassSkillId.NIGHTBLADE_CONSUMING_DARKNESS,
      name: 'Consuming Darkness',
      type: 'ultimate',
      icon: 'ability_nightblade_015',
      description:
        'Conjure a ring of shadow, reducing the Movement Speed of enemies by 70% and granting you and your allies Major Protection, reducing your damage taken by 10%.\n\nAllies in the area can activate the Hidden Refresh synergy, granting them invisibility, increasing their Movement Speed by 70%, and healing them for 9110 Health over 4 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_CONSUMING_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_BOLSTERING_DARKNESS,
      name: 'Bolstering Darkness',
      type: 'ultimate',
      icon: 'ability_nightblade_015_a',
      description:
        'Conjure a ring of shadow, reducing the Movement Speed of enemies by 70% and granting you and your allies Major Protection for 10 seconds, reducing your damage taken by 10%.\n\nAllies in the area can activate the Hidden Refresh synergy, granting them invisibility, increasing their Movement Speed by 70%, and healing them for 9110 Health over 4 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_CONSUMING_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_VEIL_OF_BLADES,
      name: 'Veil of Blades',
      type: 'ultimate',
      icon: 'ability_nightblade_015_b',
      description:
        'Conjure a ring of shadow, reducing the Movement Speed of enemies by 70%, dealing 1438 Magic Damage to them every 1 second, and granting you and your allies Major Protection, reducing your damage taken by 10%. \n\nAllies in the area can activate the Hidden Refresh synergy, granting them invisibility, increasing their Movement Speed by 70%, and healing them for 9110 Health over 4 seconds.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NIGHTBLADE_CONSUMING_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHADOW_CLOAK,
      name: 'Shadow Cloak',
      type: 'active',
      icon: 'ability_nightblade_004',
      description:
        'Cloak yourself in shadow to become invisible. When moving your Magicka Recovery is disabled and when not moving Shadow Cloak is half cost.\n\nWhen Shadow Cloak begins or ends, you gain Born From Shadow for 10 seconds, increasing your damage done to monsters by 10%.\n\nWhile slotted on either bar, you gain Minor Protection, reducing your damage taken by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SHADOW_CLOAK,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHADOWY_DISGUISE,
      name: 'Shadowy Disguise',
      type: 'active',
      icon: 'ability_nightblade_004_a',
      description:
        'Cloak yourself in shadow to become invisible. When moving your Magicka Recovery is disabled and when not moving Shadowy Disguise is half cost. Your next direct damage attack will Critically Strike.\n\nWhen Shadowy Disguise begins or ends, you gain Born From Shadow for 10 seconds, increasing your damage done to monsters by 10%.\n\nWhile slotted on either bar, you gain Minor Protection, reducing your damage taken by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SHADOW_CLOAK,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DARK_CLOAK,
      name: 'Dark Cloak',
      type: 'active',
      icon: 'ability_nightblade_004_b',
      description:
        'Shroud yourself in protective shadow to heal for 853 Health every 1 second, over 3 seconds, increasing by an additional 150% while Bracing. This portion of the ability scales off your Max Health.\n\nWhile slotted on either bar, you gain Minor Protection, reducing your damage taken by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SHADOW_CLOAK,
    },
    {
      id: ClassSkillId.NIGHTBLADE_BLUR,
      name: 'Blur',
      type: 'active',
      icon: 'ability_nightblade_009',
      description:
        'Surround yourself in a phantasmic aura to gain Major Evasion, reducing damage from area attacks by 20% for 20 seconds.\n\nWhile active, taking direct damage reduces the cost of your next Roll Dodge by 10%, up to a maximum of 100%. This effect can stack up to once every half second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_BLUR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MIRAGE,
      name: 'Mirage',
      type: 'active',
      icon: 'ability_nightblade_009_a',
      description:
        'Surround yourself in a phantasmic aura to gain Major Evasion and Minor Resolve, reducing damage from area attacks by 20% and increasing your Physical and Spell Resistance by 2974 for 20 seconds.\n\nWhile active, taking direct damage reduces the cost of your next Roll Dodge by 10%, up to a maximum of 100%. This effect can stack up to once every half second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_BLUR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_PHANTASMAL_ESCAPE,
      name: 'Phantasmal Escape',
      type: 'active',
      icon: 'ability_nightblade_009_b',
      description:
        'Surround yourself in a phantasmic aura to gain Major Evasion, reducing damage from area attacks by 20% for 20 seconds.\n\nActivating this ability removes all snares and immobilizations from you and grants immunity to them for 4 seconds.\n\nWhile active, taking direct damage reduces the cost of your next Roll Dodge by 10%, up to a maximum of 100%. This effect can stack up to once every half second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_BLUR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_ASPECT_OF_TERROR,
      name: 'Aspect of Terror',
      type: 'active',
      icon: 'ability_nightblade_016',
      description:
        'Summon a dark spirit to terrify nearby enemies, causing them to cower in fear for 2 seconds and be afflicted with Major Cowardice for 10 seconds, reducing their Weapon and Spell Damage by 430.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASPECT_OF_TERROR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MASS_HYSTERIA,
      name: 'Mass Hysteria',
      type: 'active',
      icon: 'ability_nightblade_016_a',
      description:
        'Summon a dark spirit to terrify all nearby enemies, causing them to cower in fear for 3 seconds and be afflicted with Major Cowardice for 10 seconds, reducing their Weapon and Spell Damage by 430.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASPECT_OF_TERROR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_MANIFESTATION_OF_TERROR,
      name: 'Manifestation of Terror',
      type: 'active',
      icon: 'ability_nightblade_016_b',
      description:
        'Conceal a sinister trap at the target location, which takes 2 seconds to arm and lasts for 20 seconds.\n\nWhen the trap is triggered, up to 6 enemies in the area become terrified, causing them to cower in fear for 2 seconds and be afflicted with Major Cowardice for 10 seconds, reducing their Weapon and Spell Damage by 430.',
      baseSkillId: ClassSkillId.NIGHTBLADE_ASPECT_OF_TERROR,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SUMMON_SHADE,
      name: 'Summon Shade',
      type: 'active',
      icon: 'ability_nightblade_001',
      description:
        "Summon a shade version of yourself to attack an enemy and fight at your side for 20 seconds. \n\nThe shade slashes at an enemy, dealing 462 Magic Damage once every 2 seconds, and inflicts Minor Maim for 4 seconds, reducing the enemy's damage done by 5%.",
      baseSkillId: ClassSkillId.NIGHTBLADE_SUMMON_SHADE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DARK_SHADE,
      name: 'Dark Shade',
      type: 'active',
      icon: 'ability_nightblade_001_a',
      description:
        'Summon a shade version of yourself to attack an enemy and fight at your side for 20 seconds. \n\nThe shade attacks nearby enemies within 9 meters of it, dealing 623 Magic Damage once every 2 seconds and afflicting them with Minor Maim for 4 seconds, reducing their damage done by 5%.',
      baseSkillId: ClassSkillId.NIGHTBLADE_SUMMON_SHADE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHADOW_IMAGE,
      name: 'Shadow Image',
      type: 'active',
      icon: 'ability_nightblade_001_b',
      description:
        "Summon a shade version of yourself to stay in place and attack an enemy from range for 20 seconds. \n\nThe shade shoots at an enemy, dealing 478 Magic Damage every 2 seconds, and inflicts Minor Maim for 4 seconds, reducing the enemy's damage done by 5%.\n\nWhile the shade is summoned, you can activate this ability again for no cost to teleport to the shade's location.",
      baseSkillId: ClassSkillId.NIGHTBLADE_SUMMON_SHADE,
    },
    {
      id: ClassSkillId.NIGHTBLADE_PATH_OF_DARKNESS,
      name: 'Path of Darkness',
      type: 'active',
      icon: 'ability_nightblade_010',
      description:
        'Create a corridor of shadows for 10 seconds, granting you and allies in the area Major Expedition, increasing Movement Speed by 30%. Effect persists for 4 seconds after leaving the path.',
      baseSkillId: ClassSkillId.NIGHTBLADE_PATH_OF_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_TWISTING_PATH,
      name: 'Twisting Path',
      type: 'active',
      icon: 'ability_nightblade_010_b',
      description:
        'Create a corridor of shadows for 10 seconds, granting you and allies in the area Major Expedition, increasing Movement Speed by 30% which persists for 4 seconds after leaving the path.\n\nDeals 377 Magic Damage to enemies in the target area every 1 second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_PATH_OF_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_REFRESHING_PATH,
      name: 'Refreshing Path',
      type: 'active',
      icon: 'ability_nightblade_010_a',
      description:
        'Create a corridor of shadows for 10 seconds, granting you and allies in the area Major Expedition, Minor Endurance, and Minor Intellect, increasing Movement Speed by 30%, as well as Stamina and Magicka Recovery by 15%. Effect persists for 4 seconds after leaving the path.\n\nHeals 435 Health to you and allies in the area every 1 second.',
      baseSkillId: ClassSkillId.NIGHTBLADE_PATH_OF_DARKNESS,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DARK_VEIL,
      name: 'Dark Veil',
      type: 'passive',
      icon: 'ability_sorcerer_036',
      description:
        'Increases the duration of your Shadow abilities by 2 seconds. Does not apply to Shadow Cloak or its morphs.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_DARK_VIGOR,
      name: 'Dark Vigor',
      type: 'passive',
      icon: 'ability_sorcerer_044',
      description: 'Increases your Max Health by 5% for each Shadow ability slotted.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_REFRESHING_SHADOWS,
      name: 'Refreshing Shadows',
      type: 'passive',
      icon: 'ability_sorcerer_038',
      description: 'Increases your Health, Stamina, and Magicka Recovery by 15%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHADOW_BARRIER,
      name: 'Shadow Barrier',
      type: 'passive',
      icon: 'ability_sorcerer_022',
      description:
        'Casting a Shadow ability grants you Major Resolve for 12 seconds, increasing your Physical and Spell Resistance by 5948. This duration is increased by 2 seconds for each piece of Heavy Armor equipped.\n\nCurrent duration: 12 seconds',
      isPassive: true,
    },
  ],
};
