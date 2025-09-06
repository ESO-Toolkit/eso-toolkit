import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { KnownAbilities } from '../../types/abilities';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  ResourceChangeEvent,
} from '../../types/combatlogEvents';
import { isBuffActiveOnTarget, BuffLookupData } from '../../utils/BuffLookupUtils';
import { fightTimeToTimestamp } from '../../utils/fightTimeUtils';
import { resolveActorName } from '../../utils/resolveActorName';

export interface ActorPosition {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc';
  role?: 'dps' | 'tank' | 'healer';
  position: [number, number, number];
  rotation: number;
  isAlive: boolean;
  isTaunted?: boolean;
}

export interface ActorTimeline {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc';
  role?: 'dps' | 'tank' | 'healer';
  positions: Array<{
    timestamp: number;
    position: [number, number, number];
    rotation: number;
    isAlive: boolean;
    isTaunted?: boolean;
  }>;
}

export interface ActorPositionsTimeline {
  /** Record of actorId to their timeline of positions */
  actorTimelines: Record<number, ActorTimeline>;
  /** Sorted array of all unique timestamps */
  timestamps: number[];
  /** Fight duration for bounds checking */
  fightDuration: number;
  /** Fight start time for calculations */
  fightStartTime: number;
}

export interface FightEvents {
  damage: DamageEvent[];
  heal: HealEvent[];
  death: DeathEvent[];
  resource: ResourceChangeEvent[];
}

export interface ActorPositionsCalculationTask {
  fight: FightFragment;
  events: FightEvents;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  actorsById?: Record<string | number, ReportActorFragment>;
  debuffLookupData?: BuffLookupData;
  /** Sample interval in milliseconds (default: 100ms for 10Hz) */
  sampleInterval?: number;
}

export interface ActorPositionsCalculationResult {
  timeline: ActorPositionsTimeline;
}

type OnProgressCallback = (progress: number) => void;

/**
 * Calculate actor positions timeline for efficient lookup at any timestamp
 */
