/**
 * One Hand and Shield Weapon Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/weapon/one-hand-and-shield
 */

import { SkillData } from '../types';

const CATEGORY = 'One Hand and Shield';

export const ONE_HAND_AND_SHIELD_SKILLS: SkillData[] = [
  // Ultimate: Shield Wall
  { id: 83272, name: 'Shield Wall', category: CATEGORY, isUltimate: true },
  { id: 38401, name: 'Shielded Assault', category: CATEGORY, isUltimate: true, baseSkillId: 83272 },
  // { id: XXXXX, name: "Spell Wall", category: CATEGORY, isUltimate: true, baseSkillId: 83272 },

  // Puncture (taunt)
  { id: 28306, name: 'Puncture', category: CATEGORY },
  { id: 38250, name: 'Pierce Armor', category: CATEGORY, baseSkillId: 28306 },
  { id: 38310, name: 'Pierce Armor', category: CATEGORY, baseSkillId: 28306 }, // Duplicate ID in current data
  { id: 38317, name: 'Ransack', category: CATEGORY, baseSkillId: 28306 },

  // Low Slash
  { id: 28304, name: 'Low Slash', category: CATEGORY },
  // { id: XXXXX, name: "Deep Slash", category: CATEGORY, baseSkillId: 28304 },
  { id: 38264, name: 'Heroic Slash', category: CATEGORY, baseSkillId: 28304 },

  // Defensive Posture (damage shield)
  { id: 28365, name: 'Defensive Posture', category: CATEGORY },
  // { id: XXXXX, name: "Absorb Missile", category: CATEGORY, baseSkillId: 28365 },
  { id: 38312, name: 'Defensive Stance', category: CATEGORY, baseSkillId: 28365 },

  // Shield Charge
  { id: 28719, name: 'Shield Charge', category: CATEGORY },
  // { id: XXXXX, name: "Invasion", category: CATEGORY, baseSkillId: 28719 },
  { id: 38405, name: 'Shielded Assault', category: CATEGORY, baseSkillId: 28719 },

  // Power Bash
  { id: 28365, name: 'Power Bash', category: CATEGORY },
  // { id: XXXXX, name: "Power Slam", category: CATEGORY, baseSkillId: 28365 },
  { id: 38455, name: 'Reverberating Bash', category: CATEGORY, baseSkillId: 28365 },
];
