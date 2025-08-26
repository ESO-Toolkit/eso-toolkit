import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useHostileBuffEvents, useReportMasterData } from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/useDebuffEvents';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { BuffEvent, DebuffEvent } from '../../../types/combatlogEvents';

import { StatusEffectUptime, StatusEffectUptimesView } from './StatusEffectUptimesView';

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_BUFF_ABILITIES = new Set([
  KnownAbilities.OVERCHARGED,
  KnownAbilities.SUNDERED,
  KnownAbilities.CONCUSSION,
  KnownAbilities.CHILL,
  KnownAbilities.DISEASED,
]);

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_DEBUFF_ABILITIES = new Set([
  KnownAbilities.BURNING,
  KnownAbilities.POISONED,
  KnownAbilities.HEMMORRHAGING,
]);

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

/**
 * Calculate uptime and application count for a specific debuff ability
 * @param events - Sorted array of debuff events for a single ability
 * @param fightEndTime - End time of the fight (for handling active debuffs at fight end)
 * @returns Object with totalDuration (ms) and applications count
 */
function calculateDebuffUptime(
  events: (DebuffEvent | BuffEvent)[],
  fightEndTime: number | undefined
): { totalDuration: number; applications: number } {
  let totalDuration = 0;
  let applications = 0;
  let debuffStartTime: number | null = null;
  let activeApplications = 0; // Track how many applications are currently active

  events.forEach((event) => {
    switch (event.type) {
      case 'applydebuff':
      case 'applybuff':
        applications++;
        activeApplications++;

        // If this is the first active application, start timing
        if (debuffStartTime === null) {
          debuffStartTime = event.timestamp;
        }
        break;

      case 'removedebuff':
      case 'removebuff':
        activeApplications--;

        // If this was the last active application, stop timing
        if (activeApplications <= 0 && debuffStartTime !== null) {
          totalDuration += event.timestamp - debuffStartTime;
          debuffStartTime = null;
          activeApplications = 0; // Ensure it doesn't go negative
        }
        break;
    }
  });

  // If debuff is still active at fight end, add remaining duration
  if (debuffStartTime !== null && fightEndTime) {
    totalDuration += fightEndTime - debuffStartTime;
  }

  return { totalDuration, applications };
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate status effect uptimes
  const statusEffectUptimes = React.useMemo(() => {
    if (!fightDuration || !debuffEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    // Filter debuff events for the target(s) and only include our specific status effects
    const targetDebuffEvents = debuffEvents.filter(
      (event: DebuffEvent) =>
        (!selectedTargetId
          ? !event.targetIsFriendly
          : selectedTargetId === String(event.targetID)) &&
        STATUS_EFFECT_DEBUFF_ABILITIES.has(event.abilityGameID)
    );

    const targetBuffEvents = hostileBuffEvents.filter(
      (event: BuffEvent) =>
        (!selectedTargetId
          ? !event.targetIsFriendly
          : selectedTargetId === String(event.targetID)) &&
        STATUS_EFFECT_BUFF_ABILITIES.has(event.abilityGameID)
    );

    // Group events by ability
    const eventsByAbility = new Map<number, (BuffEvent | DebuffEvent)[]>();

    targetDebuffEvents.forEach((event) => {
      const abilityId = event.abilityGameID;
      if (!eventsByAbility.has(abilityId)) {
        eventsByAbility.set(abilityId, []);
      }
      const events = eventsByAbility.get(abilityId);
      if (events) {
        events.push(event);
      }
    });

    targetBuffEvents.forEach((event) => {
      const abilityId = event.abilityGameID;
      if (!eventsByAbility.has(abilityId)) {
        eventsByAbility.set(abilityId, []);
      }
      const events = eventsByAbility.get(abilityId);
      if (events) {
        events.push(event);
      }
    });

    const uptimes: StatusEffectUptime[] = [];

    eventsByAbility.forEach((events, abilityGameID) => {
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

      // Use helper function to calculate uptime and applications
      const { totalDuration, applications } = calculateDebuffUptime(sortedEvents, fightEndTime);

      const ability = reportMasterData.abilitiesById[abilityGameID];
      const abilityName = ability?.name || `Unknown (${abilityGameID})`;
      const uptimePercentage = (totalDuration / fightDuration) * 100;

      if (totalDuration > 0) {
        uptimes.push({
          abilityGameID,
          abilityName,
          totalDuration,
          uptime: totalDuration / 1000, // Convert to seconds
          uptimePercentage,
          applications,
          isDebuff: STATUS_EFFECT_DEBUFF_ABILITIES.has(abilityGameID),
        });
      }
    });

    // Sort by uptime percentage descending
    return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [
    selectedTargetId,
    debuffEvents,
    fightDuration,
    fightEndTime,
    reportMasterData?.abilitiesById,
    hostileBuffEvents,
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading || isHostileBuffEventsLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={[]}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
        showingBossTargets={!selectedTargetId}
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
      showingBossTargets={!selectedTargetId}
    />
  );
};
