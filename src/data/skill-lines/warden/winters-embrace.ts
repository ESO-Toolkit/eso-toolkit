/**
 * Winter's Embrace - Warden Class Skill Line
 * Source: https://eso-hub.com/en/skills/warden/winters-embrace
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const wintersEmbrace: SkillLineData = {
  id: 'warden-winters-embrace',
  name: "Winter's Embrace",
  class: 'Warden',
  category: 'class',
  icon: 'winters-embrace-icon',
  skills: [
    // Ultimate abilities
    { id: 86122, name: 'Sleet Storm', type: 'ultimate', baseAbilityId: 86122 },
    { id: 86126, name: 'Northern Storm', type: 'ultimate', baseAbilityId: 86122 },
    { id: 86130, name: 'Permafrost', type: 'ultimate', baseAbilityId: 86122 },

    // Active abilities - Frost Cloak
    { id: 86135, name: 'Frost Cloak', type: 'active', baseAbilityId: 86135 },
    { id: 86139, name: 'Expansive Frost Cloak', type: 'active', baseAbilityId: 86135 },
    { id: 86143, name: 'Ice Fortress', type: 'active', baseAbilityId: 86135 },

    // Active abilities - Impaling Shards
    { id: 86147, name: 'Impaling Shards', type: 'active', baseAbilityId: 86147 },
    { id: 86151, name: 'Gripping Shards', type: 'active', baseAbilityId: 86147 },
    { id: 86155, name: "Winter's Revenge", type: 'active', baseAbilityId: 86147 },

    // Active abilities - Arctic Wind
    { id: 86159, name: 'Arctic Wind', type: 'active', baseAbilityId: 86159 },
    { id: 86165, name: 'Arctic Blast', type: 'active', baseAbilityId: 86159 },
    { id: 86169, name: 'Polar Wind', type: 'active', baseAbilityId: 86159 },

    // Active abilities - Crystallized Shield
    { id: 86175, name: 'Crystallized Shield', type: 'active', baseAbilityId: 86175 },
    { id: 86179, name: 'Crystallized Slab', type: 'active', baseAbilityId: 86175 },
    { id: 86183, name: 'Shimmering Shield', type: 'active', baseAbilityId: 86175 },

    // Active abilities - Frozen Gate
    { id: 86187, name: 'Frozen Gate', type: 'active', baseAbilityId: 86187 },
    { id: 86193, name: 'Frozen Device', type: 'active', baseAbilityId: 86187 },
    { id: 86197, name: 'Frozen Retreat', type: 'active', baseAbilityId: 86187 },

    // Passive abilities
    { id: 85804, name: 'Glacial Presence', type: 'passive', baseAbilityId: 85804 },
    { id: 85805, name: 'Frozen Armor', type: 'passive', baseAbilityId: 85805 },
    { id: 85806, name: 'Icy Aura', type: 'passive', baseAbilityId: 85806 },
    { id: 85807, name: 'Piercing Cold', type: 'passive', baseAbilityId: 85807 },
  ],
};
