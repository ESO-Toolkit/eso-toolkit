/**
 * Aedric Spear Skill Line
 * Class: Templar
 * Source: https://eso-hub.com/en/skills/templar/aedric-spear
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const aedricSpear: SkillLineData = {
  id: 'templar-aedric-spear',
  name: "Aedric Spear",
  class: 'Templar',
  category: 'class',
  icon: 'aedric-spear-icon',
  skills: [
    // Ultimate
    { id: 22138, name: 'Radial Sweep', type: 'ultimate', baseAbilityId: 22138 },
    { id: 22139, name: 'Crescent Sweep', type: 'ultimate', baseAbilityId: 22138 },
    { id: 22144, name: 'Empowering Sweep', type: 'ultimate', baseAbilityId: 22138 },
    
    // Active Abilities
    { id: 26114, name: 'Puncturing Strikes', type: 'active', baseAbilityId: 26114 },
    { id: 26792, name: 'Biting Jabs', type: 'active', baseAbilityId: 26114 },
    { id: 26797, name: 'Puncturing Sweep', type: 'active', baseAbilityId: 26114 },
    
    { id: 26800, name: 'Piercing Javelin', type: 'active', baseAbilityId: 26800 },
    { id: 26804, name: 'Aurora Javelin', type: 'active', baseAbilityId: 26800 },
    { id: 26807, name: 'Binding Javelin', type: 'active', baseAbilityId: 26800 },
    
    { id: 22161, name: 'Focused Charge', type: 'active', baseAbilityId: 22161 },
    { id: 22165, name: 'Explosive Charge', type: 'active', baseAbilityId: 22161 },
    { id: 22162, name: 'Toppling Charge', type: 'active', baseAbilityId: 22161 },
    
    { id: 26188, name: 'Spear Shards', type: 'active', baseAbilityId: 26188 },
    { id: 26869, name: 'Blazing Spear', type: 'active', baseAbilityId: 26188 },
    { id: 26871, name: 'Luminous Shards', type: 'active', baseAbilityId: 26188 },
    
    { id: 22180, name: 'Sun Shield', type: 'active', baseAbilityId: 22180 },
    { id: 22182, name: 'Blazing Shield', type: 'active', baseAbilityId: 22180 },
    { id: 22183, name: 'Radiant Ward', type: 'active', baseAbilityId: 22180 },
    
    // Passive Abilities
    { id: 22134, name: 'Piercing Spear', type: 'passive', baseAbilityId: 22134 },
    { id: 22135, name: 'Spear Wall', type: 'passive', baseAbilityId: 22135 },
    { id: 22136, name: 'Burning Light', type: 'passive', baseAbilityId: 22136 },
    { id: 22137, name: 'Balanced Warrior', type: 'passive', baseAbilityId: 22137 }
  ]
};
