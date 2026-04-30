/**
 * Bow Weapon Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/weapon/bow
 */

import { SkillData } from '../types';

const CATEGORY = 'Bow';

export const BOW_SKILLS: SkillData[] = [
  // Ultimate: Rapid Fire
  { id: 83465, name: 'Rapid Fire', category: CATEGORY, isUltimate: true },
  // { id: XXXXX, name: "Ballista", category: CATEGORY, isUltimate: true, baseSkillId: 83465 },
  // { id: XXXXX, name: "Toxic Barrage", category: CATEGORY, isUltimate: true, baseSkillId: 83465 },

  // Snipe
  { id: 28882, name: 'Snipe', category: CATEGORY },
  { id: 38685, name: 'Lethal Arrow', category: CATEGORY, baseSkillId: 28882 },
  // { id: XXXXX, name: "Focused Aim", category: CATEGORY, baseSkillId: 28882 },

  // Volley
  { id: 28876, name: 'Volley', category: CATEGORY },
  { id: 38689, name: 'Endless Hail', category: CATEGORY, baseSkillId: 28876 },
  { id: 38695, name: 'Arrow Barrage', category: CATEGORY, baseSkillId: 28876 },

  // Scatter Shot
  { id: 28879, name: 'Scatter Shot', category: CATEGORY },
  // { id: XXXXX, name: "Magnum Shot", category: CATEGORY, baseSkillId: 28879 },
  // { id: XXXXX, name: "Draining Shot", category: CATEGORY, baseSkillId: 28879 },

  // Arrow Spray
  { id: 31271, name: 'Arrow Spray', category: CATEGORY },
  // { id: XXXXX, name: "Bombard", category: CATEGORY, baseSkillId: 31271 },
  // { id: XXXXX, name: "Acid Spray", category: CATEGORY, baseSkillId: 31271 },

  // Poison Arrow - Note: No base skill ID found in abilities.json, using Venom Arrow as potential base
  { id: 38645, name: 'Venom Arrow', category: CATEGORY },
  { id: 38660, name: 'Poison Injection', category: CATEGORY, baseSkillId: 38645 },
];
