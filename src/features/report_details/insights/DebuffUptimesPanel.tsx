<<<<<<< HEAD
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDebuffEvents, useReportMasterData } from '../../../hooks';
import { DebuffEvent } from '../../../types/combatlogEvents';

import { DebuffUptimesView } from './DebuffUptimesView';

interface DebuffUptimesPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

interface DebuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

export const DebuffUptimesPanel: React.FC<DebuffUptimesPanelProps> = ({
  fight,
  selectedTargetId,
}) => {
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate debuff uptimes for selected target
  const debuffUptimes = React.useMemo(() => {
    if (!selectedTargetId || !fightDuration || !debuffEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    const targetId = Number(selectedTargetId);

    // Filter debuff events for the selected target, focusing on debuffs applied by friendlies
    const targetDebuffEvents = debuffEvents.filter((event: DebuffEvent) => {
      const eventTargetId = event.targetID;

      // Only include events where:
      // 1. The target is the selected target
      // 2. The source is friendly (debuff applied by friendly player)
      return eventTargetId === targetId && event.sourceIsFriendly === true;
    });

    if (targetDebuffEvents.length === 0) {
      return [];
    }

    // Group events by ability
    const eventsByAbility = new Map<string, DebuffEvent[]>();

    targetDebuffEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);
      const ability = reportMasterData.abilitiesById[event.abilityGameID];

      // Only include debuffs (type === '3')
      if (ability?.type !== '3') {
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

    const uptimes: DebuffUptime[] = [];

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
  }, [
    selectedTargetId,
    debuffEvents,
    fightDuration,
    fightEndTime,
    reportMasterData?.abilitiesById,
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading) {
    return (
      <DebuffUptimesView
        selectedTargetId={selectedTargetId || null}
        debuffUptimes={[]}
        isLoading={true}
      />
    );
  }

  return (
    <DebuffUptimesView
      selectedTargetId={selectedTargetId || null}
      debuffUptimes={debuffUptimes}
      isLoading={false}
    />
  );
};
=======
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDebuffEvents, useReportMasterData } from '../../../hooks';
import { DebuffEvent } from '../../../types/combatlogEvents';

import DebuffUptimesView from './DebuffUptimesView';

interface DebuffUptimesPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

interface DebuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

const DebuffUptimesPanel: React.FC<DebuffUptimesPanelProps> = ({ fight, selectedTargetId }) => {
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate debuff uptimes for selected target
  const debuffUptimes = React.useMemo(() => {
    if (!selectedTargetId || !fightDuration || !debuffEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    const targetId = Number(selectedTargetId);

    // Filter debuff events for the selected target, focusing on debuffs applied by friendlies
    const targetDebuffEvents = debuffEvents.filter((event: DebuffEvent) => {
      const eventTargetId = event.targetID;

      // Only include events where:
      // 1. The target is the selected target
      // 2. The source is friendly (debuff applied by friendly player)
      return eventTargetId === targetId && event.sourceIsFriendly === true;
    });

    if (targetDebuffEvents.length === 0) {
      return [];
    }

    // Group events by ability
    const eventsByAbility = new Map<string, DebuffEvent[]>();

    targetDebuffEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);
      const ability = reportMasterData.abilitiesById[event.abilityGameID];

      // Only include debuffs (type === '3')
      if (ability?.type !== '3') {
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

    const uptimes: DebuffUptime[] = [];

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
  }, [
    selectedTargetId,
    debuffEvents,
    fightDuration,
    fightEndTime,
    reportMasterData?.abilitiesById,
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading) {
    return (
      <DebuffUptimesView
        selectedTargetId={selectedTargetId || null}
        debuffUptimes={[]}
        isLoading={true}
      />
    );
  }

  return (
    <DebuffUptimesView
      selectedTargetId={selectedTargetId || null}
      debuffUptimes={debuffUptimes}
      isLoading={false}
    />
  );
};

export default DebuffUptimesPanel;
>>>>>>> pr-21
