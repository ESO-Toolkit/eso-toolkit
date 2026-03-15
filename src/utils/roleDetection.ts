/**
 * Gear-based role detection utilities
 *
 * The ESO Logs API sometimes misclassifies player roles (tank/healer/dps).
 * These utilities analyze equipped gear — specifically weapons — to correct
 * the API classification when it's clearly wrong.
 *
 * Key signals:
 * - Shield in off-hand → definitely tank
 * - Restoration staff → definitely healer
 * - Frost staff → ambiguous (both DPS and ice tanks use them) — trust API
 * - No shield, no frost staff, no resto staff → definitely DPS
 */

import { GearSlot, PlayerGear, WeaponType } from '../types/playerDetails';

export type Role = 'dps' | 'tank' | 'healer';

/**
 * Checks whether a shield is equipped on either weapon bar.
 *
 * In ESO endgame PvE, only tanks equip shields. This is the single most
 * reliable signal for tank identification.
 */
export function hasShieldEquipped(gear: PlayerGear[]): boolean {
  const offHandSlots = [GearSlot.OFF_HAND, GearSlot.BACKUP_OFF_HAND];
  for (const slot of offHandSlots) {
    const item = gear[slot];
    if (item && item.id !== 0 && item.type === WeaponType.SHIELD) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a restoration staff is equipped on either weapon bar.
 */
export function hasRestoStaffEquipped(gear: PlayerGear[]): boolean {
  const mainHandSlots = [GearSlot.MAIN_HAND, GearSlot.BACKUP_MAIN_HAND];
  for (const slot of mainHandSlots) {
    const item = gear[slot];
    if (item && item.id !== 0 && item.type === WeaponType.RESO_STAFF) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a frost staff is equipped on either weapon bar.
 *
 * Frost staves are ambiguous — both DPS (frost wall of elements) and
 * ice tanks (double frost staff builds, medium armor tanks) use them.
 * When a frost staff is present, the API role should be trusted.
 */
export function hasFrostStaffEquipped(gear: PlayerGear[]): boolean {
  const mainHandSlots = [GearSlot.MAIN_HAND, GearSlot.BACKUP_MAIN_HAND];
  for (const slot of mainHandSlots) {
    const item = gear[slot];
    if (item && item.id !== 0 && item.type === WeaponType.FROST_STAFF) {
      return true;
    }
  }
  return false;
}

/**
 * Corrects the API-assigned role using gear-based detection.
 *
 * Strategy: use gear to validate or correct the API, not replace it entirely.
 *
 * - Shield equipped → tank (definitive, override API)
 * - Resto staff equipped (no shield) → healer (definitive, override API)
 * - Frost staff equipped → ambiguous (ice tanks exist), trust the API role
 * - No shield, no frost staff, no resto staff → DPS (override API)
 *
 * Falls back to the API role when gear data is unavailable.
 */
export function detectRole(apiRole: Role, gear: PlayerGear[] | undefined): Role {
  if (!gear || gear.length === 0) {
    return apiRole;
  }

  if (hasShieldEquipped(gear)) {
    return 'tank';
  }

  if (hasRestoStaffEquipped(gear)) {
    return 'healer';
  }

  // Frost staff is ambiguous — both DPS and ice tanks use them.
  // Trust the API classification in this case.
  if (hasFrostStaffEquipped(gear)) {
    return apiRole;
  }

  // No shield, no frost staff, no resto staff → definitely DPS.
  // This catches false tank classifications from the API.
  return 'dps';
}
