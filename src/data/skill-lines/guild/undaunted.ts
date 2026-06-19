import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const undaunted: SkillLineData = {
  id: 'undaunted',
  name: 'Undaunted',
  class: 'guild',
  category: 'guild',
  icon: 'ability_undaunted_001',
  skills: [
    // Active Abilities
    {
      id: AbilityId.BLOOD_ALTAR,
      name: 'Blood Altar',
      description:
        'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 612 Health every 1 second when damaging them.\n\nAllies in the area can activate the Blood Funnel synergy, healing for 40% of their Max Health.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 41958, // Overflowing Altar (morph)
      name: 'Overflowing Altar',
      description:
        'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 612 Health every 1 second when damaging them.\n\nAllies in the area can activate the Blood Feast synergy, healing for 65% of their Max Health.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 41967, // Sanguine Altar (morph)
      name: 'Sanguine Altar',
      description:
        'Sacrifice your life essence to conjure a fountain of blood to apply Minor Lifesteal to enemies in the area, healing you and your allies for 612 Health every 1 second when damaging them.\n\nAllies in the area can activate the Blood Funnel synergy, healing for 40% of their Max Health.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: AbilityId.TRAPPING_WEBS,
      name: 'Trapping Webs',
      description:
        'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 6724 Physical Damage. After 10 seconds the webs explode, dealing 8965 Poison Damage to enemies within.\n\nA ranged ally can activate the Spawn Broodling synergy on an affected enemy, dealing 9171 Poison Damage to them and summoning a spider to attack for 10 seconds. The spider bites enemies for 2750 Physical Damage.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 41990, // Shadow Silk (morph)
      name: 'Shadow Silk',
      description:
        'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 6946 Physical Damage. After 10 seconds the webs explode, dealing 9261 Poison Damage to enemies within.\n\nA ranged ally can activate the Black Widow synergy on an affected enemy, dealing 9171 Poison Damage to them and summoning a spider to attack for 10 seconds. The spider bites enemies for 2750 Physical Damage and can poison them for 17358 Poison Damage over 10 seconds.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42012, // Tangling Webs (morph)
      name: 'Tangling Webs',
      description:
        'Hurl webs to ensnare your foes, reducing the Movement Speed of enemies in the area by 50% and dealing 6725 Physical Damage. After 10 seconds the webs explode, dealing 8965 Poison Damage to enemies within.\n\nA ranged ally can activate the Arachnophobia synergy on an affected enemy, dealing 9171 Poison Damage to them, fearing them for 4 seconds, and summoning a spider to attack for 10 seconds. The spider bites enemies for 2750 Physical Damage.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: AbilityId.INNER_FIRE,
      name: 'Inner Fire',
      description:
        "Ignite the fires of hate in an enemy's heart, dealing 4262 Flame Damage and taunting them to attack you for 15 seconds.\n\nAn ally targeting the taunted enemy can activate the Radiate synergy, dealing 5205 Flame Damage to them over 3 seconds then an additional 8679 Flame Damage to them and other nearby enemies.",
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42060, // Inner Beast (morph)
      name: 'Inner Beast',
      description:
        "Ignite the fires of hate in an enemy's heart, dealing 8808 Physical Damage, taunting them to attack you, and applying Minor Maim and Minor Vulnerability for 15 seconds, reducing their damage done and increasing their damage taken by 5%.\n\nAn ally targeting the enemy can activate the Radiate synergy, dealing 5205 Flame Damage to them over 3 seconds then an additional 8679 Flame Damage to them and other nearby enemies.",
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42056, // Inner Rage (morph)
      name: 'Inner Rage',
      description:
        "Ignite the fires of hate in an enemy's heart, dealing 4403 Flame Damage and taunting them to attack you for 15 seconds.\n\nUp to 3 allies targeting the taunted enemy can activate the Radiate synergy, dealing 5205 Flame Damage to them over 3 seconds then an additional 8679 Flame Damage to them and other nearby enemies.",
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: AbilityId.BONE_SHIELD,
      name: 'Bone Shield',
      description:
        'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 5702 damage for 6 seconds. This ability scales off your Max Health.\n\nAn ally near you can activate the Bone Wall synergy, granting the ally and up to 5 other allies a damage shield equal to 30% of their Max Health for 6 seconds.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42176, // Bone Surge (morph)
      name: 'Bone Surge',
      description:
        'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 5890 damage for 6 seconds. This ability scales off your Max Health.\n\nAn ally near you can activate the Spinal Surge synergy, granting up to 6 allies a damage shield that absorbs up to 30% of their Max Health for 6 seconds and Major Vitality, increasing their healing received and damage shield strength by 12%.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42138, // Spiked Bone Shield (morph)
      name: 'Spiked Bone Shield',
      description:
        'Surround yourself with a whirlwind of bones, gaining a damage shield that absorbs up to 5702 damage for 6 seconds and returns 100% of direct damage absorbed back to the enemy. This ability scales off your Max Health.\n\nAn ally near you can activate the Bone Wall synergy, granting the ally and up to 5 other allies a damage shield equal to 30% of their Max Health for 6 seconds.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: AbilityId.NECROTIC_ORB,
      name: 'Necrotic Orb',
      description:
        'Project a globe of annihilation that slowly floats forward for 10 seconds, dealing 1152 Magic Damage every 1 second to nearby enemies.\n\nAn ally near the globe can activate the Combustion synergy, causing the orb to explode for 8679 Magic Damage to nearby enemies and restore 3960 Magicka or Stamina to the ally, whichever maximum is higher.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42038, // Energy Orb (morph)
      name: 'Energy Orb',
      description:
        'Project a globe of regeneration that slowly floats forward, healing for 1728 Health every 1 second to you and nearby allies.\n\nAn ally near the globe can activate the Healing Combustion synergy, causing the orb to explode and heal for 7920 Health to nearby allies and restoring 3960 Magicka or Stamina to the activator, whichever maximum is higher.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    {
      id: 42028, // Mystic Orb (morph)
      name: 'Mystic Orb',
      description:
        'Project a globe of annihilation that slowly floats forward, dealing 1190 Magic Damage every 1 second to nearby enemies.\n\nWhile the orb is active you gain 100 Health, Magicka, and Stamina Recovery.\n\nAn ally near the globe can activate the Combustion synergy, causing the orb to explode for 8679 Magic Damage to nearby enemies and restore 3960 Magicka or Stamina to the ally, whichever maximum is higher.',
      type: 'active',
      isPassive: false,
      isUltimate: false,
    },
    // Passive Abilities
    {
      id: AbilityId.UNDAUNTED_COMMAND,
      icon: 'ability_templar_003',
      alternateIds: [55584, 55606, 55676, 55677],
      name: 'Undaunted Command',
      description: 'Activating a synergy restores 2% of your Max Health, Stamina, and Magicka.',
      type: 'passive',
      isPassive: true,
      isUltimate: false,
    },
    {
      id: AbilityId.UNDAUNTED_METTLE,
      icon: 'ability_armor_014',
      alternateIds: [55366, 55384, 55385, 55386, 55388, 55389],
      name: 'Undaunted Mettle',
      description:
        'Increases your Max Health, Stamina, and Magicka by 1% per type of Armor (Heavy, Medium, Light) that you have equipped.',
      type: 'passive',
      isPassive: true,
      isUltimate: false,
    },
  ],
};
