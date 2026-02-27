/**
 * Roster Validation Utilities
 * Provides validation logic for roster composition and gear assignments
 */

import { RaidRoster, TankSetup, HealerSetup, DPSSlot, SupportUltimate, HealerBuff } from '../../../types/roster';
import { KnownSetIDs, MONSTER_SETS } from '../../../types/abilities';
import { validateCompatibility } from '../../../types/roster';
import { getSetDisplayName } from '../../../utils/setNameUtils';

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Individual validation result
 */
export interface ValidationResult {
  severity: ValidationSeverity;
  message: string;
  field?: string; // Reference to the field causing the issue
}

/**
 * Complete validation result for a roster
 */
export interface RosterValidationResult {
  isValid: boolean;
  warnings: ValidationResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Check if a value is set (non-empty string, non-null, non-undefined)
 */
const isSet = <T>(value: T | null | undefined | ''): value is T => {
  return value !== null && value !== undefined && value !== '';
};

/**
 * Count filled player slots in the roster
 */
const countFilledSlots = (roster: RaidRoster) => {
  let tanks = 0;
  if (roster.tank1.playerName) tanks++;
  if (roster.tank2.playerName) tanks++;

  let healers = 0;
  if (roster.healer1.playerName) healers++;
  if (roster.healer2.playerName) healers++;

  let dps = roster.dpsSlots.filter((slot) => slot.playerName).length;

  return { tanks, healers, dps, total: tanks + healers + dps };
};

/**
 * Check for Warhorn coverage
 * Warning if no one has Warhorn assigned
 */
const checkWarhornCoverage = (roster: RaidRoster): ValidationResult[] => {
  const warnings: ValidationResult[] = [];
  const hasWarhorn =
    roster.tank1.ultimate === SupportUltimate.WARHORN ||
    roster.tank2.ultimate === SupportUltimate.WARHORN ||
    roster.healer1.ultimate === SupportUltimate.WARHORN ||
    roster.healer2.ultimate === SupportUltimate.WARHORN;

  if (!hasWarhorn) {
    warnings.push({
      severity: ValidationSeverity.WARNING,
      message: 'No Warhorn assigned to any player',
      field: 'warhorn',
    });
  }

  return warnings;
};

/**
 * Check for duplicate support sets across the roster
 * Warning if the same set is assigned to multiple players
 */
const checkDuplicateSets = (roster: RaidRoster): ValidationResult[] => {
  const warnings: ValidationResult[] = [];
  const setAssignments = new Map<KnownSetIDs, string[]>();

  // Helper to add set to assignments
  const addSet = (setId: KnownSetIDs | undefined, player: string) => {
    if (!setId) return;
    if (!setAssignments.has(setId)) {
      setAssignments.set(setId, []);
    }
    setAssignments.get(setId)!.push(player);
  };

  // Collect all assigned sets
  addSet(roster.tank1.gearSets.set1, 'Tank 1');
  addSet(roster.tank1.gearSets.set2, 'Tank 1');
  addSet(roster.tank1.gearSets.monsterSet, 'Tank 1');
  if (roster.tank1.gearSets.additionalSets) {
    roster.tank1.gearSets.additionalSets.forEach((s) => addSet(s, 'Tank 1'));
  }

  addSet(roster.tank2.gearSets.set1, 'Tank 2');
  addSet(roster.tank2.gearSets.set2, 'Tank 2');
  addSet(roster.tank2.gearSets.monsterSet, 'Tank 2');
  if (roster.tank2.gearSets.additionalSets) {
    roster.tank2.gearSets.additionalSets.forEach((s) => addSet(s, 'Tank 2'));
  }

  addSet(roster.healer1.set1, 'Healer 1');
  addSet(roster.healer1.set2, 'Healer 1');
  addSet(roster.healer1.monsterSet, 'Healer 1');
  if (roster.healer1.additionalSets) {
    roster.healer1.additionalSets.forEach((s) => addSet(s, 'Healer 1'));
  }

  addSet(roster.healer2.set1, 'Healer 2');
  addSet(roster.healer2.set2, 'Healer 2');
  addSet(roster.healer2.monsterSet, 'Healer 2');
  if (roster.healer2.additionalSets) {
    roster.healer2.additionalSets.forEach((s) => addSet(s, 'Healer 2'));
  }

  // Check for duplicates (excluding flexible monster sets)
  const flexibleSets = new Set([KnownSetIDs.NAZARAY, KnownSetIDs.NUNATAK]);
  setAssignments.forEach((players, setId) => {
    if (players.length > 1 && !flexibleSets.has(setId)) {
      warnings.push({
        severity: ValidationSeverity.WARNING,
        message: `${getSetDisplayName(setId)} is assigned to: ${players.join(', ')}`,
        field: 'duplicate_sets',
      });
    }
  });

  return warnings;
};

/**
 * Check for healer buff coverage
 * Warning if buffs are missing or duplicated
 */
const checkHealerBuffs = (roster: RaidRoster): ValidationResult[] => {
  const warnings: ValidationResult[] = [];
  const buffs: HealerBuff[] = [];

  if (roster.healer1.healerBuff) {
    buffs.push(roster.healer1.healerBuff);
  }
  if (roster.healer2.healerBuff) {
    buffs.push(roster.healer2.healerBuff);
  }

  // Check for duplicate buffs
  if (buffs.length === 2 && buffs[0] === buffs[1]) {
    warnings.push({
      severity: ValidationSeverity.WARNING,
      message: `Duplicate healer buff: ${buffs[0]}`,
      field: 'healer_buffs',
    });
  }

  return warnings;
};

/**
 * Check for gear/ultimate compatibility issues
 */
const checkGearCompatibility = (roster: RaidRoster): ValidationResult[] => {
  const warnings: ValidationResult[] = [];

  // Check tanks
  ['tank1', 'tank2'].forEach((key) => {
    const tank = roster[key as 'tank1' | 'tank2'];
    const tankWarnings = validateCompatibility(
      [
        tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
        tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
        tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
        ...(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id)),
      ].filter((s): s is string => s !== undefined),
      tank.ultimate,
    );
    tankWarnings.forEach((warning) => {
      warnings.push({
        severity: ValidationSeverity.WARNING,
        message: `${key === 'tank1' ? 'Tank 1' : 'Tank 2'}: ${warning}`,
        field: 'gear_compatibility',
      });
    });
  });

