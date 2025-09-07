import React from 'react';

import {
  ActorPosition,
  ActorPositionsTimeline,
} from '../../workers/calculations/CalculateActorPositions';

interface UseActorPositionsAtTimeParams {
  timeline: ActorPositionsTimeline | null;
  currentTime: number;
}

interface UseActorPositionsAtTimeResult {
  actors: ActorPosition[];
}

// Hook to extract actor positions from a timeline at a specific time
export function useActorPositionsAtTime({
  timeline,
  currentTime,
}: UseActorPositionsAtTimeParams): UseActorPositionsAtTimeResult {
  const actors = React.useMemo(() => {
    if (
      !timeline ||
      !timeline.actorTimelines ||
      !timeline.timestamps ||
      Object.keys(timeline.actorTimelines).length === 0
    ) {
      return [];
    }

    // Find the closest timestamp to currentTime
    // Both currentTime and timeline.timestamps are relative to fight start
    let closestTimestampIndex = 0;
    let minDiff = Math.abs(timeline.timestamps[0] - currentTime);

    for (let i = 1; i < timeline.timestamps.length; i++) {
      const diff = Math.abs(timeline.timestamps[i] - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestTimestampIndex = i;
      } else {
        // Since timestamps are sorted, we can break early
        break;
      }
    }

    const targetTimestamp = timeline.timestamps[closestTimestampIndex];
    const actors: ActorPosition[] = [];

    // Extract positions for each actor at the target timestamp
    for (const [actorIdStr, actorTimeline] of Object.entries(timeline.actorTimelines)) {
      const actorId = Number(actorIdStr);

      // Find the position entry for the target timestamp
      const positionEntry = actorTimeline.positions.find(
        (pos) => pos.timestamp === targetTimestamp,
      );

      if (!positionEntry) {
        continue;
      }

      // Show all actors without filtering
      actors.push({
        id: actorId,
        name: actorTimeline.name,
        type: actorTimeline.type,
        role: actorTimeline.role,
        position: positionEntry.position,
        rotation: positionEntry.rotation,
        isAlive: positionEntry.isAlive,
        isDead: positionEntry.isDead,
        isTaunted: positionEntry.isTaunted,
      });
    }

    return actors;
  }, [timeline, currentTime]);

  return React.useMemo(
    () => ({
      actors,
    }),
    [actors],
  );
}
