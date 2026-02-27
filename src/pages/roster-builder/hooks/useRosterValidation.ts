/**
 * useRosterValidation Hook
 * Provides real-time validation for roster composition
 */

import { useMemo } from 'react';
import { RaidRoster } from '../../../types/roster';
import { validateRoster, countFilledSlots, RosterValidationResult } from '../utils/rosterValidation';

/**
 * Hook for roster validation
 * Updates whenever roster changes
 */
export const useRosterValidation = (roster: RaidRoster) => {
  const validation = useMemo<RosterValidationResult>(() => {
    return validateRoster(roster);
  }, [roster]);

  const filledSlots = useMemo(() => {
    return countFilledSlots(roster);
  }, [roster]);

  const isEmpty = useMemo(() => {
    return (
      !roster.tank1.playerName &&
      !roster.tank2.playerName &&
      !roster.healer1.playerName &&
      !roster.healer2.playerName &&
      !roster.dpsSlots.some((s) => s.playerName)
    );
  }, [roster]);

  const isComplete = useMemo(() => {
    return (
      filledSlots.tanks === 2 &&
      filledSlots.healers === 2 &&
      filledSlots.dps === 8
    );
  }, [filledSlots]);

  return {
    validation,
    filledSlots,
    isEmpty,
    isComplete,
    hasErrors: validation.errorCount > 0,
    hasWarnings: validation.warningCount > 0,
  };
};

export type UseRosterValidationReturn = ReturnType<typeof useRosterValidation>;
