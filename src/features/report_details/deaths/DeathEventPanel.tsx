import React from 'react';

import {
  useDeathEvents,
  useDamageEvents,
  useReportMasterData,
  usePlayerData,
  useCastEvents,
  useHealingEvents,
  useResourceEvents,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import type { ReportFightContextInput } from '../../../store/contextTypes';
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

// OPTIMIZED: Binary search for the first index whose timestamp >= target.
function lowerBoundByTimestamp(events: { timestamp: number }[], target: number): number {
  let left = 0;
  let right = events.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (events[mid].timestamp >= target) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  return left;
}

// OPTIMIZED: Binary search for the last index whose timestamp <= target.
function upperBoundByTimestamp(
  events: { timestamp: number }[],
  target: number,
  fromIndex = 0,
): number {
  let left = fromIndex;
  let right = events.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (events[mid].timestamp <= target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return right;
}

// Simple health calculation function.
// OPTIMIZED: callers pass timestamp-sorted arrays so we can binary-search the
// look-back window instead of linearly filtering the full event arrays per death.
function calculateHealthBeforeDeath(
  playerId: string,
  deathTimestamp: number,
  sortedDamageEvents: DamageEvent[],
  sortedHealingEvents: HealEvent[],
  sortedResourceEvents: ResourceChangeEvent[],
): { health: number | null; maxHealth: number | null } {
  const timeWindow = 10000; // Look back 10 seconds
  const minTimeBeforeDeath = 10; // Must be at least 10ms before death
  const windowStart = deathTimestamp - timeWindow;
  const windowEnd = deathTimestamp - minTimeBeforeDeath;

  const collectWindow = <T extends { timestamp: number; targetID?: number | null }>(
    sortedEvents: T[],
  ): T[] => {
    const startIndex = lowerBoundByTimestamp(sortedEvents, windowStart);
    const endIndex = upperBoundByTimestamp(sortedEvents, windowEnd, startIndex);
    const result: T[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const e = sortedEvents[i];
      if (
        String(e.targetID ?? '') === playerId &&
        (e as { targetResources?: { hitPoints?: number } }).targetResources?.hitPoints !== undefined
      ) {
        result.push(e);
      }
    }
    return result;
  };

  // Combine all events that might have health data
  const allHealthEvents = [
    ...collectWindow(sortedDamageEvents),
    ...collectWindow(sortedHealingEvents),
    ...collectWindow(sortedResourceEvents),
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

interface DeathEventPanelProps {
  context?: ReportFightContextInput;
}

export const DeathEventPanel: React.FC<DeathEventPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const reportId = resolvedContext.reportCode;
  const resolvedFightId = resolvedContext.fightId;

  // Use hooks to get data scoped to the resolved context
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context: resolvedContext });
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ context: resolvedContext });
  const { castEvents, isCastEventsLoading } = useCastEvents({ context: resolvedContext });
  const { healingEvents, isHealingEventsLoading } = useHealingEvents({ context: resolvedContext });
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents({
    context: resolvedContext,
  });
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask({
    context: resolvedContext,
  });
  const { reportMasterData, isMasterDataLoading } = useReportMasterData({
    context: resolvedContext,
  });
  const { playerData } = usePlayerData({ context: resolvedContext });

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
    // OPTIMIZED: Sort healing/resource events ONCE so per-death health lookups can
    // binary-search the look-back window instead of re-filtering the full arrays.
    const sortedHealingEvents = [...healingEvents].sort((a, b) => a.timestamp - b.timestamp);
    const sortedResourceEvents = [...resourceEvents].sort((a, b) => a.timestamp - b.timestamp);

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

        // OPTIMIZED: Binary-search the [deathTimestamp - timeWindowMs, deathTimestamp]
        // window instead of linearly filtering the full sorted damage array per death.
        const kbStartIndex = lowerBoundByTimestamp(
          sortedDamageEvents,
          deathTimestamp - timeWindowMs,
        );
        const kbEndIndex = upperBoundByTimestamp(sortedDamageEvents, deathTimestamp, kbStartIndex);
        const recentDamageToPlayer: DamageEvent[] = [];
        for (let i = kbStartIndex; i <= kbEndIndex; i++) {
          const dmgEvent = sortedDamageEvents[i];
          if (
            String(dmgEvent.targetID ?? '') === playerId &&
            typeof dmgEvent.amount === 'number' &&
            dmgEvent.amount > 0
          ) {
            recentDamageToPlayer.push(dmgEvent);
          }
        }
        recentDamageToPlayer.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)); // Most recent first

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
          // Exclude every hit that contributed to the killing blow. The killing blow's
          // amount is the SUMMED simultaneous damage, so matching on amount misses the
          // individual contributing hits. Instead, drop any attack within the same
          // simultaneity window (mirrors how the killing blow group is built above).
          const filteredAttacks = allValidAttacks.filter(
            (attack) =>
              Math.abs((attack.timestamp ?? 0) - (killingBlowEvent!.timestamp ?? 0)) >
              simultaneousWindowMs,
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
          sortedHealingEvents,
          sortedResourceEvents,
        );

        deaths.push({
          playerId,
          timestamp: deathEvent.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina: deathEvent.targetResources?.stamina ?? null,
          maxStamina: deathEvent.targetResources?.maxStamina ?? null,
          health,
          maxHealth,
          killingBlowDamage,
          // Wire the previously dead 'BLOCKING' badge to real data: derive from whether
          // the killing blow (or, failing that, the most recent attack) was blocked.
          wasBlocking:
            killingBlow?.wasBlocked ?? lastAttacks[lastAttacks.length - 1]?.wasBlocked ?? null,
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

  if (!fight) {
    return null;
  }

  if (isLoading) {
    return (
      <DeathEventPanelView
        deathInfos={[]}
        actorsById={reportMasterData.actorsById}
        reportId={reportId}
        fightId={resolvedFightId ?? undefined}
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
      fightId={resolvedFightId ?? undefined}
      fight={fight}
      isLoading={isLoading}
    />
  );
};
