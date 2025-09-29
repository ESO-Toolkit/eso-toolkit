import React from 'react';

import { FightFragment } from '@/graphql/generated';

import {
  useDeathEvents,
  useDamageEvents,
  useReportMasterData,
  usePlayerData,
  useCastEvents,
  useHealingEvents,
  useResourceEvents,
} from '../../../hooks';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { KnownAbilities } from '../../../types/abilities';
import {
  DeathEvent,
  DamageEvent,
  HealEvent,
  ResourceChangeEvent,
} from '../../../types/combatlogEvents';
import { isBuffActiveOnTarget } from '../../../utils/BuffLookupUtils';
import { calculateDeathDurations } from '../../../utils/deathDurationUtils';

import { DeathEventPanelView } from './DeathEventPanelView';

interface DeathEventPanelProps {
  fight: FightFragment;
}

interface AttackEvent {
  abilityName?: string | null;
  abilityId?: number | null;
  sourceID?: number | null;
  timestamp?: number | null;
  type?: string | null;
  amount?: number | null;
  wasBlocked?: boolean | null;
  individualAttacks?: Array<{
    abilityName: string;
    amount: number;
    timestamp: number;
  }>;
  attackerWasTaunted?: boolean | null;
}

// Simple health calculation function
function calculateHealthBeforeDeath(
  playerId: string,
  deathTimestamp: number,
  damageEvents: DamageEvent[],
  healingEvents: HealEvent[],
  resourceEvents: ResourceChangeEvent[],
): { health: number | null; maxHealth: number | null } {
  const timeWindow = 10000; // Look back 10 seconds
  const minTimeBeforeDeath = 10; // Must be at least 10ms before death

  // Combine all events that might have health data
  const allHealthEvents = [
    ...damageEvents.filter(
      (e) =>
        String(e.targetID ?? '') === playerId &&
        e.timestamp >= deathTimestamp - timeWindow &&
        e.timestamp <= deathTimestamp - minTimeBeforeDeath &&
        e.targetResources?.hitPoints !== undefined,
    ),
    ...healingEvents.filter(
      (e) =>
        String(e.targetID ?? '') === playerId &&
        e.timestamp >= deathTimestamp - timeWindow &&
        e.timestamp <= deathTimestamp - minTimeBeforeDeath &&
        e.targetResources?.hitPoints !== undefined,
    ),
    ...resourceEvents.filter(
      (e) =>
        String(e.targetID ?? '') === playerId &&
        e.timestamp >= deathTimestamp - timeWindow &&
        e.timestamp <= deathTimestamp - minTimeBeforeDeath &&
        e.targetResources?.hitPoints !== undefined,
    ),
  ].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)); // Most recent first

  // Find the most recent event with valid health data
  const mostRecentHealthEvent = allHealthEvents.find(
    (event) =>
      event.targetResources?.hitPoints !== undefined &&
      event.targetResources?.hitPoints > 0 &&
      event.targetResources?.maxHitPoints !== undefined &&
      event.targetResources?.maxHitPoints > 0,
  );

  if (mostRecentHealthEvent) {
    return {
      health: mostRecentHealthEvent.targetResources.hitPoints,
      maxHealth: mostRecentHealthEvent.targetResources.maxHitPoints,
    };
  }

  return { health: null, maxHealth: null };
}

interface DeathInfo {
  playerId: string;
  timestamp: number;
  killingBlow: AttackEvent | null;
  lastAttacks: AttackEvent[];
  stamina: number | null;
  maxStamina: number | null;
  health: number | null;
  maxHealth: number | null;
  killingBlowDamage: number | null;
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
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();
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

            // Check if the attacker was taunted at the time of this attack
            let attackerWasTaunted: boolean | null = null;
            if (
              typeof dmgEvent.sourceID === 'number' &&
              typeof dmgEvent.timestamp === 'number' &&
              debuffLookupData
            ) {
              attackerWasTaunted = isBuffActiveOnTarget(
                debuffLookupData,
                KnownAbilities.TAUNT,
                dmgEvent.timestamp,
                dmgEvent.sourceID,
              );
            }

