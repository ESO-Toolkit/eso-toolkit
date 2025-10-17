import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities } from '../../../types/abilities';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';

import { BuffUptimesView } from './BuffUptimesView';

interface BuffUptimesPanelProps {
  fight: FightFragment;
}

// Define the specific status effect debuff abilities to track
const IMPORTANT_BUFF_ABILITIES = new Set([
  KnownAbilities.MINOR_SAVAGERY,
  KnownAbilities.MAJOR_SAVAGERY,
  KnownAbilities.MINOR_SORCERY,
  KnownAbilities.PEARLESCENT_WARD,
  KnownAbilities.LUCENT_ECHOES,
  KnownAbilities.LUCENT_ECHOES_GROUP,
  KnownAbilities.MAJOR_COURAGE,

  KnownAbilities.MAJOR_RESOLVE,
  KnownAbilities.ENLIVENING_OVERFLOW_BUFF,
  KnownAbilities.MINOR_BERSERK,
  KnownAbilities.MINOR_COURAGE,
  KnownAbilities.EMPOWER,

  KnownAbilities.MINOR_HEROISM,
  KnownAbilities.POWERFUL_ASSAULT,
  KnownAbilities.MINOR_BRUTALITY,
  KnownAbilities.MINOR_FORCE,
  KnownAbilities.MAJOR_SLAYER,

  KnownAbilities.GRAND_REJUVENATION,
  KnownAbilities.MAJOR_BERSERK,
]);

export const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight }) => {
  const { reportId, fightId } = useSelectedReportAndFight();
  const { buffLookupData: friendlyBuffsLookup, isBuffLookupLoading: isFriendlyBuffEventsLoading } =
    useBuffLookupTask();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // State for toggling between important buffs only and all buffs
  const [showAllBuffs, setShowAllBuffs] = React.useState(false);

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate buff uptimes for friendly players using the utility function
  const allBuffUptimes = React.useMemo(() => {
    if (!friendlyBuffsLookup || !fight?.friendlyPlayers || !fightDuration) {
      return [];
    }

    const friendlyPlayerIds = new Set(
      fight.friendlyPlayers.filter((id): id is number => id !== null),
    );

    if (friendlyPlayerIds.size === 0) {
      return [];
    }

    // Get all buff ability IDs from the lookup
    const buffAbilityIds = new Set<number>();

    // If we have master data, use it to filter by type
    if (reportMasterData?.abilitiesById) {
      Object.entries(friendlyBuffsLookup.buffIntervals).forEach(
        ([abilityGameIDStr, _intervals]) => {
          const abilityGameID = parseInt(abilityGameIDStr, 10);
          const ability = reportMasterData.abilitiesById[abilityGameID];

          // Be more permissive: include if it's type '2' OR if we don't have type data but it's in our known important buffs
          if (
            ability?.type === '2' ||
            (!ability?.type && IMPORTANT_BUFF_ABILITIES.has(abilityGameID))
          ) {
            buffAbilityIds.add(abilityGameID);
          }
        },
      );

      // If no buffs found with type filtering, include all important buffs that exist in the data
      if (buffAbilityIds.size === 0) {
        Object.keys(friendlyBuffsLookup.buffIntervals).forEach((abilityGameIDStr) => {
          const abilityGameID = parseInt(abilityGameIDStr, 10);
          if (IMPORTANT_BUFF_ABILITIES.has(abilityGameID)) {
            buffAbilityIds.add(abilityGameID);
          }
        });
      }
    } else {
      // Without master data, just include all abilities that are in our important list
      Object.keys(friendlyBuffsLookup.buffIntervals).forEach((abilityGameIDStr) => {
        const abilityGameID = parseInt(abilityGameIDStr, 10);
        if (IMPORTANT_BUFF_ABILITIES.has(abilityGameID)) {
          buffAbilityIds.add(abilityGameID);
        }
      });
    }

    return computeBuffUptimes(friendlyBuffsLookup, {
      abilityIds: buffAbilityIds,
      targetIds: friendlyPlayerIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: false,
      hostilityType: 0,
    });
  }, [
    friendlyBuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
    fight?.friendlyPlayers,
  ]);

  // Filter buff uptimes based on showAllBuffs state
  const buffUptimes = React.useMemo(() => {
    if (showAllBuffs) {
      return allBuffUptimes;
    }

    // Filter to show only important buffs
    return allBuffUptimes.filter((buff) => {
      const abilityId = parseInt(buff.abilityGameID, 10);
      return IMPORTANT_BUFF_ABILITIES.has(abilityId);
    });
  }, [allBuffUptimes, showAllBuffs]);

  // Enhanced loading check: ensure ALL required data is available and processing is complete
  const isDataLoading = React.useMemo(() => {
    // Still loading if any of the core data sources are loading
    if (isMasterDataLoading || isFriendlyBuffEventsLoading) {
      return true;
    }

    // Still loading if buff lookup task hasn't completed yet
    if (!friendlyBuffsLookup) {
      return true;
    }

    // Still loading if fight data is not available
    if (!fight?.friendlyPlayers || !fightDuration) {
      return true;
    }

    // Don't require reportMasterData to be available - we can show data without ability names
    // This allows the panel to work even if master data is slow to load

    // Data is ready
    return false;
  }, [
    isMasterDataLoading,
    isFriendlyBuffEventsLoading,
    friendlyBuffsLookup,
    fight?.friendlyPlayers,
    fightDuration,
  ]);

  if (isDataLoading) {
    return (
      <BuffUptimesView
        buffUptimes={[]}
        isLoading={true}
        showAllBuffs={showAllBuffs}
        onToggleShowAll={setShowAllBuffs}
        reportId={reportId}
        fightId={fightId}
        selectedTargetId={null}
      />
    );
  }

  return (
    <BuffUptimesView
      buffUptimes={buffUptimes}
      isLoading={false}
      showAllBuffs={showAllBuffs}
      onToggleShowAll={setShowAllBuffs}
      reportId={reportId}
      fightId={fightId}
      selectedTargetId={null}
    />
  );
};
