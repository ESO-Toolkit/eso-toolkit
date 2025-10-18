import { BuffEvent } from '../../types/combatlogEvents';
import type { CustomPhaseTransition } from '../phaseTransitionModels';

export const LORD_FALGRAVN_ENCOUNTER_ID = 48;

export const KYNE_S_AEGIS_PHASE_BUFF_IDS = Object.freeze({
  PHASE_2: 135281,
  PHASE_3: 140691,
});

export const KYNE_S_AEGIS_PHASE_BUFF_ID_SET = new Set<number>(
  Object.values(KYNE_S_AEGIS_PHASE_BUFF_IDS),
);

export function detectKyneAegisPhaseTransitions(
  buffEvents: BuffEvent[],
  fightStartTime: number,
  fightEndTime: number,
): CustomPhaseTransition[] {
  const phases: CustomPhaseTransition[] = [
    {
      id: 1,
      startTime: fightStartTime,
    },
  ];

  const phase2Event = buffEvents.find(
    (event) =>
      event.abilityGameID === KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_2 &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      (event.type === 'applybuff' || event.type === 'applybuffstack'),
  );

  const phase3Event = buffEvents.find(
    (event) =>
      event.abilityGameID === KYNE_S_AEGIS_PHASE_BUFF_IDS.PHASE_3 &&
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

  if (!phase2Event && phase3Event) {
    const fightDuration = fightEndTime - fightStartTime;
    const estimatedPhase2Start = fightStartTime + Math.floor(fightDuration * 0.33);

    if (phase3Event.timestamp - estimatedPhase2Start > 30000) {
      phases.splice(1, 0, {
        id: 2,
        startTime: estimatedPhase2Start,
        abilityName: 'Estimated Phase 2',
      });
    }
  }

  return phases;
}

export function hasKyneAegisPhaseSignature(buffEvents: BuffEvent[]): boolean {
  return buffEvents.some(
    (event) =>
      typeof event.abilityGameID === 'number' &&
      KYNE_S_AEGIS_PHASE_BUFF_ID_SET.has(event.abilityGameID),
  );
}
