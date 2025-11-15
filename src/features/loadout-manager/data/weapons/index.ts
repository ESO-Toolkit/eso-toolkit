/**
 * Weapon Skill Lines Index
 * Aggregates all weapon skill line modules
 */

import { SkillData } from "../types";
import { ONE_HAND_AND_SHIELD_SKILLS } from "./oneHandAndShield";
import { TWO_HANDED_SKILLS } from "./twoHanded";
import { BOW_SKILLS } from "./bow";
import { DUAL_WIELD_SKILLS } from "./dualWield";
import { DESTRUCTION_STAFF_SKILLS } from "./destructionStaff";
import { RESTORATION_STAFF_SKILLS } from "./restorationStaff";

/**
 * All weapon skill line skills combined
 */
export const WEAPON_SKILLS: SkillData[] = [
  ...ONE_HAND_AND_SHIELD_SKILLS,
  ...TWO_HANDED_SKILLS,
  ...BOW_SKILLS,
  ...DUAL_WIELD_SKILLS,
  ...DESTRUCTION_STAFF_SKILLS,
  ...RESTORATION_STAFF_SKILLS,
];

/**
 * Re-export individual skill line arrays for direct access
 */
export {
  ONE_HAND_AND_SHIELD_SKILLS,
  TWO_HANDED_SKILLS,
  BOW_SKILLS,
  DUAL_WIELD_SKILLS,
  DESTRUCTION_STAFF_SKILLS,
  RESTORATION_STAFF_SKILLS,
};
