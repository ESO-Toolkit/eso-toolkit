import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';

import { StatusEffectUptimesView } from './StatusEffectUptimesView';

import { useStatusEffectUptimesTask, useHostileBuffLookupTask, useDebuffLookupTask } from '@/hooks';

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Get all dependency loading states to ensure complete data
  const { isHostileBuffLookupLoading } = useHostileBuffLookupTask();
  const { isDebuffLookupLoading } = useDebuffLookupTask();

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
        uniqueKey: `${uptime.abilityGameID}`,
        abilityName: ability?.name || uptime.abilityName,
        icon: ability?.icon || uptime.icon,
      };
    });
  }, [statusEffectUptimesData, reportMasterData?.abilitiesById]);

  // Enhanced loading check: ensure ALL required data is available and processing is complete
  const isDataLoading = React.useMemo(() => {
    // Still loading if any of the core data sources are loading
    if (isMasterDataLoading || isStatusEffectUptimesLoading) {
      return true;
    }

    // Still loading if dependency tasks are loading
    if (isHostileBuffLookupLoading || isDebuffLookupLoading) {
      return true;
    }

    // Still loading if we don't have master data (required for enhancement)
    if (!reportMasterData) {
      return true;
    }

    // Still loading if status effect task hasn't completed yet
    // Note: statusEffectUptimesData can be null, undefined, or [] depending on state
    if (statusEffectUptimesData === undefined || statusEffectUptimesData === null) {
      return true;
    }

    // Data is ready - statusEffectUptimesData is either [] (no effects) or contains effects
    return false;
  }, [
    isMasterDataLoading,
    isStatusEffectUptimesLoading,
    isHostileBuffLookupLoading,
    isDebuffLookupLoading,
    reportMasterData,
    statusEffectUptimesData,
  ]);

  if (isDataLoading) {
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
