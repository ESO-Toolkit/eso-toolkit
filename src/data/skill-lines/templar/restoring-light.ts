/**
 * Restoring Light Skill Line
 * Class: Templar
 * Source: https://eso-hub.com/en/skills/templar/restoring-light
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const restoringLight: SkillLineData = {
  id: 'templar-restoring-light',
  name: 'Restoring Light',
  class: 'Templar',
  category: 'class',
  icon: 'restoring-light-icon',
  skills: [
    // Ultimate
    { id: 22223, name: 'Rite of Passage', type: 'ultimate', baseAbilityId: 22223 },
    { id: 22226, name: 'Practiced Incantation', type: 'ultimate', baseAbilityId: 22223 },
    { id: 22229, name: 'Remembrance', type: 'ultimate', baseAbilityId: 22223 },
    
    // Active Abilities
    { id: 22234, name: 'Rushed Ceremony', type: 'active', baseAbilityId: 22234 },
    { id: 22240, name: 'Breath of Life', type: 'active', baseAbilityId: 22234 },
    { id: 22237, name: 'Honor the Dead', type: 'active', baseAbilityId: 22234 },
    
    { id: 22253, name: 'Healing Ritual', type: 'active', baseAbilityId: 22253 },
    { id: 22256, name: 'Hasty Prayer', type: 'active', baseAbilityId: 22253 },
    { id: 22259, name: 'Ritual of Rebirth', type: 'active', baseAbilityId: 22253 },
    
    { id: 22262, name: 'Restoring Aura', type: 'active', baseAbilityId: 22262 },
    { id: 22265, name: 'Radiant Aura', type: 'active', baseAbilityId: 22262 },
    { id: 22268, name: 'Repentance', type: 'active', baseAbilityId: 22262 },
    
    { id: 22244, name: 'Cleansing Ritual', type: 'active', baseAbilityId: 22244 },
    { id: 22247, name: 'Extended Ritual', type: 'active', baseAbilityId: 22244 },
    { id: 22250, name: 'Ritual of Retribution', type: 'active', baseAbilityId: 22244 },
    
    { id: 22304, name: 'Rune Focus', type: 'active', baseAbilityId: 22304 },
    { id: 22306, name: 'Channeled Focus', type: 'active', baseAbilityId: 22304 },
    { id: 22307, name: 'Restoring Focus', type: 'active', baseAbilityId: 22304 },
    
    // Passive Abilities
    { id: 22314, name: 'Mending', type: 'passive', baseAbilityId: 22314 },
    { id: 22315, name: 'Sacred Ground', type: 'passive', baseAbilityId: 22315 },
    { id: 22316, name: 'Light Weaver', type: 'passive', baseAbilityId: 22316 },
    { id: 22318, name: 'Master Ritualist', type: 'passive', baseAbilityId: 22318 }
  ]
};
