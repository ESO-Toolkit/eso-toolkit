import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const destructionStaffSkillLine: SkillLineData = {
  id: '0',
  name: 'Destruction Staff',
  class: 'Weapon',
  category: 'weapon',
  icon: '',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.ELEMENTAL_STORM,
      name: 'Elemental Storm',
      type: 'ultimate',
      baseAbilityId: AbilityId.ELEMENTAL_STORM,
      description:
        'Create a cataclysmic storm at the target location that builds for 2 seconds then lays waste to all enemies in the area, dealing 1742 Magic Damage every 1 second for 7 seconds.',
      alternateIds: [83628], // Ice Storm (element-specific version)
    },
    {
      id: 83625, // Elemental Rage (morph)
      name: 'Elemental Rage',
      type: 'ultimate',
      baseAbilityId: AbilityId.ELEMENTAL_STORM,
      description:
        'Create a cataclysmic storm at the target location that builds for 2 seconds then lays waste to all enemies in the area, dealing 2249 Magic Damage every 1 second for 7 seconds. Fiery Rage increases the damage by 15%. Icy Rage immobilizes enemies hit for 3 seconds. Thunderous Rage increases the duration by 2 seconds.',
      alternateIds: [84434, 85126], // Elemental Rage (alt rank) and Fiery Rage variants
    },
    {
      id: 83630, // Eye of the Storm (morph)
      name: 'Eye of the Storm',
      type: 'ultimate',
      baseAbilityId: AbilityId.ELEMENTAL_STORM,
      description:
        'Create a cataclysmic storm above you that builds for 2 seconds then lays waste to all enemies nearby, dealing 1799 Magic Damage every 1 second for 7 seconds.',
    },

    // Scribing ability
    {
      id: AbilityId.ELEMENTAL_EXPLOSION,
      name: 'Elemental Explosion',
      type: 'active',
      baseAbilityId: AbilityId.ELEMENTAL_EXPLOSION,
      description:
        'Channel the power in your staff to fling a bolt of volatile magic, causing an elemental explosion at the target location.',
    },

    // Active abilities
    {
      id: AbilityId.FORCE_SHOCK,
      name: 'Force Shock',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SHOCK,
      description:
        'Focus all the elemental energies with your staff and blast an enemy for 695 Flame Damage 695 Frost Damage, and 695 Shock Damage.',
    },
    {
      id: 46348, // Crushing Shock (morph)
      name: 'Crushing Shock',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SHOCK,
      description:
        'Focus all the elemental energies with your staff and blast an enemy for 696 Flame Damage 696 Frost Damage, and 696 Shock Damage. Enemies hit while casting are interrupted, set Off Balance, and stunned for 3 seconds.',
    },
    {
      id: 46356, // Force Pulse (morph)
      name: 'Force Pulse',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SHOCK,
      description:
        'Focus all the elemental energies with your staff and blast an enemy for 696 Flame Damage 696 Frost Damage, and 696 Shock Damage. Up to 2 nearby enemies will take 2399 Magic Damage if they were already afflicted with a status effect.',
    },
    {
      id: AbilityId.WALL_OF_ELEMENTS,
      name: 'Wall of Elements',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Slam your staff down to create an elemental barrier in front of you, dealing 280 Magic Damage to enemies in the target area every 1 second. Wall of Fire deals additional damage to Burning enemies. Wall of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Wall of Storms sets Concussed enemies Off Balance.',
    },
    {
      id: 39011, // Elemental Blockade (morph)
      name: 'Elemental Blockade',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Slam your staff down to create an elemental barrier in front of you, dealing 281 Magic Damage to enemies in the target area every 1 second. Blockade of Fire deals additional damage to Burning enemies. Blockade of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Blockade of Storms sets Concussed enemies Off Balance.',
    },
    {
      id: 39053, // Blockade of Fire (ability rank)
      name: 'Blockade of Fire',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create a flaming barrier in front of you, dealing 281 Flame Damage to enemies in the target area every 1 second and dealing increased damage to Burning enemies.',
      alternateIds: [39012],
    },
    {
      id: 39028, // Blockade of Frost
      name: 'Blockade of Frost',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create a frozen barrier in front of you, dealing 281 Frost Damage to enemies in the target area every 1 second, snares them, and reduces their armor when they are Chilled while granting you damage shields.',
    },
    {
      id: 39073, // Blockade of Storms
      name: 'Blockade of Storms',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create a shocking barrier in front of you, dealing 281 Shock Damage to enemies in the target area every 1 second and setting Concussed enemies Off Balance.',
      alternateIds: [39018],
    },
    {
      id: 39052, // Unstable Wall of Elements (morph)
      name: 'Unstable Wall of Elements',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create an unstable elemental barrier in front of you, dealing 281 Magic Damage to enemies in the target area every 1 second before exploding for an additional 1199 Magic Damage. Unstable Wall of Fire deals additional damage to Burning enemies. Unstable Wall of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Unstable Wall of Storms sets Concussed enemies Off Balance.',
    },
    {
      id: 39061, // Unstable Blockade of Fire
      name: 'Unstable Blockade of Fire',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create an unstable flaming barrier that deals 281 Flame Damage every second before exploding for additional Flame Damage. Deals increased damage to Burning enemies.',
    },
    {
      id: 39071, // Unstable Blockade of Frost
      name: 'Unstable Blockade of Frost',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create an unstable frozen barrier that deals 281 Frost Damage every second before exploding for additional Frost Damage. Costs more, snares and reduces armor of Chilled enemies, and grants you damage shields.',
      alternateIds: [39067],
    },
    {
      id: 39045, // Unstable Blockade of Storms
      name: 'Unstable Blockade of Storms',
      type: 'active',
      baseAbilityId: AbilityId.WALL_OF_ELEMENTS,
      description:
        'Create an unstable shocking barrier that deals 281 Shock Damage every second before exploding for additional Shock Damage and setting Concussed enemies Off Balance.',
    },
    {
      id: AbilityId.DESTRUCTIVE_TOUCH,
      name: 'Destructive Touch',
      type: 'active',
      baseAbilityId: AbilityId.DESTRUCTIVE_TOUCH,
      description:
        "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 20 seconds. The initial hit always applies the element's status effect.",
    },
    {
      id: 38984, // Destructive Clench (morph)
      name: 'Destructive Clench',
      type: 'active',
      baseAbilityId: AbilityId.DESTRUCTIVE_TOUCH,
      description:
        "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage. The initial hit always applies the element's status effect. Flame Clench also knocks the enemy back. Frost Clench deals less damage, has increased range, applies Major Maim, immobilizes, and taunts the enemy. Shock Clench converts the attack into an area of effect explosion.",
      alternateIds: [38989], // Frost Clench variant
    },
    {
      id: 38937, // Destructive Reach (morph)
      name: 'Destructive Reach',
      type: 'active',
      baseAbilityId: AbilityId.DESTRUCTIVE_TOUCH,
      description:
        "Devastate an enemy with an enhanced charge from your staff, dealing 1161 Magic Damage and an additional 3470 Magic Damage over 20 seconds. The initial hit always applies the element's status effect.",
    },
    {
      id: AbilityId.WEAKNESS_TO_ELEMENTS,
      name: 'Weakness to Elements',
      type: 'active',
      baseAbilityId: AbilityId.WEAKNESS_TO_ELEMENTS,
      description:
        "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 30 seconds, reducing their Physical and Spell Resistance by 5948.",
    },
    {
      id: 39095, // Elemental Drain (morph)
      name: 'Elemental Drain',
      type: 'active',
      baseAbilityId: AbilityId.WEAKNESS_TO_ELEMENTS,
      description:
        "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 1 minute, reducing their Physical and Spell Resistance by 5948. Also applies Minor Magickasteal to the enemy for 1 minute, causing you and your allies to restore 168 Magicka every 1 second when damaging them.",
    },
    {
      id: 39089, // Elemental Susceptibility (morph)
      name: 'Elemental Susceptibility',
      type: 'active',
      baseAbilityId: AbilityId.WEAKNESS_TO_ELEMENTS,
      description:
        "Send the elements to sap an enemy's defenses and afflict them with Major Breach for 30 seconds, reducing their Physical and Spell Resistance by 5948. Every 7.5 seconds the enemy is afflicted with the Burning, Chilled, and Concussion status effect.",
    },
    {
      id: AbilityId.IMPULSE,
      name: 'Impulse',
      type: 'active',
      baseAbilityId: AbilityId.IMPULSE,
      description:
        "Release a surge of elemental energy, dealing 1742 Magic Damage to nearby enemies. Fire Impulse hits Burning enemies with Impulse Afterburn, which deals more damage based on their missing Health. Frost Impulse also provides Minor Protection. Shock Impulse's damage increases based on the number of enemies hit.",
      alternateIds: [28798],
    },
    {
      id: 39143, // Elemental Ring (morph)
      name: 'Elemental Ring',
      type: 'active',
      baseAbilityId: AbilityId.IMPULSE,
      description:
        "Release a surge of elemental energy, dealing 1799 Magic Damage to enemies at the target location. Fire Ring hits Burning enemies with Ring Afterburn, which deals more damage based on their missing Health. Frost Ring also provides Minor Protection. Shock Ring's damage increases based on the number of enemies hit.",
    },
    {
      id: 39161, // Pulsar (morph)
      name: 'Pulsar',
      type: 'active',
      baseAbilityId: AbilityId.IMPULSE,
      description:
        "Release a surge of elemental energy, dealing 1742 Magic Damage to nearby enemies and afflicting them with Minor Mangle, reducing their Max Health by 10% for 10 seconds. Flame Pulsar hits Burning enemies with Pulsar Afterburn, which deals more damage based on their missing Health. Frost Pulsar also provides Minor Protection. Storm Pulsar's damage increases based on the number of enemies hit.",
      alternateIds: [39163],
    },

    // Passive abilities
    {
      id: AbilityId.TRI_FOCUS,
      name: 'Tri Focus',
      type: 'passive',
      baseAbilityId: AbilityId.TRI_FOCUS,
      description:
        'WITH DESTRUCTION STAFF EQUIPPED Fully-charged Inferno Staff Heavy Attacks deal an additional 4480 Flame Damage over 20 seconds. Fully-charged Lightning Staff Heavy Attacks damage nearby enemies for 100% of the damage done. Fully-charged Ice Staff Heavy Attacks grant you a damage shield that absorbs 5280 damage. This effect scales off your Max Health. While an Ice Staff is equipped, blocking costs Magicka instead of Stamina.',
    },
    {
      id: AbilityId.PENETRATING_MAGIC,
      name: 'Penetrating Magic',
      type: 'passive',
      baseAbilityId: AbilityId.PENETRATING_MAGIC,
      description:
        "WITH DESTRUCTION STAFF EQUIPPED Your Destruction Staff abilities ignore 2974 of the enemy's Spell Resistance.",
    },
    {
      id: AbilityId.ELEMENTAL_FORCE,
      name: 'Elemental Force',
      type: 'passive',
      baseAbilityId: AbilityId.ELEMENTAL_FORCE,
      description:
        'WITH DESTRUCTION STAFF EQUIPPED Increases your chance to apply status effects by 100%.',
    },
    {
      id: AbilityId.ANCIENT_KNOWLEDGE,
      name: 'Ancient Knowledge',
      type: 'passive',
      baseAbilityId: AbilityId.ANCIENT_KNOWLEDGE,
      description:
        'WITH DESTRUCTION STAFF EQUIPPED Inferno Staves increases your damage done with damage over time and Status Effects by 12%. Lightning Staves increases your damage done with direct damage and channeled effects by 12%. Equipping an Ice Staff reduces the cost of blocking by 36% and increases the amount of damage you block by 20%.',
    },
    {
      id: AbilityId.DESTRUCTION_EXPERT,
      name: 'Destruction Expert',
      type: 'passive',
      baseAbilityId: AbilityId.DESTRUCTION_EXPERT,
      description:
        'WITH DESTRUCTION STAFF EQUIPPED When you kill an enemy with a Destruction Staff ability, you restore 3600 Magicka. When you absorb damage using a Destruction Staff Damage Shield, you restore 1800 Magicka. This effect can occur once every 10 seconds.',
    },
  ],
};
