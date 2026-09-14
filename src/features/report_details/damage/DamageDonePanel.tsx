import { Box } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { PlayerCardModal } from '../../../components/PlayerCardModal';
import {
  useDamageEventsLookup,
  hasNoResolvedTargets,
  useReportMasterData,
  usePlayerData,
  useSelectedTargetIds,
  useDeathEvents,
  useCastEvents,
  useDamageOverTimeTask,
  useFightForContext,
  useResolvedReportFightContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectCastEventsEntryForContext } from '../../../store/events_data/castEventsSelectors';
import { selectDamageEventsEntryForContext } from '../../../store/events_data/damageEventsSelectors';
import { selectDeathEventsEntryForContext } from '../../../store/events_data/deathEventsSelectors';
import {
  selectActorsById,
  selectMasterDataEntryForContext,
} from '../../../store/master_data/masterDataSelectors';
import { selectReportRegistryEntryForContext } from '../../../store/report/reportSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { KnownAbilities } from '../../../types/abilities';
import type { DamageStatisticsWithActivity } from '../../../utils/activePercentageUtils';
import { msToSeconds } from '../../../utils/fightDuration';
import { resolveActorName } from '../../../utils/resolveActorName';
import type { DamageOverTimeResult } from '../../../workers/calculations/CalculateDamageOverTime';
import {
  AnalyzerPanelState,
  type AnalyzerPanelStateKind,
  resolveAnalyzerPanelState,
} from '../AnalyzerPanelState';

import { DamageDonePanelView } from './DamageDonePanelView';
import { useDamageStatistics } from './useDamageStatistics';

const EMPTY_DAMAGE_STATISTICS: DamageStatisticsWithActivity = {
  damageByPlayer: {},
  criticalDamageByPlayer: {},
  damageEventsBySource: {},
  activePercentages: {},
};

interface DamageDonePanelProps {
  context?: ReportFightContextInput;
  children?: React.ReactNode;
}

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ResolveDamageDonePanelStateInput {
  error?: string | null;
  hasData: boolean;
  isLoading: boolean;
  hasFight: boolean;
  statuses: readonly LoadStatus[];
}

export const resolveDamageDonePanelState = ({
  error,
  hasData,
  isLoading,
  hasFight,
  statuses,
}: ResolveDamageDonePanelStateInput): AnalyzerPanelStateKind =>
  resolveAnalyzerPanelState({
    error,
    hasData,
    isLoading,
    isComplete: hasFight && statuses.every((status) => status === 'succeeded'),
  });

/** Returns damage share from critical hits; null means the denominator is not trustworthy. */
export const calculateCriticalDamageShare = (
  totalDamage: number,
  criticalDamageTotal: number,
): number | null => {
  if (
    !Number.isFinite(totalDamage) ||
    totalDamage <= 0 ||
    !Number.isFinite(criticalDamageTotal) ||
    criticalDamageTotal < 0 ||
    criticalDamageTotal > totalDamage
  ) {
    return null;
  }

  return (criticalDamageTotal / totalDamage) * 100;
};

/**
 * Smart component that handles data processing and state management for damage done panel
 */
