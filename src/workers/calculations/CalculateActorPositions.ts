import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { KnownAbilities } from '../../types/abilities';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  ResourceChangeEvent,
  CastEvent,
} from '../../types/combatlogEvents';
import { isBuffActiveOnTarget, BuffLookupData } from '../../utils/BuffLookupUtils';
import { convertCoordinatesWithBottomLeft, convertRotation } from '../../utils/coordinateUtils';
import { fightTimeToTimestamp } from '../../utils/fightTimeUtils';
import { Logger, LogLevel } from '../../utils/logger';
import { resolveActorName } from '../../utils/resolveActorName';
import { OnProgressCallback } from '../Utils';

// Create logger instance for actor position calculations (worker context)
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'ActorPositions',
});

export interface ActorPosition {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
  role?: 'dps' | 'tank' | 'healer';
  position: [number, number, number];
  rotation: number;
  isDead: boolean;
  isTaunted?: boolean;
  health?: {
    current: number;
    max: number;
    percentage: number;
  };
}

export interface TimestampPositionLookup {
  /** Record of timestamp to Record of actorId to position data for O(1) lookup */
  positionsByTimestamp: Record<number, Record<number, ActorPosition>>;
  /** Sorted array of all unique timestamps for binary search */
  sortedTimestamps: number[];
  /** Fight duration for bounds checking */
  fightDuration: number;
  /** Fight start time for calculations */
  fightStartTime: number;
  /** The actual interval used for timestamp generation (for O(1) lookup) */
  sampleInterval: number;
  /** Whether timestamps use regular intervals (enables O(1) mathematical lookup) */
  hasRegularIntervals: boolean;
}

export interface FightEvents {
  damage: DamageEvent[];
  heal: HealEvent[];
  death: DeathEvent[];
  resource: ResourceChangeEvent[];
  cast: CastEvent[];
}

export interface ActorPositionsCalculationTask {
  fight: FightFragment;
  events: FightEvents;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  actorsById?: Record<string | number, ReportActorFragment>;
  debuffLookupData?: BuffLookupData;
}

/**
 * Get actor position at closest available timestamp - O(1) for regular intervals, O(log n) fallback
 * This is the most optimized approach, using mathematical calculation when possible
 */
