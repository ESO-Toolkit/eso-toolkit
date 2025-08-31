import { KnownAbilities } from '../types/abilities';
import { DeathEvent } from '../types/combatlogEvents';
import { UnifiedCastEvent } from '../types/combatlogEvents';

export interface DeathDuration {
  playerId: number;
  deathTime: number;
  resurrectionTime: number | null;
  deathDurationMs: number | null;
}

/**
 * Calculate death durations for players by matching death events with resurrection cast events
 * @param deathEvents Array of death events from the fight
 * @param castEvents Array of cast events from the fight
 * @param fightStartTime Start time of the fight
 * @param fightEndTime End time of the fight
 * @returns Array of death duration data for each death
 */
export function calculateDeathDurations(
  deathEvents: DeathEvent[],
  castEvents: UnifiedCastEvent[],
  fightStartTime: number,
  fightEndTime: number
): DeathDuration[] {
  const deathDurations: DeathDuration[] = [];

  // Filter resurrection cast events where someone was the target (only actual cast events, not begincast)
  const resurrectionCasts = castEvents.filter(
    (event) =>
      event.type === 'cast' &&
      event.abilityGameID === KnownAbilities.RESURRECT &&
      event.targetID !== null &&
      event.targetID !== undefined &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime
  );

  // Process each death event
  for (const deathEvent of deathEvents) {
    if (
      deathEvent.targetID === null ||
      deathEvent.targetID === undefined ||
      deathEvent.timestamp < fightStartTime ||
      deathEvent.timestamp > fightEndTime
    ) {
      continue;
    }

    const playerId = deathEvent.targetID;
    const deathTime = deathEvent.timestamp;

    // Find the next resurrection cast event for this player after their death
    const resurrectionEvent = resurrectionCasts.find(
      (castEvent) => castEvent.targetID === playerId && castEvent.timestamp > deathTime
    );

    let resurrectionTime: number | null = null;
    let deathDurationMs: number | null = null;

    if (resurrectionEvent) {
      resurrectionTime = resurrectionEvent.timestamp;
      deathDurationMs = resurrectionEvent.timestamp - deathTime;
    } else {
      // If no resurrection found, assume they were dead until the end of the fight
      deathDurationMs = fightEndTime - deathTime;
    }

    deathDurations.push({
      playerId,
      deathTime,
      resurrectionTime,
      deathDurationMs,
    });
  }

  return deathDurations;
}

/**
 * Format death duration for display
 * @param durationMs Duration in milliseconds
 * @returns Formatted string (e.g., "1m 23.5s", "45.2s")
 */
export function formatDeathDuration(durationMs: number): string {
  const totalSeconds = durationMs / 1000;

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    return `${minutes}m ${seconds}s`;
  } else {
    return `${totalSeconds.toFixed(1)}s`;
  }
}
