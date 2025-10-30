import React from 'react';
import { useSelector } from 'react-redux';

import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectWorkerTaskLoading,
  selectWorkerTaskError,
  selectWorkerTaskProgress,
  selectPlayerTravelDistancesResult,
} from '../../store/worker_results/selectors';
import { executePlayerTravelDistancesTask } from '../../store/worker_results/taskSlices';
import { PlayerTravelDistanceResult } from '../../workers/calculations/CalculatePlayerTravelDistances';
import { useCastEvents } from '../events/useCastEvents';
import { useDamageEvents } from '../events/useDamageEvents';
import { useDeathEvents } from '../events/useDeathEvents';
import { useHealingEvents } from '../events/useHealingEvents';
import { useResourceEvents } from '../events/useResourceEvents';
import { usePlayerData } from '../usePlayerData';

import { useWorkerTaskDependencies } from './useWorkerTaskDependencies';

interface UsePlayerTravelDistanceTaskOptions {
  context?: ReportFightContextInput;
}

interface UsePlayerTravelDistanceTaskResult {
  playerTravelDistances: PlayerTravelDistanceResult | null;
  isPlayerTravelDistancesLoading: boolean;
  playerTravelDistancesError: string | null;
  playerTravelDistancesProgress: number | null;
}

export function usePlayerTravelDistanceTask(
  options?: UsePlayerTravelDistanceTaskOptions,
): UsePlayerTravelDistanceTaskResult {
  const { dispatch, selectedFight } = useWorkerTaskDependencies(options);

  const fight = selectedFight;
  const isFightLoading = !fight;
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: options?.context });
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: options?.context });
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context: options?.context });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: options?.context });
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents({ context: options?.context });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: options?.context });

  const playerIds = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [] as number[];
    }

    return Object.values(playerData.playersById)
      .map((player) => Number(player.id))
      .filter((id) => Number.isFinite(id));
  }, [playerData?.playersById]);

  const events = React.useMemo(() => {
    if (!damageEvents || !healingEvents || !deathEvents || !resourceEvents || !castEvents) {
      return null;
    }

    const primaryCastEvents = castEvents.filter((event) => event.type === 'cast');

    return {
      damage: damageEvents,
      heal: healingEvents,
      death: deathEvents,
      resource: resourceEvents,
      cast: primaryCastEvents,
    };
  }, [damageEvents, healingEvents, deathEvents, resourceEvents, castEvents]);

  const isAnyDependencyLoading =
    isFightLoading ||
    isPlayerDataLoading ||
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isDeathEventsLoading ||
    isResourceEventsLoading ||
    isCastEventsLoading;

  React.useEffect(() => {
    if (!fight || !events || playerIds.length === 0 || isAnyDependencyLoading) {
      return;
    }

    dispatch(
      executePlayerTravelDistancesTask({
        fight: {
          id: fight.id,
          startTime: fight.startTime,
          endTime: fight.endTime,
        },
        events,
        playerIds,
      }),
    );
  }, [dispatch, fight, events, playerIds, isAnyDependencyLoading]);

  const taskResult = useSelector(
    selectPlayerTravelDistancesResult,
  ) as PlayerTravelDistanceResult | null;
  const isTaskLoading = useSelector(
    selectWorkerTaskLoading('calculatePlayerTravelDistances'),
  ) as boolean;
  const taskError = useSelector(selectWorkerTaskError('calculatePlayerTravelDistances')) as
    | string
    | null;
  const taskProgress = useSelector(selectWorkerTaskProgress('calculatePlayerTravelDistances')) as
    | number
    | null;

  const isPlayerTravelDistancesLoading = isTaskLoading || isAnyDependencyLoading;

  return React.useMemo(
    () => ({
      playerTravelDistances: taskResult,
      isPlayerTravelDistancesLoading,
      playerTravelDistancesError: taskError,
      playerTravelDistancesProgress: taskProgress,
    }),
    [taskResult, isPlayerTravelDistancesLoading, taskError, taskProgress],
  );
}
