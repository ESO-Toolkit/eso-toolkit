import React from 'react';

import { FightFragment } from '../../../graphql/generated';
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
    if (
      !friendlyBuffsLookup ||
      !reportMasterData?.abilitiesById ||
      !fight?.friendlyPlayers ||
      !fightDuration
    ) {
      return [];
    }

    const friendlyPlayerIds = new Set(
      fight.friendlyPlayers.filter((id): id is number => id !== null)
    );

    if (friendlyPlayerIds.size === 0) {
      return [];
    }

    // Get all buff ability IDs from the lookup that are type '2' (buffs)
    const buffAbilityIds = new Set<number>();
    Object.entries(friendlyBuffsLookup.buffIntervals).forEach(([abilityGameIDStr, intervals]) => {
      const abilityGameID = parseInt(abilityGameIDStr, 10);
      const ability = reportMasterData.abilitiesById[abilityGameID];
      // Only include buffs (type === '2')
      if (ability?.type === '2') {
        buffAbilityIds.add(abilityGameID);
      }
    });

    return computeBuffUptimes(friendlyBuffsLookup, {
      abilityIds: buffAbilityIds,
      targetIds: friendlyPlayerIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData.abilitiesById,
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

  if (isMasterDataLoading || isFriendlyBuffEventsLoading) {
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
