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
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
  role?: 'dps' | 'tank' | 'healer';
  position: [number, number, number];
  rotation: number;
  isAlive: boolean;
  isDead: boolean;
  isTaunted?: boolean;
}

export interface ActorTimeline {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
  role?: 'dps' | 'tank' | 'healer';
  positions: Array<{
    timestamp: number;
    position: [number, number, number];
    rotation: number;
    isAlive: boolean;
    isDead: boolean;
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
}

export interface ActorPositionsCalculationResult {
  timeline: ActorPositionsTimeline;
}

// Constants for coordinate conversion and thresholds
const COORDINATE_CENTER_X = 5235;
const COORDINATE_CENTER_Y = 5410;
const COORDINATE_SCALE = 1000;
const ROTATION_SCALE = 100;
const ROTATION_OFFSET = Math.PI / 2;
const GAP_THRESHOLD_MS = 5000;
const INTERPOLATION_TOLERANCE_MS = 1;
const MIN_VISIBILITY_MS = 1000;
const SAMPLE_INTERVAL_MS = 4.7; // 240Hz sampling rate (better performance vs quality balance)
const MAX_TIMESTAMPS = 3600; // Cap at 1 minute worth of 60Hz data to prevent excessive computation

type OnProgressCallback = (progress: number) => void;

// Helper functions to eliminate code duplication
function convertCoordinates(x: number, y: number): [number, number, number] {
  return [
    (x - COORDINATE_CENTER_X) / COORDINATE_SCALE,
    0,
    (y - COORDINATE_CENTER_Y) / COORDINATE_SCALE,
  ];
}

function convertRotation(facing: number): number {
  return facing / ROTATION_SCALE + ROTATION_OFFSET;
}

function checkTauntStatus(
  type: string,
  debuffLookupData: BuffLookupData | undefined,
  fight: FightFragment,
  relativeTime: number,
  actorId: number,
): boolean {
  return (type === 'enemy' || type === 'boss') && debuffLookupData && fight
    ? isBuffActiveOnTarget(
        debuffLookupData,
        KnownAbilities.TAUNT,
        fightTimeToTimestamp(relativeTime, fight),
        actorId,
      )
    : false;
}

function trackActorEvent(
  actorId: number,
  timestamp: number,
  actorFirstEventTime: Map<number, number>,
  actorEventTimes: Map<number, number[]>,
  actorLastEventTime: Map<number, number>,
  actorDeathTime: Map<number, number | undefined>,
  isDeathEvent = false,
): void {
  // Track first event time
  if (!actorFirstEventTime.has(actorId)) {
    actorFirstEventTime.set(actorId, timestamp);
  }

  // Track all event times
  if (!actorEventTimes.has(actorId)) {
    actorEventTimes.set(actorId, []);
  }
  const eventTimes = actorEventTimes.get(actorId);
  if (eventTimes) {
    eventTimes.push(timestamp);
  }

  // Update last event time and check resurrection
  actorLastEventTime.set(actorId, timestamp);
  const deathTime = actorDeathTime.get(actorId);
  if (deathTime !== undefined && timestamp > deathTime && !isDeathEvent) {
    // Actor has a non-death event after death - they are no longer dead
    actorDeathTime.set(actorId, undefined);
  }
}

// Helper interfaces for events with position data
interface ResourcesWithPosition {
  x: number;
  y: number;
  facing: number;
}

interface EventWithResources {
  sourceResources?: ResourcesWithPosition;
  targetResources?: ResourcesWithPosition;
  timestamp: number;
}

function extractPositionData(
  event: DamageEvent | HealEvent | DeathEvent | ResourceChangeEvent,
  actorId: number,
  resourceKey: 'sourceResources' | 'targetResources',
  actorPositionHistory: Map<
    number,
    Array<{ x: number; y: number; facing: number; timestamp: number }>
  >,
): void {
  const eventWithResources = event as EventWithResources;
  const resources = eventWithResources[resourceKey];
  if (resources?.x !== undefined && resources?.y !== undefined && resources?.facing !== undefined) {
    if (!actorPositionHistory.has(actorId)) {
      actorPositionHistory.set(actorId, []);
    }
    const history = actorPositionHistory.get(actorId);
    if (history) {
      history.push({
        x: resources.x,
        y: resources.y,
        facing: resources.facing,
        timestamp: event.timestamp,
      });
    }
  }
}

/**
 * Check if an actor should be visible at the current timestamp.
 * Actors are visible at exact event times, remain visible for at least 1 second after their last event,
 * and show continuous positions during gaps shorter than 5 seconds.
 */
function hasRecentEvent(
  actorId: number,
  currentTimestamp: number,
  eventTimes: number[],
  windowMs = GAP_THRESHOLD_MS,
): boolean {
  if (!eventTimes || eventTimes.length === 0) {
    return false;
  }

  const tolerance = INTERPOLATION_TOLERANCE_MS;
  const minVisibilityMs = MIN_VISIBILITY_MS;

  // Check if there's an event exactly at this timestamp (within tolerance)
  for (const eventTime of eventTimes) {
    if (Math.abs(eventTime - currentTimestamp) <= tolerance) {
      return true;
    }
  }

  // Sort event times for gap analysis
  const sortedEventTimes = [...eventTimes].sort((a, b) => a - b);

  // Find the most recent event before the current timestamp
  let mostRecentEvent: number | null = null;
  let nextEvent: number | null = null;

  for (let i = 0; i < sortedEventTimes.length; i++) {
    const eventTime = sortedEventTimes[i];
    if (eventTime <= currentTimestamp) {
      mostRecentEvent = eventTime;
      if (i + 1 < sortedEventTimes.length) {
        nextEvent = sortedEventTimes[i + 1];
      }
    } else {
      if (mostRecentEvent === null) {
        nextEvent = eventTime;
      }
      break;
    }
  }

  // If we have a recent event, check minimum visibility and gap behavior
  if (mostRecentEvent !== null) {
    const timeSinceEvent = currentTimestamp - mostRecentEvent;

    // Always show for minimum visibility period (1 second)
    if (timeSinceEvent <= minVisibilityMs) {
      return true;
    }

    // If there's a next event and the gap is less than 5 seconds, show positions throughout
    if (nextEvent !== null) {
      const gap = nextEvent - mostRecentEvent;
      if (gap < windowMs && currentTimestamp <= nextEvent) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate actor positions timeline for efficient lookup at any timestamp
 */
export function calculateActorPositions(
  data: ActorPositionsCalculationTask,
  onProgress?: OnProgressCallback,
): ActorPositionsCalculationResult {
  const { fight, events, playersById, actorsById, debuffLookupData } = data;
  const sampleInterval = SAMPLE_INTERVAL_MS;

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

  // Track first event timestamp for each actor
  const actorFirstEventTime = new Map<number, number>();
  // Track all event timestamps for each actor (for 5-second recent event check)
  const actorEventTimes = new Map<number, number[]>();
  // Track death status for each actor - maps actor ID to death timestamp (undefined if alive)
  const actorDeathTime = new Map<number, number | undefined>();
  // Track last event timestamp for each actor (to determine if they're still dead)
  const actorLastEventTime = new Map<number, number>();

  // Combine all events and sort by timestamp
  const allEvents = [...events.damage, ...events.heal, ...events.death, ...events.resource].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  onProgress?.(0.1);

  // Collect position data from events
  for (const event of allEvents) {
    // Track death and resurrection status
    if (event.type === 'death') {
      const deathEvent = event as DeathEvent;
      actorDeathTime.set(deathEvent.targetID, deathEvent.timestamp);
    }

    // Process source and target actors
    const actorsToProcess: Array<{ id: number; isTarget: boolean }> = [];
    if ('sourceID' in event) {
      actorsToProcess.push({ id: event.sourceID, isTarget: false });
    }
    if ('targetID' in event) {
      actorsToProcess.push({ id: event.targetID, isTarget: true });
    }

    for (const { id: actorId, isTarget } of actorsToProcess) {
      trackActorEvent(
        actorId,
        event.timestamp,
        actorFirstEventTime,
        actorEventTimes,
        actorLastEventTime,
        actorDeathTime,
        isTarget && event.type === 'death',
      );

      // Extract position data
      const resourceKey = isTarget ? 'targetResources' : 'sourceResources';
      if (resourceKey in event) {
        extractPositionData(event, actorId, resourceKey, actorPositionHistory);
      }
    }
  }

  onProgress?.(0.3);

  // Sort position histories
  for (const history of actorPositionHistory.values()) {
    history.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Generate sample timestamps at regular intervals
  const timestamps: number[] = [];
  const adjustedInterval = Math.max(sampleInterval, fightDuration / MAX_TIMESTAMPS);

  for (let time = 0; time <= fightDuration; time += adjustedInterval) {
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
  const allActorIds = new Set([...actorPositionHistory.keys()]);

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

    // Get actor data early for boss and pet detection and name resolution
    const actorData = actorsById?.[actorId];

    // Check if actor is a boss by looking at actorsById data
    const isBoss = actorData?.subType === 'Boss' && actorData?.type === 'NPC';

    // Check if actor is a pet by looking at actorsById data
    const isPet = actorData?.subType === 'Pet' && actorData?.type === 'Pet';

    const isFriendlyNPC = fight.friendlyNPCs?.some((npc) => npc?.id === actorId) ?? false;
    const isEnemyNPC = fight.enemyNPCs?.some((npc) => npc?.id === actorId) ?? false;

    let type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet' = 'friendly_npc';
    if (isPlayer) type = 'player';
    else if (isBoss) type = 'boss';
    else if (isPet) type = 'pet';
    else if (isEnemyNPC || (!isFriendlyNPC && !isPlayer)) {
      type = 'enemy';
    } else if (isFriendlyNPC) type = 'friendly_npc';

    // Get role for players
    const playerData = isPlayer && playersById ? playersById[actorId] : undefined;
    const role = playerData?.role;

    // Get actor name (reusing actorData from above)
    const actorName = resolveActorName(actorData, actorId, `Actor ${actorId}`);

    // Calculate positions for each timestamp
    const positions: ActorTimeline['positions'] = [];

    // Get first event time for this actor
    const firstEventTime = actorFirstEventTime.get(actorId);
    const isNPC = type !== 'player' && type !== 'boss'; // Includes pets, enemies, and friendly NPCs
    const eventTimes = actorEventTimes.get(actorId) || [];

    for (const relativeTime of timestamps) {
      const currentTimestamp = fightStartTime + relativeTime;

      // For NPCs (including pets), skip positions before their first event
      if (isNPC && firstEventTime && currentTimestamp < firstEventTime) {
        continue;
      }

      // Check if actor is dead at this timestamp
      const deathTime = actorDeathTime.get(actorId);
      const isDead = deathTime !== undefined && currentTimestamp >= deathTime;

      // If actor is dead, don't interpolate - use their last known position before death
      if (isDead) {
        // Find the last position before or at death time
        const lastPositionBeforeDeath = history.find((pos) => pos.timestamp <= deathTime);
        if (lastPositionBeforeDeath) {
          const position = convertCoordinates(lastPositionBeforeDeath.x, lastPositionBeforeDeath.y);
          const rotation = convertRotation(lastPositionBeforeDeath.facing);
          const isTaunted = checkTauntStatus(type, debuffLookupData, fight, relativeTime, actorId);

          positions.push({
            timestamp: relativeTime,
            position,
            rotation,
            isAlive: false,
            isDead: true,
            isTaunted,
          });
        }
        continue;
      }

      // For NPCs (including pets), skip positions if no recent event within 5 seconds
      if (isNPC && !hasRecentEvent(actorId, currentTimestamp, eventTimes)) {
        continue;
      }

      // Find appropriate position data
      let currentPosition: { x: number; y: number; facing: number; timestamp: number } | null =
        null;

      if (history.length === 1) {
        currentPosition = history[0];
      } else if (history.length > 1) {
        // Binary search for better performance with large datasets
        let left = 0;
        let right = history.length - 1;
        let beforePos: (typeof history)[0] | undefined;
        let afterPos: (typeof history)[0] | undefined;

        // Find the last position <= currentTimestamp
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (history[mid].timestamp <= currentTimestamp) {
            beforePos = history[mid];
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }

        // Find the first position > currentTimestamp
        if (left < history.length) {
          afterPos = history[left];
        }

        if (beforePos && afterPos) {
          // Check if we're exactly at the afterPos timestamp (or very close)
          if (Math.abs(currentTimestamp - afterPos.timestamp) <= INTERPOLATION_TOLERANCE_MS) {
            // We're at the exact timestamp of the afterPos event, use it directly
            currentPosition = afterPos;
          } else {
            // Check if we should interpolate based on gap size
            const gap = afterPos.timestamp - beforePos.timestamp;

            if (gap < GAP_THRESHOLD_MS) {
              // Small gap: interpolate between positions
              const interpolated = interpolate(beforePos, afterPos, currentTimestamp);
              currentPosition = {
                ...interpolated,
                timestamp: currentTimestamp,
              };
            } else {
              // Large gap: don't interpolate, just use the most recent position
              // This prevents unwanted movement during minimum visibility periods
              currentPosition = beforePos;
            }
          }
        } else {
          currentPosition = beforePos || afterPos || history[0];
        }
      }

      if (!currentPosition) {
        continue;
      }

      // Check if actor is taunted (only for enemies and bosses)
      const isTaunted = checkTauntStatus(type, debuffLookupData, fight, relativeTime, actorId);

      // Convert coordinates
      const position = convertCoordinates(currentPosition.x, currentPosition.y);

      // Show all actors regardless of alive/appearance status
      positions.push({
        timestamp: relativeTime,
        position,
        rotation: convertRotation(currentPosition.facing),
        isAlive: true, // Show all actors as alive
        isDead: false, // Not dead in normal case
        isTaunted,
      });
    }

    // Always create timeline for all actors
    actorTimelines[actorId] = {
      id: actorId,
      name: actorName,
      type,
      role,
      positions,
    };

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