export const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ context }) => {
  // Use hooks to get data
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);

  const { damageEventsByPlayer, isDamageEventsLookupLoading } = useDamageEventsLookup({
    context: resolvedContext,
  });
  const { reportMasterData, isMasterDataLoading } = useReportMasterData({
    context: resolvedContext,
  });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: resolvedContext });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const selectedTargetIds = useSelectedTargetIds();
  const actorsById = useSelector(selectActorsById);
  const damageEntry = useSelector((state: RootState) =>
    selectDamageEventsEntryForContext(state, resolvedContext),
  );
  const reportEntry = useSelector((state: RootState) =>
    selectReportRegistryEntryForContext(state, resolvedContext),
  );
  const masterDataEntry = useSelector((state: RootState) =>
    selectMasterDataEntryForContext(state, resolvedContext),
  );
  const deathEntry = useSelector((state: RootState) =>
    selectDeathEventsEntryForContext(state, resolvedContext),
  );
  const castEntry = useSelector((state: RootState) =>
    selectCastEventsEntryForContext(state, resolvedContext),
  );

  const { damageOverTimeData, isDamageOverTimeLoading, damageOverTimeError } =
    useDamageOverTimeTask({ context: resolvedContext });

  // Resolve selected target names for display
  const selectedTargetNames = useMemo(() => {
    if (selectedTargetIds.size === 0 || hasNoResolvedTargets(selectedTargetIds)) return null;

    const names = Array.from(selectedTargetIds).map((targetId) => {
      const actor = actorsById[targetId];
      return resolveActorName(actor, targetId);
    });

    return names;
  }, [selectedTargetIds, actorsById]);

  // Prepare available targets for the chart
  const availableTargets = useMemo(() => {
    if (!fight || !actorsById) return [];

    const targets: Array<{ id: number; name: string }> = [];

    // Add enemy players
    if (fight.enemyPlayers) {
      fight.enemyPlayers.forEach((playerId) => {
        if (typeof playerId === 'number') {
          const actor = actorsById[playerId];
          targets.push({
            id: playerId,
            name: resolveActorName(actor, playerId),
          });
        }
      });
    }

    // Add NPCs (enemyNPCs are objects with an .id property, not bare numbers)
    if (fight.enemyNPCs) {
      fight.enemyNPCs.forEach((npc) => {
        if (npc && typeof npc.id === 'number') {
          const actor = actorsById[npc.id];
          targets.push({
            id: npc.id,
            name: resolveActorName(actor, npc.id),
          });
        }
      });
    }

    return targets;
  }, [fight, actorsById]);

  // Extract data from hooks with memoization
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData],
  );

  // Compute loading and error states
  const isLoading = useMemo(() => {
    return (
      isDamageEventsLookupLoading ||
      isMasterDataLoading ||
      isPlayerDataLoading ||
      isDeathEventsLoading ||
      isCastEventsLoading ||
      isDamageOverTimeLoading ||
      reportEntry?.status === 'loading'
    );
  }, [
    isDamageEventsLookupLoading,
    isMasterDataLoading,
    isPlayerDataLoading,
    isDeathEventsLoading,
    isCastEventsLoading,
    isDamageOverTimeLoading,
    reportEntry?.status,
  ]);

  const {
    damageStatistics: calculatedDamageStatistics,
    isLoading: isDamageStatisticsLoading,
    error: damageStatisticsError,
    retry: retryDamageStatistics,
  } = useDamageStatistics({ fight, damageEventsByPlayer, selectedTargetIds });
  const damageStatistics = calculatedDamageStatistics ?? EMPTY_DAMAGE_STATISTICS;

  const fightDurationMs = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return Number(fight.endTime) - Number(fight.startTime);
    }
    return 1;
  }, [fight]);

  const deathsByPlayer = useMemo(() => {
    const counts: Record<string, number> = {};
    const fightNum = fight?.id ? Number(fight.id) : undefined;

    for (const ev of deathEvents) {
      if (
        ev.type === 'death' &&
        (fightNum == null || (typeof ev.fight === 'number' && ev.fight === fightNum))
      ) {
        const target = ev.targetID;
        if (target != null) {
          const key = String(target);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [deathEvents, fight]);

  const resByPlayer = useMemo(() => {
    const result: Record<string, number> = {};

    for (const event of castEvents) {
      if (event.type !== 'cast') continue;

      if (event.abilityGameID === KnownAbilities.RESURRECT) {
        result[event.sourceID] = (result[event.sourceID] || 0) + 1;
      }
    }

    return result;
  }, [castEvents]);

  // Calculate CPM (casts per minute) per player
  const cpmByPlayer = useMemo(() => {
    const result: Record<string, number> = {};
    if (!fight) return result;

    // Count cast events per player (excluding fake casts)
    for (const event of castEvents) {
      if (event.type === 'cast' && !event.fake) {
        const sourceId = event.sourceID;
        result[sourceId] = (result[sourceId] || 0) + 1;
      }
    }

    // Calculate fight duration in minutes
    const durationMs = fight.endTime - fight.startTime;
    const minutes = durationMs > 0 ? durationMs / 60000 : 0;

    if (minutes > 0) {
      for (const playerId of Object.keys(result)) {
        result[playerId] = Number((result[playerId] / minutes).toFixed(1));
      }
    } else {
      // No duration; set CPM to 0
      for (const playerId of Object.keys(result)) {
        result[playerId] = 0;
      }
    }

    return result;
  }, [castEvents, fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string) => {
      const actor = masterData.actorsById[id];
      if (!actor) {
        return false;
      }

      if (fight?.friendlyPlayers?.some((friendlyId) => friendlyId?.toString() === id)) {
        return true;
      }

      return fight?.friendlyNPCs?.some((npc) => npc?.id?.toString() === id);
    };
  }, [masterData.actorsById, fight]);

  // Helper function to determine player role
  const getPlayerRole = useMemo(() => {
    return (playerId: string): 'dps' | 'tank' | 'healer' => {
      if (!playerData?.playersById) return 'dps';

      // Try both string and numeric keys since playerData might use either
      const player = playerData.playersById[playerId] || playerData.playersById[Number(playerId)];
      const role = player?.role;

      // The role should already be normalized in the store
      if (role === 'tank') return 'tank';
      if (role === 'healer') return 'healer';
      if (role === 'dps') return 'dps';

      return 'dps'; // default fallback
    };
  }, [playerData]);

  const damageRows = useMemo(() => {
    return Object.entries(damageStatistics.damageByPlayer)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, total]) => {
        const totalDamage = Number(total);
        const playerId = Number(id);

        // Prefer masterData actor name if available
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        const role = getPlayerRole(id);
        const deaths = deathsByPlayer[id] || 0;
        const resurrects = resByPlayer[id] || 0;
        const cpm = cpmByPlayer[id] || 0;

        // Get active percentage for this player
        const activeData = damageStatistics.activePercentages[playerId];
        const activePercentage = activeData?.activePercentage ?? 0;

        // Get critical damage metrics for this player
        const criticalDamageTotal = damageStatistics.criticalDamageByPlayer[playerId] || 0;
        const criticalDamageShare = calculateCriticalDamageShare(totalDamage, criticalDamageTotal);

        return {
          id,
          name,
          total: totalDamage,
          dps: fightDurationMs > 0 ? totalDamage / msToSeconds(fightDurationMs) : 0,
          activePercentage,
          criticalDamageShare,
          criticalDamageTotal,
          iconUrl,
          role,
          deaths,
          resurrects,
          cpm,
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }, [
    damageStatistics.damageByPlayer,
    damageStatistics.criticalDamageByPlayer,
    isPlayerActor,
    masterData.actorsById,
    fightDurationMs,
    getPlayerRole,
    damageStatistics.activePercentages,
    deathsByPlayer,
    resByPlayer,
    cpmByPlayer,
  ]);

  // --- PlayerCardModal state ---
  const [modalPlayerId, setModalPlayerId] = useState<string | null>(null);

  const handlePlayerClick = useCallback((playerId: string) => {
    setModalPlayerId(playerId);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalPlayerId(null);
  }, []);

  const handleModalPlayerChange = useCallback((playerId: string | number) => {
    setModalPlayerId(String(playerId));
  }, []);

  const orderedPlayerIds = useMemo(() => damageRows.map((row) => row.id), [damageRows]);

  const resolvePlayerName = useCallback(
    (playerId: number, fallbackName: string): string => {
      const actor = actorsById[playerId];
      return resolveActorName(actor, playerId, fallbackName);
    },
    [actorsById],
  );

  const rawPanelError =
    damageStatisticsError ??
    reportEntry?.error ??
    damageEntry?.error ??
    masterDataEntry?.error ??
    playerData?.error ??
    deathEntry?.error ??
    castEntry?.error ??
    damageOverTimeError ??
    null;
  const panelError =
    rawPanelError instanceof Error ? rawPanelError.message : (rawPanelError ?? null);
  const hasData = damageRows.length > 0;
  const panelState = resolveDamageDonePanelState({
    error: panelError,
    hasData,
    isLoading: isLoading || isDamageStatisticsLoading,
    hasFight: Boolean(fight),
    statuses: [
      reportEntry?.status ?? 'idle',
      damageEntry?.status ?? 'idle',
      masterDataEntry?.status ?? 'idle',
      playerData?.status ?? 'idle',
      deathEntry?.status ?? 'idle',
      castEntry?.status ?? 'idle',
    ],
  });

  return (
    <AnalyzerPanelState
      title="Damage done"
      state={panelState}
      detail={panelError ?? undefined}
      onRetry={damageStatisticsError ? retryDamageStatistics : undefined}
    >
      {hasData && (
        <Box data-testid="damage-done-panel">
          <DamageDonePanelView
            damageRows={damageRows}
            selectedTargetNames={selectedTargetNames}
            damageOverTimeData={damageOverTimeData as DamageOverTimeResult | null}
            isDamageOverTimeLoading={isDamageOverTimeLoading}
            selectedTargetIds={selectedTargetIds}
            availableTargets={availableTargets}
            onPlayerClick={handlePlayerClick}
            context={resolvedContext}
            fight={fight}
            resolvePlayerName={resolvePlayerName}
          />
          {modalPlayerId !== null && (
            <PlayerCardModal
              open
              onClose={handleModalClose}
              currentPlayerId={modalPlayerId}
              orderedPlayerIds={orderedPlayerIds}
              onPlayerChange={handleModalPlayerChange}
              context={resolvedContext}
            />
          )}
        </Box>
      )}
    </AnalyzerPanelState>
  );
};
