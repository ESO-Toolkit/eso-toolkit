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
import { TimestampPositionLookup } from '../../workers/calculations/CalculateActorPositions';
import { useCastEvents } from '../events/useCastEvents';
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
  lookup: TimestampPositionLookup | null;
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
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();

  // Create events object
  const events = React.useMemo(() => {
    if (!damageEvents || !healingEvents || !deathEvents || !resourceEvents || !castEvents) {
      return null;
    }
    // Filter to only include actual cast events, not begincast events
    const actualCastEvents = castEvents.filter((event) => event.type === 'cast');

    return {
      damage: damageEvents,
      heal: healingEvents,
      death: deathEvents,
      resource: resourceEvents,
      cast: actualCastEvents,
    };
  }, [damageEvents, healingEvents, deathEvents, resourceEvents, castEvents]);

  // Get players and actors data
  const playersById = playerData?.playersById;
  const actorsById = reportMasterData?.actorsById;

  // Check if any data is still loading
  const isAnyDataLoading =
    isFightLoading ||
    isPlayerDataLoading ||
    isMasterDataLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isDeathEventsLoading ||
    isResourceEventsLoading ||
    isCastEventsLoading ||
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

  // Return the lookup structure (the new simplified return type)
  const lookup = React.useMemo(() => {
    if (!actorPositionsResult || typeof actorPositionsResult !== 'object') {
      return null;
    }

    // The result is now directly the TimestampPositionLookup object
    return actorPositionsResult as TimestampPositionLookup;
  }, [actorPositionsResult]);

  return React.useMemo(
    () => ({
      lookup,
      isActorPositionsLoading,
      actorPositionsError,
      actorPositionsProgress,
      selectedFight: fight || null,
    }),
    [lookup, isActorPositionsLoading, actorPositionsError, actorPositionsProgress, fight],
  );
}