export function calculateActorPositions(
  data: ActorPositionsCalculationTask,
  onProgress?: OnProgressCallback,
): ActorPositionsCalculationResult {
  const { fight, events, playersById, actorsById, debuffLookupData, sampleInterval = 100 } = data;

  onProgress?.(0);

  if (!fight || !events) {
    return {
      timeline: {
        actorTimelines: {},
        timestamps: [],
        fightDuration: 0,
        fightStartTime: 0,
      },
    };
  }

  const fightDuration = fight.endTime - fight.startTime;
  const fightStartTime = fight.startTime;

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
  const actorDeathEvents = new Map<number, number[]>();
  const actorAllEvents = new Map<number, number[]>();
  const actorFirstAppearance = new Map<number, number>();

  // Combine all events and sort by timestamp
  const allEvents = [...events.damage, ...events.heal, ...events.death, ...events.resource].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  onProgress?.(0.1);

  // First pass: collect death events and track all events for each actor
  for (let i = 0; i < allEvents.length; i++) {
    const event = allEvents[i];

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

    // Report progress every 1000 events
    if (i % 1000 === 0) {
      onProgress?.(0.1 + (i / allEvents.length) * 0.2);
    }
  }

  onProgress?.(0.3);

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

  // Second pass: collect position data
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

  onProgress?.(0.5);

  // Sort position histories
  for (const history of actorPositionHistory.values()) {
    history.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Generate sample timestamps at regular intervals
  const timestamps: number[] = [];
  for (let time = 0; time <= fightDuration; time += sampleInterval) {
    timestamps.push(time);
  }
  // Ensure we include the end time
  if (timestamps[timestamps.length - 1] !== fightDuration) {
    timestamps.push(fightDuration);
  }

  onProgress?.(0.6);

  // Helper function for position interpolation
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

  // Build actor timelines
  const actorTimelines: Record<number, ActorTimeline> = {};
  const allActorIds = new Set([
    ...actorPositionHistory.keys(),
    ...actorFirstAppearance.keys(),
  ]);

  let processedActors = 0;
  const totalActors = allActorIds.size;

  for (const actorId of allActorIds) {
    const history = actorPositionHistory.get(actorId) || [];
    if (history.length === 0) {
      processedActors++;
      continue;
    }

    // Determine actor type and role
    const isPlayer = fight.friendlyPlayers?.includes(actorId) ?? false;
    const isBoss = fight.enemyNPCs?.some((npc) => npc?.id === actorId) ?? false;
    const isFriendlyNPC = fight.friendlyNPCs?.some((npc) => npc?.id === actorId) ?? false;
    const isEnemyNPC = fight.enemyNPCs?.some((npc) => npc?.id === actorId && !isBoss) ?? false;

    let type: 'player' | 'enemy' | 'boss' | 'friendly_npc' = 'friendly_npc';
    if (isPlayer) type = 'player';
    else if (isBoss) type = 'boss';
    else if (isEnemyNPC || (!isFriendlyNPC && !isPlayer)) {
      type = 'enemy';
    } else if (isFriendlyNPC) type = 'friendly_npc';

    // Get role for players
    const playerData = isPlayer && playersById ? playersById[actorId] : undefined;
    const role = playerData?.role;

    // Get actor name
    const actorData = actorsById?.[actorId];
    const actorName = resolveActorName(actorData, actorId, `Actor ${actorId}`);

    // Calculate positions for each timestamp
    const positions: ActorTimeline['positions'] = [];

    for (const relativeTime of timestamps) {
      const currentTimestamp = fightStartTime + relativeTime;
      
      // Find appropriate position data
      let currentPosition: { x: number; y: number; facing: number; timestamp: number } | null = null;
      
      if (history.length === 1) {
        currentPosition = history[0];
      } else if (history.length > 1) {
        // Use traditional for loop since findLast isn't available in all TypeScript targets
        let beforePos: typeof history[0] | undefined;
        let afterPos: typeof history[0] | undefined;

        for (let i = 0; i < history.length; i++) {
          if (history[i].timestamp <= currentTimestamp) {
            beforePos = history[i];
          }
          if (history[i].timestamp > currentTimestamp && !afterPos) {
            afterPos = history[i];
            break;
          }
        }

        if (beforePos && afterPos) {
          // Check if there's a death between these positions
          const deaths = actorDeathEvents.get(actorId) || [];
          const deathBetween = deaths.some(
            (deathTime) => deathTime > beforePos.timestamp && deathTime <= currentTimestamp,
          );

          if (!deathBetween) {
            const interpolated = interpolate(beforePos, afterPos, currentTimestamp);
            currentPosition = {
              ...interpolated,
              timestamp: currentTimestamp,
            };
          } else {
            currentPosition = beforePos;
          }
        } else {
          currentPosition = beforePos || afterPos || history[0];
        }
      }

      if (!currentPosition) {
        continue;
      }

      // Check if actor should be visible at this time
      const firstAppearance = actorFirstAppearance.get(actorId);
      const hasAppeared = firstAppearance !== undefined && currentTimestamp >= firstAppearance;

      if (!hasAppeared) {
        continue;
      }

      // Calculate if actor is alive
      const deaths = actorDeathEvents.get(actorId) || [];
      const allActorEvents = actorAllEvents?.get(actorId) || [];
      let isAlive = true;

      if (deaths.length > 0) {
        const relevantDeaths = deaths.filter((d: number) => d <= currentTimestamp);
        if (relevantDeaths.length > 0) {
          const latestDeath = Math.max(...relevantDeaths);
          const eventsAfterDeath = allActorEvents.filter(
            (eventTime: number) => eventTime > latestDeath && eventTime <= currentTimestamp,
          );
          isAlive = eventsAfterDeath.length > 0;
        }
      }

      // Check if actor is taunted (only for enemies and bosses)
      const isTaunted =
        (type === 'enemy' || type === 'boss') && debuffLookupData && fight
          ? isBuffActiveOnTarget(
              debuffLookupData,
              KnownAbilities.TAUNT,
              fightTimeToTimestamp(relativeTime, fight),
              actorId,
            )
          : false;

      // Convert coordinates
      const centerX = 5235;
      const centerY = 5410;
      const position: [number, number, number] = [
        (currentPosition.x - centerX) / 1000,
        0,
        (currentPosition.y - centerY) / 1000,
      ];

      // Only show actors that should be visible
      const showActor = hasAppeared && (isAlive || type === 'player');
      if (showActor) {
        positions.push({
          timestamp: relativeTime,
          position,
          rotation: currentPosition.facing / 100 + Math.PI / 2,
          isAlive,
          isTaunted,
        });
      }
    }

    if (positions.length > 0) {
      actorTimelines[actorId] = {
        id: actorId,
        name: actorName,
        type,
        role,
        positions,
      };
    }

    processedActors++;
    if (processedActors % 10 === 0) {
      onProgress?.(0.6 + (processedActors / totalActors) * 0.4);
    }
  }

  onProgress?.(1);

  return {
    timeline: {
      actorTimelines,
      timestamps,
      fightDuration,
      fightStartTime,
    },
  };
}
