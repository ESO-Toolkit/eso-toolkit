import { convertCoordinatesWithBottomLeft } from '../../utils/coordinateUtils';
import { OnProgressCallback } from '../Utils';
import { FightEvents } from './CalculateActorPositions';

const POSITION_EPSILON = 0.05; // Ignore tiny jitter between samples (~5 cm)

export interface PlayerTravelDistanceTaskInput {
  fight: {
    id: number;
    startTime: number;
    endTime: number;
  };
  events: FightEvents;
  playerIds: number[];
}

export interface PlayerTravelDistanceSummary {
  playerId: number;
  totalDistance: number;
  samples: number;
  activeDurationMs: number;
  averageSpeed: number | null;
  firstSampleTimestamp: number | null;
  lastSampleTimestamp: number | null;
}

export interface PlayerTravelDistanceResult {
  fightId: number;
  fightDurationMs: number;
  distancesByPlayerId: Record<number, PlayerTravelDistanceSummary>;
  processedEventCount: number;
}

interface PlayerTrackingState {
  lastPosition: [number, number] | null;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  totalDistance: number;
  samples: number;
}

const createInitialTrackingState = (): PlayerTrackingState => ({
  lastPosition: null,
  firstTimestamp: null,
  lastTimestamp: null,
  totalDistance: 0,
  samples: 0,
});

function extractPosition(resources?: { x: number; y: number } | null): [number, number] | null {
  if (!resources) {
    return null;
  }

  const { x, y } = resources;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const [convertedX, , convertedZ] = convertCoordinatesWithBottomLeft(x, y);
  return [convertedX, convertedZ];
}

function processSample(
  playerId: number,
  timestamp: number,
  position: [number, number],
  tracking: Map<number, PlayerTrackingState>,
): void {
  const state = tracking.get(playerId) ?? createInitialTrackingState();

  if (state.samples === 0) {
    state.firstTimestamp = timestamp;
  }

  if (state.lastPosition) {
    const dx = position[0] - state.lastPosition[0];
    const dz = position[1] - state.lastPosition[1];
    const distance = Math.hypot(dx, dz);

    if (distance > POSITION_EPSILON) {
      state.totalDistance += distance;
    }
  }

  state.lastPosition = position;
  state.lastTimestamp = timestamp;
  state.samples += 1;

  tracking.set(playerId, state);
}

export function calculatePlayerTravelDistances(
  input: PlayerTravelDistanceTaskInput,
  onProgress?: OnProgressCallback,
): PlayerTravelDistanceResult {
  const { fight, events, playerIds } = input;

  const playerSet = new Set<number>(playerIds.filter((id) => Number.isFinite(id)));
  const trackingStates = new Map<number, PlayerTrackingState>();

  // Pre-populate states for consistent output, even if a player has no samples
  for (const playerId of playerSet) {
    trackingStates.set(playerId, createInitialTrackingState());
  }

  const eventsWithPositions = [
    ...(events.damage ?? []),
    ...(events.heal ?? []),
    ...(events.death ?? []),
    ...(events.resource ?? []),
  ]
    .filter((event) => event && Number.isFinite(event.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  let processedEventCount = 0;
  const totalEventCount = eventsWithPositions.length || 1;

  onProgress?.(0);

  eventsWithPositions.forEach((event, index) => {
    processedEventCount += 1;

    const handleActor = (actorId: number | undefined, resources?: { x: number; y: number }) => {
      if (actorId == null || !playerSet.has(actorId)) {
        return;
      }

      const position = extractPosition(resources);
      if (!position) {
        return;
      }

      processSample(actorId, event.timestamp, position, trackingStates);
    };

    handleActor(event.sourceID, (event as { sourceResources?: { x: number; y: number } }).sourceResources);
    handleActor(event.targetID, (event as { targetResources?: { x: number; y: number } }).targetResources);
    if ((index + 1) % 250 === 0 || index === eventsWithPositions.length - 1) {
      onProgress?.((index + 1) / totalEventCount);
    }
  });

  const fightDurationMs = Math.max(0, (fight?.endTime ?? 0) - (fight?.startTime ?? 0));
  const distancesByPlayerId: Record<number, PlayerTravelDistanceSummary> = {};

  for (const playerId of playerSet) {
    const state = trackingStates.get(playerId) ?? createInitialTrackingState();
    const activeDurationMs = state.firstTimestamp && state.lastTimestamp
      ? Math.max(0, state.lastTimestamp - state.firstTimestamp)
      : 0;

    const averageSpeed = activeDurationMs > 0 ? state.totalDistance / (activeDurationMs / 1000) : null;

    distancesByPlayerId[playerId] = {
      playerId,
      totalDistance: state.totalDistance,
      samples: state.samples,
      activeDurationMs,
      averageSpeed,
      firstSampleTimestamp: state.firstTimestamp,
      lastSampleTimestamp: state.lastTimestamp,
    };
  }

  onProgress?.(1);

  return {
    fightId: fight?.id ?? 0,
    fightDurationMs,
    distancesByPlayerId,
    processedEventCount,
  };
}
