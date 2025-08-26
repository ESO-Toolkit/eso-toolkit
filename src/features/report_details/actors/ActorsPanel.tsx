import React from 'react';

import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';

import { ActorsPanelView } from './ActorsPanelView';

export const ActorsPanel: React.FC = () => {
  const { reportMasterData } = useReportMasterData();
  const { playerData } = usePlayerData();
  const { combatantInfoEvents } = useCombatantInfoEvents();

  // Convert actors object to array for the data grid
  const actors = React.useMemo(() => {
    return Object.values(reportMasterData.actorsById).map((actor) => ({
      id: actor.id ?? '',
      name: actor.name || 'Unknown',
      displayName: actor.displayName || null,
      type: actor.type || 'Unknown',
      subType: actor.subType || null,
      server: actor.server || '',
      gameID: actor.gameID || 0,
    }));
  }, [reportMasterData.actorsById]);

  return (
    <ActorsPanelView
      actors={actors}
      playersById={playerData?.playersById}
      actorsById={reportMasterData.actorsById}
      combatantInfoEvents={combatantInfoEvents}
    />
  );
};
