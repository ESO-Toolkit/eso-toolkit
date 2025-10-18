/**
 * Phase detection utilities for fights without explicit phase transition data.
 *
 * This module provides custom phase detection logic based on specific ability IDs
 * or buff events that indicate phase transitions in encounters.
 */

import { BuffEvent } from '../types/combatlogEvents';

import {
  KYNE_S_AEGIS_PHASE_BUFF_ID_SET,
  detectKyneAegisPhaseTransitions,
  LORD_FALGRAVN_ENCOUNTER_ID,
} from './encounters/kyneAegisPhaseUtils';
import type { CustomPhaseTransition } from './phaseTransitionModels';

export type { CustomPhaseTransition } from './phaseTransitionModels';
export {
  KYNE_S_AEGIS_PHASE_BUFF_ID_SET,
  KYNE_S_AEGIS_PHASE_BUFF_IDS,
  detectKyneAegisPhaseTransitions,
  hasKyneAegisPhaseSignature,
  LORD_FALGRAVN_ENCOUNTER_ID,
} from './encounters/kyneAegisPhaseUtils';

/**
 * Encounter IDs for supported boss encounters
 */
export enum EncounterID {
  LORD_FALGRAVN = LORD_FALGRAVN_ENCOUNTER_ID,
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
      return detectKyneAegisPhaseTransitions(buffEvents, fightStartTime, fightEndTime);

    // Add other encounters here as needed
    default: {
      const hasKyneAegisAbilities = buffEvents.some(
        (event) =>
          typeof event.abilityGameID === 'number' &&
          KYNE_S_AEGIS_PHASE_BUFF_ID_SET.has(event.abilityGameID),
      );

      if (hasKyneAegisAbilities) {
        return detectKyneAegisPhaseTransitions(buffEvents, fightStartTime, fightEndTime);
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
