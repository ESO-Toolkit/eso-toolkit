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
import { ActorPositionsTimeline } from '../../workers/calculations/CalculateActorPositions';
import { useDamageEvents } from '../events/useDamageEvents';
import { useDeathEvents } from '../events/useDeathEvents';
import { useHealingEvents } from '../events/useHealingEvents';
import { useResourceEvents } from '../events/useResourceEvents';
import { useCurrentFight } from '../useCurrentFight';
import { usePlayerData } from '../usePlayerData';
import { useReportMasterData } from '../useReportMasterData';

import { useDebuffLookupTask } from './useDebuffLookupTask';
import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

interface UseActorPositionsTaskResult {
  timeline: ActorPositionsTimeline | null;
  isActorPositionsLoading: boolean;
  actorPositionsError: string | null;
  actorPositionsProgress: number | null;
  selectedFight: FightFragment | null;
}

// Hook for actor positions calculation
export function useActorPositionsTask(): UseActorPositionsTaskResult {
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
  }, [dispatch, fight, events, playersById, actorsById, debuffLookupData, isAnyDataLoading]);

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

  // Return the timeline directly, let consumers extract positions for specific times
  const timeline = React.useMemo(() => {
    if (!actorPositionsResult || typeof actorPositionsResult !== 'object') {
      return null;
    }

    // The result should have a 'timeline' property
    if (!('timeline' in actorPositionsResult)) {
      return null;
    }

    return actorPositionsResult.timeline as ActorPositionsTimeline;
  }, [actorPositionsResult]);

  return React.useMemo(
    () => ({
      timeline,
      isActorPositionsLoading,
      actorPositionsError,
      actorPositionsProgress,
      selectedFight: fight || null,
    }),
    [timeline, isActorPositionsLoading, actorPositionsError, actorPositionsProgress, fight],
  );
}
