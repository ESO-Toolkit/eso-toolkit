/**
 * SlotKey — universal roster slot identifier.
 *
 * Replaces the scattered `'tank1' | 'tank2' | 'healer1' | 'healer2'` unions
 * with a structured format: `"tank:0"`, `"healer:1"`, `"dps:3"`, etc.
 *
 * The index is zero-based and refers to the position within the role's array
 * in the RaidRoster (e.g., `roster.tanks[0]` is `"tank:0"`).
 */

import type { RaidRoster, TankSetup, HealerSetup, DPSSlot } from '../types/roster';

// ─── Types ───────────────────────────────────────────────────────

export type SlotRole = 'tank' | 'healer' | 'dps';

/**
 * A string of the form `"tank:0"`, `"healer:1"`, `"dps:7"`.
 * Encodes both the role and the zero-based index within that role's array.
 */
export type SlotKey = `${SlotRole}:${number}`;

export interface ParsedSlotKey {
  role: SlotRole;
  index: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a SlotKey from role + zero-based index. */
export function makeSlotKey(role: SlotRole, index: number): SlotKey {
  return `${role}:${index}`;
}

/** Parse a SlotKey back into its role and index. */
export function parseSlotKey(key: SlotKey): ParsedSlotKey {
  const colonIdx = key.indexOf(':');
  return {
    role: key.slice(0, colonIdx) as SlotRole,
    index: Number(key.slice(colonIdx + 1)),
  };
}

/** Read the setup object for a given SlotKey from a roster. */
export function getSlotFromRoster(
  roster: RaidRoster,
  key: SlotKey,
): TankSetup | HealerSetup | DPSSlot | undefined {
  const { role, index } = parseSlotKey(key);
  switch (role) {
    case 'tank':
      return roster.tanks[index];
    case 'healer':
      return roster.healers[index];
    case 'dps':
      return roster.dpsSlots[index];
  }
}

/**
 * Return a new roster with the slot at `key` replaced by `value`.
 * Does NOT mutate the original roster.
 */
export function setSlotInRoster(
  roster: RaidRoster,
  key: SlotKey,
  value: TankSetup | HealerSetup | DPSSlot,
): RaidRoster {
  const { role, index } = parseSlotKey(key);
  switch (role) {
    case 'tank': {
      const tanks = [...roster.tanks];
      tanks[index] = value as TankSetup;
      return { ...roster, tanks };
    }
    case 'healer': {
      const healers = [...roster.healers];
      healers[index] = value as HealerSetup;
      return { ...roster, healers };
    }
    case 'dps': {
      const dpsSlots = [...roster.dpsSlots];
      dpsSlots[index] = value as DPSSlot;
      return { ...roster, dpsSlots };
    }
  }
}

/**
 * Convert a legacy key like 'tank1', 'tank2', 'healer1', 'healer2', 'dps1'...'dps8'
 * into a SlotKey. Used during migration from the old named-field format.
 */
export function legacyKeyToSlotKey(legacyKey: string): SlotKey {
  if (legacyKey.startsWith('tank')) {
    const num = parseInt(legacyKey.slice(4), 10);
    return makeSlotKey('tank', num - 1);
  }
  if (legacyKey.startsWith('healer')) {
    const num = parseInt(legacyKey.slice(6), 10);
    return makeSlotKey('healer', num - 1);
  }
  if (legacyKey.startsWith('dps')) {
    const num = parseInt(legacyKey.slice(3), 10);
    return makeSlotKey('dps', num - 1);
  }
  throw new Error(`Unknown legacy slot key: ${legacyKey}`);
}
