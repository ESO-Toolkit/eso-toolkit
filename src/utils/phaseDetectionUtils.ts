/**
 * Phase detection utilities for fights without explicit phase transition data.
 *
 * This module provides custom phase detection logic based on specific ability IDs
 * or buff events that indicate phase transitions in encounters.
 */

import { BuffEvent } from '../types/combatlogEvents';

export interface CustomPhaseTransition {
  id: number;
  startTime: number;
  abilityId?: number;
  abilityName?: string;
}

/**
 * Encounter IDs for supported boss encounters
 */
export enum EncounterID {
  LORD_FALGRAVN = 48,
}

/**
 * Known phase transition ability IDs for specific encounters
 */
export const PHASE_TRANSITION_ABILITIES = {
  // Lord Falgravn (Kyne's Aegis) - Encounter ID 48
  LORD_FALGRAVN: {
    PHASE_2: 135281, // "Phase 2" buff event
    PHASE_3: 140691, // "Phase 3" buff event
  },
} as const;

/**
 * Detects phase transitions for Lord Falgravn based on specific buff events
 */
export function detectLordFalgravnPhases(
  buffEvents: BuffEvent[],
  fightStartTime: number,
  fightEndTime: number,
): CustomPhaseTransition[] {
  const phases: CustomPhaseTransition[] = [];

  // Phase 1 always starts at fight start
  phases.push({
    id: 1,
    startTime: fightStartTime,
  });

  // Look for Phase 2 buff event (136727)
  const phase2Event = buffEvents.find(
    (event) =>
      event.abilityGameID === PHASE_TRANSITION_ABILITIES.LORD_FALGRAVN.PHASE_2 &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      (event.type === 'applybuff' || event.type === 'applybuffstack'),
  );

  // Look for Phase 3 buff event (140691)
  const phase3Event = buffEvents.find(
    (event) =>
      event.abilityGameID === PHASE_TRANSITION_ABILITIES.LORD_FALGRAVN.PHASE_3 &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      (event.type === 'applybuff' || event.type === 'applybuffstack'),
  );

  if (phase2Event) {
    phases.push({
      id: 2,
      startTime: phase2Event.timestamp,
      abilityId: phase2Event.abilityGameID,
      abilityName: 'Phase 2',
    });
  }

  if (phase3Event) {
    phases.push({
      id: 3,
      startTime: phase3Event.timestamp,
      abilityId: phase3Event.abilityGameID,
      abilityName: 'Phase 3',
    });
  }

  // If we only found Phase 3 but not Phase 2, estimate Phase 2
  if (!phase2Event && phase3Event) {
    const fightDuration = fightEndTime - fightStartTime;
    const estimatedPhase2Start = fightStartTime + Math.floor(fightDuration * 0.33);

    // Only add estimated Phase 2 if it's significantly before Phase 3
    if (phase3Event.timestamp - estimatedPhase2Start > 30000) {
      // At least 30 seconds difference
      phases.splice(1, 0, {
        // Insert at position 1 (between Phase 1 and Phase 3)
        id: 2,
        startTime: estimatedPhase2Start,
        abilityName: 'Estimated Phase 2',
      });
    }
  }

  return phases;
}

/**
 * Generic phase detection function that can be extended for other encounters
 */
export function detectCustomPhaseTransitions(
  buffEvents: BuffEvent[],
  fightStartTime: number,
  fightEndTime: number,
  encounterID?: number,
): CustomPhaseTransition[] {
  switch (encounterID) {
    case EncounterID.LORD_FALGRAVN:
      return detectLordFalgravnPhases(buffEvents, fightStartTime, fightEndTime);

    // Add other encounters here as needed
    default: {
      // Check if we can detect Lord Falgravn by looking for the specific abilities
      const hasLordFalgravnAbilities = buffEvents.some(
        (event) =>
          event.abilityGameID === PHASE_TRANSITION_ABILITIES.LORD_FALGRAVN.PHASE_2 ||
          event.abilityGameID === PHASE_TRANSITION_ABILITIES.LORD_FALGRAVN.PHASE_3,
      );

      if (hasLordFalgravnAbilities) {
        return detectLordFalgravnPhases(buffEvents, fightStartTime, fightEndTime);
      }

      return [
        {
          id: 1,
          startTime: fightStartTime,
        },
      ];
    }
  }
}

/**
 * Converts custom phase transitions to the PhaseTransition format expected by the map timeline system
 */
export function convertToPhaseTransitions(
  customPhases: CustomPhaseTransition[],
): Array<{ id: number; startTime: number }> {
  return customPhases.map((phase) => ({
    id: phase.id,
    startTime: phase.startTime,
  }));
}

/**
 * Creates phase transitions with enhanced detection logic when buff events are available
 */
export function createEnhancedPhaseTransitions(
  buffEvents: BuffEvent[] | null,
  fightStartTime: number,
  fightEndTime: number,
  encounterID?: number,
): Array<{ id: number; startTime: number }> | null {
  if (!buffEvents || buffEvents.length === 0) {
    return null;
  }

  const customPhases = detectCustomPhaseTransitions(
    buffEvents,
    fightStartTime,
    fightEndTime,
    encounterID,
  );

  if (customPhases.length <= 1) {
    return null;
  }

  const phaseTransitions = convertToPhaseTransitions(customPhases);

  return phaseTransitions;
}
