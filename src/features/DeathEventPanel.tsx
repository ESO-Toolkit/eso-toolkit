import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { useReportFightParams } from '../hooks/useReportFightParams';
import { RootState } from '../store/storeWithHistory';
import {
  DamageEvent,
  DeathEvent,
  ResourceChangeEvent,
  BuffEvent,
  EventType,
} from '../types/combatlogEvents';
import { resolveActorName } from '../utils/resolveActorName';

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
  wasBlocking: boolean | null;
}

const DeathEventPanel: React.FC<DeathEventPanelProps> = ({ fight }) => {
  // Get reportId and fightId from params
  const { reportId, fightId } = useReportFightParams();

  const events = useSelector((state: RootState) => state.events.events);
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const abilitiesById = useSelector((state: RootState) => state.masterData.abilitiesById);

  // Helper function to convert timestamp to seconds since fight start
  const formatTimeFromFightStart = (timestamp: number): string => {
    if (!fight?.startTime) {
      return timestamp.toString();
    }
    const totalSeconds = (timestamp - fight.startTime) / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  const deathInfos: DeathInfo[] = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) return [];
    // Pre-sort events by type for performance
    const eventsByType: Record<string, EventType[]> = {};
    for (const e of events as EventType[]) {
      const type = e.type;
      if (!eventsByType[type]) eventsByType[type] = [];
      eventsByType[type].push(e);
    }
    // Build a map of deaths per player, sorted by timestamp
    const deathsByPlayer: Record<string, EventType[]> = {};
    (eventsByType['death'] || []).forEach((event) => {
      if (event.type === 'death') {
        const deathEvent = event as DeathEvent;
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
        // Calculate stamina at time of death by tracking all stamina changes since last death
        if (resourceChangesByPlayer[playerId]) {
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
        } else {
          stamina = null;
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
          wasBlocking,
        });
        lastDeathTimestamp = event.timestamp;
      }
    });

    return deaths;
  }, [events, fight, abilitiesById, actorsById]);

  if (deathInfos.length === 0) {
    return (
      <Box mt={2}>
        <Typography variant="h6">Death Events</Typography>
        <Typography>No deaths detected in this fight.</Typography>
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <Typography variant="h6">Death Events</Typography>
      {/* Death summary */}
      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Death Summary
        </Typography>
        <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(
            deathInfos.reduce(
              (acc, info) => {
                acc[info.playerId] = (acc[info.playerId] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            )
          ).map(([playerId, count]) => {
            const actor = actorsById[playerId];
            const playerName = resolveActorName(actor, playerId);
            const link =
              reportId && fightId
                ? `https://www.esologs.com/reports/${reportId}?fight=${fightId}&source=${playerId}&type=deaths`
                : undefined;
            return (
              <ListItem key={playerId} sx={{ width: 'auto', p: 0 }}>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Chip label={`${playerName}: ${count}`} color="error" clickable />
                  </a>
                ) : (
                  <Chip label={`${playerName}: ${count}`} color="error" />
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>
      <List>
        {deathInfos.map((info, idx) => {
          const actor = actorsById[info.playerId];
          const playerName = resolveActorName(actor, info.playerId);
          // Get source name for killing blow
          const killingBlowSourceActor = info.killingBlow?.sourceID
            ? actorsById[info.killingBlow.sourceID]
            : undefined;
          const killingBlowSourceName = resolveActorName(
            killingBlowSourceActor,
            info.killingBlow?.sourceID,
            info.killingBlow?.sourceName
          );
          return (
            <ListItem key={idx} alignItems="flex-start" divider>
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Player: {playerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time: {formatTimeFromFightStart(info.timestamp)}
                  </Typography>
                  <Box mt={1}>
                    {info.wasBlocking && (
                      <Chip label={'Blocking'} color={'success'} sx={{ mr: 1 }} />
                    )}
                    <Chip label={`Stamina: ${info.stamina ?? 'Unknown'}`} sx={{ mr: 1 }} />
                  </Box>
                  <Box mt={2}>
                    <Typography variant="body2" fontWeight="bold">
                      Killing Blow:
                    </Typography>
                    {info.killingBlow ? (
                      <Typography variant="body2">
                        {info.killingBlow.abilityName || 'Unknown'}
                        {typeof info.killingBlow.abilityId !== 'undefined'
                          ? ` (ID: ${info.killingBlow.abilityId})`
                          : ''}{' '}
                        by {killingBlowSourceName}
                        {typeof info.killingBlow.amount === 'number'
                          ? ` — ${info.killingBlow.amount} damage`
                          : ''}
                      </Typography>
                    ) : (
                      <Typography variant="body2">Unknown</Typography>
                    )}
                  </Box>
                  <Box mt={2}>
                    <Typography variant="body2" fontWeight="bold">
                      Last 3 Attacks:
                    </Typography>
                    {info.lastAttacks.length > 0 ? (
                      <List>
                        {info.lastAttacks.map((attack, i) => {
                          const attackSourceActor = attack.sourceID
                            ? actorsById[attack.sourceID]
                            : undefined;
                          const attackSourceName = resolveActorName(
                            attackSourceActor,
                            attack.sourceID,
                            attack.sourceName
                          );
                          return (
                            <ListItem key={i}>
                              <ListItemText
                                primary={
                                  <>
                                    {attack.abilityName || attack.abilityId || 'Unknown'} by{' '}
                                    {attackSourceName}
                                    {typeof attack.amount === 'number'
                                      ? ` — ${attack.amount} damage`
                                      : ''}
                                    {attack.wasBlocked === true && (
                                      <Chip
                                        label="Blocked"
                                        color="success"
                                        size="small"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </>
                                }
                                secondary={`Time: ${formatTimeFromFightStart(attack.timestamp ?? 0)}`}
                              />
                            </ListItem>
                          );
                        })}
                        {/* Close ListItem map */}
                      </List>
                    ) : (
                      <Typography variant="body2">None</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
export default DeathEventPanel;
