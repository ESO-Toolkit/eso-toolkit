import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientContext, useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/gql/graphql';
import {
  useCombatantInfoEvents,
  useDamageEvents,
  usePlayerData,
  useResolvedReportFightContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import {
  clearCombatantInfoEventsForContext,
  fetchCombatantInfoEvents,
} from '../../../store/events_data/combatantInfoEventsSlice';
import {
  clearDamageEventsForContext,
  fetchDamageEvents,
} from '../../../store/events_data/damageEventsSlice';
import {
  clearPlayerDataForContext,
  fetchPlayerData,
} from '../../../store/player_data/playerDataSlice';
import { selectSelectedFriendlyPlayerId } from '../../../store/ui/uiSelectors';
import { useAppDispatch } from '../../../store/useAppDispatch';
import { KnownAbilities } from '../../../types/abilities';
import { PlayerTalent } from '../../../types/playerDetails';

import {
  getInsightsDataState,
  getInsightsRetryAvailability,
  type InsightsDataSource,
  type InsightsDataSourceName,
  type InsightsSourceAvailability,
} from './insightsDataState';
import { InsightsPanelView, type FightInitiatorState } from './InsightsPanelView';

interface InsightsPanelProps {
  fight: FightFragment;
  context?: ReportFightContextInput;
}

interface RetryTracking {
  contextKey: string | null;
  nextGeneration: number;
  sources: Map<InsightsDataSourceName, RetrySourceTracking>;
}

interface RetrySourceTracking {
  generation: number;
  initialError: string | null;
  initialStatus: InsightsDataSource['status'];
  observedLoading: boolean;
}

interface RetryDisplayState {
  contextKey: string | null;
  sources: InsightsDataSourceName[];
}

const getRetryContextKey = (
  reportCode: string | null | undefined,
  fightId: number | null | undefined,
): string | null =>
  reportCode && fightId !== null && fightId !== undefined
    ? JSON.stringify([reportCode, fightId])
    : null;

const ULTIMATE_ABILITY_MAPPINGS: Record<number, KnownAbilities> = {
  [KnownAbilities.GLACIAL_COLOSSUS]: KnownAbilities.GLACIAL_COLOSSUS,
  [KnownAbilities.SUMMON_CHARGED_ATRONACH]: KnownAbilities.SUMMON_CHARGED_ATRONACH,
  [KnownAbilities.AGGRESSIVE_HORN]: KnownAbilities.AGGRESSIVE_HORN,
  [KnownAbilities.REPLENISHING_BARRIER]: KnownAbilities.REPLENISHING_BARRIER,
  [KnownAbilities.REVIVING_BARRIER]: KnownAbilities.REVIVING_BARRIER,
  [KnownAbilities.CONCENTRATED_BARRIER]: KnownAbilities.CONCENTRATED_BARRIER,
};

// Mapping of champion point ability IDs to their known abilities
const CHAMPION_POINT_MAPPINGS: Record<number, KnownAbilities> = {
  [KnownAbilities.ENLIVENING_OVERFLOW]: KnownAbilities.ENLIVENING_OVERFLOW,
  [KnownAbilities.FROM_THE_BRINK]: KnownAbilities.FROM_THE_BRINK,
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight, context }) => {
  const durationMs = fight.endTime - fight.startTime;
  const dispatch = useAppDispatch();
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);

  const resolvedContext = useResolvedReportFightContext(context);
  const { client: damageClient, isReady: isDamageClientReady } = useEsoLogsClientContext();
  const eventClient = useEsoLogsClientInstance();
  const {
    damageEvents,
    isDamageEventsLoading,
    damageEventsStatus,
    damageEventsError,
    selectedFight,
  } = useDamageEvents({ context: resolvedContext });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const {
    combatantInfoEvents,
    isCombatantInfoEventsLoading,
    combatantInfoEventsStatus,
    combatantInfoEventsError,
  } = useCombatantInfoEvents({ context: resolvedContext });
  const retryContextKey = getRetryContextKey(resolvedContext.reportCode, resolvedContext.fightId);
  const retryTrackingRef = React.useRef<RetryTracking>({
    contextKey: null,
    nextGeneration: 0,
    sources: new Map<InsightsDataSourceName, RetrySourceTracking>(),
  });
  const isMountedRef = React.useRef(false);
  const [retryDisplayState, setRetryDisplayState] = React.useState<RetryDisplayState>({
    contextKey: null,
    sources: [],
  });
  const retryingSources =
    retryDisplayState.contextKey === retryContextKey ? retryDisplayState.sources : [];

  const dataState = getInsightsDataState([
    {
      hasData: damageEvents.length > 0,
      isLoading: isDamageEventsLoading,
      name: 'damage',
      status: damageEventsStatus,
      error: damageEventsError,
    },
    {
      hasData: combatantInfoEvents.length > 0,
      isLoading: isCombatantInfoEventsLoading,
      name: 'combatantInfo',
      status: combatantInfoEventsStatus,
      error: combatantInfoEventsError,
    },
    {
      hasData: Object.keys(playerData?.playersById ?? {}).length > 0,
      isLoading: isPlayerDataLoading,
      name: 'playerData',
      status: playerData?.status ?? (isPlayerDataLoading ? 'loading' : 'idle'),
      error: playerData?.error ?? null,
    },
  ]);

  const sourceOutcomes = React.useMemo<
    Record<InsightsDataSourceName, Pick<InsightsDataSource, 'error' | 'status'>>
  >(
    () => ({
      damage: { error: damageEventsError, status: damageEventsStatus },
      combatantInfo: {
        error: combatantInfoEventsError,
        status: combatantInfoEventsStatus,
      },
      playerData: {
        error: playerData?.error ?? null,
        status: playerData?.status ?? (isPlayerDataLoading ? 'loading' : 'idle'),
      },
    }),
    [
      combatantInfoEventsError,
      combatantInfoEventsStatus,
      damageEventsError,
      damageEventsStatus,
      isPlayerDataLoading,
      playerData?.error,
      playerData?.status,
    ],
  );
  const sourceAvailability = React.useMemo<InsightsSourceAvailability>(
    () => ({
      damage: Boolean(
        resolvedContext.reportCode &&
        resolvedContext.fightId !== null &&
        damageClient &&
        isDamageClientReady &&
        selectedFight,
      ),
      combatantInfo: Boolean(
        resolvedContext.reportCode &&
        resolvedContext.fightId !== null &&
        eventClient &&
        selectedFight,
      ),
      playerData: Boolean(
        resolvedContext.reportCode && resolvedContext.fightId !== null && eventClient,
      ),
    }),
    [
      damageClient,
      eventClient,
      isDamageClientReady,
      resolvedContext.fightId,
      resolvedContext.reportCode,
      selectedFight,
    ],
  );
  const retryAvailability = getInsightsRetryAvailability(
    dataState.failedSources,
    sourceAvailability,
    retryingSources,
  );

  React.useEffect(() => {
    const retryTracking = retryTrackingRef.current;
    isMountedRef.current = true;

    return () => {
      // Thunks can settle after a tab or route unmounts. Clearing the active
      // attempts and marking this instance inactive prevents a late settlement
      // from scheduling state work for a panel that no longer exists.
      isMountedRef.current = false;
      retryTracking.sources.clear();
    };
  }, []);

  const completeRetryAttempt = React.useCallback(
    (contextKey: string, source: InsightsDataSourceName, generation: number) => {
      if (!isMountedRef.current) {
        return;
      }

      const retryTracking = retryTrackingRef.current;
      const sourceTracking = retryTracking.sources.get(source);

      // A prior report/fight request can settle after navigation. It must not
      // unlock or otherwise alter the retry control for the active context.
      if (retryTracking.contextKey !== contextKey || sourceTracking?.generation !== generation) {
        return;
      }

      retryTracking.sources.delete(source);
      setRetryDisplayState({
        contextKey,
        sources: Array.from(retryTracking.sources.keys()),
      });
    },
    [],
  );

  React.useEffect(() => {
    const retryTracking = retryTrackingRef.current;
    if (!retryContextKey || retryTracking.contextKey !== retryContextKey) {
      return;
    }

    let hasCompletedRetry = false;

    retryTracking.sources.forEach((tracking, source) => {
      const outcome = sourceOutcomes[source];
      if (outcome.status === 'loading') {
        tracking.observedLoading = true;
        return;
      }

      const isTerminal = outcome.status === 'succeeded' || outcome.status === 'failed';
      const changedSinceRetry =
        outcome.status !== tracking.initialStatus || outcome.error !== tracking.initialError;

      // A cache invalidation and refetch can complete before React observes a
      // loading render. Compare against the pre-retry terminal outcome so the
      // retained failure does not look like the retried request completed.
      if (isTerminal && (tracking.observedLoading || changedSinceRetry)) {
        retryTracking.sources.delete(source);
        hasCompletedRetry = true;
      }
    });

    if (hasCompletedRetry) {
      setRetryDisplayState({
        contextKey: retryContextKey,
        sources: Array.from(retryTracking.sources.keys()),
      });
    }
  }, [retryContextKey, sourceOutcomes]);

  const abilityEquipped = React.useMemo(() => {
    const result: Partial<Record<KnownAbilities, string[]>> = {};

    if (!fight.friendlyPlayers) {
      return {};
    }

    fight.friendlyPlayers.forEach((playerId) => {
      if (playerId === null) {
        return;
      }

      const player = playerData?.playersById[playerId];

      if (!player) {
        return;
      }

      const talents = player.combatantInfo?.talents || [];

      // Check for ultimate abilities using the KnownAbilities mappings
      Object.entries(ULTIMATE_ABILITY_MAPPINGS).forEach(([abilityId, knownAbility]) => {
        const talentFound = talents.some(
          (talent: PlayerTalent) => talent.guid === Number(abilityId),
        );
        if (talentFound) {
          if (!result[knownAbility]) result[knownAbility] = [];
          const playerArray = result[knownAbility];
          if (playerArray) {
            playerArray.push(String(player.displayName || player.name || player.id));
          }
        }
      });
    });
    return result;
  }, [playerData, fight.friendlyPlayers]);

  const buffActors = React.useMemo(() => {
    const result: Partial<Record<KnownAbilities, Set<string>>> = {};

    // Initialize with empty sets for champion point abilities
    Object.values(CHAMPION_POINT_MAPPINGS).forEach((ability) => {
      result[ability] = new Set();
    });

    // Process combatant info events to find champion point auras
    combatantInfoEvents.forEach((event) => {
      if (!event.auras || event.auras.length === 0) return;

      event.auras.forEach((aura) => {
        // Check if this aura matches any of our known champion point abilities
        const knownAbility = CHAMPION_POINT_MAPPINGS[aura.ability];
        if (knownAbility) {
          const sourceId = String(event.sourceID);

          if (event.sourceID != null && playerData?.playersById[sourceId]) {
            const player = playerData.playersById[sourceId];
            const playerName = String(player.displayName || player.name || sourceId);
            const playerSet = result[knownAbility];
            if (playerSet) {
              playerSet.add(playerName);
            }
          }
        }
      });
    });

    return result;
  }, [combatantInfoEvents, playerData?.playersById]);

  // The full damage stream is only required for this label. Keep its state
  // isolated so that it never holds up the independent Insights content.
  const fightInitiator = React.useMemo<FightInitiatorState>(() => {
    const damageIsPending =
      isDamageEventsLoading || damageEventsStatus === 'idle' || damageEventsStatus === 'loading';
    const playerDataStatus = playerData?.status ?? (isPlayerDataLoading ? 'loading' : 'idle');
    const playerDataIsPending =
      isPlayerDataLoading || playerDataStatus === 'idle' || playerDataStatus === 'loading';

    if (damageEvents.length === 0) {
      if (damageEventsStatus === 'failed') {
        return {
          kind: 'unavailable',
          message: 'Damage events could not be loaded, so the fight initiator is unavailable.',
        };
      }

      if (damageIsPending) {
        return {
          kind: 'loading',
          message: 'Loading damage events to identify the fight initiator.',
        };
      }

      return {
        kind: 'unavailable',
        message: 'No friendly damage event identified the fight initiator.',
      };
    }

    // A paginated stream can expose an event page before it has collected the
    // true earliest friendly source. Do not publish a tentative initiator.
    if (damageEventsStatus === 'failed') {
      return {
        kind: 'unavailable',
        message: 'Damage events could not be loaded, so the fight initiator is unavailable.',
      };
    }

    if (damageIsPending) {
      return {
        kind: 'loading',
        message: 'Loading damage events to identify the fight initiator.',
      };
    }

    // Find the earliest-timestamp damage event from a friendly player in a single O(n) scan
    let firstDamageEvent = null;
    for (const event of damageEvents) {
      if (
        event.sourceIsFriendly &&
        fight.friendlyPlayers?.includes(event.sourceID) &&
        (firstDamageEvent === null || event.timestamp < firstDamageEvent.timestamp)
      ) {
        firstDamageEvent = event;
      }
    }

    if (!firstDamageEvent) {
      return {
        kind: 'unavailable',
        message: 'No friendly damage event identified the fight initiator.',
      };
    }

    const sourcePlayer = playerData?.playersById[firstDamageEvent.sourceID];
    if (sourcePlayer) {
      return {
        kind: 'available',
        name:
          sourcePlayer.displayName || sourcePlayer.name || `Player ${firstDamageEvent.sourceID}`,
      };
    }

    if (playerDataStatus === 'failed') {
      return {
        kind: 'unavailable',
        message: 'Player details could not be loaded, so the fight initiator is unavailable.',
      };
    }

    if (playerDataIsPending) {
      return {
        kind: 'loading',
        message: 'Loading player details to identify the fight initiator.',
      };
    }

    return {
      kind: 'unavailable',
      message: 'The first friendly damage event could not be matched to a player.',
    };
  }, [
    damageEvents,
    damageEventsStatus,
    fight.friendlyPlayers,
    isDamageEventsLoading,
    isPlayerDataLoading,
    playerData?.playersById,
    playerData?.status,
  ]);

  const retryFailedSources = React.useCallback(() => {
    if (
      !retryAvailability.canRetry ||
      !resolvedContext.reportCode ||
      resolvedContext.fightId === null
    ) {
      return;
    }

    const cacheContext = {
      reportCode: resolvedContext.reportCode,
      fightId: resolvedContext.fightId,
    };
    const retryTracking = retryTrackingRef.current;
    if (retryTracking.contextKey !== retryContextKey) {
      retryTracking.contextKey = retryContextKey;
      retryTracking.sources.clear();
    }
    const failedSources = dataState.failedSources.filter(
      (source) => sourceAvailability[source] && !retryTracking.sources.has(source),
    );

    if (failedSources.length === 0) {
      return;
    }

    failedSources.forEach((source) => {
      const outcome = sourceOutcomes[source];
      retryTracking.sources.set(source, {
        generation: retryTracking.nextGeneration + 1,
        initialError: outcome.error,
        initialStatus: outcome.status,
        observedLoading: outcome.status === 'loading',
      });
      retryTracking.nextGeneration += 1;
    });
    setRetryDisplayState({
      contextKey: retryContextKey,
      sources: Array.from(retryTracking.sources.keys()),
    });

    const failedSourceSet = new Set<InsightsDataSourceName>(failedSources);
    const releaseRetryOnSettlement = (
      source: InsightsDataSourceName,
      retryAttempt: unknown,
    ): void => {
      const generation = retryTracking.sources.get(source)?.generation;
      if (generation === undefined || !retryContextKey) {
        return;
      }

      // Redux thunks settle when their fresh request has either fulfilled or
      // rejected. Releasing by attempt (rather than only by a changed render)
      // also covers an immediate repeat of the same failed status and error.
      void Promise.resolve(retryAttempt).then(
        () => completeRetryAttempt(retryContextKey, source, generation),
        () => completeRetryAttempt(retryContextKey, source, generation),
      );
    };

    if (failedSourceSet.has('damage') && damageClient && isDamageClientReady && selectedFight) {
      dispatch(clearDamageEventsForContext(cacheContext));
      const retryAttempt = dispatch(
        fetchDamageEvents({
          reportCode: resolvedContext.reportCode,
          fight: selectedFight,
          client: damageClient,
          restrictToFightWindow: true,
        }),
      );
      releaseRetryOnSettlement('damage', retryAttempt);
    }

    if (failedSourceSet.has('combatantInfo') && selectedFight) {
      dispatch(clearCombatantInfoEventsForContext(cacheContext));
      const retryAttempt = dispatch(
        fetchCombatantInfoEvents({
          reportCode: resolvedContext.reportCode,
          fight: selectedFight,
          client: eventClient,
          restrictToFightWindow: true,
        }),
      );
      releaseRetryOnSettlement('combatantInfo', retryAttempt);
    }

    if (failedSourceSet.has('playerData')) {
      dispatch(clearPlayerDataForContext(cacheContext));
      const retryAttempt = dispatch(
        fetchPlayerData({
          reportCode: resolvedContext.reportCode,
          fightId: resolvedContext.fightId,
          client: eventClient,
        }),
      );
      releaseRetryOnSettlement('playerData', retryAttempt);
    }
  }, [
    completeRetryAttempt,
    damageClient,
    dataState.failedSources,
    dispatch,
    eventClient,
    isDamageClientReady,
    retryAvailability.canRetry,
    retryContextKey,
    resolvedContext.fightId,
    resolvedContext.reportCode,
    selectedFight,
    sourceAvailability,
    sourceOutcomes,
  ]);

  return (
    <InsightsPanelView
      fight={fight}
      durationMs={durationMs}
      abilityEquipped={abilityEquipped}
      buffActors={buffActors}
      fightInitiator={fightInitiator}
      selectedPlayerId={selectedFriendlyPlayerId ?? null}
      dataState={dataState}
      onRetry={retryFailedSources}
      retryAvailability={retryAvailability}
    />
  );
};
