import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

/**
 * Excavation Skill Line
 * Category: World
 * Description: Used for the Antiquities System - lets you excavate treasures
 * and makes treasure chests easier to see in the game
 */
export const excavation: SkillLineData = {
  id: 0,
  name: 'Excavation',
  class: 'world',
  category: 'world',
  icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_001.png',
  skills: [
    {
      id: AbilityId.HAND_BRUSH,
      name: 'Hand Brush',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_hand_brush.png',
      description:
        'Removes 1 layer of soil or rock from a 1x1 area. Generates: 1 Intuition Maximum Intuition: 4.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.AUGUR,
      name: 'Augur',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_augur.png',
      description:
        "Indicates how near the Antiquity is to the selected location. Can only be used a limited number of times, based on the Antiquity's Difficulty. Works on the lowest six layers of dirt and rocks. Cannot detect Bonus Loot. Using Augur does not consume a turn.",
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.TROWEL,
      name: 'Trowel',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_trowel.png',
      description:
        'Removes 3 layers of dirt or rock from a 1x1 area. Costs 2 Intuition to use. Can safely trigger Fissures to create explosive chain reactions.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.KEEN_EYE_DIG_SITES,
      name: 'Keen Eye: Dig Sites',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_keen_eye_dig_sites.png',
      description:
        'Antiquity Dig Sites will be easier to see when you are 30 meters or closer.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.EXCAVATORS_RESERVES,
      name: "Excavator's Reserves",
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_excavators_reserves.png',
      description:
        'Further increases the amount of time you have available when excavating a dig site.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.HEAVY_SHOVEL,
      name: 'Heavy Shovel',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_heavy_shovel.png',
      description:
        'Removes 1 layer of dirt and rocks from up to a 3x3 area. The shovel only affects a single contiguous height of dirt and rocks. Costs 2 Intuition to use. Has a chance to consume no Intuition on use.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.KEEN_EYE_TREASURE_CHESTS,
      name: 'Keen Eye: Treasure Chests',
      icon: 'https://eso-hub.com/storage/icons/ability_world_excavation_keen_eye_treasure_chests.png',
      description:
        'Treasure Chests will be easier to see when you are 30 meters or closer.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
