import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment, HostilityType } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';

import { StatusEffectUptimesView } from './StatusEffectUptimesView';

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_BUFF_ABILITIES = Object.freeze(
  new Set([
    KnownAbilities.OVERCHARGED,
    KnownAbilities.SUNDERED,
    KnownAbilities.CONCUSSION,
    KnownAbilities.CHILL,
    KnownAbilities.DISEASED,
  ])
);

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_DEBUFF_ABILITIES = Object.freeze(
  new Set([KnownAbilities.BURNING, KnownAbilities.POISONED, KnownAbilities.HEMMORRHAGING])
);

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();
  const realTargetIds = useSelectedTargetIds();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate status effect uptimes using the utility function
  const statusEffectUptimes = React.useMemo(() => {
    if (!fightDuration || !fightStartTime || !fightEndTime) {
      return [];
    }

    const debuffUptimes = computeBuffUptimes(debuffsLookup, {
      abilityIds: STATUS_EFFECT_DEBUFF_ABILITIES,
      targetIds: realTargetIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: true,
      hostilityType: HostilityType.Friendlies,
    });

    const buffUptimes = computeBuffUptimes(friendlyBuffsLookup, {
      abilityIds: STATUS_EFFECT_BUFF_ABILITIES,
      targetIds: realTargetIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: false,
      hostilityType: HostilityType.Enemies,
    });

    // Combine and sort all uptimes
    return [...debuffUptimes, ...buffUptimes].sort(
      (a, b) => b.uptimePercentage - a.uptimePercentage
    );
  }, [
    debuffsLookup,
    friendlyBuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
    realTargetIds,
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading || isFriendlyBuffEventsLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={undefined}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
      />
    );
  }

  return (
    <StatusEffectUptimesView
      selectedTargetId={selectedTargetId}
      statusEffectUptimes={statusEffectUptimes}
      isLoading={false}
      reportId={reportId}
      fightId={fightId}
    />
  );
};
