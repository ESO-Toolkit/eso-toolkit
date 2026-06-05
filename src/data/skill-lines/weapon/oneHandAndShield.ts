import { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const oneHandAndShieldSkillLine: SkillLineData = {
  id: '0',
  name: 'One Hand and Shield',
  class: 'Weapon',
  category: 'weapon',
  icon: 'ability_1handed_006',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.SHIELD_WALL,
      name: 'Shield Wall',
      type: 'ultimate',
      baseAbilityId: AbilityId.SHIELD_WALL,
      description:
        'Reinforce your shield, allowing you to automatically block all attacks at no cost for 6 seconds.',
    },
    {
      id: 83283, // Shield Discipline (morph)
      name: 'Shield Discipline',
      type: 'ultimate',
      baseAbilityId: AbilityId.SHIELD_WALL,
      description:
        'Reinforce your shield, allowing you to automatically block all attacks at no cost for 8 seconds.\n\nYour One Hand and Shield non-Ultimate abilities cost nothing while this effect persists.',
    },
    {
      id: 83295, // Spell Wall (morph)
      name: 'Spell Wall',
      type: 'ultimate',
      baseAbilityId: AbilityId.SHIELD_WALL,
      description:
        'Reinforce your shield, allowing you to automatically block all attacks at no cost and reflect all projectiles cast at you for 7 seconds.',
      alternateIds: [83292],
    },

    // Scribing abilities
    {
      id: AbilityId.SHIELD_THROW,
      name: 'Shield Throw',
      type: 'active',
      baseAbilityId: AbilityId.SHIELD_THROW,
      description: 'Hurl your shield at an enemy, which then returns to you.',
    },

    // Active abilities
    {
      id: AbilityId.PUNCTURE,
      name: 'Puncture',
      type: 'active',
      baseAbilityId: AbilityId.PUNCTURE,
      description:
        'Thrust your weapon with disciplined precision at an enemy, dealing 1161 Physical Damage and taunting them to attack you for 15 seconds.\n\nAlso inflicts Major Breach on the enemy, reducing their Physical and Spell Resistance by 5948 for 15 seconds.',
    },
    {
      id: 38250, // Pierce Armor (morph)
      name: 'Pierce Armor',
      type: 'active',
      baseAbilityId: AbilityId.PUNCTURE,
      description:
        'Thrust your weapon with disciplined precision at an enemy, dealing 1199 Physical Damage and taunting them to attack you for 15 seconds.\n\nAlso inflicts Minor Breach and Major Breach on the enemy, reducing their Physical Resistance and Spell Resistance by 2974 and 5948 for 15 seconds.',
    },
    {
      id: 38254, // Ransack (morph)
      name: 'Ransack',
      type: 'active',
      baseAbilityId: AbilityId.PUNCTURE,
      description:
        'Thrust your weapon with disciplined precision at an enemy, dealing 1199 Physical Damage and taunting them to attack you for 15 seconds.\n\nAlso inflicts Major Breach on the enemy, reducing their Physical and Spell Resistance by 5948 for 15 seconds.\n\nYou also gain Minor Protection, reducing your damage taken by 5% for 15 seconds.',
    },
    {
      id: AbilityId.LOW_SLASH,
      name: 'Low Slash',
      type: 'active',
      baseAbilityId: AbilityId.LOW_SLASH,
      description:
        'Surprise an enemy with a deep lunge, dealing 1392 Physical Damage and afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds.',
    },
    {
      id: 38268, // Deep Slash (morph)
      name: 'Deep Slash',
      type: 'active',
      baseAbilityId: AbilityId.LOW_SLASH,
      description:
        'Surprise an enemy with a sweeping lunge, dealing 1799 Physical Damage to them and other nearby enemies, afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds.\n\nEnemies hit also have their Movement Speed reduced by 30% for 4 seconds.',
    },
    {
      id: 38264, // Heroic Slash (morph)
      name: 'Heroic Slash',
      type: 'active',
      baseAbilityId: AbilityId.LOW_SLASH,
      description:
        'Surprise an enemy with a deep lunge, dealing 1438 Physical Damage and afflicting them with Minor Maim, reducing their damage done by 5% for 15 seconds.\n\nYou gain Minor Heroism, granting you 1 Ultimate every 1.5 seconds for 15 seconds.',
    },
    {
      id: AbilityId.DEFENSIVE_POSTURE,
      name: 'Defensive Posture',
      type: 'active',
      baseAbilityId: AbilityId.DEFENSIVE_POSTURE,
      description:
        'Bolster your defenses, gaining a damage shield that absorbs up to 4958 damage for 6 seconds. This portion of the ability scales off your Max Health.\n\nYou reflect the next harmful direct damage projectile cast at you. This effect can occur once per cast.',
    },
    {
      id: 38401, // Absorb Missile (morph)
      name: 'Absorb Missile',
      type: 'active',
      baseAbilityId: AbilityId.DEFENSIVE_POSTURE,
      description:
        'Rush an enemy and ram them, dealing 1393 Physical Damage and stunning them for 3 seconds.\n\nYou gain a damage shield after the attack, absorbing 5121 damage for 6 seconds. This portion of the ability scales off your Max Health.',
    },
    {
      id: 38405, // Defensive Stance (morph)
      name: 'Defensive Stance',
      type: 'active',
      baseAbilityId: AbilityId.DEFENSIVE_POSTURE,
      description:
        'Rush an enemy and ram them, dealing 1393 Physical Damage and stunning them for 4 seconds.\n\nStuns up to 50% longer based on the distance traveled.',
    },
    {
      id: AbilityId.SHIELD_CHARGE,
      name: 'Shield Charge',
      type: 'active',
      baseAbilityId: AbilityId.SHIELD_CHARGE,
      description:
        'Rush an enemy and ram them, dealing 1392 Physical Damage and stunning them for 3 seconds.',
    },
    {
      id: 38455, // Invasion (morph)
      name: 'Invasion',
      type: 'active',
      baseAbilityId: AbilityId.SHIELD_CHARGE,
      description:
        "Strike an enemy full-force with your shield, dealing 1161 Physical Damage and stunning them for 3 seconds.\n\nAfter the stun ends, the enemy takes an additional 1161 Physical Damage.\n\nThis ability's damage is considered Bash damage and interrupts the enemy if they are casting.",
    },
    {
      id: 38452, // Shielded Assault (morph)
      name: 'Shielded Assault',
      type: 'active',
      baseAbilityId: AbilityId.SHIELD_CHARGE,
      description:
        "Strike an enemy full-force with your shield, dealing 2399 Physical Damage.\n\nWhile slotted, blocking any attack grants you Resentment, which reduces the cost of your next Power Slam cast within 10 seconds by 50%.\n\nThis ability's damage is considered Bash damage and interrupts the enemy if they are casting.",
    },
    {
      id: AbilityId.POWER_BASH,
      name: 'Power Bash',
      type: 'active',
      baseAbilityId: AbilityId.POWER_BASH,
      description:
        "Strike an enemy full-force with your shield, dealing 2323 Physical Damage.\n\nThis ability's damage is considered Bash damage and interrupts the enemy if they are casting.",
    },
    {
      id: 38382, // Power Slam (morph)
      name: 'Power Slam',
      type: 'active',
      baseAbilityId: AbilityId.POWER_BASH,
      description:
        "Strike an enemy full-force with your shield, dealing 2399 Physical Damage.\n\nWhile slotted, blocking any attack grants you Resentment, which reduces the cost of your next Power Slam cast within 10 seconds by 50%.\n\nThis ability's damage is considered Bash damage and interrupts the enemy if they are casting.",
    },
    {
      id: 38386, // Reverberating Bash (morph)
      name: 'Reverberating Bash',
      type: 'active',
      baseAbilityId: AbilityId.POWER_BASH,
      description:
        "Strike an enemy full-force with your shield, dealing 1161 Physical Damage and stunning them for 3 seconds.\n\nAfter the stun ends, the enemy takes an additional 1161 Physical Damage.\n\nThis ability's damage is considered Bash damage and interrupts the enemy if they are casting.",
    },

    // Passive abilities
    {
      id: AbilityId.FORTRESS,
      icon: 'ability_weapon_028',
      alternateIds: [29420, 38306, 41344, 41346, 45471, 200240],
      name: 'Fortress',
      type: 'passive',
      baseAbilityId: AbilityId.FORTRESS,
      description:
        'Reduces the Stamina cost of your One Hand and Shield abilities by 15% and reduces the cost of blocking by 36%.',
    },
    {
      id: AbilityId.SWORD_AND_BOARD,
      icon: 'ability_armor_014',
      alternateIds: [29397, 29398, 45452, 45453],
      name: 'Sword and Board',
      type: 'passive',
      baseAbilityId: AbilityId.SWORD_AND_BOARD,
      description:
        'Increases your Weapon and Spell Damage by 5% and the amount of damage you can block by 20%.',
    },
    {
      id: AbilityId.DEADLY_BASH,
      icon: 'ability_dragonknight_034',
      alternateIds: [29415, 45469, 147189, 147190, 217092],
      name: 'Deadly Bash',
      type: 'passive',
      baseAbilityId: AbilityId.DEADLY_BASH,
      description:
        'Improves your standard Bash attacks, causing them to deal 500 more damage and cost 50% less Stamina.',
    },
    {
      id: AbilityId.DEFLECT_BOLTS,
      icon: 'ability_templar_027',
      alternateIds: [29399, 45472],
      name: 'Deflect Bolts',
      type: 'passive',
      baseAbilityId: AbilityId.DEFLECT_BOLTS,
      description:
        'Increases the amount of damage you can block from projectiles and ranged attacks by 14%.',
    },
    {
      id: AbilityId.BATTLEFIELD_MOBILITY,
      icon: 'ability_armor_009',
      alternateIds: [29422, 45473],
      name: 'Battlefield Mobility',
      type: 'passive',
      baseAbilityId: AbilityId.BATTLEFIELD_MOBILITY,
      description: 'Reduces the Movement Speed penalty of Bracing.',
    },
  ],
};
