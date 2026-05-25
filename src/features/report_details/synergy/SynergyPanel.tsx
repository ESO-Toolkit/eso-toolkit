import React from 'react';

import {
  useCastEvents,
  useReportMasterData,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';

import { SynergyPanelView } from './SynergyPanelView';
import { extractSynergyData } from './synergyUtils';

interface SynergyPanelProps {
  context?: ReportFightContextInput;
}

export const SynergyPanel: React.FC<SynergyPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const { reportMasterData, isMasterDataLoading } = useReportMasterData({
    context: resolvedContext,
  });

  const isLoading = isCastEventsLoading || isMasterDataLoading;

  const friendlyPlayerIds = React.useMemo(
    () => fight?.friendlyPlayers?.filter((id): id is number => id !== null) ?? [],
    [fight?.friendlyPlayers],
  );

  const synergyData = React.useMemo(() => {
    if (!castEvents.length || !reportMasterData.loaded) {
      return { activations: [], byPlayer: [], byAbility: [], totalCount: 0 };
    }

    return extractSynergyData(
      castEvents,
      reportMasterData.abilitiesById,
      reportMasterData.actorsById,
      friendlyPlayerIds,
    );
  }, [
    castEvents,
    reportMasterData.abilitiesById,
    reportMasterData.actorsById,
    reportMasterData.loaded,
    friendlyPlayerIds,
  ]);

  if (!fight) {
    return null;
  }

  return (
    <SynergyPanelView
      data={synergyData}
      fight={fight}
      isLoading={isLoading}
      actorsById={reportMasterData.actorsById}
      reportCode={resolvedContext.reportCode}
      fightId={resolvedContext.fightId}
    />
  );
};
