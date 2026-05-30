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
  icon: 'u26_ability_digging_01',
  sourceUrl: 'https://eso-hub.com/en/skills/world/excavation',
  skills: [
    {
      id: AbilityId.HAND_BRUSH,
      alternateIds: [139908, 139909],
      name: 'Hand Brush',
      icon: 'u26_ability_digging_03',
      description:
        'Removes 1 layer of soil or rock from a 1x1 area. Generates: 1 Intuition Maximum Intuition: 4.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.AUGUR,
      alternateIds: [139904, 139905],
      name: 'Augur',
      icon: 'u26_ability_digging_04',
      description:
        "Indicates how near the Antiquity is to the selected location. Can only be used a limited number of times, based on the Antiquity's Difficulty. Works on the lowest six layers of dirt and rocks. Cannot detect Bonus Loot. Using Augur does not consume a turn.",
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.TROWEL,
      alternateIds: [139943, 140093],
      name: 'Trowel',
      icon: 'u26_ability_digging_01',
      description:
        'Removes 3 layers of dirt or rock from a 1x1 area. Costs 2 Intuition to use. Can safely trigger Fissures to create explosive chain reactions.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.KEEN_EYE_DIG_SITES,
      alternateIds: [140173, 140174],
      name: 'Keen Eye: Dig Sites',
      icon: 'ability_scrying_08a',
      description: 'Antiquity Dig Sites will be easier to see when you are 30 meters or closer.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.EXCAVATORS_RESERVES,
      name: "Excavator's Reserves",
      icon: 'u26_ability_digging_05',
      description:
        'Further increases the amount of time you have available when excavating a dig site.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.HEAVY_SHOVEL,
      alternateIds: [139906, 139907],
      name: 'Heavy Shovel',
      icon: 'u26_ability_digging_02',
      description:
        'Removes 1 layer of dirt and rocks from up to a 3x3 area. The shovel only affects a single contiguous height of dirt and rocks. Costs 2 Intuition to use. Has a chance to consume no Intuition on use.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.KEEN_EYE_TREASURE_CHESTS,
      alternateIds: [139771, 139772],
      name: 'Keen Eye: Treasure Chests',
      icon: 'ability_scrying_08a',
      description: 'Treasure Chests will be easier to see when you are 30 meters or closer.',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
