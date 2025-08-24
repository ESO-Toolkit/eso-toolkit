import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useBuffEvents, useReportMasterData } from '../../../hooks';
import { BuffEvent } from '../../../types/combatlogEvents';

import { BuffUptimesView } from './BuffUptimesView';

interface BuffUptimesPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

export const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight, selectedTargetId }) => {
  const { buffEvents, isBuffEventsLoading } = useBuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate buff uptimes for selected target
  const buffUptimes = React.useMemo(() => {
    if (!selectedTargetId || !fightDuration || !buffEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    // Filter buff events for the selected target, focusing on friendly interactions
    const targetBuffEvents = buffEvents.filter((event: BuffEvent) => {
      // Only include events where:
      // 1. The target is the selected target
      // 2. The source is friendly (buff applied by friendly player)
      // 3. The target is friendly (buff applied to friendly player)
      return event.sourceIsFriendly === true && event.targetIsFriendly === true;
    });

    if (targetBuffEvents.length === 0) {
      return [];
    }

    // Group events by ability
    const eventsByAbility = new Map<string, BuffEvent[]>();

    targetBuffEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);
      const ability = reportMasterData.abilitiesById[event.abilityGameID];

      // Only include buffs (type === '2')
      if (ability?.type !== '2') {
        return;
      }

      if (!eventsByAbility.has(abilityId)) {
        eventsByAbility.set(abilityId, []);
      }
      const events = eventsByAbility.get(abilityId);
      if (events) {
        events.push(event);
      }
    });

    const uptimes: BuffUptime[] = [];

    eventsByAbility.forEach((events, abilityGameID) => {
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

      let totalDuration = 0;
      let applications = 0;
      let currentStartTime: number | null = null;

      sortedEvents.forEach((event) => {
        if (event.type === 'applybuff') {
          if (currentStartTime === null) {
            currentStartTime = event.timestamp;
            applications++;
          }
        } else if (event.type === 'removebuff') {
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
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDuration,
          uptime: totalDuration / 1000, // Convert to seconds
          uptimePercentage,
          applications,
        });
      }
    });

    // Sort by uptime percentage descending
    return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [selectedTargetId, buffEvents, fightDuration, fightEndTime, reportMasterData?.abilitiesById]);

  if (isMasterDataLoading || isBuffEventsLoading) {
    return (
      <BuffUptimesView
        selectedTargetId={selectedTargetId || null}
        buffUptimes={[]}
        isLoading={true}
      />
    );
  }

  return (
    <BuffUptimesView
      selectedTargetId={selectedTargetId || null}
      buffUptimes={buffUptimes}
      isLoading={false}
    />
  );
};
