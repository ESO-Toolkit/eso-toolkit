import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../graphql/generated';
import {
  selectActorPositionsResult,
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
} from '../../store/worker_results/selectors';
import { executeActorPositionsTask } from '../../store/worker_results/taskSlices';
import { ActorPosition, ActorPositionsTimeline } from '../../workers/calculations/CalculateActorPositions';
import { useDamageEvents } from '../events/useDamageEvents';
import { useDeathEvents } from '../events/useDeathEvents';
import { useHealingEvents } from '../events/useHealingEvents';
import { useResourceEvents } from '../events/useResourceEvents';
import { useCurrentFight } from '../useCurrentFight';
import { usePlayerData } from '../usePlayerData';
import { useReportMasterData } from '../useReportMasterData';

import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

interface UseActorPositionsTaskParams {
  currentTime: number;
}

interface UseActorPositionsTaskResult {
  actors: ActorPosition[];
  isActorPositionsLoading: boolean;
  actorPositionsError: string | null;
  actorPositionsProgress: number | null;
  selectedFight: FightFragment | null;
}

// Hook for actor positions calculation
export function useActorPositionsTask({
  currentTime,
}: UseActorPositionsTaskParams): UseActorPositionsTaskResult {
  const { dispatch } = useWorkerTaskDependencies();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Get data from hooks instead of parameters
  const fight = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();

  // Create events object
  const events = React.useMemo(() => {
    if (!damageEvents || !healingEvents || !deathEvents || !resourceEvents) {
      return null;
    }
    return {
      damage: damageEvents,
      heal: healingEvents,
      death: deathEvents,
      resource: resourceEvents,
    };
  }, [damageEvents, healingEvents, deathEvents, resourceEvents]);

  // Get players and actors data
  const playersById = playerData?.playersById;
  const actorsById = reportMasterData?.actorsById;

  // Check if any data is still loading
  const isAnyDataLoading =
    isPlayerDataLoading ||
    isMasterDataLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isDeathEventsLoading ||
    isResourceEventsLoading ||
    isDebuffLookupLoading;

  React.useEffect(() => {
    if (fight && events && !isAnyDataLoading && debuffLookupData) {
      dispatch(
        executeActorPositionsTask({
          fight,
          events,
          playersById,
          actorsById,
          debuffLookupData,
        }),
      );
    }
  }, [
    dispatch,
    fight,
    events,
    playersById,
    actorsById,
    debuffLookupData,
    isAnyDataLoading,
  ]);

  const actorPositionsResult = useSelector(selectActorPositionsResult);
  const isActorPositionsTaskLoading = useSelector(
    selectWorkerTaskLoading('calculateActorPositions'),
  ) as boolean;
  const actorPositionsError = useSelector(selectWorkerTaskError('calculateActorPositions')) as
    | string
    | null;
  const actorPositionsProgress = useSelector(
    selectWorkerTaskProgress('calculateActorPositions'),
  ) as number | null;

  // Include all dependency loading states in the overall loading state
  const isActorPositionsLoading = isActorPositionsTaskLoading || isAnyDataLoading;

  // Extract actors from the timeline result for the current time
  const actors = React.useMemo(() => {
    if (!actorPositionsResult || typeof actorPositionsResult !== 'object') {
      return [];
    }

    // The result should have a 'timeline' property
    if (!('timeline' in actorPositionsResult)) {
      return [];
    }

    const timeline = actorPositionsResult.timeline as ActorPositionsTimeline;
    if (!timeline.actorTimelines || !timeline.timestamps || Object.keys(timeline.actorTimelines).length === 0) {
      return [];
    }

    // Find the closest timestamp to currentTime
    const relativeTime = currentTime; // currentTime is already relative to fight start
    let closestTimestampIndex = 0;
    let minDiff = Math.abs(timeline.timestamps[0] - relativeTime);

    for (let i = 1; i < timeline.timestamps.length; i++) {
      const diff = Math.abs(timeline.timestamps[i] - relativeTime);
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

      if (positionEntry) {
        actors.push({
          id: actorId,
          name: actorTimeline.name,
          type: actorTimeline.type,
          role: actorTimeline.role,
          position: positionEntry.position,
          rotation: positionEntry.rotation,
          isAlive: positionEntry.isAlive,
          isTaunted: positionEntry.isTaunted,
        });
      }
    }

    return actors;
  }, [actorPositionsResult, currentTime]);

  return React.useMemo(
    () => ({
      actors,
      isActorPositionsLoading,
      actorPositionsError,
      actorPositionsProgress,
      selectedFight: fight || null,
    }),
    [actors, isActorPositionsLoading, actorPositionsError, actorPositionsProgress, fight],
  );
}
