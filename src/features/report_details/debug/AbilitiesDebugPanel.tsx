import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { selectMasterDataErrorState } from '../../../store/master_data/masterDataSelectors';
import { parseDamageTypeFlags } from '../../../types/abilities';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { AbilitiesDebugPanelView } from './AbilitiesDebugPanelView';

interface AbilitiesDebugPanelProps {
  fight: FightFragment;
}

export const AbilitiesDebugPanel: React.FC<AbilitiesDebugPanelProps> = ({ fight: _fight }) => {
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const masterDataError = useSelector(selectMasterDataErrorState);

  // Process abilities data
  const abilitiesData = React.useMemo(() => {
    if (!reportMasterData?.abilitiesById) {
      return [];
    }

    return Object.values(reportMasterData.abilitiesById)
      .filter((ability) => ability != null)
      .map((ability) => ({
        gameID: ability.gameID || 'N/A',
        name: ability.name || 'Unknown',
        icon: ability.icon || 'N/A',
        type: ability.type || 'N/A',
        // Parse damage type flags if available
        damageTypes: parseDamageTypeFlags(ability.type),
      }))
      .sort((a, b) => {
        // Sort by gameID numerically
        const aId = typeof a.gameID === 'number' ? a.gameID : parseInt(String(a.gameID), 10) || 0;
        const bId = typeof b.gameID === 'number' ? b.gameID : parseInt(String(b.gameID), 10) || 0;
        return aId - bId;
      });
  }, [reportMasterData?.abilitiesById]);

  const hasRetainedData = abilitiesData.length > 0;
  const state = resolveAnalyzerPanelState({
    error: masterDataError,
    hasData: hasRetainedData,
    isComplete: reportMasterData.loaded,
    isLoading: isMasterDataLoading,
  });

  return (
    <AnalyzerPanelState detail={masterDataError ?? undefined} state={state} title="Abilities">
      {hasRetainedData && (
        <AbilitiesDebugPanelView
          abilities={abilitiesData}
          totalCount={abilitiesData.length}
          isLoading={false}
        />
      )}
    </AnalyzerPanelState>
  );
};
