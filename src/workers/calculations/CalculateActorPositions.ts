import { FightFragment, ReportActorFragment } from '../../graphql/gql/graphql';
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

// Create logger instance for actor position calculations (worker context). INFO so the one-line
// multi-instance split summary surfaces (once per fight) — the signal for live-verifying that
// previously-teleporting packs of adds now render as separate pucks. Warnings still pass through.
const logger = new Logger({
  level: LogLevel.INFO,
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
  /**
   * Real ESO-Logs report actor id this puck derives from. Equals `id` for single-instance actors;
   * for a multi-instance NPC copy, `id` is a synthetic render id and `baseActorId` recovers the real
   * report id. Any consumer that joins back to report data (actorsById / playersById / event indices)
   * MUST use `baseActorId`, never `id`. See INSTANCE_STRIDE / baseActorIdOf below.
   */
  baseActorId?: number;
  /** Instance slot for a multi-instance NPC copy (0 = primary/single-instance; >=2 = extra copies). */
  instance?: number;
}

export interface TimestampPositionLookup {
  /** Record of timestamp to Record of actorId to position data for O(1) lookup */
  positionsByTimestamp: Record<number, Record<number, ActorPosition>>;
  /** Sorted array of all unique timestamps for binary search */
  sortedTimestamps: number[];
  /** Sorted actor IDs present in this lookup, avoiding render-time scans across all timestamps */
  actorIds?: number[];
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

function getClosestTimestamp(
  lookup: TimestampPositionLookup,
  targetTimestamp: number,
): number | null {
  if (lookup.sortedTimestamps.length === 0) return null;

  // Use O(1) mathematical calculation for regular intervals
  if (lookup.hasRegularIntervals && lookup.sampleInterval > 0) {
    const intervalMs = lookup.sampleInterval;
    const closestIndex = Math.round(targetTimestamp / intervalMs);
    const boundedIndex = Math.max(0, Math.min(closestIndex, lookup.sortedTimestamps.length - 1));
    return lookup.sortedTimestamps[boundedIndex];
  }

  // Fallback to binary search for irregular intervals
  let left = 0;
  let right = lookup.sortedTimestamps.length - 1;
  let closest = lookup.sortedTimestamps[0];
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

  return closest;
}

export interface ActorPositionsCalculationTask {
  fight: FightFragment;
  events: FightEvents;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  actorsById?: Record<string | number, ReportActorFragment>;
  debuffLookupData?: BuffLookupData;
  /**
   * Report code for cache identity. Fight ids are report-local, so two reports with the same
   * fight id + similar events must not share a cache key. Optional (older callers omit it);
   * the content digest still separates differing inputs.
   */
  reportCode?: string;
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
  const closest = getClosestTimestamp(lookup, targetTimestamp);
  if (closest === null) return null;

  const positionsAtTimestamp = lookup.positionsByTimestamp[closest];
  return positionsAtTimestamp?.[actorId] || null;
}

export function getActorPositionsByIdAtClosestTimestamp(
  lookup: TimestampPositionLookup,
  targetTimestamp: number,
): Record<number, ActorPosition> | null {
  const closest = getClosestTimestamp(lookup, targetTimestamp);
  if (closest === null) return null;

  return lookup.positionsByTimestamp[closest] || null;
}

/**
 * Get all actor positions at the closest available timestamp - O(1) for regular intervals, O(log n) fallback
 * Efficiently returns all actors' positions for a given time, useful for high-frequency rendering
 */
export function getAllActorPositionsAtTimestamp(
  lookup: TimestampPositionLookup,
  targetTimestamp: number,
): ActorPosition[] {
  const positionsAtTimestamp = getActorPositionsByIdAtClosestTimestamp(lookup, targetTimestamp);
  return positionsAtTimestamp ? Object.values(positionsAtTimestamp) : [];
}

// Constants for coordinate conversion and thresholds
const GAP_THRESHOLD_MS = 5000;
const INTERPOLATION_TOLERANCE_MS = 1;
const MIN_VISIBILITY_MS = 1000;
const BOSS_DEATH_VISIBILITY_WINDOW_MS = 2000;
const SAMPLE_INTERVAL_MS = 4.7; // 240Hz sampling rate (better performance vs quality balance)
const MAX_TIMESTAMPS = 72000; // ≈5.6 minutes of 240Hz data; longer fights downsample, never truncate
const ESTIMATED_BYTES_PER_CELL = 200; // Rough estimate (matches the legacy memory heuristic)
const DESKTOP_CELL_BUDGET = (500 * 1024 * 1024) / ESTIMATED_BYTES_PER_CELL;
const MOBILE_CELL_BUDGET = (120 * 1024 * 1024) / ESTIMATED_BYTES_PER_CELL; // mobile tabs die ~1GB shared

/** Coarse pointers (phones/tablets) get the mobile memory budget. Worker-safe (window-guarded). */
export const isCoarsePointerDevice = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer:coarse)').matches;

export interface SampleIntervalOptions {
  durationMs: number;
  actorCount: number;
  baseIntervalMs?: number;
  maxTimestamps?: number;
  budgetCells?: number;
}

/**
 * Resolve the sampling interval, ENFORCING the memory budget by downsampling (doubling the
 * interval) instead of truncating the fight. Pure and unit-tested. The legacy code only warned
 * past 500MB and built the full grid anyway — the source of mobile tab reloads on long fights.
 */
export const resolveSampleInterval = ({
  durationMs,
  actorCount,
  baseIntervalMs = SAMPLE_INTERVAL_MS,
  maxTimestamps = MAX_TIMESTAMPS,
  budgetCells = DESKTOP_CELL_BUDGET,
}: SampleIntervalOptions): { intervalMs: number; downsampled: boolean } => {
  let intervalMs =
    durationMs > 0 ? Math.max(baseIntervalMs, durationMs / maxTimestamps) : baseIntervalMs;
  let downsampled = intervalMs > baseIntervalMs;
  if (durationMs > 0 && actorCount > 0) {
    for (let i = 0; i < 12; i++) {
      const cells = (Math.floor(durationMs / intervalMs) + 2) * actorCount;
      if (cells <= budgetCells) break;
      intervalMs *= 2;
      downsampled = true;
    }
  }
  return { intervalMs, downsampled };
};

// Facing values in event resources are stored in CENTI-radians: a full turn is 2π·ROTATION_SCALE,
// matching coordinateUtils' ROTATION_SCALE divisor in convertRotation (`facing / 100`). The facing
// interpolation's shortest-angle wrap must use this unit — wrapping against 2π (raw radians) folds
// any turn beyond ~1.8° into a tiny window, so headings held-then-jumped instead of turning. Kept
// in lockstep with coordinateUtils.ts's ROTATION_SCALE (not exported from there).
const ROTATION_SCALE = 100;
const FACING_FULL_TURN = 2 * Math.PI * ROTATION_SCALE; // ≈ 628 centi-radians per revolution

// ---- Multi-instance NPC splitting --------------------------------------------------------------
//
// ESO Logs assigns ONE ReportFightNPC `id` to ALL simultaneous copies of an NPC (the schema:
// `id` "is used in events to identify sources and targets" + `instanceCount` = "how many instances
// of the NPC were seen"). Each physical copy is distinguished on events by sourceInstance /
// targetInstance. Position history was keyed by `id` alone, so a pack of identical adds
// (instanceCount > 1) merged into ONE history array and the interpolator slid a single puck across
// the copies' separate map positions — the "enemies bug out and move rapidly" report.
//
// Fix: give each copy of a genuinely multi-instance NPC its own puck via a synthetic, REVERSIBLE
// render id. Single-instance actors (the overwhelming common case) keep their real id unchanged, so
// the lookup is byte-identical to before for them. If ESO Logs ever omits instance fields entirely,
// every actor collapses to a single slot and NOTHING splits → no behavior change (fail-safe).
//
// Instance numbering is small and varies across reports: single-instance NPCs log instance 0 (or
// omit it); multi-instance copies log 1, 2, 3, .... We map a raw instance to a copy "slot" where 0
// and 1 both mean the primary copy, so {0}, {1}, {0,1} are all single-instance (never split) and
// {1,2}, {0,2}, {1,2,3} split into the right number of pucks without phantom copies.
const INSTANCE_STRIDE = 1_000_000; // >> any real ReportActor.id (small sequential ints); copy counts are tiny

/** Map a raw per-event instance value to its copy slot: 0/undefined/1 => 0 (primary), N>=2 => N. */
function instanceSlot(rawInstance: number | undefined | null): number {
  const v = rawInstance ?? 0;
  return v <= 1 ? 0 : v;
}

/**
 * Synthetic render id for a (real actorId, instance) pair. The primary slot keeps the bare actorId,
 * so single-instance actors and every NPC's primary copy are unchanged; extra copies get
 * `actorId + slot * INSTANCE_STRIDE`, which cannot collide with real ids (all < INSTANCE_STRIDE) nor
 * with other copies. Reversible: see baseActorIdOf / instanceSlotOf.
 */
function makeRenderId(actorId: number, rawInstance: number | undefined | null): number {
  const slot = instanceSlot(rawInstance);
  return slot === 0 ? actorId : actorId + slot * INSTANCE_STRIDE;
}

/** Recover the real ESO-Logs actor id from a render id (for name/type/role/taunt joins). */
function baseActorIdOf(renderId: number): number {
  return renderId % INSTANCE_STRIDE;
}

/** Recover the copy slot from a render id (0 = primary/single-instance). */
function instanceSlotOf(renderId: number): number {
  return Math.floor(renderId / INSTANCE_STRIDE);
}

/** Minimal accessor for the optional instance discriminators on any positional event. */
interface EventWithInstances {
  sourceInstance?: number;
  targetInstance?: number;
}

// Memory-efficient batch size for processing
const ACTOR_BATCH_SIZE = 50; // Process actors in batches to manage memory
const PROGRESS_REPORT_INTERVAL = 25; // Report progress every N actors

// NOTE: the legacy warn-only `shouldLimitTimestamps` heuristic (500MB, no enforcement) was
// removed; resolveSampleInterval above enforces the budget by downsampling instead.

function checkTauntStatus(
  type: string,
  debuffLookupData: BuffLookupData | undefined,
  fight: FightFragment,
  relativeTime: number,
  actorId: number,
  // Pre-sorted (ascending timestamp) death/resurrection events per actor id. The death events of any
  // given source never change across timestamps, so sorting them once up front (see
  // sortedActorDeathEvents below) avoids a per-call .slice().sort() on every sampled timestamp.
  sortedActorDeathEvents: Map<number, Array<{ type: 'death' | 'resurrection'; timestamp: number }>>,
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

  // Check if the taunt source is still alive. Events are already sorted ascending by timestamp.
  const sortedEvents = sortedActorDeathEvents.get(activeInterval.sourceID) || [];
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

  onProgress?.(0);

  if (!fight || !events) {
    return {
      positionsByTimestamp: {},
      sortedTimestamps: [],
      actorIds: [],
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

  // Pre-pass: discover which actors are genuinely multi-instance so we only split those. For every
  // event, record the copy slot seen for the source and target actor. An actor is multi-instance iff
  // it shows >= 2 distinct slots (slot 0 = primary/single). This is cheap (one extra scan) and makes
  // the split fail-safe: if instance fields are absent everywhere, every actor has just slot 0 and
  // nothing is split (identical to the pre-fix behavior).
  const slotsByActor = new Map<number, Set<number>>();
  const noteSlot = (actorId: number, rawInstance: number | undefined): void => {
    let set = slotsByActor.get(actorId);
    if (!set) {
      set = new Set<number>();
      slotsByActor.set(actorId, set);
    }
    set.add(instanceSlot(rawInstance));
  };
  for (const event of allEvents) {
    const withInstances = event as EventWithInstances;
    if ('sourceID' in event) {
      noteSlot((event as { sourceID: number }).sourceID, withInstances.sourceInstance);
    }
    if ('targetID' in event) {
      noteSlot((event as { targetID: number }).targetID, withInstances.targetInstance);
    }
  }
  const multiInstanceActors = new Set<number>();
  let splitCopyCount = 0; // total pucks emitted for split NPCs (for observability)
  slotsByActor.forEach((slots, actorId) => {
    if (slots.size < 2) return;
    // Safety: the synthetic render id is `actorId + slot * INSTANCE_STRIDE`, and baseActorIdOf reverses
    // it with `% INSTANCE_STRIDE`. That round-trip is only exact while the real id is below the stride.
    // Real ESO-Logs report actor ids are small sequential ints, so this never trips in practice; if a
    // report ever exceeded it we keep the (merged) pre-fix behavior for that actor rather than risk a
    // corrupted id, and log it.
    if (actorId >= INSTANCE_STRIDE) {
      logger.warn('Skipping multi-instance split for out-of-range actor id', {
        actorId,
        instanceStride: INSTANCE_STRIDE,
      });
      return;
    }
    multiInstanceActors.add(actorId);
    splitCopyCount += slots.size;
  });

  // Map a (real actorId, raw instance) to the id under which its position history / death / event
  // times are keyed and the puck is rendered. Single-instance actors keep their real id verbatim.
  const resolveRenderId = (actorId: number, rawInstance: number | undefined): number =>
    multiInstanceActors.has(actorId) ? makeRenderId(actorId, rawInstance) : actorId;

  // Observability: surface when the split actually fires. A fight with no multi-instance NPCs logs
  // nothing (and behaves exactly as before); a trash pull logs how many NPC ids fanned out into how
  // many pucks — the signal to look for when live-verifying that "teleporting adds" are now split.
  if (multiInstanceActors.size > 0) {
    logger.info('Split multi-instance NPCs into per-copy pucks', {
      multiInstanceNpcs: multiInstanceActors.size,
      totalCopies: splitCopyCount,
    });
  }

  // Collect position data from events
  for (const event of allEvents) {
    const withInstances = event as EventWithInstances;
    // Track death and resurrection status. Death events carry targetInstance, so a copy's death is
    // recorded under that copy's render id — only the dying copy stops rendering, not its siblings.
    if (event.type === 'death') {
      const deathEvent = event as DeathEvent;
      const deathRenderId = resolveRenderId(deathEvent.targetID, deathEvent.targetInstance);
      if (!actorDeathEvents.has(deathRenderId)) {
        actorDeathEvents.set(deathRenderId, []);
      }
      const events = actorDeathEvents.get(deathRenderId);
      if (events) {
        events.push({
          type: 'death',
          timestamp: deathEvent.timestamp,
        });
      }
    }

    // Handle resurrection cast events (resurrection targets are players, which are single-instance,
    // so this resolves to the real id; a multi-instance NPC with no instance on the cast resolves to
    // its primary copy).
    if (event.type === 'cast') {
      const castEvent = event as CastEvent;
      if (castEvent.abilityGameID === KnownAbilities.RESURRECT && castEvent.targetID) {
        const resRenderId = resolveRenderId(castEvent.targetID, castEvent.targetInstance);
        if (!actorDeathEvents.has(resRenderId)) {
          actorDeathEvents.set(resRenderId, []);
        }
        const events = actorDeathEvents.get(resRenderId);
        if (events) {
          events.push({
            type: 'resurrection',
            timestamp: castEvent.timestamp,
          });
        }
      }
    }

    // Process source and target actors. Each role's events are keyed by the render id of the specific
    // copy they belong to, so a multi-instance NPC's copies build SEPARATE position histories (the
    // fix: the interpolator can no longer bridge two physically distinct copies into one teleporting
    // puck).
    const actorsToProcess: Array<{ renderId: number; isTarget: boolean }> = [];
    if ('sourceID' in event) {
      actorsToProcess.push({
        renderId: resolveRenderId(
          (event as { sourceID: number }).sourceID,
          withInstances.sourceInstance,
        ),
        isTarget: false,
      });
    }
    if ('targetID' in event) {
      actorsToProcess.push({
        renderId: resolveRenderId(
          (event as { targetID: number }).targetID,
          withInstances.targetInstance,
        ),
        isTarget: true,
      });
    }

    for (const { renderId, isTarget } of actorsToProcess) {
      trackActorEvent(
        renderId,
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
            renderId,
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

  // Pre-sort each actor's death/resurrection events ONCE. An actor's death events are invariant
  // across the (up to MAX_TIMESTAMPS) sampled timestamps, so the old per-timestamp
  // `events.slice().sort()` — both for the actor's own death check and inside checkTauntStatus —
  // recomputed identical work tens of thousands of times. We build the ascending-by-timestamp copies
  // here and reuse them everywhere below. Output is identical: same comparator, same stable ordering.
  const sortedActorDeathEvents = new Map<
    number,
    Array<{ type: 'death' | 'resurrection'; timestamp: number }>
  >();
  actorDeathEvents.forEach((deathEvents, id) => {
    sortedActorDeathEvents.set(
      id,
      deathEvents.slice().sort((a, b) => a.timestamp - b.timestamp),
    );
  });

  // No position history anywhere (e.g. a fight with no positional resources): return the
  // empty lookup WITHOUT allocating the timestamp grid. An empty grid costs tens of thousands
  // of objects and buys nothing — there is no actor to place on any frame.
  if (actorPositionHistory.size === 0) {
    return {
      positionsByTimestamp: {},
      sortedTimestamps: [],
      actorIds: [],
      fightDuration,
      fightStartTime,
      sampleInterval: SAMPLE_INTERVAL_MS,
      hasRegularIntervals: true,
    };
  }

  // Generate sample timestamps at regular intervals. The interval enforces the memory budget by
  // downsampling (never truncating the fight), and the grid is hard-capped at MAX_TIMESTAMPS.
  // The additive loop is kept deliberately: `i * interval` multiplication produces
  // last-bit-different floats than repeated addition, which would change lookup-key strings.
  const { intervalMs: adjustedInterval, downsampled } = resolveSampleInterval({
    durationMs: fightDuration,
    actorCount: actorPositionHistory.size,
    budgetCells: isCoarsePointerDevice() ? MOBILE_CELL_BUDGET : DESKTOP_CELL_BUDGET,
  });
  if (downsampled) {
    logger.warn('Downsampling replay timestamps to fit the memory budget', {
      fightDuration,
      actors: actorPositionHistory.size,
      intervalMs: adjustedInterval,
    });
  }
  const hasRegularIntervals = adjustedInterval === SAMPLE_INTERVAL_MS; // True if we didn't need to adjust

  const timestamps: number[] = [];
  for (let time = 0; time <= fightDuration; time += adjustedInterval) {
    timestamps.push(time);
    // Hard cap: the resolver guarantees count <= MAX, so at most the end-time slot is at stake.
    if (timestamps.length >= MAX_TIMESTAMPS) break;
  }
  // Ensure we include the end time: append as before while under the cap (bit-identical to
  // the legacy grid); overwrite the final cell only if the cap is already reached.
  if (timestamps[timestamps.length - 1] !== fightDuration) {
    if (timestamps.length < MAX_TIMESTAMPS) {
      timestamps.push(fightDuration);
    } else {
      timestamps[timestamps.length - 1] = fightDuration;
    }
  }

  // Progress reports are throttled to 5% steps: unthrottled per-25-actor dispatches spam Redux
  // (each dispatch re-renders progress subscribers) on large fights.
  let lastReportedProgress = 0;
  const reportProgress = (p: number): void => {
    if (p >= 1 || p - lastReportedProgress >= 0.05) {
      lastReportedProgress = p;
      onProgress?.(p);
    }
  };
  reportProgress(0.6);

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
    // Shortest-angle facing delta in the stored centi-radian unit. The extra `+ FACING_FULL_TURN`
    // before the second `%` makes the modulo positive regardless of the raw difference's sign (JS
    // `%` keeps the sign of the dividend), yielding a delta in [-half, +half) so headings turn the
    // short way and interpolate smoothly between event samples.
    const half = FACING_FULL_TURN / 2;
    const angleDiff =
      ((((pos2.facing - pos1.facing + half) % FACING_FULL_TURN) + FACING_FULL_TURN) %
        FACING_FULL_TURN) -
      half;

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
  allActorIds.sort((a, b) => a - b);

  let processedActors = 0;
  const totalActors = allActorIds.length;

  // Process actors in batches for better memory management
  const actorBatches = [];
  for (let i = 0; i < allActorIds.length; i += ACTOR_BATCH_SIZE) {
    actorBatches.push(allActorIds.slice(i, i + ACTOR_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < actorBatches.length; batchIndex++) {
    const actorBatch = actorBatches[batchIndex];

    for (const renderId of actorBatch) {
      const history = actorPositionHistory.get(renderId) || [];
      if (history.length === 0) {
        processedActors++;
        continue;
      }

      // `renderId` is the per-copy key (== real id for single-instance actors). ALL report-data joins
      // (type/role/name classification, taunt lookup) must use the REAL id; only position history,
      // death, event-times, and the emitted puck id are keyed by renderId. Every copy of one NPC
      // shares the same name/type/role, so resolving them off the base id is correct.
      const baseActorId = baseActorIdOf(renderId);
      const instance = instanceSlotOf(renderId);

      // Determine actor type and role
      const isPlayer = fight.friendlyPlayers?.includes(baseActorId) ?? false;

      // Get actor data early for boss and pet detection and name resolution
      const actorData = actorsById?.[baseActorId];

      // Check if actor is a boss by looking at actorsById data
      const isBoss = actorData?.subType === 'Boss' && actorData?.type === 'NPC';

      // Check if actor is a pet by looking at actorsById data
      const isPet = actorData?.subType === 'Pet' && actorData?.type === 'Pet';

      const isFriendlyNPC = fight.friendlyNPCs?.some((npc) => npc?.id === baseActorId) ?? false;
      const isEnemyNPC = fight.enemyNPCs?.some((npc) => npc?.id === baseActorId) ?? false;

      let type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet' = 'friendly_npc';
      if (isPlayer) type = 'player';
      else if (isBoss) type = 'boss';
      else if (isPet) type = 'pet';
      else if (isEnemyNPC || (!isFriendlyNPC && !isPlayer)) {
        type = 'enemy';
      } else if (isFriendlyNPC) type = 'friendly_npc';

      // Get role for players
      const playerData = isPlayer && playersById ? playersById[baseActorId] : undefined;
      const role = playerData?.role;

      // Get actor name (reusing actorData from above)
      const actorName = resolveActorName(actorData, baseActorId, `Actor ${baseActorId}`);

      // Get first event time for this actor
      const firstEventTime = actorFirstEventTime.get(renderId);
      const isNPC = type !== 'player' && type !== 'boss'; // Includes pets, enemies, and friendly NPCs

      // Hoist the actor's death state out of the per-timestamp loop: the death/resurrection events
      // and whether the actor ever has a recorded death are invariant across timestamps. The
      // pre-sorted copy (ascending by timestamp) is reused for the dead-state walk below.
      const sortedDeathEvents = sortedActorDeathEvents.get(renderId) || [];
      const hasRecordedDeath = sortedDeathEvents.some((event) => event.type === 'death');
      // currentDeathTimestamp is monotonic non-decreasing as relativeTime advances, so cache the
      // history scan index for the "last position before death" lookup (FIX B) and never rescan from
      // the end of the (growing) history each frame.
      let lastDeathTimestampUsed: number | undefined;
      let lastPosBeforeDeathIndex = -1;
      // Monotonic death-event cursor: relativeTime ascends, so each death/resurrection event is
      // visited exactly once per actor instead of rescanning from the start on every timestamp
      // (O(deaths) per frame → O(1) amortized). `lastDeathTs` tracks the most recent death at or
      // below the cursor, mirroring the old reverse-scan semantics exactly.
      let deathCursor = -1;
      let lastDeathTs: number | undefined;

      // Process each timestamp and directly populate the lookup structure
      for (const relativeTime of timestamps) {
        const currentTimestamp = fightStartTime + relativeTime;

        // For NPCs (including pets), skip positions before their first event
        if (isNPC && firstEventTime && currentTimestamp < firstEventTime) {
          continue;
        }

        // Determine if actor is dead at this timestamp using the pre-sorted death/resurrection
        // events (ascending by timestamp; hoisted above so the sort is not repeated per timestamp).
        const sortedEvents = sortedDeathEvents;
        while (
          deathCursor + 1 < sortedEvents.length &&
          sortedEvents[deathCursor + 1].timestamp <= currentTimestamp
        ) {
          deathCursor++;
          if (sortedEvents[deathCursor].type === 'death') {
            lastDeathTs = sortedEvents[deathCursor].timestamp;
          }
        }
        const isDead = deathCursor >= 0 && sortedEvents[deathCursor].type === 'death';

        const lastEventTimestamp = actorLastEventTime.get(renderId);

        // If actor is dead, handle based on actor type
        if (isDead) {
          // For NPCs (enemies, pets, friendly NPCs), stop giving positions after death
          if (isNPC) {
            continue;
          }

          // For players and bosses, continue giving positions at their last known location.
          // The most recent death at or before now comes from the monotonic cursor above (was an
          // allocation-free reverse walk per frame).
          const currentDeathTimestamp = lastDeathTs;

          if (type === 'boss' && currentDeathTimestamp) {
            const timeSinceDeath = currentTimestamp - currentDeathTimestamp;
            if (timeSinceDeath > BOSS_DEATH_VISIBILITY_WINDOW_MS) {
              continue;
            }
          }

          // Find the last position strictly before the death timestamp. `history` is time-ordered and
          // currentDeathTimestamp is monotonic non-decreasing across the loop, so the answer index is
          // monotonic too — advance a cached index forward instead of copying+reversing the (growing)
          // history each frame. Semantics match the old reverse().find(pos.timestamp < deathTs).
          let lastPositionBeforeDeath:
            | {
                x: number;
                y: number;
                facing: number;
                timestamp: number;
                health?: { current: number; max: number; percentage: number };
              }
            | undefined;
          if (currentDeathTimestamp !== undefined) {
            if (currentDeathTimestamp !== lastDeathTimestampUsed) {
              lastDeathTimestampUsed = currentDeathTimestamp;
              while (
                lastPosBeforeDeathIndex + 1 < history.length &&
                history[lastPosBeforeDeathIndex + 1].timestamp < currentDeathTimestamp
              ) {
                lastPosBeforeDeathIndex++;
              }
            }
            if (lastPosBeforeDeathIndex >= 0) {
              lastPositionBeforeDeath = history[lastPosBeforeDeathIndex];
            }
          }
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
              baseActorId,
              sortedActorDeathEvents,
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
            positionsByTimestamp[relativeTime][renderId] = {
              id: renderId,
              name: actorName,
              type,
              role,
              position,
              rotation,
              isDead: true,
              isTaunted,
              health,
              baseActorId,
              instance,
            };
          }
          continue;
        }

        // For bosses with no explicit death event, remove them shortly after their final interaction
        if (
          type === 'boss' &&
          !hasRecordedDeath &&
          lastEventTimestamp !== undefined &&
          currentTimestamp > lastEventTimestamp + BOSS_DEATH_VISIBILITY_WINDOW_MS
        ) {
          continue;
        }

        // For NPCs (including pets) or bosses without death records, skip positions if no recent event within 5 seconds
        // Use pre-sorted event times for better performance
        const sortedEventTimes = sortedEventTimesCache.get(renderId) || [];
        const enforceRecentEventVisibility = isNPC || (type === 'boss' && !hasRecordedDeath);
        if (
          enforceRecentEventVisibility &&
          !hasRecentEvent(renderId, currentTimestamp, sortedEventTimes)
        ) {
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
                baseActorId,
                sortedActorDeathEvents,
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
        positionsByTimestamp[relativeTime][renderId] = {
          id: renderId,
          name: actorName,
          type,
          role,
          position: convertedPosition,
          rotation: convertedRotation,
          isDead, // Use the calculated death status
          isTaunted,
          health,
          baseActorId,
          instance,
        };
      }

      processedActors++;
      if (processedActors % PROGRESS_REPORT_INTERVAL === 0) {
        reportProgress(0.6 + (processedActors / totalActors) * 0.4);
      }
    }

    // Report progress after each batch
    const batchProgress = ((batchIndex + 1) / actorBatches.length) * 0.4;
    reportProgress(0.6 + batchProgress);
  }

  reportProgress(1);

  return {
    positionsByTimestamp,
    sortedTimestamps: [...timestamps].sort((a, b) => a - b),
    actorIds: allActorIds,
    fightDuration,
    fightStartTime,
    sampleInterval: adjustedInterval,
    hasRegularIntervals,
  };
}
