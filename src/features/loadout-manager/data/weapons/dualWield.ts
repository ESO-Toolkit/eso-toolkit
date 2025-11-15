/**
 * Dual Wield Weapon Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/weapon/dual-wield
 */

import { SkillData } from "../types";

const CATEGORY = "Dual Wield";

export const DUAL_WIELD_SKILLS: SkillData[] = [
  // Ultimate: Lacerate
  { id: 5452, name: "Lacerate", category: CATEGORY, isUltimate: true },
  // { id: XXXXX, name: "Thrive in Chaos", category: CATEGORY, isUltimate: true, baseSkillId: 5452 },
  // { id: XXXXX, name: "Whirling Blades", category: CATEGORY, isUltimate: true, baseSkillId: 5452 },

  // Flurry
  { id: 3415, name: "Flurry", category: CATEGORY },
  // { id: XXXXX, name: "Rapid Strikes", category: CATEGORY, baseSkillId: 3415 },
  // { id: XXXXX, name: "Bloodthirst", category: CATEGORY, baseSkillId: 3415 },

  // Twin Slashes
  { id: 28379, name: "Twin Slashes", category: CATEGORY },
  // { id: XXXXX, name: "Rending Slashes", category: CATEGORY, baseSkillId: 28379 },
  // { id: XXXXX, name: "Blood Craze", category: CATEGORY, baseSkillId: 28379 },

  // Whirlwind
  { id: 28591, name: "Whirlwind", category: CATEGORY },
  { id: 38891, name: "Whirling Blades", category: CATEGORY, baseSkillId: 28591 },
  { id: 38914, name: "Whirling Blades", category: CATEGORY, baseSkillId: 28591 }, // Possible duplicate ID

  // Blade Cloak
  { id: 28613, name: "Blade Cloak", category: CATEGORY },
  { id: 38901, name: "Quick Cloak", category: CATEGORY, baseSkillId: 28613 },
  { id: 38906, name: "Deadly Cloak", category: CATEGORY, baseSkillId: 28613 },

  // Hidden Blade
  { id: 21157, name: "Hidden Blade", category: CATEGORY },
  // { id: XXXXX, name: "Shrouded Daggers", category: CATEGORY, baseSkillId: 21157 },
  { id: 28311, name: "Vibrant Shroud", category: CATEGORY, baseSkillId: 21157 },
];
