import React from 'react';

import {
  useDeathEvents,
  useDamageEvents,
  useReportMasterData,
  usePlayerData,
  useCastEvents,
} from '../../../hooks';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities } from '../../../types/abilities';
import { DeathEvent } from '../../../types/combatlogEvents';
import { isBuffActiveOnTarget } from '../../../utils/BuffLookupUtils';
import { calculateDeathDurations } from '../../../utils/deathDurationUtils';

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
  deathDurationMs: number | null;
  resurrectionTime: number | null;
  killerWasTaunted?: boolean | null;
}

export const DeathEventPanel: React.FC<DeathEventPanelProps> = ({ fight }) => {
  // Get reportId and fightId from params
  const { reportId, fightId } = useSelectedReportAndFight();

  // Use hooks to get data
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData } = usePlayerData();

  const deathInfos: DeathInfo[] = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    // Calculate death durations first
    const deathDurations = calculateDeathDurations(
      deathEvents,
      castEvents,
      fight.startTime,
      fight.endTime,
    );

    // Create a map of death durations by player ID and timestamp for quick lookup
    const deathDurationMap = new Map<string, Map<number, (typeof deathDurations)[0]>>();
    deathDurations.forEach((duration) => {
      const playerId = duration.playerId.toString();
      if (!deathDurationMap.has(playerId)) {
        deathDurationMap.set(playerId, new Map());
      }
      const playerDurations = deathDurationMap.get(playerId);
      if (playerDurations) {
        playerDurations.set(duration.deathTime, duration);
      }
    }); // OPTIMIZED: Pre-build lookup maps to avoid repeated computations
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

        // Get death duration data for this death
        const playerDurations = deathDurationMap.get(playerId);
        const deathDurationData = playerDurations?.get(deathEvent.timestamp ?? 0);

        // Check if the killer was taunted at the time of death
        let killerWasTaunted: boolean | null = null;
        if (killingBlow?.sourceID && debuffLookupData) {
          // Use the pre-computed debuff lookup data
          killerWasTaunted = isBuffActiveOnTarget(
            debuffLookupData,
            KnownAbilities.TAUNT,
            deathEvent.timestamp || 0,
            killingBlow.sourceID,
          );
        }

        deaths.push({
          playerId,
          timestamp: deathEvent.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina: deathEvent.targetResources.stamina,
          maxStamina: deathEvent.targetResources.maxStamina,
          wasBlocking: false,
          deathDurationMs: deathDurationData?.deathDurationMs ?? null,
          resurrectionTime: deathDurationData?.resurrectionTime ?? null,
          killerWasTaunted,
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
    castEvents,
    debuffLookupData,
    reportMasterData.actorsById,
    reportMasterData.abilitiesById,
  ]);

  // Calculate combined loading state
  const isLoading =
    isDeathEventsLoading ||
    isDamageEventsLoading ||
    isCastEventsLoading ||
    isDebuffLookupLoading ||
    isMasterDataLoading;

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

  // Prepare players data with roles
  const players = Object.entries(reportMasterData.actorsById)
    .filter(([_, actor]) => actor?.type === 'Player')
    .map(([id, actor]) => ({
      id,
      name: actor?.name || id,
      role: playerData?.playersById?.[id]?.role || 'dps', // Default to 'dps' if role not found
    }));

  return (
    <DeathEventPanelView
      deathInfos={deathInfos}
      actorsById={reportMasterData.actorsById}
      players={players}
      reportId={reportId}
      fightId={fightId ? parseInt(fightId, 10) : undefined}
      fight={fight}
      isLoading={isLoading}
    />
  );
};
