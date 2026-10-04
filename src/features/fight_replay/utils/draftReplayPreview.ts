import type { FightFragment } from '../../../graphql/gql/graphql';
import type {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

export const DRAFT_REPLAY_DURATION_MS = 30_000;
export const DRAFT_REPLAY_ACTOR_ID = 900_001;

const SAMPLE_INTERVAL_MS = 100;
const PREVIEW_PLAYERS = [
  { id: 900_002, name: 'Preview Tank', role: 'tank', offset: [0, 3] },
  { id: 900_003, name: 'Preview Healer', role: 'healer', offset: [-5, -4] },
  { id: 900_004, name: 'Preview Damage', role: 'dps', offset: [5, -4] },
] as const;

/** Simulated positions for inspecting a draft in the replay renderer, without report data. */
export function buildDraftReplayLookup({
  name,
  kind,
}: {
  name: string;
  kind: 'boss' | 'lesser';
}): TimestampPositionLookup {
  const positionsByTimestamp: TimestampPositionLookup['positionsByTimestamp'] = {};
  const sortedTimestamps: number[] = [];

  for (let time = 0; time <= DRAFT_REPLAY_DURATION_MS; time += SAMPLE_INTERVAL_MS) {
    // Modulo makes the final frame exactly equal to the first, including its rotation.
    const phase = ((time % DRAFT_REPLAY_DURATION_MS) / DRAFT_REPLAY_DURATION_MS) * Math.PI * 2;
    const x = 50 + 2 * Math.sin(phase);
    const z = 50 + 2 * Math.cos(phase);
    const actors: Record<number, ActorPosition> = {
      [DRAFT_REPLAY_ACTOR_ID]: {
        id: DRAFT_REPLAY_ACTOR_ID,
        name,
        type: kind === 'boss' ? 'boss' : 'enemy',
        position: [x, 0, z],
        rotation: (phase + Math.PI / 2) % (Math.PI * 2),
        isDead: false,
      },
    };

    for (const player of PREVIEW_PLAYERS) {
      const [offsetX, offsetZ] = player.offset;
      actors[player.id] = {
        id: player.id,
        name: player.name,
        type: 'player',
        role: player.role,
        position: [x + offsetX, 0, z + offsetZ],
        rotation: Math.atan2(-offsetX, -offsetZ),
        isDead: false,
      };
    }
    positionsByTimestamp[time] = actors;
    sortedTimestamps.push(time);
  }

  return {
    positionsByTimestamp,
    sortedTimestamps,
    actorIds: [DRAFT_REPLAY_ACTOR_ID, ...PREVIEW_PLAYERS.map((player) => player.id)],
    fightDuration: DRAFT_REPLAY_DURATION_MS,
    fightStartTime: 0,
    sampleInterval: SAMPLE_INTERVAL_MS,
    hasRegularIntervals: true,
  };
}

export function buildDraftReplayFight(name: string): FightFragment {
  return {
    id: -1,
    name: `${name} - simulated draft preview`,
    encounterID: 0,
    startTime: 0,
    endTime: DRAFT_REPLAY_DURATION_MS,
    boundingBox: { minX: 1000, maxX: 9000, minY: 1000, maxY: 9000 },
  };
}
