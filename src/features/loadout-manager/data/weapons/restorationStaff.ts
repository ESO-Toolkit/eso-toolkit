/**
 * Restoration Staff Weapon Skill Line
 */

import { SkillData } from '../types';

const CATEGORY = 'Restoration Staff';

export const RESTORATION_STAFF_SKILLS: SkillData[] = [
  // Ultimate: Panacea
  { id: 83552, name: 'Panacea', category: CATEGORY, isUltimate: true },
  { id: 83563, name: "Light's Champion", category: CATEGORY, isUltimate: true, baseSkillId: 83552 },
  { id: 83558, name: 'Life Giver', category: CATEGORY, isUltimate: true, baseSkillId: 83552 },

  // Grand Healing
  { id: 28385, name: 'Grand Healing', category: CATEGORY },
  { id: 40058, name: 'Illustrious Healing', category: CATEGORY, baseSkillId: 28385 },
  { id: 40060, name: 'Healing Springs', category: CATEGORY, baseSkillId: 28385 },

  // Regeneration
  { id: 8205, name: 'Regeneration', category: CATEGORY },
  { id: 40076, name: 'Rapid Regeneration', category: CATEGORY, baseSkillId: 8205 },
  { id: 40079, name: 'Radiating Regeneration', category: CATEGORY, baseSkillId: 8205 },
  { id: 40081, name: 'Mutagen', category: CATEGORY, baseSkillId: 8205 },

  // Blessing of Protection
  { id: 37243, name: 'Blessing of Protection', category: CATEGORY },
  { id: 40094, name: 'Combat Prayer', category: CATEGORY, baseSkillId: 37243 },
  { id: 40103, name: 'Blessing of Restoration', category: CATEGORY, baseSkillId: 37243 },

  // Steadfast Ward
  { id: 37232, name: 'Steadfast Ward', category: CATEGORY },
  { id: 40126, name: 'Healing Ward', category: CATEGORY, baseSkillId: 37232 },
  { id: 40130, name: 'Ward Ally', category: CATEGORY, baseSkillId: 37232 },

  // Force Siphon
  { id: 31531, name: 'Force Siphon', category: CATEGORY },
  { id: 40109, name: 'Siphon Spirit', category: CATEGORY, baseSkillId: 31531 },
  { id: 40116, name: 'Quick Siphon', category: CATEGORY, baseSkillId: 31531 },

  // Passives/Other
  { id: 63507, name: 'Healing Combustion', category: CATEGORY },
  { id: 95042, name: 'Healing Combustion', category: CATEGORY }, // Duplicate?
];
