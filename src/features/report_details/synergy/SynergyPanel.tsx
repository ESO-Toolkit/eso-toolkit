import React from 'react';
import { useSelector } from 'react-redux';

import {
  useCastEvents,
  useReportMasterData,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectMasterDataErrorForContext } from '../../../store/master_data/masterDataSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { SynergyPanelView } from './SynergyPanelView';
import { extractSynergyData } from './synergyUtils';

interface SynergyPanelProps {
  context?: ReportFightContextInput;
}

export const SynergyPanel: React.FC<SynergyPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const { castEvents, isCastEventsLoading, castEventsStatus, castEventsError } = useCastEvents({
    context: resolvedContext,
  });
  const { reportMasterData, isMasterDataLoading } = useReportMasterData({
    context: resolvedContext,
  });
  const masterDataError = useSelector((state: RootState) =>
    selectMasterDataErrorForContext(state, resolvedContext),
  );

  const isLoading = Boolean(fight) && (isCastEventsLoading || isMasterDataLoading);

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

  const hasSynergyData = synergyData.totalCount > 0;
  const state = resolveAnalyzerPanelState({
    error: masterDataError ?? castEventsError,
    hasData: hasSynergyData,
    isComplete: Boolean(fight && reportMasterData.loaded && castEventsStatus === 'succeeded'),
    isLoading,
  });

  return (
    <AnalyzerPanelState
      detail={masterDataError ?? castEventsError ?? undefined}
      state={state}
      title="Synergies"
    >
      {hasSynergyData && fight && (
        <SynergyPanelView
          data={synergyData}
          fight={fight}
          isLoading={false}
          actorsById={reportMasterData.actorsById}
          reportCode={resolvedContext.reportCode}
          fightId={resolvedContext.fightId}
        />
      )}
    </AnalyzerPanelState>
  );
};
