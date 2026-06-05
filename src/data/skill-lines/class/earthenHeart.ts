/**
 * Earthen Heart — Dragonknight Skill Line
 * Regenerated: 2026-03-10T00:00:00.000Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const earthenHeart: SkillLineData = {
  id: 'class.earthen-heart',
  name: 'Earthen Heart',
  class: 'Dragonknight',
  category: 'class',
  icon: 'ability_dragonknight_018',
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
      name: 'Magma Armor',
      type: 'ultimate',
      icon: 'ability_dragonknight_018',
      description:
        'Ignite the molten lava in your veins, limiting incoming damage to 3% of your Max Health for 15 seconds.\n\nWhile active, you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MAGMA_SHELL,
      name: 'Magma Shell',
      type: 'ultimate',
      icon: 'ability_dragonknight_018_a',
      description:
        'Ignite the molten lava in your veins, limiting incoming damage to 3% of your Max Health for 15 seconds.\n\nWhen activated, nearby allies gain a damage shield for 133% of their Max Health for 10 seconds.\n\nWhile active, you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CORROSIVE_ARMOR,
      name: 'Corrosive Armor',
      type: 'ultimate',
      icon: 'ability_dragonknight_018_b',
      description:
        'Ignite the molten lava in your veins, limiting incoming damage to 6% of your Max Health and dealing 1619 Flame Damage to nearby enemies each second for 10 seconds. \n\nWhile active your direct damage attacks ignore enemy Physical and Spell Resistance but you cannot generate Ultimate.',
      isUltimate: true,
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MAGMA_ARMOR,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SUPERHEATED_WARD,
      name: 'Superheated Ward',
      type: 'active',
      icon: 'ability_dragonknight_013',
      description:
        "Roil the air around you or an ally, granting a damage shield that absorbs up to 4958 for 6 seconds. This ability scales off the higher of your Max Magicka or Stamina and is capped at 50% of the target's Max Health.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SUPERHEATED_WARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MAGMA_FIST,
      name: 'Magma Fist',
      type: 'active',
      icon: 'ability_dragonknight_013_a',
      description:
        "Draw forth magma from below to hurl at an enemy, dealing 2399 Flame Damage while applying a stack of Heat Shock, which increases the enemy's damage taken by 66 for 7 seconds per stack, up to 3 times. Hitting an enemy at max stacks of Heat Shock with this ability increases the damage done of the next cast of this ability within 6 seconds by 66%, up to once every 6 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SUPERHEATED_WARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_VOLCANIC_WARD,
      name: 'Volcanic Ward',
      type: 'active',
      icon: 'ability_dragonknight_013_b',
      description:
        "Roil the air around you or an ally, granting a damage shield that absorbs up to 4958 for 6 seconds and reducing the next instance of damage taken by 10%. When the shield ends the latent heat warms the target, healing them for 1766 Health. This ability scales off the higher of your Max Magicka or Stamina and the shield is capped at 50% of the target's Max Health.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_SUPERHEATED_WARD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
      name: 'Molten Weapons',
      type: 'active',
      icon: 'ability_dragonknight_015',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds. While active, dealing damage with Light and Heavy Attacks causes an additional 448 Flame Damage, up to once every 2 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IGNEOUS_WEAPONS,
      name: 'Igneous Weapons',
      type: 'active',
      icon: 'ability_dragonknight_015_a',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 1 minute. While active, dealing damage with Light and Heavy Attacks causes an additional 448 Flame Damage, up to once every 2 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOLTEN_ARMAMENTS,
      name: 'Molten Armaments',
      type: 'active',
      icon: 'ability_dragonknight_015_b',
      description:
        "Charge you and your grouped allies' weapons with volcanic power to gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20% for 30 seconds. While active, dealing damage with Light and Heavy Attacks causes an additional 448 Flame Damage, up to once every 1.5 seconds. You also gain Empower for the duration, increasing the damage of your Heavy Attacks against monsters by 70%.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_MOLTEN_WEAPONS,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
      name: 'Obsidian Shield',
      type: 'active',
      icon: 'ability_dragonknight_017',
      description:
        'Call the earth to your defense, granting a damage shield for you and nearby allies that absorbs 1321 damage. This portion of the ability scales off your Max Health.\n\nYou also gain Major Mending, increasing your healing done by 16% for 4 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FRAGMENTED_SHIELD,
      name: 'Fragmented Shield',
      type: 'active',
      icon: 'ability_dragonknight_017a',
      description:
        "Call the earth to your defense, creating a damage shield for you and nearby allies that absorbs 2400 damage. This portion of the ability scales off the higher of your Max Magicka or Stamina and is capped at 31% of the target's Max Health. You also gain Major Mending, increasing your healing done by 16% for 6 seconds.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_IGNEOUS_SHIELD,
      name: 'Igneous Shield',
      type: 'active',
      icon: 'ability_dragonknight_017b',
      description:
        'Call the earth to your defense, granting a damage shield for nearby allies that absorbs 1322 damage. Your own damage shield absorbs 3824 damage. This portion of the ability scales off your Max Health.\n\nYou also gain Major Mending, increasing your healing done by 16% for 4 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_OBSIDIAN_SHIELD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_PETRIFY,
      name: 'Petrify',
      type: 'active',
      icon: 'ability_dragonknight_014',
      description:
        "Encase an enemy in molten rock, reducing their movement speed by 50% for 1 second. Upon completion, the target is stunned for 4 seconds, or 8 seconds against monsters. This stun cannot be blocked. The molten rock melts through the enemy's armor and applies Minor Breach for 10 seconds, reducing Armor by 2974.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_FOSSILIZE,
      name: 'Fossilize',
      type: 'active',
      icon: 'ability_dragonknight_014_a',
      description:
        "Encase an enemy in molten rock, reducing their movement speed by 50% for 1 second. Upon completion, the target is stunned for 4 seconds, or 8 seconds against monsters. Immobilizes the target for 4 seconds after the stun ends. This stun cannot be blocked. The molten rock melts through the enemy's armor and applies Minor Breach and Minor Vulnerability for 20 seconds, reducing Armor by 2974 and increasing damage taken by 5%.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SHATTERING_ROCKS,
      name: 'Shattering Rocks',
      type: 'active',
      icon: 'ability_dragonknight_014b',
      description:
        "Encase an enemy in molten rock, reducing their movement speed by 50% for 1 second. Upon completion, the target is stunned for 4 seconds, or 8 seconds against monsters. After the stun ends, the target takes 1379 Flame Damage and you heal for 2760 Health. This stun cannot be blocked. The molten rock melts through the enemy's armor and applies Minor Breach for 10 seconds, reducing Armor by 2974.",
      baseSkillId: ClassSkillId.DRAGONKNIGHT_PETRIFY,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      name: 'Ash Cloud',
      type: 'active',
      icon: 'ability_dragonknight_016',
      description:
        'Throw out a kindled flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 434 Health every 1 second.\n\nHealed targets gain Minor Fortitude and Minor Heroism while inside, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_CINDER_STORM,
      name: 'Cinder Storm',
      type: 'active',
      icon: 'ability_dragonknight_016a',
      description:
        'Throw out a purifying flame, filling a large area with warmth for 15 seconds. This fire heals you and your allies at the target location for 449 Health every 1 second. This healing increases by 50% if you are in the area.\n\nHealed targets gain Minor Fortitude and Minor Heroism for 15 seconds, increasing Health Recovery by 15% and generating 1 Ultimate every 1.5 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ERUPTION,
      name: 'Eruption',
      type: 'active',
      icon: 'ability_dragonknight_016b',
      description:
        'Summon a scorching cloud of ash at the target location for 15 seconds, dealing 1799 Flame Damage immediately, reducing enemy Movement Speed by 70%, and dealing 319 Flame Damage in the area every 1 second.\n\nThe eruptive damage can occur once every 10 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_ASH_CLOUD,
      alternateIds: [32710],
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_EARTHSPIKE_MANTLE,
      name: 'Earthspike Mantle',
      type: 'active',
      icon: 'ability_dragonknight_007',
      description:
        'Envelop your body in molten spikes to increase your damage done by 100 and gain Major Resolve, increasing Physical and Spell Resistance by 5948 for 20 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_EARTHSPIKE_MANTLE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_SHATTERSPIKE_MANTLE,
      name: 'Shatterspike Mantle',
      type: 'active',
      icon: 'ability_dragonknight_007_a',
      description:
        'Envelop your body in molten spikes to increase your damage done by 100 and gain Major Resolve, increasing Physical and Spell Resistance by 5948 for 20 seconds.\n\nAs the armor forms you blast foes around you with shattered obsidian, causing them to take 4785 Flame Damage over 20 seconds. When this effect deals damage you gain a stack of Landslide, up to once every 10 seconds.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_EARTHSPIKE_MANTLE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_EARTHSHIELD_MANTLE,
      name: 'Earthshield Mantle',
      type: 'active',
      icon: 'ability_dragonknight_007_b',
      description:
        'Envelop your body in molten spikes to increase your damage done by 100 and gain Major Resolve, increasing Physical and Spell Resistance by 5948 for 20 seconds.\n\nPower drawn from the heart of a volcano forms a damage shield around you that absorbs up to 5121 damage for 6 seconds, scaling off your Max Health.',
      baseSkillId: ClassSkillId.DRAGONKNIGHT_EARTHSPIKE_MANTLE,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LANDSLIDE,
      name: 'Landslide',
      type: 'passive',
      icon: 'ability_weapon_005',
      description:
        'Given time, the smallest rock on the mountain can cascade into pure devastation.\n\nWhenever you deal damage you gain a stack of Landslide which increases your damage done by 1% per stack, up to 10 times. This effect can occur once every 10 seconds.\n\nEvery 2 seconds you do not deal damage, you lose a stack.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_ETERNAL_MOUNTAIN,
      alternateIds: [29468, 44996],
      name: 'Eternal Mountain',
      type: 'passive',
      icon: 'ability_dragonknight_023',
      description:
        'Rock and stone shield your heart, turning aside sharp blades and barbed words.\n\nIncreases your Armor by 1487.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BLESSING_AT_THE_PEAK,
      name: 'Blessing at the Peak',
      type: 'passive',
      icon: 'ability_dragonknight_024',
      description:
        'Where earth meets sky is a wellspring of power you can tap at will.\n\nWhen you cast or deal damage with an Earthen Heart ability in combat you generate 1 Ultimate. This effect can occur once every 6 seconds.\n\nIncreases your Critical Damage by 5%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_MOUNTAIN_GIANT,
      name: 'Mountain Giant',
      type: 'passive',
      icon: 'ability_dragonknight_034',
      description:
        'The strength of mountains fuels your mightiest blows.\n\nDealing damage with a fully-charged Heavy Attack also applies Off Balance to the target.',
      isPassive: true,
    },
    // Heart of Stone passive (U49) — ID pending from ESO data sources
  ],
};
