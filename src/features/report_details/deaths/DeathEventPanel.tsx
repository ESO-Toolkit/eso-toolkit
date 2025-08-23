import React from 'react';
import { useSelector } from 'react-redux';

import { useReportFightParams } from '../../../hooks/useReportFightParams';
import { RootState } from '../../../store/storeWithHistory';
import {
  BuffEvent,
  DamageEvent,
  DeathEvent,
  LogEvent,
  ResourceChangeEvent,
} from '../../../types/combatlogEvents';

import DeathEventPanelView from './DeathEventPanelView';

interface DeathEventPanelProps {
  fight: { startTime?: number; endTime?: number };
}

interface AttackEvent {
  abilityName?: string;
  abilityId?: number;
  sourceName?: string;
  sourceID?: number;
  timestamp?: number;
  type?: string;
  amount?: number;
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

const DeathEventPanel: React.FC<DeathEventPanelProps> = ({ fight }) => {
  // Get reportId and fightId from params
  const { reportId, fightId } = useReportFightParams();

  const events = useSelector((state: RootState) => state.events.events);
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const abilitiesById = useSelector((state: RootState) => state.masterData.abilitiesById);

  const deathInfos: DeathInfo[] = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) return [];
    // Pre-sort events by type for performance
    const eventsByType: Record<string, LogEvent[]> = {};
    for (const e of events as LogEvent[]) {
      const type = e.type;
      if (!eventsByType[type]) eventsByType[type] = [];
      eventsByType[type].push(e);
    }
    // Build a map of deaths per player, sorted by timestamp
    const deathsByPlayer: Record<string, LogEvent[]> = {};
    (eventsByType['death'] || []).forEach((event) => {
      if (event.type === 'death') {
        const deathEvent = event;
        const targetId = String(deathEvent.targetID ?? deathEvent.target ?? '');
        if (!deathsByPlayer[targetId]) deathsByPlayer[targetId] = [];
        deathsByPlayer[targetId].push(deathEvent);
      }
    });

    // Build a map of resourceChange events per player
    const resourceChangesByPlayer: Record<string, ResourceChangeEvent[]> = {};
    (eventsByType['resourcechange'] || []).forEach((event) => {
      const rcEvent = event as ResourceChangeEvent;
      const targetId = String(rcEvent.targetID ?? rcEvent.target ?? '');
      if (!resourceChangesByPlayer[targetId]) resourceChangesByPlayer[targetId] = [];
      resourceChangesByPlayer[targetId].push(rcEvent);
    });

    // Build a map of damage events per player
    const damageByPlayer: Record<string, DamageEvent[]> = {};
    (eventsByType['damage'] || []).forEach((event) => {
      const dmgEvent = event as DamageEvent;
      const targetId = String(
        dmgEvent.victimID ?? dmgEvent.victim ?? dmgEvent.targetID ?? dmgEvent.target ?? ''
      );
      if (!damageByPlayer[targetId]) damageByPlayer[targetId] = [];
      damageByPlayer[targetId].push(dmgEvent);
    });

    // Build a map of buff events per player
    const buffEventsByPlayer: Record<string, BuffEvent[]> = {};
    [...(eventsByType['applybuff'] || []), ...(eventsByType['removebuff'] || [])].forEach(
      (event) => {
        const buffEvent = event as BuffEvent;
        const targetId = String(buffEvent.targetID ?? buffEvent.target ?? '');
        if (!buffEventsByPlayer[targetId]) buffEventsByPlayer[targetId] = [];
        buffEventsByPlayer[targetId].push(buffEvent);
      }
    );

    // Process deaths to create DeathInfo objects
    const deaths: DeathInfo[] = [];

