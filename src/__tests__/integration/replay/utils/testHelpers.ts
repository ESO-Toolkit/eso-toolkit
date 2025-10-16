/**
 * Test utilities for replay system integration tests
 * Provides helper functions for setting up and testing replay data flows
 */

import {
  TimestampPositionLookup,
  ActorPosition,
} from '../../../../workers/calculations/CalculateActorPositions';

/**
 * Creates a mock TimestampPositionLookup for testing
 */
export function createMockPositionLookup(
  positions: Record<
    number,
    Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
  >,
): TimestampPositionLookup {
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = {};
  const timestamps = new Set<number>();

  // Build the lookup structure
  for (const [actorIdStr, positionArray] of Object.entries(positions)) {
    const actorId = Number(actorIdStr);

    for (const pos of positionArray) {
      timestamps.add(pos.timestamp);

      if (!positionsByTimestamp[pos.timestamp]) {
        positionsByTimestamp[pos.timestamp] = {};
      }

      positionsByTimestamp[pos.timestamp][actorId] = {
        id: actorId,
        name: `Actor${actorId}`,
        type: 'player',
        position: [pos.x, pos.y, pos.z],
        rotation: pos.rotation,
        isDead: false,
      };
    }
  }

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
  const fightDuration =
    sortedTimestamps.length > 0
      ? sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]
      : 0;
  const fightStartTime = sortedTimestamps[0] || 0;

  // Check if timestamps are at regular intervals
  let hasRegularIntervals = false;
  let sampleInterval = 0;

  if (sortedTimestamps.length >= 2) {
    sampleInterval = sortedTimestamps[1] - sortedTimestamps[0];
    hasRegularIntervals = sortedTimestamps.every(
      (ts, i) => i === 0 || ts - sortedTimestamps[i - 1] === sampleInterval,
    );
  }

  return {
    positionsByTimestamp,
    sortedTimestamps,
    fightDuration,
    fightStartTime,
    sampleInterval,
    hasRegularIntervals,
  };
}

/**
 * Finds a position at a specific timestamp
 */
export function getPositionAtTimestamp(
  lookup: TimestampPositionLookup,
  actorId: number,
  timestamp: number,
): ActorPosition | null {
  // Find the closest timestamp
  const { sortedTimestamps, positionsByTimestamp } = lookup;

  if (sortedTimestamps.length === 0) {
    return null;
  }

  let closest = sortedTimestamps[0];
  let minDiff = Math.abs(sortedTimestamps[0] - timestamp);

  for (const ts of sortedTimestamps) {
    const diff = Math.abs(ts - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ts;
    }
  }

  // Get the actor position at that timestamp
  const positionsAtTime = positionsByTimestamp[closest];
  return positionsAtTime?.[actorId] || null;
}

/**
 * Validates that position data is properly formatted
 */
export function validatePositionData(lookup: TimestampPositionLookup): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check basic structure
  if (!lookup.positionsByTimestamp || typeof lookup.positionsByTimestamp !== 'object') {
    errors.push('positionsByTimestamp is missing or invalid');
    return { isValid: false, errors };
  }

  if (!Array.isArray(lookup.sortedTimestamps)) {
    errors.push('sortedTimestamps is not an array');
    return { isValid: false, errors };
  }

  if (lookup.sortedTimestamps.length === 0) {
    errors.push('No timestamps found');
    return { isValid: false, errors };
  }

  // Check that timestamps are sorted
  for (let i = 1; i < lookup.sortedTimestamps.length; i++) {
    if (lookup.sortedTimestamps[i] < lookup.sortedTimestamps[i - 1]) {
      errors.push(
        `Timestamps are not sorted (${lookup.sortedTimestamps[i - 1]} > ${lookup.sortedTimestamps[i]})`,
      );
      break;
    }
  }

  // Check each timestamp's position data
  for (const timestamp of lookup.sortedTimestamps) {
    const positionsAtTime = lookup.positionsByTimestamp[timestamp];
    if (!positionsAtTime) {
      errors.push(`Missing position data for timestamp ${timestamp}`);
      continue;
    }

    for (const [actorId, position] of Object.entries(positionsAtTime)) {
      if (!position.position || position.position.length !== 3) {
        errors.push(`Actor ${actorId} at ${timestamp}: invalid position array`);
      }
      if (typeof position.rotation !== 'number') {
        errors.push(`Actor ${actorId} at ${timestamp}: invalid rotation`);
      }
      if (typeof position.isDead !== 'boolean') {
        errors.push(`Actor ${actorId} at ${timestamp}: invalid isDead flag`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a mock Redux store state for testing
 */
export function createMockReplayState(overrides = {}): {
  replay: {
    isPlaying: boolean;
    currentTime: number;
    playbackSpeed: number;
    scrubbingMode: boolean;
    [key: string]: unknown;
  };
} {
  return {
    replay: {
      isPlaying: false,
      currentTime: 0,
      playbackSpeed: 1.0,
      scrubbingMode: false,
      ...overrides,
    },
  };
}

/**
 * Waits for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  checkIntervalMs = 100,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }

  return false;
}

/**
 * Creates a mock worker response for testing
 */
export function createMockWorkerResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Simulates timeline scrubbing by generating time values
 */
export function* generateTimelineValues(
  startTime: number,
  endTime: number,
  step: number,
): Generator<number> {
  for (let t = startTime; t <= endTime; t += step) {
    yield t;
  }
}

/**
 * Validates event ordering
 */
export function validateEventOrdering(events: Array<{ timestamp: number }>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp < events[i - 1].timestamp) {
      errors.push(
        `Events out of order at index ${i}: ${events[i - 1].timestamp} > ${events[i].timestamp}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
