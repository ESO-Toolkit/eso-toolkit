/**
 * Resize a roster when the role composition changes.
 *
 * Trims or extends each role array to match the new composition counts,
 * re-numbers slotNumber fields to be contiguous, and cleans up
 * trialOverrides keys that reference removed slots.
 */

import type { RaidRoster, RoleComposition, TankSetup, HealerSetup, DPSSlot } from '../types/roster';
import { defaultTankSetup, defaultHealerSetup } from '../types/roster';

import { makeSlotKey } from './slotKey';

/**
 * Resize an array of slots to a new length.
 * If shrinking, excess slots are dropped from the end.
 * If growing, new default slots are appended.
 * Slot numbers are re-assigned to be contiguous 1..N.
 */
function resizeTanks(tanks: TankSetup[], newCount: number): TankSetup[] {
  const result: TankSetup[] = [];
  for (let i = 0; i < newCount; i++) {
    const existing =
      i < tanks.length ? JSON.parse(JSON.stringify(tanks[i])) : defaultTankSetup(i + 1);
    existing.slotNumber = i + 1;
    result.push(existing);
  }
  return result;
}

function resizeHealers(healers: HealerSetup[], newCount: number): HealerSetup[] {
  const result: HealerSetup[] = [];
  for (let i = 0; i < newCount; i++) {
    const existing =
      i < healers.length ? JSON.parse(JSON.stringify(healers[i])) : defaultHealerSetup(i + 1);
    existing.slotNumber = i + 1;
    result.push(existing);
  }
  return result;
}

function resizeDPS(dpsSlots: DPSSlot[], newCount: number): DPSSlot[] {
  const result: DPSSlot[] = [];
  for (let i = 0; i < newCount; i++) {
    const existing: DPSSlot =
      i < dpsSlots.length
        ? JSON.parse(JSON.stringify(dpsSlots[i]))
        : ({ slotNumber: i + 1 } as DPSSlot);
    existing.slotNumber = i + 1;
    result.push(existing);
  }
  return result;
}

/**
 * Clean up trial overrides to remove references to slots that no longer exist.
 */
function cleanTrialOverrides(
  roster: RaidRoster,
  newComp: RoleComposition,
): RaidRoster['trialOverrides'] {
  if (!roster.trialOverrides) return undefined;

  const validKeys = new Set<string>();
  for (let i = 0; i < newComp.tanks; i++) validKeys.add(makeSlotKey('tank', i));
  for (let i = 0; i < newComp.healers; i++) validKeys.add(makeSlotKey('healer', i));
  for (let i = 0; i < newComp.dps; i++) validKeys.add(makeSlotKey('dps', i));

  const newEncounterBuilds: typeof roster.trialOverrides.encounterBuilds = {};
  for (const [encId, overrides] of Object.entries(roster.trialOverrides.encounterBuilds)) {
    const filteredSlots: Record<string, (typeof overrides.slots)[string]> = {};
    for (const [slotKey, override] of Object.entries(overrides.slots)) {
      if (validKeys.has(slotKey)) {
        filteredSlots[slotKey] = override;
      }
    }
    if (Object.keys(filteredSlots).length > 0) {
      newEncounterBuilds[encId] = { slots: filteredSlots };
    }
  }

  return {
    ...roster.trialOverrides,
    encounterBuilds: newEncounterBuilds,
  };
}

/**
 * Resize a roster to match a new composition.
 * Returns a new roster object (does not mutate the original).
 */
export function resizeRoster(roster: RaidRoster, newComp: RoleComposition): RaidRoster {
  const resized: RaidRoster = {
    ...roster,
    composition: { ...newComp },
    tanks: resizeTanks(roster.tanks, newComp.tanks),
    healers: resizeHealers(roster.healers, newComp.healers),
    dpsSlots: resizeDPS(roster.dpsSlots, newComp.dps),
    updatedAt: new Date().toISOString(),
  };

  resized.trialOverrides = cleanTrialOverrides(roster, newComp);

  return resized;
}

/**
 * Check if shrinking a role would lose player data.
 * Returns true if any slot being removed has a playerName, gear, or build ref.
 */
export function wouldLoseData(
  roster: RaidRoster,
  newComp: RoleComposition,
): { tanks: boolean; healers: boolean; dps: boolean } {
  const checkTanks = roster.tanks
    .slice(newComp.tanks)
    .some((t) => t.playerName || t.gearSets.set1 || t.gearSets.set2 || t.buildRef);
  const checkHealers = roster.healers
    .slice(newComp.healers)
    .some((h) => h.playerName || h.set1 || h.set2 || h.buildRef);
  const checkDPS = roster.dpsSlots
    .slice(newComp.dps)
    .some((d) => d.playerName || d.set1 || d.set2 || d.buildRef);
  return { tanks: checkTanks, healers: checkHealers, dps: checkDPS };
}
