/**
 * Centralized weapon and gear classification utilities
 * Consolidates weapon type checking logic used across the application
 */

import { WeaponType } from '../types/playerDetails';

// Weapon type sets for efficient lookups.
//
// Typed as ReadonlySet<number> — not Set<WeaponType> — because callers pass raw
// `PlayerGear.type` codes straight from the log payload, which include values
// WeaponType does not model (0 = not reported, armor codes on non-weapon slots).
// Membership testing is well-defined for those; narrowing the sets would only
// force every call site back into an `as WeaponType` cast.
const ONE_HANDED_WEAPONS: ReadonlySet<number> = Object.freeze(
  new Set<number>([WeaponType.AXE, WeaponType.SWORD, WeaponType.DAGGER, WeaponType.MACE]),
);

const TWO_HANDED_WEAPONS: ReadonlySet<number> = Object.freeze(
  new Set<number>([WeaponType.TWO_HANDED_SWORD, WeaponType.TWO_HANDED_AXE, WeaponType.MAUL]),
);

const STAFF_WEAPONS: ReadonlySet<number> = Object.freeze(
  new Set<number>([
    WeaponType.FROST_STAFF,
    WeaponType.INFERNO_STAFF,
    WeaponType.LIGHTNING_STAFF,
    WeaponType.RESO_STAFF,
  ]),
);

const DOUBLE_SET_TYPES: ReadonlySet<number> = Object.freeze(
  new Set<number>([
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
 * Determines if a weapon type is 1-handed.
 *
 * Takes a raw type code (`PlayerGear.type`) rather than `WeaponType`: log
 * payloads report codes this app does not model, and an unknown code is simply
 * not a 1H weapon. Callers must already have gated on a weapon slot, since
 * armor codes collide numerically with weapon codes.
 */
export function isOneHandedWeapon(weaponType: number): boolean {
  return ONE_HANDED_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is 2-handed (excluding staves)
 */
export function isTwoHandedWeapon(weaponType: number): boolean {
  return TWO_HANDED_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is a staff (2-handed magical weapon)
 */
export function isStaff(weaponType: number): boolean {
  return STAFF_WEAPONS.has(weaponType);
}

/**
 * Determines if a weapon type is any 2-handed weapon (including staves)
 */
export function isAnyTwoHandedWeapon(weaponType: number): boolean {
  return isTwoHandedWeapon(weaponType) || isStaff(weaponType);
}

/**
 * Determines if a weapon counts as double set pieces
 */
export function isDoubleSetWeapon(weaponType: number): boolean {
  return DOUBLE_SET_TYPES.has(weaponType);
}

/**
 * Determines if a weapon is a mace (for Twin Blade and Blunt passive)
 */
export function isMace(weaponType: number): boolean {
  return weaponType === WeaponType.MACE;
}

/**
 * Determines if a weapon can be dual wielded
 */
export function canDualWield(weaponType: number): boolean {
  return isOneHandedWeapon(weaponType);
}

// Export the sets for other utilities that might need them
export { ONE_HANDED_WEAPONS, TWO_HANDED_WEAPONS, STAFF_WEAPONS, DOUBLE_SET_TYPES };
