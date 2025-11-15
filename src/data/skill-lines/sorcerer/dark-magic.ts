/**
 * Dark Magic Skill Line Data
 * 
 * The Dark Magic skill-line is part of the Sorcerer toolkit and has a focus on 
 * offensive and support abilities. In addition to powerful abilities, you can also 
 * select passives that increase your sustain and support capabilities even further.
 * 
 * @source https://eso-hub.com/en/skills/sorcerer/dark-magic
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const darkMagic: SkillLineData = {
  id: 'sorcerer-dark-magic',
  name: 'Dark Magic',
  class: 'Sorcerer',
  category: 'class',
  icon: '/images/skills/sorcerer/dark-magic.png',
  skills: [
    // Ultimate: Negate Magic and morphs
    { id: 28341, name: 'Negate Magic', type: 'ultimate', baseAbilityId: 28341 },
    { id: 47845, name: 'Absorption Field', type: 'ultimate', baseAbilityId: 28341 },
    { id: 47878, name: 'Suppression Field', type: 'ultimate', baseAbilityId: 28341 },
    
    // Active: Crystal Shard and morphs
    { id: 43714, name: 'Crystal Shard', type: 'active', baseAbilityId: 43714 },
    { id: 46324, name: 'Crystal Fragments', type: 'active', baseAbilityId: 43714 },
    { id: 46340, name: 'Crystal Weapon', type: 'active', baseAbilityId: 43714 },
    
    // Active: Encase and morphs
    { id: 28308, name: 'Encase', type: 'active', baseAbilityId: 28308 },
    { id: 47878, name: 'Shattering Spines', type: 'active', baseAbilityId: 28308 },
    { id: 118355, name: 'Vibrant Shroud', type: 'active', baseAbilityId: 28308 },
    
    // Active: Rune Prison and morphs
    { id: 24371, name: 'Rune Prison', type: 'active', baseAbilityId: 24371 },
    { id: 47874, name: 'Defensive Rune', type: 'active', baseAbilityId: 24371 },
    { id: 47890, name: 'Rune Cage', type: 'active', baseAbilityId: 24371 },
    
    // Active: Dark Exchange and morphs
    { id: 24595, name: 'Dark Exchange', type: 'active', baseAbilityId: 24595 },
    { id: 47867, name: 'Dark Conversion', type: 'active', baseAbilityId: 24595 },
    { id: 47884, name: 'Dark Deal', type: 'active', baseAbilityId: 24595 },
    
    // Active: Daedric Mines and morphs
    { id: 24828, name: 'Daedric Mines', type: 'active', baseAbilityId: 24828 },
    { id: 215371, name: 'Daedric Refuge', type: 'active', baseAbilityId: 24828 },
    { id: 47899, name: 'Daedric Tomb', type: 'active', baseAbilityId: 24828 },
    
    // Passives
    { id: 31375, name: 'Unholy Knowledge', type: 'passive', baseAbilityId: 31375 },
    { id: 31380, name: 'Blood Magic', type: 'passive', baseAbilityId: 31380 },
    { id: 31382, name: 'Persistence', type: 'passive', baseAbilityId: 31382 },
    { id: 45182, name: 'Exploitation', type: 'passive', baseAbilityId: 45182 },
  ],
};
