import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useWorkerDebuffLookup } from '../../../hooks/events/useDebuffEvents';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
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
  KnownAbilities.MINOR_BREACH,
  KnownAbilities.RUNIC_SUNDER_DEBUFF,
  KnownAbilities.MAJOR_BREACH,
  KnownAbilities.ENGULFING_FLAMES_BUFF,
  KnownAbilities.MINOR_VULNERABILITY,
  KnownAbilities.MINOR_BRITTLE,

  KnownAbilities.TOUCH_OF_ZEN,
  KnownAbilities.MINOR_LIFESTEAL,
  KnownAbilities.CRUSHER,
  KnownAbilities.MAJOR_COWARDICE,
  KnownAbilities.MAJOR_VULNERABILITY,
  KnownAbilities.OFF_BALANCE,
]);

export const DebuffUptimesPanel: React.FC<DebuffUptimesPanelProps> = ({ fight }) => {
  const { reportId, fightId } = useSelectedReportAndFight();
  const { result: debuffsLookup, isLoading: isDebuffEventsLoading } = useWorkerDebuffLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

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

    return computeBuffUptimes(debuffsLookup, {
      abilityIds: debuffAbilityIds,
      targetIds: realTargetIds,
      fightStartTime,
      fightEndTime,
      fightDuration,
      abilitiesById: reportMasterData?.abilitiesById || {},
      isDebuff: true,
      hostilityType: 1,
    });
  }, [
    debuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    realTargetIds,
    reportMasterData?.abilitiesById,
  ]);

  // Filter debuff uptimes based on showAllDebuffs state
  const debuffUptimes = React.useMemo(() => {
    if (showAllDebuffs) {
      return allDebuffUptimes;
    }

    // Filter to show only important debuffs
    return allDebuffUptimes.filter((debuff) => {
      const abilityId = parseInt(debuff.abilityGameID, 10);
      return IMPORTANT_DEBUFF_ABILITIES.has(abilityId);
    });
  }, [allDebuffUptimes, showAllDebuffs]);

  if (isMasterDataLoading || isDebuffEventsLoading) {
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
