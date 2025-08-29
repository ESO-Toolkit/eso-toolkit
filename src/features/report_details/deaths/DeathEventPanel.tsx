import React from 'react';

import { useDeathEvents, useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { DeathEvent } from '../../../types/combatlogEvents';

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

    // OPTIMIZED: Pre-build lookup maps to avoid repeated computations
    const abilityNameCache = new Map<number, string>();
    const getAbilityName = (abilityId: number): string | undefined => {
      if (abilityNameCache.has(abilityId)) {
        return abilityNameCache.get(abilityId);
      }
      const name = reportMasterData.abilitiesById?.[abilityId]?.name;
      if (typeof name === 'string') {
        abilityNameCache.set(abilityId, name);
        return name;
      }
      abilityNameCache.set(abilityId, '');
      return undefined;
    };

    // OPTIMIZED: Filter player deaths once
    const playerDeaths = deathEvents.filter((event) => {
      const targetId = String(event.targetID ?? '');
      const targetActor = reportMasterData.actorsById[targetId];
      return targetActor?.type === 'Player';
    });

    if (playerDeaths.length === 0) return [];

    // OPTIMIZED: Sort damage events by timestamp for efficient range queries
    const sortedDamageEvents = [...damageEvents].sort((a, b) => a.timestamp - b.timestamp);

    // OPTIMIZED: Group deaths by player for batch processing
    const deathsByPlayer = new Map<string, DeathEvent[]>();
    playerDeaths.forEach((event) => {
      const targetId = String(event.targetID ?? '');
      if (!deathsByPlayer.has(targetId)) {
        deathsByPlayer.set(targetId, []);
      }
      const playerDeathsList = deathsByPlayer.get(targetId);
      if (playerDeathsList) {
        playerDeathsList.push(event);
      }
    });

    // Process deaths efficiently
    const deaths: DeathInfo[] = [];

    deathsByPlayer.forEach((playerDeaths, playerId) => {
      // Sort deaths by timestamp
      playerDeaths.sort((a, b) => a.timestamp - b.timestamp);

      let lastDeathTimestamp: number | undefined = undefined;

      playerDeaths.forEach((deathEvent) => {
        // OPTIMIZED: Binary search for damage events in the relevant time range
        const relevantDamageEvents: AttackEvent[] = [];

        // Find damage events for this player between last death and current death
        const startTime = lastDeathTimestamp ?? (fight.startTime || 0);
        const endTime = deathEvent.timestamp;

        // OPTIMIZED: Use binary search to find the range of relevant events
        let left = 0;
        let right = sortedDamageEvents.length - 1;

        // Find first event >= startTime
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (sortedDamageEvents[mid].timestamp >= startTime) {
            right = mid - 1;
          } else {
            left = mid + 1;
          }
        }
        const startIndex = left;

        // Find last event < endTime
        left = startIndex;
        right = sortedDamageEvents.length - 1;
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (sortedDamageEvents[mid].timestamp < endTime) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        const endIndex = right;

        // Process only relevant damage events
        for (let i = startIndex; i <= endIndex; i++) {
          const dmgEvent = sortedDamageEvents[i];
          if (String(dmgEvent.targetID ?? '') === playerId) {
            const abilityName =
              typeof dmgEvent.abilityGameID === 'number'
                ? getAbilityName(dmgEvent.abilityGameID)
                : undefined;

            relevantDamageEvents.push({
              abilityName,
              abilityId: dmgEvent.abilityGameID,
              sourceID: typeof dmgEvent.sourceID === 'number' ? dmgEvent.sourceID : undefined,
              timestamp: dmgEvent.timestamp,
              type: dmgEvent.type,
              amount: typeof dmgEvent.amount === 'number' ? dmgEvent.amount : undefined,
              wasBlocked: typeof dmgEvent.blocked === 'number' ? dmgEvent.blocked === 1 : null,
            });
          }
        }

        // Get last 3 attacks with damage > 0
        const lastAttacks = relevantDamageEvents
          .filter((a) => typeof a.amount === 'number' && a.amount > 0)
          .slice(-3);

        // OPTIMIZED: Build killing blow once with cached ability lookup
        let killingBlow: AttackEvent | null = null;
        if (typeof deathEvent.abilityGameID === 'number') {
          killingBlow = {
            abilityName: getAbilityName(deathEvent.abilityGameID),
            abilityId: deathEvent.abilityGameID,
            sourceID: typeof deathEvent.sourceID === 'number' ? deathEvent.sourceID : undefined,
            timestamp: deathEvent.timestamp,
            type: deathEvent.type,
            amount: typeof deathEvent.amount === 'number' ? deathEvent.amount : undefined,
          };
        }

        deaths.push({
          playerId,
          timestamp: deathEvent.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina: deathEvent.targetResources.stamina,
          maxStamina: deathEvent.targetResources.maxStamina,
          wasBlocking: false,
        });

        lastDeathTimestamp = deathEvent.timestamp;
      });
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
