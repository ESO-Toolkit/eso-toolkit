/**
 * Centralized weapon and gear classification utilities
 * Consolidates weapon type checking logic used across the application
 */

import { WeaponType } from '../types/playerDetails';

// Weapon type sets for efficient lookups
const ONE_HANDED_WEAPONS = Object.freeze(
  new Set([WeaponType.AXE, WeaponType.SWORD, WeaponType.DAGGER, WeaponType.MACE]),
);

const TWO_HANDED_WEAPONS = Object.freeze(
  new Set([WeaponType.TWO_HANDED_SWORD, WeaponType.TWO_HANDED_AXE, WeaponType.MAUL]),
);

const STAFF_WEAPONS = Object.freeze(
  new Set([
    WeaponType.FROST_STAFF,
    WeaponType.INFERNO_STAFF,
    WeaponType.LIGHTNING_STAFF,
    WeaponType.RESO_STAFF,
  ]),
);

const DOUBLE_SET_TYPES = Object.freeze(
  new Set([
    WeaponType.FROST_STAFF,
    WeaponType.INFERNO_STAFF,
    WeaponType.LIGHTNING_STAFF,
    WeaponType.RESO_STAFF,
    WeaponType.TWO_HANDED_SWORD,
  ]),
);

// ========================================
// WEAPON TYPE CLASSIFICATION UTILITIES
// ========================================

/**
 * Determines if a weapon type is 1-handed
 */
export function isOneHandedWeapon(weaponType: WeaponType): boolean {
  return ONE_HANDED_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is 2-handed (excluding staves)
 */
export function isTwoHandedWeapon(weaponType: WeaponType): boolean {
  return TWO_HANDED_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is a staff (2-handed magical weapon)
 */
export function isStaff(weaponType: WeaponType): boolean {
  return STAFF_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is any 2-handed weapon (including staves)
 */
export function isAnyTwoHandedWeapon(weaponType: WeaponType): boolean {
  return isTwoHandedWeapon(weaponType) || isStaff(weaponType);
}

/**
 * Determines if a weapon counts as double set pieces
 */
export function isDoubleSetWeapon(weaponType: WeaponType): boolean {
  return DOUBLE_SET_TYPES.has(weaponType);
}

/**
 * Determines if a weapon is a mace (for Twin Blade and Blunt passive)
 */
export function isMace(weaponType: WeaponType): boolean {
  return weaponType === WeaponType.MACE;
}

/**
 * Determines if a weapon can be dual wielded
 */
export function canDualWield(weaponType: WeaponType): boolean {
  return isOneHandedWeapon(weaponType);
}

// Export the sets for other utilities that might need them
export { 
  ONE_HANDED_WEAPONS,
  TWO_HANDED_WEAPONS, 
  STAFF_WEAPONS,
  DOUBLE_SET_TYPES,
};
