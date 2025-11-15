import { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const bowSkillLine: SkillLineData = {
  id: '0',
  name: 'Bow',
  class: 'Weapon',
  category: 'weapon',
  icon: '/images/skill-lines/weapon/bow.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.RAPID_FIRE,
      name: 'Rapid Fire',
      type: 'ultimate',
      baseAbilityId: AbilityId.RAPID_FIRE,
      description: 'Unleash a barrage of arrows at an enemy, dealing 17415 Physical Damage over 4 seconds. You can move at full speed and are immune to all disabling effects while channeling this attack. This ability is considered direct damage.',
    },
    {
      id: 83484, // Ballista (morph)
      name: 'Ballista',
      type: 'ultimate',
      baseAbilityId: AbilityId.RAPID_FIRE,
      description: 'Create a turret to unleash a barrage of arrows at an enemy, dealing 15587 Physical Damage over 5 seconds. Create a turret to channel the attack for you, but for less damage.',
      alternateIds: [68205, 85451, 85458, 85462, 86615, 86616, 86618, 86619, 86621, 86622, 179702],
    },
    {
      id: 83486, // Toxic Barrage (morph)
      name: 'Toxic Barrage',
      type: 'ultimate',
      baseAbilityId: AbilityId.RAPID_FIRE,
      description: 'Unleash a barrage of arrows at an enemy, dealing 17415 Poison Damage over 4 seconds. After dealing damage you poison the enemy, dealing an additional 9990 Poison Damage over 8 seconds after a 1 second delay. You can move at full speed and are immune to all disabling effects while channeling this attack. This ability is considered direct damage.',
    },

    // Scribing abilities
    {
      id: AbilityId.VAULT,
      name: 'Vault',
      type: 'active',
      baseAbilityId: AbilityId.VAULT,
      description: 'Fire a burst at your feet while flipping backwards 15 meters. Casting again within 4 seconds increases the cost by 33%.',
    },

    // Active abilities
    {
      id: AbilityId.SNIPE,
      name: 'Snipe',
      type: 'active',
      baseAbilityId: AbilityId.SNIPE,
      description: 'Plant a masterfully aimed arrow in an enemy\'s vital spot, dealing 2404 Physical Damage.',
    },
    {
      id: 38687, // Focused Aim (morph)
      name: 'Focused Aim',
      type: 'active',
      baseAbilityId: AbilityId.SNIPE,
      description: 'Plant a masterfully aimed arrow in an enemy\'s vital spot, dealing 2404 Physical Damage and applying the Sundered status effect.',
    },
    {
      id: 38685, // Lethal Arrow (morph)
      name: 'Lethal Arrow',
      type: 'active',
      baseAbilityId: AbilityId.SNIPE,
      description: 'Plant a masterfully aimed arrow in an enemy\'s vital spot, dealing 2483 Poison Damage and applying the Poisoned status effect. Also afflicts enemy with Minor Defile, which reduces their healing received and damage shield strength by 6% for 4 seconds.',
    },
    {
      id: AbilityId.VOLLEY,
      name: 'Volley',
      type: 'active',
      baseAbilityId: AbilityId.VOLLEY,
      description: 'Launch a multitude of arrows into the sky to rain down, dealing 342 Physical Damage to enemies in the target area every 1 second for 8 seconds, after a 2 second delay.',
    },
    {
      id: 38695, // Arrow Barrage (morph)
      name: 'Arrow Barrage',
      type: 'active',
      baseAbilityId: AbilityId.VOLLEY,
      description: 'Launch a multitude of arrows into the sky to rain down, dealing 460 Physical Damage to enemies in the target area every 1 second for 8 seconds, after a 2 second delay.',
    },
    {
      id: 38692, // Endless Hail (morph)
      name: 'Endless Hail',
      type: 'active',
      baseAbilityId: AbilityId.VOLLEY,
      description: 'Launch a multitude of arrows into the sky to rain down, dealing 343 Physical Damage to enemies in the target area every 1 second for 13 seconds, after a 2 second delay.',
      alternateIds: [38689],
    },
    {
      id: AbilityId.SCATTER_SHOT,
      name: 'Scatter Shot',
      type: 'active',
      baseAbilityId: AbilityId.SCATTER_SHOT,
      description: 'Blast an enemy with an explosive arrow, dealing 1392 Physical Damage, knocking them back 8 meters.',
    },
    {
      id: 38669, // Draining Shot (morph)
      name: 'Draining Shot',
      type: 'active',
      baseAbilityId: AbilityId.SCATTER_SHOT,
      description: 'Blast an enemy with an enchanted arrow, dealing 1393 Physical Damage and reducing their Movement Speed by 60% for 3 seconds. If the enemy is hit, you heal for 2399.',
    },
    {
      id: 38672, // Magnum Shot (morph)
      name: 'Magnum Shot',
      type: 'active',
      baseAbilityId: AbilityId.SCATTER_SHOT,
      description: 'Blast an enemy with an explosive arrow, dealing 1727 Physical Damage and knocking them back 8 meters.',
    },
    {
      id: AbilityId.ARROW_SPRAY,
      name: 'Arrow Spray',
      type: 'active',
      baseAbilityId: AbilityId.ARROW_SPRAY,
      description: 'Fire a burst of arrows in one shot, dealing 1742 Physical Damage to enemies in front of you.',
    },
    {
      id: 38705, // Acid Spray (morph)
      name: 'Acid Spray',
      type: 'active',
      baseAbilityId: AbilityId.ARROW_SPRAY,
      description: 'Fire a burst of arrows in one shot, dealing 1742 Poison Damage to enemies in front of you, and dealing an additional 1635 Poison Damage over 5 seconds.',
    },
    {
      id: 38701, // Bombard (morph)
      name: 'Bombard',
      type: 'active',
      baseAbilityId: AbilityId.ARROW_SPRAY,
      description: 'Fire a burst of arrows in one shot, dealing 1742 Physical Damage to enemies in front of you. Enemies hit are immobilized for 4 seconds.',
    },
    {
      id: AbilityId.POISON_ARROW,
      name: 'Poison Arrow',
      type: 'active',
      baseAbilityId: AbilityId.POISON_ARROW,
      description: 'Shoot an arrow coated in Baandari poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds.',
    },
    {
      id: 38660, // Poison Injection (morph)
      name: 'Poison Injection',
      type: 'active',
      baseAbilityId: AbilityId.POISON_ARROW,
      description: 'Shoot an arrow coated in Baandari poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds. Deals up to 120% more damage to enemies under 50% Health.',
    },
    {
      id: 38645, // Venom Arrow (morph)
      name: 'Venom Arrow',
      type: 'active',
      baseAbilityId: AbilityId.POISON_ARROW,
      description: 'Shoot an arrow coated in Shadowscale poison at an enemy, dealing 1161 Poison Damage and an additional 3470 Poison Damage over 20 seconds. If the enemy hit is casting an ability they are interrupted, set Off Balance, and stunned for 3 seconds. After casting you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage for 20 seconds.',
    },

    // Passive abilities
    {
      id: AbilityId.VINEDUSK_TRAINING,
      name: 'Vinedusk Training',
      type: 'passive',
      baseAbilityId: AbilityId.VINEDUSK_TRAINING,
      description: 'WITH BOW EQUIPPED Increases your damage done by 5% against enemies 15 meters or closer. Increases your Critical Chance rating by 1314 against enemies further than 15 meters.',
    },
    {
      id: AbilityId.ACCURACY,
      name: 'Accuracy',
      type: 'passive',
      baseAbilityId: AbilityId.ACCURACY,
      description: 'WITH BOW EQUIPPED Increases your Critical Chance rating by 1314.',
    },
    {
      id: AbilityId.RANGER,
      name: 'Ranger',
      type: 'passive',
      baseAbilityId: AbilityId.RANGER,
      description: 'WITH BOW EQUIPPED Reduces the Stamina cost of Bow abilities by 15%.',
    },
    {
      id: AbilityId.HAWK_EYE,
      name: 'Hawk Eye',
      type: 'passive',
      baseAbilityId: AbilityId.HAWK_EYE,
      description: 'WITH BOW EQUIPPED Dealing damage with a Light or Heavy Attack increases the damage of your Bow abilities by 5% for 5 seconds, stacking up to 5 times.',
    },
    {
      id: AbilityId.HASTY_RETREAT,
      name: 'Hasty Retreat',
      type: 'passive',
      baseAbilityId: AbilityId.HASTY_RETREAT,
      description: 'WITH BOW EQUIPPED Grants you Major Expedition for 4 seconds after you use Roll Dodge. Major Expedition increases your Movement Speed by 30%.',
    },
  ],
};
