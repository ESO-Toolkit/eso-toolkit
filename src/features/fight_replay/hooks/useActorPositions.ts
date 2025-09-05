import { useMemo } from 'react';

import { FightFragment, ReportActorFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  ResourceChangeEvent,
} from '../../../types/combatlogEvents';
import { resolveActorName } from '../../../utils/resolveActorName';

interface Actor {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss';
  role?: 'dps' | 'tank' | 'healer';
  position: [number, number, number];
  rotation: number;
  isAlive: boolean;
}

interface FightEvents {
  damage: DamageEvent[];
  heal: HealEvent[];
  death: DeathEvent[];
  resource: ResourceChangeEvent[];
}

interface UseActorPositionsParams {
  fight?: FightFragment;
  events: FightEvents | null;
  currentTime: number;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  actorsById?: Record<string | number, ReportActorFragment>;
}

export const useActorPositions = ({
  fight,
  events,
  currentTime,
  playersById,
  actorsById,
}: UseActorPositionsParams): Actor[] => {
  // Pre-compute static data that doesn't change with currentTime (PERFORMANCE CRITICAL)
  const staticActorData = useMemo(() => {
    if (!fight || !events) {
      return {
        actorPositionHistory: new Map(),
        actorDeathEvents: new Map(),
        actorFirstAppearance: new Map(),
      };
    }

    // Store raw position data from events
    const actorPositionHistory = new Map<
      number,
      Array<{
        x: number;
        y: number;
        facing: number;
        timestamp: number;
      }>
    >();

    // Store death events and all actor events (for resurrection detection)
    const actorDeathEvents = new Map<number, number[]>(); // Track multiple deaths
    const actorAllEvents = new Map<number, number[]>(); // Track all events for resurrection detection
    const actorFirstAppearance = new Map<number, number>();

    // Process all events to collect position data (DONE ONCE PER FIGHT)
    const allEvents = [...events.damage, ...events.heal, ...events.death, ...events.resource].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Collect all death events and track all events for each actor
    for (const event of allEvents) {
      // Track death events
      if (event.type === 'death' && 'targetID' in event) {
        if (!actorDeathEvents.has(event.targetID)) {
          actorDeathEvents.set(event.targetID, []);
        }
        const deaths = actorDeathEvents.get(event.targetID);
        if (deaths) {
          deaths.push(event.timestamp);
        }

        if (!actorFirstAppearance.has(event.targetID)) {
          actorFirstAppearance.set(event.targetID, event.timestamp);
        }
      }

      // Track all events for each actor (for resurrection detection)
      const actorIds = [];
      if ('sourceID' in event) actorIds.push(event.sourceID);
      if ('targetID' in event) actorIds.push(event.targetID);

      for (const actorId of actorIds) {
        if (!actorAllEvents.has(actorId)) {
          actorAllEvents.set(actorId, []);
        }
        const events = actorAllEvents.get(actorId);
        if (events && !events.includes(event.timestamp)) {
          events.push(event.timestamp);
        }

        // Track first appearance
        if (!actorFirstAppearance.has(actorId)) {
          actorFirstAppearance.set(actorId, event.timestamp);
        }
      }
    }

    // Helper to add position data
    const addPosition = (
      actorId: number,
      resources: { x?: number; y?: number; facing?: number } | undefined,
      timestamp: number,
    ): void => {
      if (
        resources?.x !== undefined &&
        resources?.y !== undefined &&
        resources?.facing !== undefined
      ) {
        // Track first appearance
        if (!actorFirstAppearance.has(actorId)) {
          actorFirstAppearance.set(actorId, timestamp);
        }

        if (!actorPositionHistory.has(actorId)) {
          actorPositionHistory.set(actorId, []);
        }
        const history = actorPositionHistory.get(actorId);
        if (history) {
          history.push({
            x: resources.x,
            y: resources.y,
            facing: resources.facing,
            timestamp,
          });
        }
      }
    };

    // Second pass: collect position data (filtering out post-death NPC positions)
    for (const event of allEvents) {
      if ('sourceID' in event && 'sourceResources' in event) {
        addPosition(event.sourceID, event.sourceResources, event.timestamp);
      }
      if ('targetID' in event && 'targetResources' in event) {
        addPosition(event.targetID, event.targetResources, event.timestamp);
      }

      // Track first appearance for all actors in any event
      if ('sourceID' in event && !actorFirstAppearance.has(event.sourceID)) {
        actorFirstAppearance.set(event.sourceID, event.timestamp);
      }
      if ('targetID' in event && !actorFirstAppearance.has(event.targetID)) {
        actorFirstAppearance.set(event.targetID, event.timestamp);
      }
    }

    // Sort position histories (DONE ONCE)
    for (const history of actorPositionHistory.values()) {
      history.sort((a, b) => a.timestamp - b.timestamp);
    }

    return {
      actorPositionHistory,
      actorDeathEvents,
      actorAllEvents,
      actorFirstAppearance,
    };
  }, [fight, events]); // Only recalculate when fight or events change, NOT on currentTime!

  // Fast position lookup for current time (lightweight, runs at 60Hz)
  return useMemo(() => {
    if (!fight || !events) {
      return [];
    }

    const currentTimestamp = fight.startTime + currentTime;
    const { actorPositionHistory, actorDeathEvents, actorAllEvents, actorFirstAppearance } =
      staticActorData;

    // Simple interpolation helper (lightweight)
    const interpolate = (
      pos1: { x: number; y: number; facing: number; timestamp: number },
      pos2: { x: number; y: number; facing: number; timestamp: number },
      timestamp: number,
    ): { x: number; y: number; facing: number } => {
      const timeDiff = pos2.timestamp - pos1.timestamp;
      if (timeDiff === 0) return pos1;

      const progress = Math.max(0, Math.min(1, (timestamp - pos1.timestamp) / timeDiff));
      const angleDiff = ((pos2.facing - pos1.facing + Math.PI) % (2 * Math.PI)) - Math.PI;

      return {
        x: pos1.x + (pos2.x - pos1.x) * progress,
        y: pos1.y + (pos2.y - pos1.y) * progress,
        facing: pos1.facing + angleDiff * progress,
      };
    };

    // Generate current actor positions (fast lookup, no pre-generation)
    const actors: Actor[] = [];

    for (const [actorId, history] of actorPositionHistory) {
      if (history.length === 0) continue;

      // Fast position lookup (instead of generating thousands of interpolated points)
      let currentPosition = history[0];

      if (history.length > 1) {
        let beforePos = null;
        let afterPos = null;

        // Simple linear search for current position
        for (const pos of history) {
          if (pos.timestamp <= currentTimestamp) {
            beforePos = pos;
          }
          if (pos.timestamp >= currentTimestamp && !afterPos) {
            afterPos = pos;
            break;
          }
        }

        if (beforePos && afterPos && beforePos !== afterPos) {
          const interpolated = interpolate(beforePos, afterPos, currentTimestamp);
          currentPosition = {
            ...interpolated,
            timestamp: currentTimestamp,
          };
        } else {
          currentPosition = beforePos || afterPos || history[0];
        }
      }

      // Determine actor type
      const isPlayer = fight.friendlyPlayers?.includes(actorId) ?? false;
      const isBoss = fight.enemyNPCs?.some((npc) => npc?.id === actorId) ?? false;

      let type: 'player' | 'enemy' | 'boss' = 'enemy';
      if (isPlayer) type = 'player';
      else if (isBoss) type = 'boss';

      // Get role for players
      const playerData = isPlayer && playersById ? playersById[actorId] : undefined;
      const role = playerData?.role;

      // New resurrection logic: any event after death means the actor is alive again
      const deaths = actorDeathEvents.get(actorId) || [];
      const allActorEvents = actorAllEvents?.get(actorId) || [];

      // Calculate if actor is alive
      let isAlive = true; // Start assuming alive

      if (deaths.length > 0) {
        // Get all relevant deaths before current time
        const relevantDeaths = deaths.filter((d: number) => d <= currentTimestamp);

        if (relevantDeaths.length > 0) {
          const latestDeath = Math.max(...relevantDeaths);

          // Check if there's any event after the latest death but before current time
          const eventsAfterDeath = allActorEvents.filter(
            (eventTime: number) => eventTime > latestDeath && eventTime <= currentTimestamp,
          );

          if (eventsAfterDeath.length > 0) {
            // There's an event after death, actor is alive again
            isAlive = true;
          } else {
            // No events after death, actor is dead
            isAlive = false;
          }
        }
      }

      const firstAppearance = actorFirstAppearance.get(actorId);
      const hasAppeared = firstAppearance !== undefined && currentTimestamp >= firstAppearance;

      // Convert coordinates
      const centerX = 5235;
      const centerY = 5410;
      const position: [number, number, number] = [
        (currentPosition.x - centerX) / 1000, // Negate x-axis to fix flipped positions
        0,
        (currentPosition.y - centerY) / 1000,
      ];

      // Determine visibility
      // Players: always show when appeared (alive or dead for resurrection tracking)
      // NPCs: only show when alive
      const showActor = hasAppeared && (isAlive || type === 'player');

      if (showActor) {
        // Get the actor data for name resolution
        const actorData = actorsById?.[actorId];
        const actorName = resolveActorName(actorData, actorId, `Actor ${actorId}`);

        actors.push({
          id: actorId,
          name: actorName,
          type,
          role,
          position,
          rotation: currentPosition.facing,
          isAlive,
        });
      }
    }

    return actors;
  }, [staticActorData, currentTime, fight, playersById, actorsById, events]); // dependencies properly listed
};