            relevantDamageEvents.push({
              abilityName,
              abilityId: dmgEvent.abilityGameID,
              sourceID: typeof dmgEvent.sourceID === 'number' ? dmgEvent.sourceID : undefined,
              timestamp: dmgEvent.timestamp,
              type: dmgEvent.type,
              amount: typeof dmgEvent.amount === 'number' ? dmgEvent.amount : undefined,
              wasBlocked: typeof dmgEvent.blocked === 'number' ? dmgEvent.blocked === 1 : null,
              attackerWasTaunted,
            });
          }
        }

        // Calculate killing blow damage from recent damage events FIRST
        let killingBlowDamage: number | null = null;
        let killingBlowEvent: AttackEvent | null = null;
        const deathTimestamp = deathEvent.timestamp ?? 0;
        const timeWindowMs = 1000; // Look back 1 second
        const simultaneousWindowMs = 50; // Treat damage within 50ms as simultaneous

        const recentDamageToPlayer = sortedDamageEvents
          .filter(
            (dmgEvent) =>
              String(dmgEvent.targetID ?? '') === playerId &&
              dmgEvent.timestamp >= deathTimestamp - timeWindowMs &&
              dmgEvent.timestamp <= deathTimestamp &&
              typeof dmgEvent.amount === 'number' &&
              dmgEvent.amount > 0,
          )
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)); // Most recent first

        if (recentDamageToPlayer.length > 0) {
          const mostRecentDamage = recentDamageToPlayer[0];
          const mostRecentTimestamp = mostRecentDamage.timestamp ?? 0;

          // Find all damage events that happened within simultaneousWindowMs of the most recent one
          const simultaneousDamage = recentDamageToPlayer.filter(
            (dmgEvent) =>
              Math.abs((dmgEvent.timestamp ?? 0) - mostRecentTimestamp) <= simultaneousWindowMs,
          );

          // Sum all simultaneous damage
          killingBlowDamage = simultaneousDamage.reduce(
            (total, dmgEvent) => total + (dmgEvent.amount ?? 0),
            0,
          );

          // Check if the killer was taunted at the time of death
          let killerWasTaunted: boolean | null = null;
          if (
            typeof mostRecentDamage.sourceID === 'number' &&
            typeof mostRecentDamage.timestamp === 'number' &&
            debuffLookupData
          ) {
            killerWasTaunted = isBuffActiveOnTarget(
              debuffLookupData,
              KnownAbilities.TAUNT,
              mostRecentDamage.timestamp,
              mostRecentDamage.sourceID,
            );
          }

          // Use the most recent damage event for killing blow display, but show total damage
          killingBlowEvent = {
            abilityName:
              simultaneousDamage.length > 1
                ? `Multiple attacks (${simultaneousDamage.length})`
                : typeof mostRecentDamage.abilityGameID === 'number'
                  ? getAbilityName(mostRecentDamage.abilityGameID)
                  : undefined,
            abilityId: mostRecentDamage.abilityGameID,
            sourceID:
              typeof mostRecentDamage.sourceID === 'number' ? mostRecentDamage.sourceID : undefined,
            timestamp: mostRecentDamage.timestamp,
            type: mostRecentDamage.type,
            amount: killingBlowDamage, // Use total damage, not just single event
            wasBlocked:
              typeof mostRecentDamage.blocked === 'number' ? mostRecentDamage.blocked === 1 : null,
            // Add individual attacks for tooltip display
            individualAttacks:
              simultaneousDamage.length > 1
                ? simultaneousDamage.map((dmg) => ({
                    abilityName:
                      typeof dmg.abilityGameID === 'number'
                        ? getAbilityName(dmg.abilityGameID) || 'Unknown'
                        : 'Unknown',
                    amount: dmg.amount ?? 0,
                    timestamp: dmg.timestamp ?? 0,
                  }))
                : undefined,
            attackerWasTaunted: killerWasTaunted,
          };
        }

        // Get last 3 attacks with damage > 0, EXCLUDING the killing blow to avoid duplication
        const allValidAttacks = relevantDamageEvents.filter(
          (a) => typeof a.amount === 'number' && a.amount > 0,
        );

        // If we have a killing blow event, exclude it from recent attacks
        let lastAttacks: AttackEvent[];
        if (killingBlowEvent) {
          // Filter out the killing blow event (match by timestamp and amount)
          const filteredAttacks = allValidAttacks.filter(
            (attack) =>
              attack.timestamp !== killingBlowEvent!.timestamp ||
              attack.amount !== killingBlowEvent!.amount,
          );
          lastAttacks = filteredAttacks.slice(-3);
        } else {
          lastAttacks = allValidAttacks.slice(-3);
        }

        // OPTIMIZED: Build killing blow once with cached ability lookup (fallback if no recent damage)
        let killingBlow: AttackEvent | null = killingBlowEvent;
        if (!killingBlow && typeof deathEvent.abilityGameID === 'number') {
          // Check if the killer was taunted at the time of death
          let killerWasTaunted: boolean | null = null;
          if (
            typeof deathEvent.sourceID === 'number' &&
            typeof deathEvent.timestamp === 'number' &&
            debuffLookupData
          ) {
            killerWasTaunted = isBuffActiveOnTarget(
              debuffLookupData,
              KnownAbilities.TAUNT,
              deathEvent.timestamp,
              deathEvent.sourceID,
            );
          }
          killingBlow = {
            abilityName: getAbilityName(deathEvent.abilityGameID),
            abilityId: deathEvent.abilityGameID,
            sourceID: typeof deathEvent.sourceID === 'number' ? deathEvent.sourceID : undefined,
            timestamp: deathEvent.timestamp,
            type: deathEvent.type,
            amount: typeof deathEvent.amount === 'number' ? deathEvent.amount : undefined,
            attackerWasTaunted: killerWasTaunted,
          };
        }

        // Get death duration data for this death
        const playerDurations = deathDurationMap.get(playerId);
        const deathDurationData = playerDurations?.get(deathEvent.timestamp ?? 0);

        // Calculate health before death
        const { health, maxHealth } = calculateHealthBeforeDeath(
          playerId,
          deathTimestamp,
          sortedDamageEvents,
          healingEvents,
          resourceEvents,
        );

        deaths.push({
          playerId,
          timestamp: deathEvent.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina: deathEvent.targetResources.stamina,
          maxStamina: deathEvent.targetResources.maxStamina,
          health,
          maxHealth,
          killingBlowDamage,
          wasBlocking: false,
          deathDurationMs: deathDurationData?.deathDurationMs ?? null,
          resurrectionTime: deathDurationData?.resurrectionTime ?? null,
          killerWasTaunted: killingBlow?.attackerWasTaunted ?? null,
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
    healingEvents,
    resourceEvents,
    debuffLookupData,
    reportMasterData.actorsById,
    reportMasterData.abilitiesById,
  ]);

  // Calculate combined loading state
  const isLoading =
    isDeathEventsLoading ||
    isDamageEventsLoading ||
    isCastEventsLoading ||
    isHealingEventsLoading ||
    isResourceEventsLoading ||
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
