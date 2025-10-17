/**
 * Utility functions for converting between fight frame time and absolute timestamps
 */

import { FightFragment } from '../graphql/gql/graphql';

/**
 * Converts a relative fight time (in milliseconds since fight start) to absolute timestamp
 * @param fightTime - Time in milliseconds since the fight started (0-based)
 * @param fight - Fight data containing start time
 * @returns Absolute timestamp that matches combat log events
 */
export function fightTimeToTimestamp(fightTime: number, fight: FightFragment): number {
  return fight.startTime + fightTime;
}

/**
 * Converts an absolute timestamp to relative fight time (milliseconds since fight start)
 * @param timestamp - Absolute timestamp from combat log
 * @param fight - Fight data containing start time
 * @returns Time in milliseconds since the fight started (0-based)
 */
export function timestampToFightTime(timestamp: number, fight: FightFragment): number {
  return timestamp - fight.startTime;
}

/**
 * Gets the total duration of a fight in milliseconds
 * @param fight - Fight data containing start and end times
 * @returns Fight duration in milliseconds
 */
export function getFightDuration(fight: FightFragment): number {
  return fight.endTime - fight.startTime;
}

/**
 * Checks if a timestamp is within the fight's time range
 * @param timestamp - Absolute timestamp to check
 * @param fight - Fight data containing start and end times
 * @returns True if the timestamp is within the fight's duration
 */
export function isTimestampInFight(timestamp: number, fight: FightFragment): boolean {
  return timestamp >= fight.startTime && timestamp <= fight.endTime;
}

/**
 * Clamps a fight time to be within the valid fight duration
 * @param fightTime - Time in milliseconds since fight start
 * @param fight - Fight data containing duration
 * @returns Clamped fight time within [0, fight duration]
 */
export function clampFightTime(fightTime: number, fight: FightFragment): number {
  const duration = getFightDuration(fight);
  return Math.max(0, Math.min(fightTime, duration));
}
