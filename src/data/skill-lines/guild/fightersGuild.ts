import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const fightersGuild: SkillLineData = {
  id: 'fighters-guild',
  name: 'Fighters Guild',
  class: 'guild',
  category: 'guild',
  icon: 'ability_fightersguild_005',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.DAWNBREAKER,
      name: 'Dawnbreaker',
      type: 'ultimate',
      baseAbilityId: AbilityId.DAWNBREAKER,
      description:
        "Arm yourself with Meridia's sacred sword and dispense her retribution, dealing 2904 Physical Damage to enemies in front of you and an additional 3483 Physical Damage over 6 seconds.",
    },
    {
      id: 40158,
      name: 'Dawnbreaker of Smiting',
      type: 'ultimate',
      baseAbilityId: AbilityId.DAWNBREAKER,
      description:
        "Arm yourself with Meridia's sacred sword and dispense her retribution, dealing 3600 Physical Damage to enemies in front of you, an additional 4314 Physical Damage over 6 seconds, and stunning them for 2 seconds.",
    },
    {
      id: 40161,
      name: 'Flawless Dawnbreaker',
      type: 'ultimate',
      baseAbilityId: AbilityId.DAWNBREAKER,
      description:
        "Arm yourself with Meridia's sacred sword and dispense her retribution, dealing 2904 Physical Damage to enemies in front of you and an additional 3483 Physical Damage over 6 seconds. After activating, your Weapon and Spell Damage is increased by 300 for 20 seconds.",
    },

    // Scribing abilities
    {
      id: AbilityId.TORCHBEARER,
      name: 'Torchbearer',
      type: 'active',
      baseAbilityId: AbilityId.TORCHBEARER,
      description:
        'Conjure an imbued torch and sweep the area in front of you three times with its power.',
    },

    // Active abilities - Silver Bolts family
    {
      id: AbilityId.SILVER_BOLTS,
      name: 'Silver Bolts',
      type: 'active',
      baseAbilityId: AbilityId.SILVER_BOLTS,
      description:
        "Fire a Dawnguard Vampire Hunter's crossbow bolt to strike an enemy, dealing 2090 Physical Damage.",
    },
    {
      id: 40336,
      name: 'Silver Leash',
      type: 'active',
      baseAbilityId: AbilityId.SILVER_BOLTS,
      description:
        "Fire a Dawnguard's crossbow hook to pull an enemy to you, dealing 1438 Physical Damage, taunting them for 15 seconds if they are not already taunted, and reducing their Movement Speed by 30% for 4 seconds.",
    },
    {
      id: 40300,
      name: 'Silver Shards',
      type: 'active',
      baseAbilityId: AbilityId.SILVER_BOLTS,
      description:
        "Fire an augmented Dawnguard Vampire Hunter's crossbow bolt to strike an enemy, dealing 2091 Physical Damage. Fires additional bolts at other enemies near the initial target for 22% less damage.",
    },

    // Active abilities - Circle of Protection family
    {
      id: AbilityId.CIRCLE_OF_PROTECTION,
      name: 'Circle of Protection',
      type: 'active',
      baseAbilityId: AbilityId.CIRCLE_OF_PROTECTION,
      description:
        'Brand the earth at your location with a rune of protection for 17 seconds. You and your allies in the area gain Minor Protection and Minor Endurance, reducing your damage taken by 5% and increasing your Stamina Recovery by 15%.',
    },
    {
      id: 40169,
      name: 'Ring of Preservation',
      type: 'active',
      baseAbilityId: AbilityId.CIRCLE_OF_PROTECTION,
      description:
        'Brand the earth at your location with a rune of protection for 10 seconds. You and your allies in the area gain Minor Protection and Minor Endurance, reducing damage taken by 5% and increasing Stamina Recovery by 15%, and are healed for 422 Health every 1 second.',
    },
    {
      id: 40181,
      name: 'Turn Evil',
      type: 'active',
      baseAbilityId: AbilityId.CIRCLE_OF_PROTECTION,
      description:
        'Brand the earth at your location with a rune of protection for 20 seconds. You and your allies in the area gain Minor Protection and Minor Endurance, reducing your damage taken by 5% and increasing your Stamina Recovery by 15%.\n\nUpon activation, enemies in the area are feared for 2 seconds.',
    },

    // Active abilities - Expert Hunter family
    {
      id: AbilityId.EXPERT_HUNTER,
      name: 'Expert Hunter',
      type: 'active',
      baseAbilityId: AbilityId.EXPERT_HUNTER,
      description:
        'Invoke your expertise in anatomy and enemy behavior to detect stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds.\n\nWhile slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
    },
    {
      id: 40195,
      name: 'Camouflaged Hunter',
      type: 'active',
      baseAbilityId: AbilityId.EXPERT_HUNTER,
      description:
        "Invoke your expertise in anatomy and enemy behavior to detect stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629. You also gain Minor Berserk for 5 seconds after dealing Critical Damage from an enemy's flank.",
    },
    {
      id: 40194,
      name: 'Evil Hunter',
      type: 'active',
      baseAbilityId: AbilityId.EXPERT_HUNTER,
      description:
        'Invoke your expertise in anatomy and enemy behavior to detect stealthed and invisible enemies around you for 5 seconds. Exposed enemies cannot return to stealth or invisibility for 4 seconds. \n\nWhile active, increases the damage of your Stamina costing Fighters Guild abilities by 22%.\n\nWhile slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
    },

    // Active abilities - Trap Beast family
    {
      id: AbilityId.TRAP_BEAST,
      name: 'Trap Beast',
      type: 'active',
      baseAbilityId: AbilityId.TRAP_BEAST,
      description:
        'Set a sharpened blade trap at your location, which takes 1.5 seconds to arm and lasts for 20 seconds. \n\nWhen triggered, the trap deals 1124 Bleed Damage, an additional 3360 Bleed Damage over 20 seconds, and grants you Minor Force, increasing your Critical Damage by 10% for the duration.\n\nEnemies who activate the trap are immobilized for 2 seconds.',
    },
    {
      id: 40382,
      name: 'Barbed Trap',
      type: 'active',
      baseAbilityId: AbilityId.TRAP_BEAST,
      description:
        'Set a sharpened blade trap at your location, which takes 1.5 seconds to arm and lasts for 20 seconds.\n\nWhen triggered, the trap deals 1393 Bleed Damage, an additional 3470 Bleed Damage over 20 seconds, and grants you Minor Force, increasing your Critical Damage by 10% for the duration.\n\nEnemies hit by the initial hit are afflicted with the Hemorrhaging status effect.\n\n Enemies who activate the trap are immobilized for 2 seconds.',
    },
    {
      id: 40372,
      icon: 'ability_fightersguild_004_b',
      name: 'Lightweight Beast Trap',
      type: 'active',
      baseAbilityId: AbilityId.TRAP_BEAST,
      description:
        'Launch a sharpened blade trap at a target location, which takes 1.5 seconds to arm and lasts for 20 seconds.\n\nWhen triggered, the trap deals 1161 Bleed Damage, an additional 3470 Bleed Damage over 20 seconds, and grants you Minor Force, increasing your Critical Damage by 10% for the duration.\n\nEnemies who activate the trap are immobilized for 2 seconds.',
    },

    // Passive abilities
    {
      id: AbilityId.INTIMIDATING_PRESENCE,
      icon: 'ability_fightersguild_passive_intimidate',
      name: 'Intimidating Presence',
      type: 'passive',
      baseAbilityId: AbilityId.INTIMIDATING_PRESENCE,
      description:
        'Allows you to Intimidate NPCs in conversation.\n\nReduces the Stamina cost of your Fighters Guild abilities by 15%.',
    },
    {
      id: AbilityId.SLAYER,
      icon: 'ability_dragonknight_025',
      alternateIds: [35803, 45595, 45596],
      name: 'Slayer',
      type: 'passive',
      baseAbilityId: AbilityId.SLAYER,
      description:
        'Increases your Weapon and Spell Damage by 1% for each Fighters Guild ability slotted.\n\nCurrent bonus: 0%.',
    },
    {
      id: AbilityId.BANISH_THE_WICKED,
      icon: 'ability_dragonknight_034',
      alternateIds: [35800, 35801, 45597, 45598, 45599, 45600],
      name: 'Banish the Wicked',
      type: 'passive',
      baseAbilityId: AbilityId.BANISH_THE_WICKED,
      description: 'You generate 1 Ultimate whenever you kill an enemy.',
    },
    {
      id: AbilityId.SKILLED_TRACKER,
      icon: 'ability_armor_007',
      alternateIds: [40393, 159880],
      name: 'Skilled Tracker',
      type: 'passive',
      baseAbilityId: AbilityId.SKILLED_TRACKER,
      description:
        'Your Fighters Guild abilities deal an additional 10% damage. This bonus doubles against player Vampires and Werewolves.',
    },
    {
      id: AbilityId.BOUNTY_HUNTER,
      icon: 'ability_armor_011',
      name: 'Bounty Hunter',
      type: 'passive',
      baseAbilityId: AbilityId.BOUNTY_HUNTER,
      description: 'Allows you to accept bounty quests from the Fighters Guild in Cyrodiil.',
    },
  ],
};