  // Check healers
  ['healer1', 'healer2'].forEach((key) => {
    const healer = roster[key as 'healer1' | 'healer2'];
    const healerWarnings = validateCompatibility(
      [
        healer.set1 ? getSetDisplayName(healer.set1) : undefined,
        healer.set2 ? getSetDisplayName(healer.set2) : undefined,
        healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
        ...(healer.additionalSets || []).map((id) => getSetDisplayName(id)),
      ].filter((s): s is string => s !== undefined),
      healer.ultimate,
    );
    healerWarnings.forEach((warning) => {
      warnings.push({
        severity: ValidationSeverity.WARNING,
        message: `${key === 'healer1' ? 'Healer 1' : 'Healer 2'}: ${warning}`,
        field: 'gear_compatibility',
      });
    });
  });

  return warnings;
};

/**
 * Check for missing mandatory fields
 */
const checkMandatoryFields = (roster: RaidRoster): ValidationResult[] => {
  const warnings: ValidationResult[] = [];

  // No mandatory fields currently required - this is informational
  return warnings;
};

/**
 * Validate a complete roster
 * Returns all validation issues with severity levels
 */
export const validateRoster = (roster: RaidRoster): RosterValidationResult => {
  const allWarnings: ValidationResult[] = [];

  // Run all validation checks
  allWarnings.push(...checkWarhornCoverage(roster));
  allWarnings.push(...checkDuplicateSets(roster));
  allWarnings.push(...checkHealerBuffs(roster));
  allWarnings.push(...checkGearCompatibility(roster));
  allWarnings.push(...checkMandatoryFields(roster));

  // Count severity levels
  const errorCount = allWarnings.filter((w) => w.severity === ValidationSeverity.ERROR).length;
  const warningCount = allWarnings.filter((w) => w.severity === ValidationSeverity.WARNING).length;
  const infoCount = allWarnings.filter((w) => w.severity === ValidationSeverity.INFO).length;

  return {
    isValid: errorCount === 0,
    warnings: allWarnings,
    errorCount,
    warningCount,
    infoCount,
  };
};

