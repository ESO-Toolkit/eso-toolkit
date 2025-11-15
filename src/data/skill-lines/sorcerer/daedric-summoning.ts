/**
 * Daedric Summoning - Sorcerer skill line
 * 
 * The Daedric Summoning skill-line is part of the Sorcerer toolkit and has a focus on 
 * summoned pets, defensive and offensive abilities.
 * 
 * Source: https://eso-hub.com/en/skills/sorcerer/daedric-summoning
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const daedricSummoning: SkillLineData = {
  id: 'daedric-summoning',
  name: 'Daedric Summoning',
  class: 'Sorcerer',
  category: 'class',
  icon: '/images/skills/sorcerer/daedric-summoning.png',
  skills: [
    // Ultimate: Summon Storm Atronach
    { id: 23634, name: 'Summon Storm Atronach', type: 'ultimate', baseAbilityId: 23634 },
    { id: 23492, name: 'Greater Storm Atronach', type: 'ultimate', baseAbilityId: 23634 },
    { id: 23495, name: 'Summon Charged Atronach', type: 'ultimate', baseAbilityId: 23634 },
    
    // Active: Summon Unstable Familiar
    { id: 23304, name: 'Summon Unstable Familiar', type: 'active', baseAbilityId: 23304 },
    { id: 23319, name: 'Summon Unstable Clannfear', type: 'active', baseAbilityId: 23304 },
    { id: 23316, name: 'Summon Volatile Familiar', type: 'active', baseAbilityId: 23304 },
    
    // Active: Daedric Curse
    { id: 24328, name: 'Daedric Curse', type: 'active', baseAbilityId: 24328 },
    { id: 24330, name: 'Daedric Prey', type: 'active', baseAbilityId: 24328 },
    { id: 24326, name: 'Haunting Curse', type: 'active', baseAbilityId: 24328 },
    
    // Active: Summon Winged Twilight
    { id: 23316, name: 'Summon Winged Twilight', type: 'active', baseAbilityId: 23316 },
    { id: 23495, name: 'Summon Twilight Matriarch', type: 'active', baseAbilityId: 23316 },
    { id: 23492, name: 'Summon Twilight Tormentor', type: 'active', baseAbilityId: 23316 },
    
    // Active: Conjured Ward
    { id: 28418, name: 'Conjured Ward', type: 'active', baseAbilityId: 28418 },
    { id: 28502, name: 'Hardened Ward', type: 'active', baseAbilityId: 28418 },
    { id: 28536, name: 'Regenerative Ward', type: 'active', baseAbilityId: 28418 },
    
    // Active: Bound Armor
    { id: 24163, name: 'Bound Armor', type: 'active', baseAbilityId: 24163 },
    { id: 24158, name: 'Bound Aegis', type: 'active', baseAbilityId: 24163 },
    { id: 24165, name: 'Bound Armaments', type: 'active', baseAbilityId: 24163 },
    
    // Passives
    { id: 31418, name: 'Rebate', type: 'passive', baseAbilityId: 31418 },
    { id: 31421, name: 'Power Stone', type: 'passive', baseAbilityId: 31421 },
    { id: 31425, name: 'Daedric Protection', type: 'passive', baseAbilityId: 31425 },
    { id: 31429, name: 'Expert Summoner', type: 'passive', baseAbilityId: 31429 },
  ],
};
