import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const assault: SkillLineData = {
  id: 0,
  name: 'Assault',
  class: 'alliance-war',
  category: 'alliance',
  icon: 'https://eso-hub.com/storage/icons/ability_ava_003.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.WAR_HORN,
      name: 'War Horn',
      description:
        "Sound a war horn to rally your forces, increasing you and your group's Max Magicka and Max Stamina by 10% for 30 seconds.",
      isUltimate: true,
      maxRank: 4,
    },
    {
      id: 40223, // Morph of War Horn
      name: 'Aggressive Horn',
      description:
        "Sound a war horn to rally your forces, increasing you and your group's Max Magicka and Max Stamina by 10% for 30 seconds. You and your allies gain Major Force, increasing your Critical Damage by 20% for 10 seconds.",
      isUltimate: true,
      maxRank: 4,
    },
    {
      id: 40220, // Morph of War Horn
      name: 'Sturdy Horn',
      description:
        "Sound a war horn to rally your forces, increasing you and your group's Max Magicka and Max Stamina by 10% for 30 seconds. You and your allies gain 1320 Critical Resistance for 10 seconds, reducing incoming Critical Damage by 20%.",
      isUltimate: true,
      maxRank: 4,
    },
    // Scribing abilities
    {
      id: AbilityId.TRAMPLE,
      name: 'Trample',
      description:
        'Pierce the air with a shrill whistle, calling your mount forth to trample enemies in a line. This ability cannot be re-activated while your mount is already attacking.',
      maxRank: 4,
    },
    // Active abilities
    {
      id: AbilityId.RAPID_MANEUVER,
      name: 'Rapid Maneuver',
      description:
        'Mobilize your forces, granting Major Expedition to you and your group, increasing your Movement Speed by 30% for 8 seconds.',
      maxRank: 4,
    },
    {
      id: 40215, // Morph of Rapid Maneuver
      name: 'Charging Maneuver',
      description:
        'Mobilize your forces, granting Major and Minor Expedition to you and your group, increasing your Movement Speed by 30% and 15% respectively, for 8 seconds.',
      maxRank: 4,
    },
    {
      id: 40211, // Morph of Rapid Maneuver
      name: 'Retreating Maneuver',
      description:
        'Mobilize your forces, granting Major Expedition to you and your group, increasing your Movement Speed by 30% for 8 seconds. Attacks from behind deal 15% less damage while this effect persists.',
      maxRank: 4,
    },
    {
      id: AbilityId.VIGOR,
      name: 'Vigor',
      description:
        'Let loose a battle cry, instilling yourself and nearby allies with resolve and healing them for 3480 Health over 10 seconds.',
      maxRank: 4,
    },
    {
      id: 61505, // Morph of Vigor
      name: 'Echoing Vigor',
      description:
        'Let loose a battle cry, instilling you and your allies with resolve and healing for 3480 Health over 16 seconds.',
      maxRank: 4,
    },
    {
      id: 61507, // Morph of Vigor
      name: 'Resolving Vigor',
      description:
        'Let loose a battle cry, instilling yourself with resolve and healing for 5388 Health over 5 seconds. After casting you gain Minor Resolve, increasing your Physical and Spell Resistance by 2974, for 20 seconds.',
      maxRank: 4,
    },
    {
      id: AbilityId.CALTROPS,
      name: 'Caltrops',
      description:
        'Hurl a ball of caltrops that scatter over the target area, dealing 280 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%.',
      maxRank: 4,
      alternateIds: [33376],
    },
    {
      id: 40255, // Morph of Caltrops
      name: 'Anti-Cavalry Caltrops',
      description:
        'Hurl a ball of caltrops that scatter over the target area, dealing 281 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%. The caltrops also drain the Mount Stamina of any enemy in the area.',
      maxRank: 4,
    },
    {
      id: 40242, // Morph of Caltrops
      name: 'Razor Caltrops',
      description:
        'Hurl a ball of caltrops that scatter over the target area, dealing 281 Physical Damage every 1 second to enemies inside, and reducing their Movement Speed by 50%. Enemies who take damage from the caltrops have Major Breach applied to them, reducing their Physical and Spell Resistance by 5948 for 4.1 seconds.',
      maxRank: 4,
    },
    {
      id: AbilityId.MAGICKA_DETONATION,
      name: 'Magicka Detonation',
      description:
        "Curse an enemy with a magical bomb that explodes after 4 seconds, dealing 434 Magic Damage to all enemies in the area. Each enemy within the bomb's radius increases the damage by 100%, including the original target.",
      maxRank: 4,
    },
    {
      id: 61491, // Morph of Magicka Detonation
      name: 'Inevitable Detonation',
      description:
        "Curse an enemy with a magical bomb that explodes after 4 seconds, dealing 449 Magic Damage to all enemies in the area. If the bomb is dispelled or removed early, the explosion is triggered immediately. Each enemy within the bomb's radius increases the damage by 100%.",
      maxRank: 4,
    },
    {
      id: 61500, // Morph of Magicka Detonation
      name: 'Proximity Detonation',
      description:
        "Activate a magical bomb on yourself that explodes after 8 seconds, dealing 449 Magic Damage to all enemies in the area. Each enemy within the bomb's radius increases the damage by 100%, including the original target.",
      maxRank: 4,
    },
    // Passive abilities
    {
      id: AbilityId.CONTINUOUS_ATTACK,
      name: 'Continuous Attack',
      description:
        'Increases your Weapon and Spell Damage by 10% and Health, Magicka, and Stamina Recovery by 20% for 10 minutes after you capture a Lumber Mill, Farm, Mine, or Keep. Gain Gallop at all times, increasing your Mount Speed by 15%.',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.REACH,
      name: 'Reach',
      description:
        'Increases the range of long-range abilities by 5 meters while near a keep or outpost. Any ability with a range greater than 28 meters is affected.',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.COMBAT_FRENZY,
      name: 'Combat Frenzy',
      description: 'You generate 20 Ultimate when you kill an enemy player.',
      isPassive: true,
      maxRank: 1,
    },
  ],
};
