import React from 'react';
import { useSelector } from 'react-redux';

import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';
import { selectMasterDataErrorState } from '../../../store/master_data/masterDataSelectors';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { ActorsPanelView } from './ActorsPanelView';

export const ActorsPanel: React.FC = () => {
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const masterDataError = useSelector(selectMasterDataErrorState);
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const {
    combatantInfoEvents,
    isCombatantInfoEventsLoading,
    combatantInfoEventsStatus,
    combatantInfoEventsError,
  } = useCombatantInfoEvents();

  // Calculate loading state for all dependencies
  const isLoading = isMasterDataLoading || isPlayerDataLoading || isCombatantInfoEventsLoading;

  // Convert actors object to array for the data grid
  const actors = React.useMemo(() => {
    if (!reportMasterData?.actorsById) return [];

    return Object.values(reportMasterData.actorsById).map((actor) => ({
      id: actor.id ?? '',
      name: actor.name || 'Unknown',
      displayName: actor.displayName || null,
      type: actor.type || 'Unknown',
      subType: actor.subType || null,
      server: actor.server || '',
      // Preserve an absent game ID as unknown; zero is a valid-looking value.
      gameID: actor.gameID ?? null,
    }));
  }, [reportMasterData?.actorsById]);

  const hasRetainedData = actors.length > 0;
  const failureDetail =
    masterDataError ?? combatantInfoEventsError ?? playerData?.error ?? undefined;
  const state = resolveAnalyzerPanelState({
    error: failureDetail,
    hasData: hasRetainedData,
    isComplete:
      reportMasterData.loaded &&
      playerData?.status === 'succeeded' &&
      combatantInfoEventsStatus === 'succeeded',
    isLoading,
  });

  return (
    <AnalyzerPanelState detail={failureDetail} state={state} title="Actors">
      {hasRetainedData && (
        <ActorsPanelView
          actors={actors}
          playersById={playerData?.playersById}
          actorsById={reportMasterData?.actorsById}
          combatantInfoEvents={combatantInfoEvents}
        />
      )}
    </AnalyzerPanelState>
  );
};
