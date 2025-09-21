import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useSelectedTargetIds, ALL_TARGETS_SENTINEL } from '../../../hooks/useSelectedTargetIds';
import { useSelectedReportAndFight } from '../../../ReportFightContext';

import { BuffUptime } from './BuffUptimeProgressBar';
import { StatusEffectUptimesView } from './StatusEffectUptimesView';

import { useStatusEffectUptimesTask, useHostileBuffLookupTask, useDebuffLookupTask } from '@/hooks';

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetIds = useSelectedTargetIds();
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Convert Set to single target ID for backward compatibility with StatusEffectUptimesView
  const selectedTargetId = React.useMemo(() => {
    if (selectedTargetIds.size === 0) {
      return null;
    }
    const targetArray = Array.from(selectedTargetIds);
    // Return first non-sentinel target, or null if only sentinel values
    return targetArray.find((id) => id !== ALL_TARGETS_SENTINEL) || null;
  }, [selectedTargetIds]);

  // Get all dependency loading states to ensure complete data
  const { isHostileBuffLookupLoading } = useHostileBuffLookupTask();
  const { isDebuffLookupLoading } = useDebuffLookupTask();

  // Use the worker-based selector for status effect uptimes (now returns target-segmented data)
  const { statusEffectUptimesData, isStatusEffectUptimesLoading } = useStatusEffectUptimesTask();

  // Filter and average the target-segmented data based on selected targets
  const filteredStatusEffectUptimes = React.useMemo(() => {
    if (!statusEffectUptimesData || selectedTargetIds.size === 0) {
      return [];
    }

    // Cache fight duration calculation
    const fightDuration = fight.endTime ? fight.endTime - fight.startTime : 1;

    // If "All Targets" is selected, include all available targets
    const shouldIncludeAllTargets = selectedTargetIds.has(ALL_TARGETS_SENTINEL);

    // Pre-compute targets to include outside the map loop
    let selectedTargetsArray: number[] | null = null;
    if (!shouldIncludeAllTargets) {
      selectedTargetsArray = Array.from(selectedTargetIds).filter(
        (id) => id !== ALL_TARGETS_SENTINEL,
      );
    }

    // For small datasets, process normally
    if (statusEffectUptimesData.length <= 50) {
      return statusEffectUptimesData
        .map((uptimeData) => {
          const { targetData, ...baseData } = uptimeData;

          // Determine which targets to include
          let targetsToInclude: number[];
          if (shouldIncludeAllTargets) {
            // Include all targets that have data
            targetsToInclude = Object.keys(targetData).map(Number);
          } else {
            // Include only selected targets that have data
            targetsToInclude =
              selectedTargetsArray?.filter((id) => targetData[id] !== undefined) || [];
          }

          if (targetsToInclude.length === 0) {
            return null; // No valid targets for this status effect
          }

          // Calculate aggregated values efficiently
          let totalDuration = 0;
          let totalUptime = 0;
          let totalApplications = 0;
          const targetCount = targetsToInclude.length;

          // Use a single loop for all calculations
          for (let j = 0; j < targetCount; j++) {
            const data = targetData[targetsToInclude[j]];
            if (data) {
              totalDuration += data.totalDuration;
              totalUptime += data.uptime;
              totalApplications += data.applications;
            }
          }

          // Pre-calculate commonly used values
          const avgTotalDuration = totalDuration / targetCount;
          const avgUptime = totalUptime / targetCount;
          const avgUptimePercentage = (avgTotalDuration / fightDuration) * 100;

          return {
            abilityGameID: baseData.abilityGameID,
            abilityName: baseData.abilityName,
            icon: baseData.icon,
            isDebuff: baseData.isDebuff,
            hostilityType: baseData.hostilityType,
            uniqueKey: baseData.uniqueKey,
            totalDuration: avgTotalDuration,
            uptime: avgUptime,
            uptimePercentage: avgUptimePercentage,
            applications: totalApplications, // Sum applications across targets
          };
        })
        .filter((item) => item !== null) as BuffUptime[]; // Remove null entries and assert type
    }

    // For larger datasets, use simpler processing to reduce computational load
    const results: BuffUptime[] = [];

    for (const uptimeData of statusEffectUptimesData) {
      const { targetData, ...baseData } = uptimeData;

      // Determine which targets to include
      let targetsToInclude: number[];
      if (shouldIncludeAllTargets) {
        // Include all targets that have data - cache Object.keys conversion
        targetsToInclude = Object.keys(targetData).map(Number);
      } else {
        // Include only selected targets that have data
        targetsToInclude = selectedTargetsArray?.filter((id) => targetData[id] !== undefined) || [];
      }

      if (targetsToInclude.length === 0) {
        continue; // Skip this status effect
      }

      // Calculate aggregated values more efficiently
      let totalDuration = 0;
      let totalUptime = 0;
      let totalApplications = 0;
      const targetCount = targetsToInclude.length;

      // Use a single loop for all calculations
      for (let j = 0; j < targetCount; j++) {
        const data = targetData[targetsToInclude[j]];
        if (data) {
          totalDuration += data.totalDuration;
          totalUptime += data.uptime;
          totalApplications += data.applications;
        }
      }

      // Pre-calculate commonly used values
      const avgTotalDuration = totalDuration / targetCount;
      const avgUptime = totalUptime / targetCount;
      const avgUptimePercentage = (avgTotalDuration / fightDuration) * 100;

      results.push({
        abilityGameID: baseData.abilityGameID,
        abilityName: baseData.abilityName,
        icon: baseData.icon,
        isDebuff: baseData.isDebuff,
        hostilityType: baseData.hostilityType,
        uniqueKey: baseData.uniqueKey,
        totalDuration: avgTotalDuration,
        uptime: avgUptime,
        uptimePercentage: avgUptimePercentage,
        applications: totalApplications, // Sum applications across targets
      });
    }

    return results;
  }, [statusEffectUptimesData, selectedTargetIds, fight.startTime, fight.endTime]);

  // Enhance the results with ability names from master data
  const enhancedStatusEffectUptimes = React.useMemo(() => {
    if (!filteredStatusEffectUptimes || !reportMasterData?.abilitiesById) {
      return filteredStatusEffectUptimes;
    }

    return filteredStatusEffectUptimes
      .filter((uptime): uptime is NonNullable<typeof uptime> => uptime !== null)
      .map((uptime) => {
        const ability = reportMasterData.abilitiesById[uptime.abilityGameID as string];
        return {
          ...uptime,
          uniqueKey: `${uptime.abilityGameID}`,
          abilityName: ability?.name || uptime.abilityName,
          icon: ability?.icon || uptime.icon,
        } as BuffUptime;
      });
  }, [filteredStatusEffectUptimes, reportMasterData?.abilitiesById]);

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
