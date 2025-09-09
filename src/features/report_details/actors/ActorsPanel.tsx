import React from 'react';

import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';

import { ActorsPanelView } from './ActorsPanelView';

export const ActorsPanel: React.FC = () => {
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  // Calculate loading state for all dependencies
  const isLoading = isMasterDataLoading || isPlayerDataLoading || isCombatantInfoEventsLoading;

  // Convert actors object to array for the data grid
  const actors = React.useMemo(() => {
    if (isLoading || !reportMasterData?.actorsById) return [];

    return Object.values(reportMasterData.actorsById).map((actor) => ({
      id: actor.id ?? '',
      name: actor.name || 'Unknown',
      displayName: actor.displayName || null,
      type: actor.type || 'Unknown',
      subType: actor.subType || null,
      server: actor.server || '',
      gameID: actor.gameID || 0,
    }));
  }, [reportMasterData?.actorsById, isLoading]);

  return (
    <ActorsPanelView
      actors={actors}
      playersById={isLoading ? undefined : playerData?.playersById}
      actorsById={isLoading ? undefined : reportMasterData?.actorsById}
      combatantInfoEvents={isLoading ? [] : combatantInfoEvents}
    />
  );
};
