import { SkillData } from '../types';

export const ASSAULT_SKILLS: SkillData[] = [
  // War Horn (Ultimate)
  { id: 38563, name: 'War Horn', category: 'Alliance War - Assault', isUltimate: true },
  {
    id: 40223,
    name: 'Aggressive Horn',
    category: 'Alliance War - Assault',
    isUltimate: true,
    baseSkillId: 38563,
  },
  {
    id: 40224,
    name: 'Sturdy Horn',
    category: 'Alliance War - Assault',
    isUltimate: true,
    baseSkillId: 38563,
  },

  // Trample (Active)
  { id: 46947, name: 'Trample', category: 'Alliance War - Assault', baseSkillId: 46947 },

  // Rapid Maneuver (Active)
  { id: 38566, name: 'Rapid Maneuver', category: 'Alliance War - Assault', baseSkillId: 38566 },
  { id: 40211, name: 'Charging Maneuver', category: 'Alliance War - Assault', baseSkillId: 38566 },
  {
    id: 40215,
    name: 'Retreating Maneuver',
    category: 'Alliance War - Assault',
    baseSkillId: 38566,
  },

  // Vigor (Active)
  { id: 61503, name: 'Vigor', category: 'Alliance War - Assault', baseSkillId: 61503 },
  { id: 61505, name: 'Echoing Vigor', category: 'Alliance War - Assault', baseSkillId: 61503 },
  { id: 61504, name: 'Resolving Vigor', category: 'Alliance War - Assault', baseSkillId: 61503 },

  // Caltrops (Active)
  { id: 33376, name: 'Caltrops', category: 'Alliance War - Assault', baseSkillId: 33376 },
  {
    id: 40242,
    name: 'Anti-Cavalry Caltrops',
    category: 'Alliance War - Assault',
    baseSkillId: 33376,
  },
  { id: 40252, name: 'Razor Caltrops', category: 'Alliance War - Assault', baseSkillId: 33376 },

  // Magicka Detonation (Active)
  { id: 61487, name: 'Magicka Detonation', category: 'Alliance War - Assault', baseSkillId: 61487 },
  {
    id: 61490,
    name: 'Inevitable Detonation',
    category: 'Alliance War - Assault',
    baseSkillId: 61487,
  },
  {
    id: 61491,
    name: 'Proximity Detonation',
    category: 'Alliance War - Assault',
    baseSkillId: 61487,
  },

  // Passives
  { id: 45605, name: 'Continuous Attack', category: 'Alliance War - Assault' },
  { id: 45607, name: 'Reach', category: 'Alliance War - Assault' },
  { id: 45608, name: 'Combat Frenzy', category: 'Alliance War - Assault' },
];
