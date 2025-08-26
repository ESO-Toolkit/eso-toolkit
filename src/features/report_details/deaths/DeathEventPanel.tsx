import React from 'react';

import { useDeathEvents, useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { DamageEvent, DeathEvent } from '../../../types/combatlogEvents';

import { DeathEventPanelView } from './DeathEventPanelView';

interface DeathEventPanelProps {
  fight: { startTime?: number; endTime?: number };
}

interface AttackEvent {
  abilityName?: string | null;
  abilityId?: number | null;
  sourceID?: number | null;
  timestamp?: number | null;
  type?: string | null;
  amount?: number | null;
  wasBlocked?: boolean | null;
}

interface DeathInfo {
  playerId: string;
  timestamp: number;
  killingBlow: AttackEvent | null;
  lastAttacks: AttackEvent[];
  stamina: number | null;
  maxStamina: number | null;
  wasBlocking: boolean | null;
}

export const DeathEventPanel: React.FC<DeathEventPanelProps> = ({ fight }) => {
  // Get reportId and fightId from params
  const { reportId, fightId } = useSelectedReportAndFight();

  // Use hooks to get data
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const deathInfos: DeathInfo[] = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    // OPTIMIZED: Use pre-filtered death events instead of filtering all events
    const deathsByPlayer: Record<string, DeathEvent[]> = {};
    deathEvents.forEach((event: DeathEvent) => {
      const targetId = String(event.targetID ?? '');
      if (!deathsByPlayer[targetId]) deathsByPlayer[targetId] = [];
      deathsByPlayer[targetId].push(event);
    });

    // Build a map of damage events per player
    const damageByPlayer: Record<string, DamageEvent[]> = {};
    damageEvents.forEach((event) => {
      const dmgEvent = event;
      const targetId = String(dmgEvent.targetID ?? '');
      if (!damageByPlayer[targetId]) damageByPlayer[targetId] = [];
      damageByPlayer[targetId].push(dmgEvent);
    });

    // Process deaths to create DeathInfo objects
    const deaths: DeathInfo[] = [];

    Object.entries(deathsByPlayer).forEach(([playerId, playerDeaths]) => {
      let lastDeathTimestamp: number | undefined = undefined;

      for (let deathIdx = 0; deathIdx < playerDeaths.length; deathIdx++) {
        const event = playerDeaths[deathIdx];
        const targetActor = reportMasterData.actorsById[playerId];
        if (!targetActor || targetActor.type !== 'Player') continue;
        // Only use damage events for prior attacks
        const priorDamageEvents: AttackEvent[] = [];
        if (damageByPlayer[playerId]) {
          for (let i = 0; i < damageByPlayer[playerId].length; i++) {
            const e = damageByPlayer[playerId][i];
            if (
              e.timestamp < event.timestamp &&
              (lastDeathTimestamp === undefined || e.timestamp > lastDeathTimestamp)
            ) {
              let abilityName: string | null | undefined = undefined;
              if (
                typeof e.abilityGameID === 'number' &&
                reportMasterData.abilitiesById &&
                typeof reportMasterData.abilitiesById[e.abilityGameID]?.name === 'string'
              ) {
                abilityName = reportMasterData.abilitiesById[e.abilityGameID].name;
              }
              priorDamageEvents.push({
                abilityName,
                abilityId: e.abilityGameID,
                sourceID: typeof e.sourceID === 'number' ? e.sourceID : undefined,
                timestamp: e.timestamp,
                type: e.type,
                amount: typeof e.amount === 'number' ? e.amount : undefined,
                wasBlocked: typeof e.blocked === 'number' ? e.blocked === 1 : null,
              });
            }
          }
        }
        const lastAttacks = priorDamageEvents
          .filter((a) => typeof a.amount === 'number' && a.amount > 0)
          .slice(-3);
        // Killing blow from death event's abilityGameID
        let killingBlow: AttackEvent | null = null;
        if (typeof event.abilityGameID === 'number') {
          const abilityName =
            reportMasterData.abilitiesById &&
            typeof reportMasterData.abilitiesById[event.abilityGameID]?.name === 'string'
              ? reportMasterData.abilitiesById[event.abilityGameID].name
              : undefined;
          killingBlow = {
            abilityName,
            abilityId: event.abilityGameID,
            sourceID: typeof event.sourceID === 'number' ? event.sourceID : undefined,
            timestamp: event.timestamp,
            type: event.type,
            amount: typeof event.amount === 'number' ? event.amount : undefined,
          };
        }

        deaths.push({
          playerId,
          timestamp: event.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina: event.targetResources.stamina,
          maxStamina: event.targetResources.maxStamina,
          wasBlocking: false,
        });
        lastDeathTimestamp = event.timestamp;
      }
    });

    // Sort deaths by timestamp to display them in chronological order
    return deaths.sort((a, b) => a.timestamp - b.timestamp);
  }, [
    fight?.startTime,
    fight?.endTime,
    deathEvents,
    damageEvents,
    reportMasterData.actorsById,
    reportMasterData.abilitiesById,
  ]);

  // Calculate combined loading state
  const isLoading = isDeathEventsLoading || isDamageEventsLoading || isMasterDataLoading;

  if (isLoading) {
    return (
      <DeathEventPanelView
        deathInfos={[]}
        actorsById={reportMasterData.actorsById}
        reportId={reportId}
        fightId={fightId ? Number(fightId) : undefined}
        fight={fight}
        isLoading={true}
      />
    );
  }

  return (
    <DeathEventPanelView
      deathInfos={deathInfos}
      actorsById={reportMasterData.actorsById}
      reportId={reportId}
      fightId={fightId ? Number(fightId) : undefined}
      fight={fight}
      isLoading={isLoading}
    />
  );
};