export function getActorPositionAtClosestTimestamp(
  lookup: TimestampPositionLookup,
  actorId: number,
  targetTimestamp: number,
): ActorPosition | null {
  if (lookup.sortedTimestamps.length === 0) return null;

  let closest: number;

  // Use O(1) mathematical calculation for regular intervals
  if (lookup.hasRegularIntervals && lookup.sampleInterval > 0) {
    const intervalMs = lookup.sampleInterval;
    const closestIndex = Math.round(targetTimestamp / intervalMs);
    const boundedIndex = Math.max(0, Math.min(closestIndex, lookup.sortedTimestamps.length - 1));
    closest = lookup.sortedTimestamps[boundedIndex];
  } else {
    // Fallback to binary search for irregular intervals
    let left = 0;
    let right = lookup.sortedTimestamps.length - 1;
    closest = lookup.sortedTimestamps[0];
    let minDiff = Math.abs(targetTimestamp - closest);

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const current = lookup.sortedTimestamps[mid];
      const diff = Math.abs(targetTimestamp - current);

      if (diff < minDiff) {
        minDiff = diff;
        closest = current;
      }

      if (current === targetTimestamp) {
        closest = current;
        break;
      } else if (current < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  const positionsAtTimestamp = lookup.positionsByTimestamp[closest];
  return positionsAtTimestamp?.[actorId] || null;
}

/**
 * Get all actor positions at the closest available timestamp - O(1) for regular intervals, O(log n) fallback
 * Efficiently returns all actors' positions for a given time, useful for high-frequency rendering
 */
export function getAllActorPositionsAtTimestamp(
  lookup: TimestampPositionLookup,
  targetTimestamp: number,
): ActorPosition[] {
  if (lookup.sortedTimestamps.length === 0) return [];

  let closest: number;

  // Use O(1) mathematical calculation for regular intervals
  if (lookup.hasRegularIntervals && lookup.sampleInterval > 0) {
    const intervalMs = lookup.sampleInterval;
    const closestIndex = Math.round(targetTimestamp / intervalMs);
    const boundedIndex = Math.max(0, Math.min(closestIndex, lookup.sortedTimestamps.length - 1));
    closest = lookup.sortedTimestamps[boundedIndex];
  } else {
    // Fallback to binary search for irregular intervals
    let left = 0;
    let right = lookup.sortedTimestamps.length - 1;
    closest = lookup.sortedTimestamps[0];
    let minDiff = Math.abs(targetTimestamp - closest);

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const current = lookup.sortedTimestamps[mid];
      const diff = Math.abs(targetTimestamp - current);

      if (diff < minDiff) {
        minDiff = diff;
        closest = current;
      }

      if (current === targetTimestamp) {
        closest = current;
        break;
      } else if (current < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  const positionsAtTimestamp = lookup.positionsByTimestamp[closest];
  return positionsAtTimestamp ? Object.values(positionsAtTimestamp) : [];
}

// Constants for coordinate conversion and thresholds
const GAP_THRESHOLD_MS = 5000;
const INTERPOLATION_TOLERANCE_MS = 1;
const MIN_VISIBILITY_MS = 1000;
const SAMPLE_INTERVAL_MS = 4.7; // 240Hz sampling rate (better performance vs quality balance)
const MAX_TIMESTAMPS = 72000; // Cap at 5 minutes worth of 240Hz data to prevent excessive computation

// Memory-efficient batch size for processing
const ACTOR_BATCH_SIZE = 50; // Process actors in batches to manage memory
const PROGRESS_REPORT_INTERVAL = 25; // Report progress every N actors

// Memory management: limit timestamp processing for very large datasets
function shouldLimitTimestamps(timestampCount: number, actorCount: number): boolean {
  const estimatedMemoryMB = (timestampCount * actorCount * 200) / (1024 * 1024); // Rough estimate
  return estimatedMemoryMB > 500; // Limit if estimated memory usage > 500MB
}

function checkTauntStatus(
  type: string,
  debuffLookupData: BuffLookupData | undefined,
  fight: FightFragment,
  relativeTime: number,
  actorId: number,
  actorDeathEvents: Map<number, Array<{ type: 'death' | 'resurrection'; timestamp: number }>>,
): boolean {
  if (!(type === 'enemy' || type === 'boss') || !debuffLookupData || !fight) {
    return false;
  }

  const currentTimestamp = fightTimeToTimestamp(relativeTime, fight);

  // Check if the taunt buff is active on this target
  const isActive = isBuffActiveOnTarget(
    debuffLookupData,
    KnownAbilities.TAUNT,
    currentTimestamp,
    actorId,
  );

  if (!isActive) {
    return false;
  }

  // Get the taunt interval that's currently active to find the source
  const tauntIntervals = debuffLookupData.buffIntervals[KnownAbilities.TAUNT] || [];
  const activeInterval = tauntIntervals.find(
    (interval) =>
      interval.targetID === actorId &&
      currentTimestamp >= interval.start &&
      currentTimestamp < interval.end,
  );

  if (!activeInterval) {
    return false; // No active taunt interval found
  }

  // Check if the taunt source is still alive
  const sourceDeathEvents = actorDeathEvents.get(activeInterval.sourceID) || [];

  // Sort events chronologically and determine if source is dead at current timestamp
  const sortedEvents = sourceDeathEvents.slice().sort((a, b) => a.timestamp - b.timestamp);
  let sourceIsDead = false;

  // Walk through events to find current status of the taunt source
  for (const event of sortedEvents) {
    if (currentTimestamp >= event.timestamp) {
      sourceIsDead = event.type === 'death';
    } else {
      break; // Stop at first future event
    }
  }

  // If the taunt source is dead, the taunt is effectively broken
  return !sourceIsDead;
}

function trackActorEvent(
  actorId: number,
  timestamp: number,
  actorFirstEventTime: Map<number, number>,
  actorEventTimes: Map<number, number[]>,
  actorLastEventTime: Map<number, number>,
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

  // Update last event time (resurrection is now handled explicitly for cast events)
  actorLastEventTime.set(actorId, timestamp);
}

// Helper interfaces for events with position data
interface ResourcesWithPosition {
  x: number;
  y: number;
  facing: number;
  hitPoints?: number;
  maxHitPoints?: number;
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
    Array<{
      x: number;
      y: number;
      facing: number;
      timestamp: number;
      health?: {
        current: number;
        max: number;
        percentage: number;
      };
    }>
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
      // Extract health information if available
      let health: { current: number; max: number; percentage: number } | undefined;
      if (resources.hitPoints !== undefined && resources.maxHitPoints !== undefined) {
        const current = resources.hitPoints;
        const max = resources.maxHitPoints;
        const percentage = max > 0 ? (current / max) * 100 : 0;
        health = { current, max, percentage };
      }

      history.push({
        x: resources.x,
        y: resources.y,
        facing: resources.facing,
        timestamp: event.timestamp,
        health,
      });
    }
  }
}

/**
 * Check if an actor should be visible at the current timestamp.
 * Actors are visible at exact event times, remain visible for at least 1 second after their last event,
 * and show continuous positions during gaps shorter than 5 seconds.
 */
/**
 * Optimized check for recent events using pre-sorted event times
 */
function hasRecentEvent(
  actorId: number,
  currentTimestamp: number,
  sortedEventTimes: number[],
  windowMs = GAP_THRESHOLD_MS,
): boolean {
  if (!sortedEventTimes || sortedEventTimes.length === 0) {
    return false;
  }

  const tolerance = INTERPOLATION_TOLERANCE_MS;
  const minVisibilityMs = MIN_VISIBILITY_MS;

  // For small arrays, linear search is faster than binary search overhead
  if (sortedEventTimes.length <= 20) {
    for (const eventTime of sortedEventTimes) {
      if (Math.abs(eventTime - currentTimestamp) <= tolerance) {
        return true;
      }
    }
  } else {
    // Binary search for exact match within tolerance for large arrays
    let left = 0;
    let right = sortedEventTimes.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const diff = Math.abs(sortedEventTimes[mid] - currentTimestamp);

      if (diff <= tolerance) {
        return true;
      }

      if (sortedEventTimes[mid] < currentTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  // Binary search to find insertion point (where currentTimestamp would be inserted)
  let insertionIndex = 0;
  let left = 0;
  let right = sortedEventTimes.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedEventTimes[mid] <= currentTimestamp) {
      insertionIndex = mid + 1;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  const mostRecentEvent = insertionIndex > 0 ? sortedEventTimes[insertionIndex - 1] : null;
  const nextEvent =
    insertionIndex < sortedEventTimes.length ? sortedEventTimes[insertionIndex] : null;

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
 * Calculate actor positions for efficient lookup at any timestamp.
 *
 * Returns an optimized lookup structure that provides efficient access to actor positions
 * at any given timestamp.
 *
 * Performance characteristics:
 * - O(1) lookup for regular intervals: mathematical calculation
 * - O(log n) lookup for irregular intervals: binary search fallback
 */
export function calculateActorPositions(
  data: ActorPositionsCalculationTask,
  onProgress?: OnProgressCallback,
): TimestampPositionLookup {
  const { fight, events, playersById, actorsById, debuffLookupData } = data;
  const sampleInterval = SAMPLE_INTERVAL_MS;

  onProgress?.(0);

  if (!fight || !events) {
    return {
      positionsByTimestamp: {},
      sortedTimestamps: [],
      fightDuration: 0,
      fightStartTime: 0,
      sampleInterval: SAMPLE_INTERVAL_MS,
      hasRegularIntervals: true,
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
      health?: {
        current: number;
        max: number;
        percentage: number;
      };
    }>
  >();

  // Track first event timestamp for each actor
  const actorFirstEventTime = new Map<number, number>();
  // Track all event timestamps for each actor (for 5-second recent event check)
  const actorEventTimes = new Map<number, number[]>();
  // Track death status for each actor - maps actor ID to array of death/resurrection events
  const actorDeathEvents = new Map<
    number,
    Array<{ type: 'death' | 'resurrection'; timestamp: number }>
  >();
  // Track last event timestamp for each actor (to determine if they're still dead)
  const actorLastEventTime = new Map<number, number>();

  // Combine all events and sort by timestamp
  const allEvents = [
    ...events.damage,
    ...events.heal,
    ...events.death,
    ...events.resource,
    ...events.cast,
  ].sort((a, b) => a.timestamp - b.timestamp);

  onProgress?.(0.1);

  // Collect position data from events
  for (const event of allEvents) {
    // Track death and resurrection status
    if (event.type === 'death') {
      const deathEvent = event as DeathEvent;
      if (!actorDeathEvents.has(deathEvent.targetID)) {
        actorDeathEvents.set(deathEvent.targetID, []);
      }
      const events = actorDeathEvents.get(deathEvent.targetID);
      if (events) {
        events.push({
          type: 'death',
          timestamp: deathEvent.timestamp,
        });
      }
    }

    // Handle resurrection cast events
    if (event.type === 'cast') {
      const castEvent = event as CastEvent;
      if (castEvent.abilityGameID === KnownAbilities.RESURRECT && castEvent.targetID) {
        if (!actorDeathEvents.has(castEvent.targetID)) {
          actorDeathEvents.set(castEvent.targetID, []);
        }
        const events = actorDeathEvents.get(castEvent.targetID);
        if (events) {
          events.push({
            type: 'resurrection',
            timestamp: castEvent.timestamp,
          });
        }
      }
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
      );

      // Extract position data (skip for cast events as they don't have position data)
      if (event.type !== 'cast') {
        const resourceKey = isTarget ? 'targetResources' : 'sourceResources';
        if (resourceKey in event) {
          extractPositionData(
            event as DamageEvent | HealEvent | DeathEvent | ResourceChangeEvent,
            actorId,
            resourceKey,
            actorPositionHistory,
          );
        }
      }
    }
  }

  onProgress?.(0.3);

  // Sort position histories
  actorPositionHistory.forEach((history) => {
    history.sort((a, b) => a.timestamp - b.timestamp);
  });

  // Generate sample timestamps at regular intervals
  const timestamps: number[] = [];
  const adjustedInterval = Math.max(sampleInterval, fightDuration / MAX_TIMESTAMPS);
  const hasRegularIntervals = adjustedInterval === sampleInterval; // True if we didn't need to adjust

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
    pos1: {
      x: number;
      y: number;
      facing: number;
      timestamp: number;
      health?: { current: number; max: number; percentage: number };
    },
    pos2: {
      x: number;
      y: number;
      facing: number;
      timestamp: number;
      health?: { current: number; max: number; percentage: number };
    },
    timestamp: number,
  ): {
    x: number;
    y: number;
    facing: number;
    health?: { current: number; max: number; percentage: number };
  } => {
    const timeDiff = pos2.timestamp - pos1.timestamp;
    if (timeDiff === 0) return pos1;

    const progress = Math.max(0, Math.min(1, (timestamp - pos1.timestamp) / timeDiff));
    const angleDiff = ((pos2.facing - pos1.facing + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Interpolate health if both positions have health data
    let health: { current: number; max: number; percentage: number } | undefined;
    if (pos1.health && pos2.health) {
      const currentHealth =
        pos1.health.current + (pos2.health.current - pos1.health.current) * progress;
      const maxHealth = pos1.health.max + (pos2.health.max - pos1.health.max) * progress;
      const percentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;
      health = { current: currentHealth, max: maxHealth, percentage };
    } else if (pos1.health) {
      // Use the first position's health if second doesn't have it
      health = pos1.health;
    } else if (pos2.health) {
      // Use the second position's health if first doesn't have it
      health = pos2.health;
    }

    return {
      x: pos1.x + (pos2.x - pos1.x) * progress,
      y: pos1.y + (pos2.y - pos1.y) * progress,
      facing: pos1.facing + angleDiff * progress,
      health,
    };
  };

  // Build memory-efficient lookup structure directly
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = {};

  // Pre-allocate timestamp objects to avoid repeated property access
  const timestampSet = new Set(timestamps);
  for (const timestamp of timestampSet) {
    positionsByTimestamp[timestamp] = {};
  }

  // Pre-sort all event times once to avoid repeated sorting in hasRecentEvent
  const sortedEventTimesCache = new Map<number, number[]>();
  const allActorIds: number[] = [];

  actorPositionHistory.forEach((_, actorId) => {
    allActorIds.push(actorId);

    // Pre-sort event times for this actor
    const eventTimes = actorEventTimes.get(actorId) || [];
    if (eventTimes.length > 0) {
      sortedEventTimesCache.set(
        actorId,
        [...eventTimes].sort((a, b) => a - b),
      );
    }
  });

  let processedActors = 0;
  const totalActors = allActorIds.length;

  // Check if we should limit processing for memory efficiency
  const memoryLimited = shouldLimitTimestamps(timestamps.length, totalActors);
  if (memoryLimited) {
    logger.warn('Large dataset detected', {
      timestamps: timestamps.length,
      totalActors,
      recommendation: 'Consider reducing sample rate for better performance',
    });
  }

  // Process actors in batches for better memory management
  const actorBatches = [];
  for (let i = 0; i < allActorIds.length; i += ACTOR_BATCH_SIZE) {
    actorBatches.push(allActorIds.slice(i, i + ACTOR_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < actorBatches.length; batchIndex++) {
    const actorBatch = actorBatches[batchIndex];

    for (const actorId of actorBatch) {
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

      // Get first event time for this actor
      const firstEventTime = actorFirstEventTime.get(actorId);
      const isNPC = type !== 'player' && type !== 'boss'; // Includes pets, enemies, and friendly NPCs

      // Process each timestamp and directly populate the lookup structure
      for (const relativeTime of timestamps) {
        const currentTimestamp = fightStartTime + relativeTime;

        // For NPCs (including pets), skip positions before their first event
        if (isNPC && firstEventTime && currentTimestamp < firstEventTime) {
          continue;
        }

        // Check if actor is dead at this timestamp
        const actorEvents = actorDeathEvents.get(actorId) || [];

        // Sort events chronologically and determine if actor is dead at current timestamp
        const sortedEvents = actorEvents.slice().sort((a, b) => a.timestamp - b.timestamp);
        let isDead = false;

        // Walk through events to find current status
        for (const event of sortedEvents) {
          if (currentTimestamp >= event.timestamp) {
            isDead = event.type === 'death';
          } else {
            break; // Stop at first future event
          }
        }

        // If actor is dead, handle based on actor type
        if (isDead) {
          // For NPCs (enemies, pets, friendly NPCs), stop giving positions after death
          if (isNPC) {
            continue;
          }

          // For players and bosses, continue giving positions at their last known location
          // Find the last position before the most recent death time
          const currentDeathTimestamp = sortedEvents
            .slice()
            .reverse()
            .find((e) => e.type === 'death' && currentTimestamp >= e.timestamp)?.timestamp;

          const lastPositionBeforeDeath = history
            .slice()
            .reverse()
            .find((pos) => (currentDeathTimestamp ? pos.timestamp < currentDeathTimestamp : false));
          if (lastPositionBeforeDeath) {
            const position = convertCoordinatesWithBottomLeft(
              lastPositionBeforeDeath.x,
              lastPositionBeforeDeath.y,
            );
            const rotation = convertRotation(lastPositionBeforeDeath.facing);
            const isTaunted = checkTauntStatus(
              type,
              debuffLookupData,
              fight,
              relativeTime,
              actorId,
              actorDeathEvents,
            );

            // Extract health information if available
            let health: { current: number; max: number; percentage: number } | undefined;
            if (lastPositionBeforeDeath.health) {
              // For bosses at the beginning of the fight, ensure health starts at 100%
              if (type === 'boss' && relativeTime === 0 && lastPositionBeforeDeath.health.max > 0) {
                health = {
                  current: lastPositionBeforeDeath.health.max,
                  max: lastPositionBeforeDeath.health.max,
                  percentage: 100,
                };
              } else {
                health = lastPositionBeforeDeath.health;
              }
            }

            // Directly add to lookup structure
            positionsByTimestamp[relativeTime][actorId] = {
              id: actorId,
              name: actorName,
              type,
              role,
              position,
              rotation,
              isDead: true,
              isTaunted,
              health,
            };
          }
          continue;
        }

        // For NPCs (including pets), skip positions if no recent event within 5 seconds
        // Use pre-sorted event times for better performance
        const sortedEventTimes = sortedEventTimesCache.get(actorId) || [];
        if (isNPC && !hasRecentEvent(actorId, currentTimestamp, sortedEventTimes)) {
          continue;
        }

        // Find appropriate position data
        let currentPosition: {
          x: number;
          y: number;
          facing: number;
          timestamp: number;
          health?: { current: number; max: number; percentage: number };
        } | null = null;

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
        // Cache the result to avoid repeated function calls for same conditions
        const isTaunted =
          type === 'enemy' || type === 'boss'
            ? checkTauntStatus(
                type,
                debuffLookupData,
                fight,
                relativeTime,
                actorId,
                actorDeathEvents,
              )
            : false;

        // Convert coordinates once and reuse
        const convertedPosition = convertCoordinatesWithBottomLeft(
          currentPosition.x,
          currentPosition.y,
        );
        const convertedRotation = convertRotation(currentPosition.facing);

        // Extract health information if available
        let health: { current: number; max: number; percentage: number } | undefined;
        if (currentPosition.health) {
          // For bosses at the beginning of the fight, ensure health starts at 100%
          if (type === 'boss' && relativeTime === 0 && currentPosition.health.max > 0) {
            health = {
              current: currentPosition.health.max,
              max: currentPosition.health.max,
              percentage: 100,
            };
          } else {
            health = currentPosition.health;
          }
        }

        // Directly add to lookup structure
        positionsByTimestamp[relativeTime][actorId] = {
          id: actorId,
          name: actorName,
          type,
          role,
          position: convertedPosition,
          rotation: convertedRotation,
          isDead, // Use the calculated death status
          isTaunted,
          health,
        };
      }

      processedActors++;
      if (processedActors % PROGRESS_REPORT_INTERVAL === 0) {
        onProgress?.(0.6 + (processedActors / totalActors) * 0.4);
      }
    }

    // Report progress after each batch
    const batchProgress = ((batchIndex + 1) / actorBatches.length) * 0.4;
    onProgress?.(0.6 + batchProgress);
  }

  onProgress?.(1);

  return {
    positionsByTimestamp,
    sortedTimestamps: [...timestamps].sort((a, b) => a - b),
    fightDuration,
    fightStartTime,
    sampleInterval: adjustedInterval,
    hasRegularIntervals,
  };
}
