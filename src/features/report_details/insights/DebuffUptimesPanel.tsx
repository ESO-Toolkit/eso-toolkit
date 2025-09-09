import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useWorkerDebuffLookup } from '../../../hooks/events/useDebuffEvents';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { useTouchOfZenStacksTask } from '../../../hooks/workerTasks/useTouchOfZenStacksTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';

import { DebuffUptimesView } from './DebuffUptimesView';

interface DebuffUptimesPanelProps {
  fight: FightFragment;
}

// Define the specific status effect debuff abilities to track
const IMPORTANT_DEBUFF_ABILITIES = new Set([
  KnownAbilities.CRUSHER,
  KnownAbilities.ENGULFING_FLAMES_BUFF,
  KnownAbilities.MAJOR_BREACH,
  KnownAbilities.MAJOR_COWARDICE,
  KnownAbilities.MAJOR_VULNERABILITY,
  KnownAbilities.MINOR_BREACH,
  KnownAbilities.MINOR_BRITTLE,
  KnownAbilities.MINOR_LIFESTEAL,
  KnownAbilities.MINOR_VULNERABILITY,
  KnownAbilities.OFF_BALANCE,
  KnownAbilities.RUNIC_SUNDER_DEBUFF,
  KnownAbilities.STAGGER,
  KnownAbilities.TOUCH_OF_ZEN,
]);

export const DebuffUptimesPanel: React.FC<DebuffUptimesPanelProps> = ({ fight }) => {
  const { reportId, fightId } = useSelectedReportAndFight();
  const { result: debuffsLookup, isLoading: isDebuffEventsLoading } = useWorkerDebuffLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // Touch of Z'en stacks data
  const { touchOfZenStacksData, allDotAbilityIds, isTouchOfZenStacksLoading } =
    useTouchOfZenStacksTask();

  // Note: allDotAbilityIds contains the unique DOT ability IDs used for Touch of Z'en calculation

  const realTargetIds = useSelectedTargetIds();

  // State for toggling between important debuffs only and all debuffs
  const [showAllDebuffs, setShowAllDebuffs] = React.useState(false);

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate debuff uptimes for selected targets using the utility function
  const allDebuffUptimes = React.useMemo(() => {
    if (!debuffsLookup || !fightDuration || !fightStartTime || !fightEndTime) {
      return [];
    }

    // Get all debuff ability IDs from the lookup
    const debuffAbilityIds = new Set<number>();
    Object.keys(debuffsLookup.buffIntervals).forEach((abilityGameIDStr) => {
      const abilityGameID = parseInt(abilityGameIDStr, 10);
      debuffAbilityIds.add(abilityGameID);
    });

    // Calculate regular debuff uptimes
    const regularDebuffUptimes = computeBuffUptimes(debuffsLookup, {
      abilityIds: debuffAbilityIds,
      targetIds: realTargetIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: true,
      hostilityType: 1,
    }).map((debuff) => ({
      ...debuff,
      uniqueKey: `debuff_${debuff.abilityGameID}`, // Add unique key for regular debuffs
    }));

    // Group Touch of Z'en stacks and provide all stack data with default to stack 5
    const touchOfZenStackUptimes = touchOfZenStacksData
      ? (() => {
          if (touchOfZenStacksData.length === 0) return [];

          // Sort stacks by level and prepare all stack data
          const sortedStacks = [...touchOfZenStacksData].sort(
            (a, b) => a.stackLevel - b.stackLevel,
          );

          // Use stack 5 as the default display (highest stack for initial display)
          const defaultStack =
            sortedStacks.find((stack) => stack.stackLevel === 5) ||
            sortedStacks[sortedStacks.length - 1];

          // Look up the Touch of Z'en ability for icon information
          const touchOfZenAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

          // Create allStacksData for the interactive component
          const allStacksData = sortedStacks.map((stack) => ({
            stackLevel: stack.stackLevel,
            totalDuration: stack.totalDuration,
            uptime: stack.uptime,
            uptimePercentage: stack.uptimePercentage,
            applications: stack.applications,
          }));

          return [
            {
              abilityGameID: defaultStack.abilityGameID,
              abilityName: "Touch of Z'en", // Clean name without stack info
              icon: touchOfZenAbility?.icon ? String(touchOfZenAbility.icon) : defaultStack.icon,
              totalDuration: defaultStack.totalDuration,
              uptime: defaultStack.uptime,
              uptimePercentage: defaultStack.uptimePercentage,
              applications: defaultStack.applications,
              isDebuff: defaultStack.isDebuff,
              hostilityType: defaultStack.hostilityType,
              uniqueKey: `touch_of_zen_grouped`, // Single unique key for the grouped entry
              dotAbilityIds: allDotAbilityIds || [], // Include the DOT ability IDs for filtering
              stackLevel: defaultStack.stackLevel,
              maxStacks: 5, // Touch of Z'en has 5 stacks maximum
              allStacksData, // Provide all stack data for interactive switching
            },
          ];
        })()
      : [];

    // Combine regular debuffs with Touch of Z'en stacks and sort by uptime percentage (descending)
    const combinedDebuffs = [...regularDebuffUptimes, ...touchOfZenStackUptimes];
    return combinedDebuffs.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [
    debuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    realTargetIds,
    reportMasterData?.abilitiesById,
    touchOfZenStacksData,
    allDotAbilityIds,
  ]);

  // Filter debuff uptimes based on showAllDebuffs state
  const debuffUptimes = React.useMemo(() => {
    if (showAllDebuffs) {
      return allDebuffUptimes;
    }

    // Filter to show only important debuffs
    return allDebuffUptimes.filter((debuff) => {
      // Convert ability ID to number for comparison with enum values
      const abilityIdNum = parseInt(debuff.abilityGameID, 10);

      // Check if this ability ID is in our important list
      return IMPORTANT_DEBUFF_ABILITIES.has(abilityIdNum as KnownAbilities);
    });
  }, [allDebuffUptimes, showAllDebuffs]);

  // Enhanced loading check: ensure ALL required data is available and processing is complete
  const isDataLoading = React.useMemo(() => {
    // Still loading if any of the core data sources are loading
    if (isMasterDataLoading || isDebuffEventsLoading || isTouchOfZenStacksLoading) {
      return true;
    }

    // Still loading if we don't have master data (though it's optional for debuffs)
    // Still loading if debuff lookup task hasn't completed yet
    if (!debuffsLookup) {
      return true;
    }

    // Still loading if fight data is not available
    if (!fightDuration || !fightStartTime || !fightEndTime) {
      return true;
    }

    // Still loading if target data is not available
    if (realTargetIds.size === 0) {
      return true;
    }

    // Data is ready
    return false;
  }, [
    isMasterDataLoading,
    isDebuffEventsLoading,
    isTouchOfZenStacksLoading,
    debuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    realTargetIds,
  ]);

  if (isDataLoading) {
    return (
      <DebuffUptimesView
        selectedTargetId={selectedTargetId}
        debuffUptimes={[]}
        isLoading={true}
        showAllDebuffs={showAllDebuffs}
        onToggleShowAll={setShowAllDebuffs}
        reportId={reportId}
        fightId={fightId}
      />
    );
  }

  return (
    <DebuffUptimesView
      selectedTargetId={selectedTargetId}
      debuffUptimes={debuffUptimes}
      isLoading={false}
      showAllDebuffs={showAllDebuffs}
      onToggleShowAll={setShowAllDebuffs}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
