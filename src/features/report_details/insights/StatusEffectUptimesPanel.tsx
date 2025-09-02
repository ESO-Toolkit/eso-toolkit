import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';

import { StatusEffectUptimesView } from './StatusEffectUptimesView';

import { useStatusEffectUptimesTask } from '@/hooks';

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Use the worker-based selector for status effect uptimes
  const { statusEffectUptimesData, isStatusEffectUptimesLoading } = useStatusEffectUptimesTask();

  // Enhance the results with ability names from master data
  const enhancedStatusEffectUptimes = React.useMemo(() => {
    if (!statusEffectUptimesData || !reportMasterData?.abilitiesById) {
      return statusEffectUptimesData;
    }

    return statusEffectUptimesData.map((uptime) => {
      const ability = reportMasterData.abilitiesById[uptime.abilityGameID];
      return {
        ...uptime,
        abilityName: ability?.name || uptime.abilityName,
        icon: ability?.icon || uptime.icon,
      };
    });
  }, [statusEffectUptimesData, reportMasterData?.abilitiesById]);

  if (isMasterDataLoading || isStatusEffectUptimesLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={null}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
      />
    );
  }

  return (
    <StatusEffectUptimesView
      selectedTargetId={selectedTargetId}
      statusEffectUptimes={enhancedStatusEffectUptimes}
      isLoading={false}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
