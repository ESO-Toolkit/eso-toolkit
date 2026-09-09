import { Box } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { PlayerCardModal } from '../../../components/PlayerCardModal';
import {
  useCastEvents,
  useHealingEvents,
  useReportMasterData,
  usePlayerData,
  useDeathEvents,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectCastEventsEntryForContext } from '../../../store/events_data/castEventsSelectors';
import { selectDeathEventsEntryForContext } from '../../../store/events_data/deathEventsSelectors';
import { selectHealingEventsEntryForContext } from '../../../store/events_data/healingEventsSelectors';
import { selectMasterDataEntryForContext } from '../../../store/master_data/masterDataSelectors';
import { selectReportRegistryEntryForContext } from '../../../store/report/reportSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { KnownAbilities } from '../../../types/abilities';
import { HealEvent } from '../../../types/combatlogEvents';
import { msToSeconds } from '../../../utils/fightDuration';
import { resolveActorName } from '../../../utils/resolveActorName';
import {
  AnalyzerPanelState,
  type AnalyzerPanelStateKind,
  resolveAnalyzerPanelState,
} from '../AnalyzerPanelState';

import { HealingDonePanelView } from './HealingDonePanelView';

interface HealingDonePanelProps {
  context?: ReportFightContextInput;
}

type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ResolveHealingDonePanelStateInput {
  error?: string | null;
  hasData: boolean;
  isLoading: boolean;
  hasFight: boolean;
  statuses: readonly LoadStatus[];
}

export const resolveHealingDonePanelState = ({
  error,
  hasData,
  isLoading,
  hasFight,
  statuses,
}: ResolveHealingDonePanelStateInput): AnalyzerPanelStateKind =>
  resolveAnalyzerPanelState({
    error,
    hasData,
    isLoading,
    isComplete: hasFight && statuses.every((status) => status === 'succeeded'),
  });

/**
 * Smart component that handles data processing and state management for healing done panel
 */
export const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  // Use hooks to get data
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context: resolvedContext });
  const { reportMasterData, isMasterDataLoading } = useReportMasterData({
    context: resolvedContext,
  });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: resolvedContext });
  const healingEntry = useSelector((state: RootState) =>
    selectHealingEventsEntryForContext(state, resolvedContext),
  );
  const reportEntry = useSelector((state: RootState) =>
    selectReportRegistryEntryForContext(state, resolvedContext),
  );
  const masterDataEntry = useSelector((state: RootState) =>
    selectMasterDataEntryForContext(state, resolvedContext),
  );
  const castEntry = useSelector((state: RootState) =>
    selectCastEventsEntryForContext(state, resolvedContext),
  );
  const deathEntry = useSelector((state: RootState) =>
    selectDeathEventsEntryForContext(state, resolvedContext),
  );

  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData],
  );

  // Compute loading state
  const isLoading =
    isHealingEventsLoading ||
    isMasterDataLoading ||
    isCastEventsLoading ||
    isPlayerDataLoading ||
    isDeathEventsLoading ||
    reportEntry?.status === 'loading';

  // Memoize healing calculations to prevent unnecessary recalculations
  const healingStatistics = useMemo(() => {
    const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};

    healingEvents.forEach((event: HealEvent) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = event.sourceID;
        const amount = event.amount ?? 0;
        const overheal = event.overheal ?? 0;
        if (!healingByPlayer[playerId]) {
          healingByPlayer[playerId] = { raw: 0, overheal: 0 };
        }
        healingByPlayer[playerId].raw += amount;
        healingByPlayer[playerId].overheal += overheal;
      }
    });

    return healingByPlayer;
  }, [healingEvents]);

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

  const fightDurationMs = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return Number(fight.endTime) - Number(fight.startTime);
    }
    return 1;
  }, [fight]);

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
    return (playerId: string | number): 'dps' | 'tank' | 'healer' => {
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

  const healingRows = useMemo(() => {
    return Object.entries(healingStatistics)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, { raw, overheal }]) => {
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        const ressurects = resByPlayer[id] || 0;
        const deaths = deathsByPlayer[id] || 0;
        const role = getPlayerRole(id);

        // Calculate overheal percentage: (overheal / (raw + overheal)) * 100
        const totalHealing = raw + overheal;
        const overhealPercentage = totalHealing > 0 ? (overheal / totalHealing) * 100 : 0;

        return {
          id,
          name,
          raw,
          hps: fightDurationMs > 0 ? raw / msToSeconds(fightDurationMs) : 0,
          rawHps: fightDurationMs > 0 ? (raw + overheal) / msToSeconds(fightDurationMs) : 0,
          overheal,
          overhealPercentage,
          iconUrl,
          ressurects,
          deaths,
          role,
        };
      })
      .sort((a, b) => b.hps - a.hps);
  }, [
    healingStatistics,
    isPlayerActor,
    masterData.actorsById,
    fightDurationMs,
    resByPlayer,
    deathsByPlayer,
    getPlayerRole,
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

  const orderedPlayerIds = useMemo(() => healingRows.map((row) => row.id), [healingRows]);

  const panelError =
    reportEntry?.error ??
    healingEntry?.error ??
    masterDataEntry?.error ??
    castEntry?.error ??
    playerData?.error ??
    deathEntry?.error ??
    null;
  const hasData = healingRows.length > 0;
  const panelState = resolveHealingDonePanelState({
    error: panelError,
    hasData,
    isLoading,
    hasFight: Boolean(fight),
    statuses: [
      reportEntry?.status ?? 'idle',
      healingEntry?.status ?? 'idle',
      masterDataEntry?.status ?? 'idle',
      castEntry?.status ?? 'idle',
      playerData?.status ?? 'idle',
      deathEntry?.status ?? 'idle',
    ],
  });

  return (
    <AnalyzerPanelState title="Healing done" state={panelState} detail={panelError ?? undefined}>
      {hasData && (
        <Box data-testid="healing-done-panel">
          <HealingDonePanelView healingRows={healingRows} onPlayerClick={handlePlayerClick} />
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