/**
 * Validate a single tank setup
 */
export const validateTank = (tank: TankSetup, tankNum: 1 | 2): ValidationResult[] => {
  const warnings: ValidationResult[] = [];

  const compatibilityWarnings = validateCompatibility(
    [
      tank.gearSets.set1 ? getSetDisplayName(tank.gearSets.set1) : undefined,
      tank.gearSets.set2 ? getSetDisplayName(tank.gearSets.set2) : undefined,
      tank.gearSets.monsterSet ? getSetDisplayName(tank.gearSets.monsterSet) : undefined,
      ...(tank.gearSets.additionalSets || []).map((id) => getSetDisplayName(id)),
    ].filter((s): s is string => s !== undefined),
    tank.ultimate,
  );

  compatibilityWarnings.forEach((warning) => {
    warnings.push({
      severity: ValidationSeverity.WARNING,
      message: warning,
      field: 'gear_compatibility',
    });
  });

  return warnings;
};

/**
 * Validate a single healer setup
 */
export const validateHealer = (healer: HealerSetup, healerNum: 1 | 2): ValidationResult[] => {
  const warnings: ValidationResult[] = [];

  const compatibilityWarnings = validateCompatibility(
    [
      healer.set1 ? getSetDisplayName(healer.set1) : undefined,
      healer.set2 ? getSetDisplayName(healer.set2) : undefined,
      healer.monsterSet ? getSetDisplayName(healer.monsterSet) : undefined,
      ...(healer.additionalSets || []).map((id) => getSetDisplayName(id)),
    ].filter((s): s is string => s !== undefined),
    healer.ultimate,
  );

  compatibilityWarnings.forEach((warning) => {
    warnings.push({
      severity: ValidationSeverity.WARNING,
      message: warning,
      field: 'gear_compatibility',
    });
  });

  return warnings;
};

/**
 * Get all assigned sets across the roster
 */
export const getAssignedSets = (roster: RaidRoster): KnownSetIDs[] => {
  const assigned = new Set<KnownSetIDs>();

  const addSets = (setIds: (KnownSetIDs | undefined)[] | undefined) => {
    if (!setIds) return;
    setIds.forEach((id) => {
      if (id) assigned.add(id);
    });
  };

  addSets([
    roster.tank1.gearSets.set1,
    roster.tank1.gearSets.set2,
    roster.tank1.gearSets.monsterSet,
    ...(roster.tank1.gearSets.additionalSets || []),
  ]);

  addSets([
    roster.tank2.gearSets.set1,
    roster.tank2.gearSets.set2,
    roster.tank2.gearSets.monsterSet,
    ...(roster.tank2.gearSets.additionalSets || []),
  ]);

  addSets([
    roster.healer1.set1,
    roster.healer1.set2,
    roster.healer1.monsterSet,
    ...(roster.healer1.additionalSets || []),
  ]);

  addSets([
    roster.healer2.set1,
    roster.healer2.set2,
    roster.healer2.monsterSet,
    ...(roster.healer2.additionalSets || []),
  ]);

  return Array.from(assigned);
};

/**
 * Check if a set is currently assigned to any player
 */
export const isSetAssigned = (roster: RaidRoster, setId: KnownSetIDs): boolean => {
  return getAssignedSets(roster).includes(setId);
};

/**
 * Get set availability status for a set
 */
export const getSetAvailability = (roster: RaidRoster, setId: KnownSetIDs): 'available' | 'assigned' => {
  return isSetAssigned(roster, setId) ? 'assigned' : 'available';
};
