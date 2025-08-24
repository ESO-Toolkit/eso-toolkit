import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useDebuffEvents } from '../../../hooks/useDebuffEvents';
import { KnownAbilities } from '../../../types/abilities';
import { DebuffEvent } from '../../../types/combatlogEvents';

import StatusEffectUptimesView from './StatusEffectUptimesView';

// Define the specific status effect abilities to track
const STATUS_EFFECT_ABILITIES = new Set([
  KnownAbilities.BURNING,
  KnownAbilities.POISONED,
  KnownAbilities.OVERCHARGED,
  KnownAbilities.SUNDERED,
  KnownAbilities.CONCUSSION,
  KnownAbilities.CHILL,
  KnownAbilities.HEMMORRHAGING,
  KnownAbilities.DISEASED,
]);

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

interface StatusEffectUptime {
  abilityGameID: number;
  abilityName: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({
  fight,
  selectedTargetId,
}) => {
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate status effect uptimes
  const statusEffectUptimes = React.useMemo(() => {
    if (!selectedTargetId || !fightDuration || !debuffEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    const targetId = Number(selectedTargetId);

    // Filter debuff events for the selected target and only include our specific status effects
    const targetDebuffEvents = debuffEvents.filter(
      (event: DebuffEvent) =>
        event.targetID === targetId && STATUS_EFFECT_ABILITIES.has(event.abilityGameID)
    );

    if (targetDebuffEvents.length === 0) {
      return [];
    }

    // Group events by ability
    const eventsByAbility = new Map<number, DebuffEvent[]>();

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

    const uptimes: StatusEffectUptime[] = [];

    eventsByAbility.forEach((events, abilityGameID) => {
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

      let totalDuration = 0;
      let applications = 0;
      let currentStartTime: number | null = null;

      sortedEvents.forEach((event) => {
        if (event.type === 'applydebuff') {
          if (currentStartTime === null) {
            currentStartTime = event.timestamp;
            applications++;
          }
        } else if (event.type === 'removedebuff') {
          if (currentStartTime !== null) {
            totalDuration += event.timestamp - currentStartTime;
            currentStartTime = null;
          }
        }
      });

      // If still active at fight end, add remaining duration
      if (currentStartTime !== null && fightEndTime) {
        totalDuration += fightEndTime - currentStartTime;
      }

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
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId || null}
        statusEffectUptimes={[]}
        isLoading={true}
      />
    );
  }

  return (
    <StatusEffectUptimesView
      selectedTargetId={selectedTargetId || null}
      statusEffectUptimes={statusEffectUptimes}
      isLoading={false}
    />
  );
};
export default StatusEffectUptimesPanel;
