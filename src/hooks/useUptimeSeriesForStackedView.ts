import React from 'react';

import {
  buildUptimeTimelineSeries,
  type UptimeTimelineSeries,
} from '../features/report_details/insights/utils/buildUptimeTimeline';
import { computeBuffUptimes } from '../utils/buffUptimeCalculator';
import type { FightFragment } from '../graphql/gql/graphql';

import { useBuffLookupTask } from './workerTasks/useBuffLookupTask';
import { useReportMasterData } from './index';

const IMPORTANT_BUFF_ABILITIES = new Set([
  61536, 61665, 61694, 61697, 61693, 61662, 40225, 92503, 62636, 44731,
  76667, 92505, 36957, 76672, 148801, 46539, 147417, 46528, 62795, 147418,
  148798, 148799, 148800, 61898, 61899, 45227, 45228, 45229, 145975,
  145976, 145977, 46537, 46538, 46536,
]);

export function useUptimeSeriesForStackedView(
  fight: FightFragment | null | undefined,
): { uptimeSeries: UptimeTimelineSeries[]; isLoading: boolean } {
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask();
  const { reportMasterData } = useReportMasterData();

  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  const friendlyPlayerIds = React.useMemo(() => {
    if (!fight?.friendlyPlayers) return new Set<number>();
    return new Set(fight.friendlyPlayers.filter((id): id is number => id !== null));
  }, [fight?.friendlyPlayers]);

  const uptimeSeries = React.useMemo(() => {
    if (!buffLookupData || friendlyPlayerIds.size === 0 || !fightDuration || !fightStartTime || !fightEndTime) {
      return [];
    }

    const buffAbilityIds = new Set<number>();
    if (reportMasterData?.abilitiesById) {
      Object.entries(buffLookupData.buffIntervals).forEach(([idStr]) => {
        const id = parseInt(idStr, 10);
        const ability = reportMasterData.abilitiesById[id];
        if (ability?.type === '2' || IMPORTANT_BUFF_ABILITIES.has(id)) {
          buffAbilityIds.add(id);
        }
      });
    }
    if (buffAbilityIds.size === 0) {
      Object.keys(buffLookupData.buffIntervals).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        if (IMPORTANT_BUFF_ABILITIES.has(id)) {
          buffAbilityIds.add(id);
        }
      });
    }

    const uptimes = computeBuffUptimes(buffLookupData, {
      abilityIds: buffAbilityIds,
      targetIds: friendlyPlayerIds,
      sourceIds: undefined,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: false,
      hostilityType: 0 as const,
    });

    const importantUptimes = uptimes.filter((buff) => {
      const id = parseInt(buff.abilityGameID, 10);
      return IMPORTANT_BUFF_ABILITIES.has(id);
    });

    return buildUptimeTimelineSeries({
      uptimes: importantUptimes,
      lookup: buffLookupData,
      fightStartTime,
      fightEndTime,
      targetFilter: friendlyPlayerIds.size > 0 ? friendlyPlayerIds : null,
    });
  }, [
    buffLookupData,
    reportMasterData?.abilitiesById,
    friendlyPlayerIds,
    fightStartTime,
    fightEndTime,
    fightDuration,
  ]);

  return { uptimeSeries, isLoading: isBuffLookupLoading };
}
