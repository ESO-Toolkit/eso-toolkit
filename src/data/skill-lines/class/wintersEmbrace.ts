/**
 * Winter's Embrace — Warden Skill Line
 * Source: https://eso-hub.com/en/skills/warden/winter-s-embrace
 * Regenerated: 2025-11-14T20:33:08.883Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const wintersEmbrace: SkillLineData = {
  id: 'class.winter-s-embrace',
  name: "Winter's Embrace",
  class: 'Warden',
  category: 'class',
  icon: 'ability_warden_006',
  sourceUrl: 'https://eso-hub.com/en/skills/warden/winter-s-embrace',
  skills: [
    {
      id: ClassSkillId.WARDEN_SLEET_STORM,
      name: 'Sleet Storm',
      type: 'ultimate',
      icon: 'ability_warden_006',
      description:
        'Twist a violent storm around you, dealing 1161 Frost Damage every 1 second for 8 seconds to enemies around you and reducing their Movement Speed by 40%.  \n\nYou and nearby allies gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SLEET_STORM,
    },
    {
      id: ClassSkillId.WARDEN_NORTHERN_STORM,
      name: 'Northern Storm',
      type: 'ultimate',
      icon: 'ability_warden_006_a',
      description:
        'Twist a violent storm around you, dealing 1199 Frost Damage every 1 second for 8 seconds to enemies around you and reducing their Movement Speed by 40%. As the storm holds, your damage done increases by 2% every 1 second for 12 seconds, up to 9 stacks max.\n\nYou and nearby allies gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SLEET_STORM,
    },
    {
      id: ClassSkillId.WARDEN_PERMAFROST,
      name: 'Permafrost',
      type: 'ultimate',
      icon: 'ability_warden_006_b',
      description:
        'Twist a violent storm around you, dealing 158 Frost Damage every 1 second for 13 seconds to enemies around you and reducing their Movement Speed by 70% and applying the Chilled status effect.\n\nYou and nearby allies gain Major Protection, reducing your damage taken by 10%.',
      isUltimate: true,
      baseSkillId: ClassSkillId.WARDEN_SLEET_STORM,
      alternateIds: [86117],
    },
    {
      id: ClassSkillId.WARDEN_ARCTIC_WIND,
      name: 'Arctic Wind',
      type: 'active',
      icon: 'ability_warden_003',
      description:
        'Envelop yourself in winter winds, instantly healing for 4958 Health and an additional 990 Health every 2 seconds over 10 seconds. This ability scales off your Max Health.',
      baseSkillId: ClassSkillId.WARDEN_ARCTIC_WIND,
    },
    {
      id: ClassSkillId.WARDEN_ARCTIC_BLAST,
      name: 'Arctic Blast',
      type: 'active',
      icon: 'ability_warden_003_b',
      description:
        'Envelop yourself in winter winds, instantly dealing 1799 Frost Damage to nearby enemies. If no enemies are hit, you heal for 2323 Health.\n\nThe winds persist for 20 seconds and chill your foes to the bone, dealing 298 Frost Damage every 2 seconds, after 2 seconds. The damage has a higher chance to apply the Chilled status effect.\n\nStuns enemies after the delay for 3 seconds.',
      baseSkillId: ClassSkillId.WARDEN_ARCTIC_WIND,
    },
    {
      id: ClassSkillId.WARDEN_POLAR_WIND,
      name: 'Polar Wind',
      type: 'active',
      icon: 'ability_warden_003_a',
      description:
        'Envelop yourself in winter winds, instantly healing for 4958 Health and healing for an additional 1365 Health every 2 seconds over 10 seconds. You also heal a nearby ally for 3305 Health. This ability scales off your Max Health.',
      baseSkillId: ClassSkillId.WARDEN_ARCTIC_WIND,
    },
    {
      id: ClassSkillId.WARDEN_CRYSTALLIZED_SHIELD,
      name: 'Crystallized Shield',
      type: 'active',
      icon: 'ability_warden_002',
      description:
        'Spin a shield of ice around you, absorbing up to 16528 damage from 3 projectiles. \n\nEach time you absorb a projectile you gain 2 Ultimate.',
      baseSkillId: ClassSkillId.WARDEN_CRYSTALLIZED_SHIELD,
    },
    {
      id: ClassSkillId.WARDEN_CRYSTALLIZED_SLAB,
      name: 'Crystallized Slab',
      type: 'active',
      icon: 'ability_warden_002_a',
      description:
        'Spin a shield of ice around you, absorbing up to 24791 damage from 3 projectiles. \n\nEach time you absorb a projectile you launch an icy bolt back at the enemy, dealing 1199 Frost Damage and stunning them for 3 seconds.',
      baseSkillId: ClassSkillId.WARDEN_CRYSTALLIZED_SHIELD,
    },
    {
      id: ClassSkillId.WARDEN_SHIMMERING_SHIELD,
      name: 'Shimmering Shield',
      type: 'active',
      icon: 'ability_warden_002_b',
      description:
        'Spin a shield of ice around you, absorbing up to 16527 damage from 3 projectiles. \n\nEach time you absorb a projectile you gain 2 Ultimate and gain Major Heroism for 6 seconds, granting you 3 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.WARDEN_CRYSTALLIZED_SHIELD,
    },
    {
      id: ClassSkillId.WARDEN_FROST_CLOAK,
      name: 'Frost Cloak',
      type: 'active',
      icon: 'ability_warden_001',
      description:
        'Wrap a thick cloak of ice around you and your grouped allies. The ice grants Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds.',
      baseSkillId: ClassSkillId.WARDEN_FROST_CLOAK,
    },
    {
      id: ClassSkillId.WARDEN_EXPANSIVE_FROST_CLOAK,
      name: 'Expansive Frost Cloak',
      type: 'active',
      icon: 'ability_warden_001_a',
      description:
        'Wrap a thick cloak of ice around you and your grouped allies. The ice grants Major Resolve, increasing your Physical and Spell Resistance by 5948 for 20 seconds.',
      baseSkillId: ClassSkillId.WARDEN_FROST_CLOAK,
    },
    {
      id: ClassSkillId.WARDEN_ICE_FORTRESS,
      name: 'Ice Fortress',
      type: 'active',
      icon: 'ability_warden_001_b',
      description:
        'Wrap a thick cloak of ice around you and your grouped allies. The ice grants Major Resolve, increasing your Physical and Spell Resistance by 5948 for 30 seconds.\n\nYou gain Minor Protection, reducing your damage taken by 5% for 30 seconds.',
      baseSkillId: ClassSkillId.WARDEN_FROST_CLOAK,
    },
    {
      id: ClassSkillId.WARDEN_FROZEN_GATE,
      name: 'Frozen Gate',
      type: 'active',
      icon: 'ability_warden_005',
      description:
        'Summon an ancient portal, which arms after 1.5 seconds and lasts for 15 seconds.\n\nWhen triggered the enemy is teleported to you if within range, immobilized for 3 seconds, and dealt 1742 Frost Damage.\n\nYou can have up to 3 Frozen Gates active at a time.',
      baseSkillId: ClassSkillId.WARDEN_FROZEN_GATE,
    },
    {
      id: ClassSkillId.WARDEN_FROZEN_DEVICE,
      name: 'Frozen Device',
      type: 'active',
      icon: 'ability_warden_005_a',
      description:
        'Summon an ancient portal, which arms after 1.5 seconds.\n\nWhen triggered the enemy is teleported to you if within range, immobilized for 3 seconds, dealt 1799 Frost Damage, and afflicted with Major Maim, reducing their damage done by 10% for 4 seconds.\n\nYou can have up to 3 Frozen Devices active at a time.',
      baseSkillId: ClassSkillId.WARDEN_FROZEN_GATE,
    },
    {
      id: ClassSkillId.WARDEN_FROZEN_RETREAT,
      name: 'Frozen Retreat',
      type: 'active',
      icon: 'ability_warden_005_b',
      description:
        'Summon an ancient portal, which arms after 1.5 seconds.\n\nWhen triggered the enemy is teleported to you if within range, immobilized for 3 seconds, and dealt 1799 Frost Damage.\n\nAn ally in the portal can activate the Icy Escape synergy, teleporting them to you and granting them Major Expedition, increasing their Movement Speed by 30% for 8 seconds.\n\nYou can have up to 3 Frozen Retreats active at a time.',
      baseSkillId: ClassSkillId.WARDEN_FROZEN_GATE,
    },
    {
      id: ClassSkillId.WARDEN_IMPALING_SHARDS,
      name: 'Impaling Shards',
      type: 'active',
      icon: 'ability_warden_004',
      description:
        'Conjure icy shards around you to skewer enemies in the area, dealing 405 Frost Damage every 1 second for 12 seconds.\n\nEnemies hit are overcome with bitter cold, reducing their Movement Speed by 30% for 3 seconds.\n\nDamage done is based on your Max Health, and has a higher chance to apply the Chilled status effect.',
      baseSkillId: ClassSkillId.WARDEN_IMPALING_SHARDS,
    },
    {
      id: ClassSkillId.WARDEN_GRIPPING_SHARDS,
      name: 'Gripping Shards',
      type: 'active',
      icon: 'ability_warden_004_a',
      description:
        'Conjure icy shards around you to skewer enemies in the area, immobilizing them for 3 seconds and dealing 419 Frost Damage every 1 second for 12 seconds.\n\nEnemies hit are overcome with bitter cold, reducing their Movement Speed by 30% for 3 seconds.\n\nDamage done is based on your Max Health and has a higher chance to apply the Chilled status effect.',
      baseSkillId: ClassSkillId.WARDEN_IMPALING_SHARDS,
    },
    {
      id: ClassSkillId.WARDEN_WINTER_S_REVENGE,
      name: "Winter's Revenge",
      type: 'active',
      icon: 'ability_warden_004_b',
      description:
        'Conjure icy shards at the target location to skewer enemies in the area, dealing 294 Frost Damage every 1 second for 12 seconds. This damage increases by 30% if cast with a Destruction Staff equipped.\n\nEnemies hit are overcome with bitter cold, reducing their Movement Speed by 30% for 3 seconds.\n\nThis ability has a higher chance to apply the Chilled status effect.',
      baseSkillId: ClassSkillId.WARDEN_IMPALING_SHARDS,
    },
    {
      id: ClassSkillId.WARDEN_FROZEN_ARMOR,
      name: 'Frozen Armor',
      type: 'passive',
      icon: 'passive_warden_001',
      description:
        "Increases your Physical and Spell Resistance by 1240 for each Winter's Embrace ability slotted.",
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_GLACIAL_PRESENCE,
      name: 'Glacial Presence',
      type: 'passive',
      icon: 'passive_warden_002',
      description:
        'Increases your chance to apply the Chilled status effect by 250% and increases its damage by 105. The damage increasing effect scales off the higher of your Weapon or Spell Damage.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_ICY_AURA,
      name: 'Icy Aura',
      type: 'passive',
      icon: 'passive_warden_003',
      description:
        'When you take direct damage from an enemy in melee range, you apply a stack of Bite of Winter to them for 3 seconds, up to 5 stacks max. Attackers at max stacks are afflicted with Major Maim for 3 seconds, reducing their damage done by 10%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_PIERCING_COLD,
      name: 'Piercing Cold',
      type: 'passive',
      icon: 'passive_warden_004',
      description:
        'Increases the amount of damage you block by 8% and increases your Frost Damage by 15%.',
      isPassive: true,
    },
  ],
};
