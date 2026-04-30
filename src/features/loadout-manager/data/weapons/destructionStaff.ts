/**
 * Destruction Staff Weapon Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/weapon/destruction-staff
 */

import { SkillData } from '../types';

const CATEGORY = 'Destruction Staff';

export const DESTRUCTION_STAFF_SKILLS: SkillData[] = [
  // Ultimate: Elemental Storm
  { id: 83619, name: 'Elemental Storm', category: CATEGORY, isUltimate: true },
  { id: 83625, name: 'Fire Storm', category: CATEGORY, isUltimate: true, baseSkillId: 83619 },
  // { id: XXXXX, name: "Eye of the Storm", category: CATEGORY, isUltimate: true, baseSkillId: 83619 },
  // { id: XXXXX, name: "Elemental Rage", category: CATEGORY, isUltimate: true, baseSkillId: 83619 },

  // Force Shock
  { id: 46340, name: 'Force Shock', category: CATEGORY },
  { id: 46348, name: 'Crushing Shock', category: CATEGORY, baseSkillId: 46340 },
  // { id: XXXXX, name: "Force Pulse", category: CATEGORY, baseSkillId: 46340 },

  // Wall of Elements
  { id: 28858, name: 'Wall of Elements', category: CATEGORY },
  { id: 39011, name: 'Elemental Blockade', category: CATEGORY, baseSkillId: 28858 },
  { id: 39012, name: 'Blockade of Fire', category: CATEGORY, baseSkillId: 28858 },
  { id: 39018, name: 'Blockade of Storms', category: CATEGORY, baseSkillId: 28858 },
  { id: 39028, name: 'Blockade of Frost', category: CATEGORY, baseSkillId: 28858 },
  { id: 39052, name: 'Unstable Wall of Elements', category: CATEGORY, baseSkillId: 28858 },
  { id: 39053, name: 'Unstable Wall of Fire', category: CATEGORY, baseSkillId: 28858 },
  { id: 39067, name: 'Unstable Wall of Frost', category: CATEGORY, baseSkillId: 28858 },
  { id: 39073, name: 'Unstable Wall of Storms', category: CATEGORY, baseSkillId: 28858 },

  // Destructive Touch
  { id: 29091, name: 'Destructive Touch', category: CATEGORY },
  { id: 38984, name: 'Destructive Clench', category: CATEGORY, baseSkillId: 29091 },
  { id: 38989, name: 'Frost Clench', category: CATEGORY, baseSkillId: 29091 },
  { id: 38993, name: 'Shock Clench', category: CATEGORY, baseSkillId: 29091 },
  // { id: XXXXX, name: "Destructive Reach", category: CATEGORY, baseSkillId: 29091 },

  // Weakness to Elements
  { id: 29173, name: 'Weakness to Elements', category: CATEGORY },
  { id: 39089, name: 'Elemental Susceptibility', category: CATEGORY, baseSkillId: 29173 },
  { id: 39095, name: 'Elemental Drain', category: CATEGORY, baseSkillId: 29173 },

  // Impulse
  { id: 28800, name: 'Impulse', category: CATEGORY },
  { id: 39163, name: 'Frost Pulsar', category: CATEGORY, baseSkillId: 28800 },
  // { id: XXXXX, name: "Elemental Ring", category: CATEGORY, baseSkillId: 28800 },
  // { id: XXXXX, name: "Pulsar", category: CATEGORY, baseSkillId: 28800 },

  // Passives/Other
  { id: 39301, name: 'Combustion', category: CATEGORY },
  { id: 48076, name: 'Charged Lightning', category: CATEGORY },
  { id: 95040, name: 'Combustion', category: CATEGORY }, // Duplicate?
];
