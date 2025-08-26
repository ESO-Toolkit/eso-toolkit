import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities } from '../../../types/abilities';

import { BuffUptime } from './BuffUptimeProgressBar';
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
  KnownAbilities.ENLIVENING_OVERFLOW,
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
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // State for toggling between important buffs only and all buffs
  const [showAllBuffs, setShowAllBuffs] = React.useState(false);

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate buff uptimes for selected target
  const allBuffUptimes = React.useMemo(() => {
    if (!friendlyBuffsLookup || !reportMasterData?.abilitiesById || !fight?.friendlyPlayers) {
      return [];
    }

    const uptimes: BuffUptime[] = [];
    const friendlyPlayerIds = new Set(
      fight.friendlyPlayers.filter((id): id is number => id !== null)
    );
    const friendlyPlayerCount = friendlyPlayerIds.size;

    if (friendlyPlayerCount === 0) {
      return [];
    }

    // Iterate through all buff intervals in the lookup
    friendlyBuffsLookup.buffIntervals.forEach((intervals, abilityGameID) => {
      const ability = reportMasterData.abilitiesById[abilityGameID];

      // Only include buffs (type === '2')
      if (ability?.type !== '2') {
        return;
      }

      // Group intervals by target player
      const intervalsByPlayer = new Map<number, typeof intervals>();
      intervals.forEach((interval) => {
        if (friendlyPlayerIds.has(interval.targetID)) {
          if (!intervalsByPlayer.has(interval.targetID)) {
            intervalsByPlayer.set(interval.targetID, []);
          }
          const playerIntervals = intervalsByPlayer.get(interval.targetID);
          if (playerIntervals) {
            playerIntervals.push(interval);
          }
        }
      });

      if (intervalsByPlayer.size === 0) {
        return;
      }

      // Calculate total duration and applications per player, then average
      let totalDurationSum = 0;
      let totalApplicationsSum = 0;
      let playersWithBuff = 0;

      intervalsByPlayer.forEach((playerIntervals) => {
        let playerTotalDuration = 0;
        const playerApplications = playerIntervals.length;

        playerIntervals.forEach((interval) => {
          playerTotalDuration += interval.end - interval.start;
        });

        if (playerTotalDuration > 0) {
          totalDurationSum += playerTotalDuration;
          totalApplicationsSum += playerApplications;
          playersWithBuff++;
        }
      });

      if (playersWithBuff > 0) {
        // Average the duration and applications across players with the buff
        const averageDuration = totalDurationSum / playersWithBuff;
        const averageApplications = Math.round(totalApplicationsSum / playersWithBuff);

        const abilityName = ability?.name || `Unknown (${abilityGameID})`;
        const uptimePercentage = (averageDuration / fightDuration) * 100;

        uptimes.push({
          abilityGameID: String(abilityGameID),
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDuration: averageDuration,
          uptime: averageDuration / 1000, // Convert to seconds
          uptimePercentage,
          applications: averageApplications,
        });
      }
    });

    // Sort by uptime percentage descending
    return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [friendlyBuffsLookup, fightDuration, reportMasterData?.abilitiesById, fight?.friendlyPlayers]);

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
    />
  );
};
