/**
 * Animal Companions - Warden Class Skill Line
 * Source: https://eso-hub.com/en/skills/warden/animal-companions
 */

import type { SkillLineData } from '../../types/skill-line-types';

export const animalCompanions: SkillLineData = {
  id: 'warden-animal-companions',
  name: 'Animal Companions',
  class: 'Warden',
  category: 'class',
  icon: 'animal-companions-icon',
  skills: [
    // Ultimate abilities
    { id: 85982, name: 'Feral Guardian', type: 'ultimate', baseAbilityId: 85982 },
    { id: 85986, name: 'Eternal Guardian', type: 'ultimate', baseAbilityId: 85982 },
    { id: 85990, name: 'Wild Guardian', type: 'ultimate', baseAbilityId: 85982 },

    // Active abilities - Dive
    { id: 86019, name: 'Dive', type: 'active', baseAbilityId: 86019 },
    { id: 86023, name: 'Cutting Dive', type: 'active', baseAbilityId: 86019 },
    { id: 86027, name: 'Screaming Cliff Racer', type: 'active', baseAbilityId: 86019 },

    // Active abilities - Scorch
    { id: 86009, name: 'Scorch', type: 'active', baseAbilityId: 86009 },
    { id: 86015, name: 'Deep Fissure', type: 'active', baseAbilityId: 86009 },
    { id: 86017, name: 'Subterranean Assault', type: 'active', baseAbilityId: 86009 },

    // Active abilities - Swarm
    { id: 86031, name: 'Swarm', type: 'active', baseAbilityId: 86031 },
    { id: 86037, name: 'Fetcher Infection', type: 'active', baseAbilityId: 86031 },
    { id: 86041, name: 'Growing Swarm', type: 'active', baseAbilityId: 86031 },

    // Active abilities - Betty Netch
    { id: 86050, name: 'Betty Netch', type: 'active', baseAbilityId: 86050 },
    { id: 86054, name: 'Blue Betty', type: 'active', baseAbilityId: 86050 },
    { id: 86058, name: 'Bull Netch', type: 'active', baseAbilityId: 86050 },

    // Active abilities - Falcon's Swiftness
    { id: 86062, name: "Falcon's Swiftness", type: 'active', baseAbilityId: 86062 },
    { id: 86066, name: 'Bird of Prey', type: 'active', baseAbilityId: 86062 },
    { id: 86070, name: 'Deceptive Predator', type: 'active', baseAbilityId: 86062 },

    // Passive abilities
    { id: 85800, name: 'Bond with Nature', type: 'passive', baseAbilityId: 85800 },
    { id: 85801, name: 'Savage Beast', type: 'passive', baseAbilityId: 85801 },
    { id: 85802, name: 'Flourish', type: 'passive', baseAbilityId: 85802 },
    { id: 85803, name: 'Advanced Species', type: 'passive', baseAbilityId: 85803 },
  ],
};
