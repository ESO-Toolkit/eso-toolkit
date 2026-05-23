/**
 * Two-Handed Weapon Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/weapon/two-handed
 */

import { SkillData } from '../types';

const CATEGORY = 'Two-Handed';

export const TWO_HANDED_SKILLS: SkillData[] = [
  // Ultimate: Berserker Strike
  { id: 83216, name: 'Berserker Strike', category: CATEGORY, isUltimate: true },
  { id: 83238, name: 'Berserker Rage', category: CATEGORY, isUltimate: true, baseSkillId: 83216 },
  { id: 83229, name: 'Onslaught', category: CATEGORY, isUltimate: true, baseSkillId: 83216 },

  // Uppercut
  { id: 28279, name: 'Uppercut', category: CATEGORY },
  { id: 38814, name: 'Dizzying Swing', category: CATEGORY, baseSkillId: 28279 },
  { id: 38807, name: 'Wrecking Blow', category: CATEGORY, baseSkillId: 28279 },

  // Critical Charge
  { id: 28448, name: 'Critical Charge', category: CATEGORY },
  { id: 38788, name: 'Critical Rush', category: CATEGORY, baseSkillId: 28448 },
  { id: 38791, name: 'Stampede', category: CATEGORY, baseSkillId: 28448 },

  // Cleave
  { id: 20919, name: 'Cleave', category: CATEGORY },
  { id: 38745, name: 'Brawler', category: CATEGORY, baseSkillId: 20919 },
  { id: 38754, name: 'Carve', category: CATEGORY, baseSkillId: 20919 },

  // Reverse Slash
  { id: 28302, name: 'Reverse Slash', category: CATEGORY },
  { id: 38846, name: 'Executioner', category: CATEGORY, baseSkillId: 28302 },
  { id: 38839, name: 'Reverse Slice', category: CATEGORY, baseSkillId: 28302 },

  // Momentum
  { id: 28297, name: 'Momentum', category: CATEGORY },
  { id: 38794, name: 'Forward Momentum', category: CATEGORY, baseSkillId: 28297 },
  { id: 38802, name: 'Rally', category: CATEGORY, baseSkillId: 28297 },
];