    Object.entries(deathsByPlayer).forEach(([playerId, playerDeaths]) => {
      let lastDeathTimestamp: number | undefined = undefined;

      for (let deathIdx = 0; deathIdx < playerDeaths.length; deathIdx++) {
        const event = playerDeaths[deathIdx] as DeathEvent;
        const targetActor = actorsById[playerId];
        if (!targetActor || targetActor.type !== 'Player') continue;
        // Only use damage events for prior attacks
        const priorDamageEvents: AttackEvent[] = [];
        if (damageByPlayer[playerId]) {
          for (let i = 0; i < damageByPlayer[playerId].length; i++) {
            const e = damageByPlayer[playerId][i] as DamageEvent;
            if (
              e.timestamp < event.timestamp &&
              (lastDeathTimestamp === undefined || e.timestamp > lastDeathTimestamp)
            ) {
              let abilityName: string | undefined = undefined;
              if (
                typeof e.abilityGameID === 'number' &&
                abilitiesById &&
                typeof abilitiesById[e.abilityGameID]?.name === 'string'
              ) {
                abilityName = abilitiesById[e.abilityGameID].name as string;
              } else if (typeof e.abilityName === 'string') {
                abilityName = e.abilityName;
              }
              priorDamageEvents.push({
                abilityName,
                abilityId: typeof e.abilityId === 'number' ? e.abilityId : undefined,
                sourceName: typeof e.sourceName === 'string' ? e.sourceName : undefined,
                sourceID: typeof e.sourceID === 'number' ? e.sourceID : undefined,
                timestamp: e.timestamp,
                type: e.type,
                amount: typeof e.amount === 'number' ? e.amount : undefined,
                wasBlocked:
                  typeof e.blocked === 'boolean'
                    ? e.blocked
                    : typeof e.blocked === 'number'
                      ? e.blocked === 1
                      : null,
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
            abilitiesById && typeof abilitiesById[event.abilityGameID]?.name === 'string'
              ? (abilitiesById[event.abilityGameID].name as string)
              : undefined;
          killingBlow = {
            abilityName,
            abilityId: event.abilityGameID,
            sourceName: typeof event.sourceName === 'string' ? event.sourceName : undefined,
            sourceID: typeof event.sourceID === 'number' ? event.sourceID : undefined,
            timestamp: event.timestamp,
            type: event.type,
            amount: typeof event.amount === 'number' ? event.amount : undefined,
          };
        }
        let stamina: number | null = null;
        let maxStamina: number | null = null;
        // Find the most recent resourcechange event with targetResources data for this player
        if (resourceChangesByPlayer[playerId]) {
          let mostRecentStaminaEvent: ResourceChangeEvent | null = null;

          // Find the most recent resourcechange event before death with targetResources data
          for (const e of resourceChangesByPlayer[playerId]) {
            if (
              e.timestamp < event.timestamp &&
              (lastDeathTimestamp === undefined || e.timestamp > lastDeathTimestamp) &&
              e.targetResources?.stamina !== undefined
            ) {
              if (!mostRecentStaminaEvent || e.timestamp > mostRecentStaminaEvent.timestamp) {
                mostRecentStaminaEvent = e;
              }
            }
          }

          // Use the stamina value from the most recent event with targetResources
          if (mostRecentStaminaEvent?.targetResources?.stamina !== undefined) {
            stamina = mostRecentStaminaEvent.targetResources.stamina;
            maxStamina = mostRecentStaminaEvent.targetResources.maxStamina ?? null;
          } else {
            // Fallback to the old calculation method if no targetResources available
            let currentStamina = 0;
            let hasStaminaData = false;

            // Sort stamina events by timestamp to process them in order
            const staminaEvents: ResourceChangeEvent[] = [];
            for (const e of resourceChangesByPlayer[playerId]) {
              if (
                e.resourceChangeType === 1 && // stamina resource type
                e.timestamp < event.timestamp &&
                (lastDeathTimestamp === undefined || e.timestamp > lastDeathTimestamp)
              ) {
                staminaEvents.push(e);
              }
            }
            staminaEvents.sort((a, b) => a.timestamp - b.timestamp);

            // Apply stamina changes in chronological order to get final stamina value
            for (const e of staminaEvents) {
              currentStamina += e.resourceChange;
              hasStaminaData = true;
            }

            stamina = hasStaminaData ? Math.max(0, currentStamina) : null;
            maxStamina = null;
          }
        } else {
          stamina = null;
          maxStamina = null;
        }
        // Find the most recent applybuff and removebuff for 'Brace for Impact' before the death event
        let lastApplyBuffTime: number | null = null;
        let lastRemoveBuffTime: number | null = null;
        if (buffEventsByPlayer[playerId]) {
          for (let i = buffEventsByPlayer[playerId].length - 1; i >= 0; i--) {
            const e = buffEventsByPlayer[playerId][i] as BuffEvent;
            if (e.timestamp < event.timestamp && e.abilityName === 'Brace for Impact') {
              if (e.type === 'applybuff') {
                if (lastApplyBuffTime === null || e.timestamp > lastApplyBuffTime) {
                  lastApplyBuffTime = e.timestamp;
                }
              }
              if (e.type === 'removebuff') {
                if (lastRemoveBuffTime === null || e.timestamp > lastRemoveBuffTime) {
                  lastRemoveBuffTime = e.timestamp;
                }
              }
            }
          }
        }
        let wasBlocking: boolean | null = null;
        if (
          lastApplyBuffTime !== null &&
          (lastRemoveBuffTime === null || lastApplyBuffTime > lastRemoveBuffTime)
        ) {
          wasBlocking = true;
        } else if (
          lastRemoveBuffTime !== null &&
          (lastApplyBuffTime === null || lastRemoveBuffTime > lastApplyBuffTime)
        ) {
          wasBlocking = false;
        } else {
          wasBlocking = null;
        }
        deaths.push({
          playerId,
          timestamp: event.timestamp ?? 0,
          killingBlow,
          lastAttacks,
          stamina,
          maxStamina,
          wasBlocking,
        });
        lastDeathTimestamp = event.timestamp;
      }
    });

    // Sort deaths by timestamp to display them in chronological order
    return deaths.sort((a, b) => a.timestamp - b.timestamp);
  }, [events, fight, abilitiesById, actorsById]);

  if (deathInfos.length === 0) {
    return (
      <DeathEventPanelView
        deathInfos={[]}
        actorsById={actorsById}
        reportId={reportId}
        fightId={fightId ? Number(fightId) : undefined}
        fight={fight}
      />
    );
  }

  return (
    <DeathEventPanelView
      deathInfos={deathInfos}
      actorsById={actorsById}
      reportId={reportId}
      fightId={fightId ? Number(fightId) : undefined}
      fight={fight}
    />
  );
};
export default DeathEventPanel;
