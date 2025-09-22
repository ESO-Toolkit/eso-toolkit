import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { parseDamageTypeFlags } from '../../../types/abilities';

import { AbilitiesDebugPanelView } from './AbilitiesDebugPanelView';

interface AbilitiesDebugPanelProps {
  fight: FightFragment;
}

export const AbilitiesDebugPanel: React.FC<AbilitiesDebugPanelProps> = ({ fight: _fight }) => {
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

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

  return (
    <AbilitiesDebugPanelView
      abilities={abilitiesData}
      totalCount={abilitiesData.length}
      isLoading={isMasterDataLoading}
    />
  );
};
