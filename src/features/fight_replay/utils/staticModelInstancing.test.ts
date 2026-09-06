import type {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  COOL_STICKMAN_ASSET,
  NEUTRAL_MODEL_TINT,
  type NpcModelPreviewMode,
  type StaticReplayActorModelAsset,
  normalizeActorName,
  resolveReplayActorModel,
} from './replayActorModelRegistry';
import {
  EMPTY_STATIC_MODEL_PLAN,
  buildStaticModelInstancingPlan,
  composeStaticModelInstanceColor,
  getStaticModelForActor,
} from './staticModelInstancing';

// Only the catalog LOOKUP is faked. `resolveStaticModelTint` — the code under test for tints — stays
// real and runs against these fixtures, so the tests exercise the shipped resolution rules while
// staying independent of which NPCs happen to be registered today.
jest.mock('./replayActorModelRegistry', () => ({
  ...jest.requireActual('./replayActorModelRegistry'),
  resolveReplayActorModel: jest.fn(),
}));

const mockResolve = resolveReplayActorModel as jest.MockedFunction<typeof resolveReplayActorModel>;

const transform = {
  orientEuler: [0, 0, 0] as const,
  scale: 1,
  yOffset: 0,
  yawOffset: 0,
  modelHeight: 2,
};
const provenance = {
  designation: 'project-authorized-fan-prototype',
  sourceUrl: 'https://example.invalid/fixture',
  attributionFile: 'public/models/fight-replay/npcs/README-fixture.md',
} as const;

/** One mesh, three recolour variants — the exact Kyne's Aegis knight case. */
const BLOODKNIGHT: StaticReplayActorModelAsset = {
  id: 'bloodknight-v1',
  path: 'models/fight-replay/npcs/bloodknight-v1.glb',
  renderer: 'static-boss',
  actorTypes: ['boss', 'enemy'],
  aliases: ['blood knight', 'crimson knight', 'bitter knight'],
  aliasTints: {
    'crimson knight': [1.2, 0.55, 0.55],
    'bitter knight': [0.6, 0.8, 1.15],
  },
  transform,
  provenance,
};

/** Pack trash with a single asset-wide tint and no per-alias override. */
const RAIDER: StaticReplayActorModelAsset = {
  id: 'half-giant-raider-v1',
  path: 'models/fight-replay/npcs/half-giant-raider-v1.glb',
  renderer: 'static-boss',
  actorTypes: ['enemy'],
  aliases: ['half-giant raider'],
  tint: [0.9, 0.95, 1],
  transform,
  provenance,
};

/** A shipped-style entry with no tint at all — must stay byte-for-byte "as authored". */
const UNTINTED: StaticReplayActorModelAsset = {
  id: 'captain-fixture-v1',
  path: 'models/fight-replay/npcs/captain-fixture-v1.glb',
  renderer: 'static-boss',
  actorTypes: ['boss', 'enemy'],
  aliases: ['captain fixture'],
  transform,
  provenance,
};

const CATALOG = [BLOODKNIGHT, RAIDER, UNTINTED];

beforeEach(() => {
  mockResolve.mockImplementation((actor, mode: NpcModelPreviewMode) => {
    if (actor.type === 'player') return COOL_STICKMAN_ASSET;
    if (mode !== 'prototype') return null;
    const name = normalizeActorName(actor.name);
    return (
      CATALOG.find(
        (asset) => asset.actorTypes.includes(actor.type) && asset.aliases.includes(name),
      ) ?? null
    );
  });
});

let nextId = 1;
const actorAt = (type: ActorPosition['type'], name: string): ActorPosition => ({
  id: nextId++,
  name,
  type,
  position: [0, 0, 0],
  rotation: 0,
  isDead: false,
});

/**
 * Build a lookup from frames of `[actorId, actor]` pairs. Mirrors the real shape closely enough for
 * the scan: a Record of timestamp → Record of actorId → position.
 */
function makeLookup(frames: Array<Record<number, ActorPosition>>): TimestampPositionLookup {
  const positionsByTimestamp: Record<number, Record<number, ActorPosition>> = {};
  frames.forEach((frame, index) => {
    positionsByTimestamp[index * 100] = frame;
  });
  return {
    positionsByTimestamp,
    sortedTimestamps: frames.map((_, index) => index * 100),
    fightDuration: frames.length * 100,
    fightStartTime: 0,
    sampleInterval: 100,
  } as TimestampPositionLookup;
}

describe('getStaticModelForActor', () => {
  it('returns the registry asset for a modelled hostile', () => {
    expect(getStaticModelForActor({ type: 'enemy', name: 'Blood Knight' }, 'prototype')).toBe(
      BLOODKNIGHT,
    );
  });

  it('never lets the player flipbook leak into the model path', () => {
    expect(getStaticModelForActor({ type: 'player', name: 'Someone' }, 'prototype')).toBeNull();
  });

  it('returns null without the prototype opt-in', () => {
    expect(getStaticModelForActor({ type: 'enemy', name: 'Blood Knight' }, 'off')).toBeNull();
  });
});

describe('buildStaticModelInstancingPlan', () => {
  it('gives every actor sharing one asset its own slot in that asset mesh', () => {
    // The regression this whole change exists for: under the old "first match wins" resolver, raider
    // #2 would have stayed a capsule next to its identical, fully-modelled sibling.
    const first = actorAt('enemy', 'Half-Giant Raider');
    const second = actorAt('enemy', 'Half-Giant Raider #2');
    const lookup = makeLookup([{ 10: first, 11: second }]);

    const plan = buildStaticModelInstancingPlan(lookup, [10, 11], 'prototype');

    expect(plan.assets).toEqual([RAIDER]);
    expect(plan.byActorId.get(10)?.slot).toBe(0);
    expect(plan.byActorId.get(11)?.slot).toBe(1);
    expect(plan.byActorId.get(10)?.asset).toBe(RAIDER);
    expect(plan.byActorId.get(11)?.asset).toBe(RAIDER);
    expect(plan.actorIdsByAssetId.get(RAIDER.id)).toEqual([10, 11]);
  });

  it('packs three recolour variants of one species into a single mesh', () => {
    const lookup = makeLookup([
      {
        10: actorAt('enemy', 'Blood Knight'),
        11: actorAt('enemy', 'Crimson Knight'),
        12: actorAt('enemy', 'Bitter Knight'),
      },
    ]);

    const plan = buildStaticModelInstancingPlan(lookup, [10, 11, 12], 'prototype');

    expect(plan.assets).toHaveLength(1);
    expect(plan.actorIdsByAssetId.get(BLOODKNIGHT.id)).toEqual([10, 11, 12]);
    expect(plan.byActorId.get(10)?.tint).toEqual(NEUTRAL_MODEL_TINT);
    expect(plan.byActorId.get(11)?.tint).toEqual([1.2, 0.55, 0.55]);
    expect(plan.byActorId.get(12)?.tint).toEqual([0.6, 0.8, 1.15]);
  });

  it('resolves the tint through the same name normalization as the lookup', () => {
    const lookup = makeLookup([{ 10: actorAt('enemy', '  CRIMSON   Knight #4 ') }]);

    const plan = buildStaticModelInstancingPlan(lookup, [10], 'prototype');

    expect(plan.byActorId.get(10)?.tint).toEqual([1.2, 0.55, 0.55]);
  });

  it('falls back to the asset-wide tint, then to neutral', () => {
    const lookup = makeLookup([
      { 10: actorAt('enemy', 'Half-Giant Raider'), 11: actorAt('boss', 'Captain Fixture') },
    ]);

    const plan = buildStaticModelInstancingPlan(lookup, [10, 11], 'prototype');

    expect(plan.byActorId.get(10)?.tint).toEqual([0.9, 0.95, 1]);
    expect(plan.byActorId.get(11)?.tint).toEqual(NEUTRAL_MODEL_TINT);
  });

  it('gives each distinct asset in one fight its own mesh and its own slot space', () => {
    const lookup = makeLookup([
      {
        10: actorAt('boss', 'Captain Fixture'),
        11: actorAt('enemy', 'Half-Giant Raider'),
        12: actorAt('enemy', 'Half-Giant Raider #2'),
        13: actorAt('enemy', 'Blood Knight'),
      },
    ]);

    const plan = buildStaticModelInstancingPlan(lookup, [10, 11, 12, 13], 'prototype');

    expect(plan.assets.map((asset) => asset.id)).toEqual([UNTINTED.id, RAIDER.id, BLOODKNIGHT.id]);
    expect(plan.actorIdsByAssetId.get(UNTINTED.id)).toEqual([10]);
    expect(plan.actorIdsByAssetId.get(RAIDER.id)).toEqual([11, 12]);
    expect(plan.actorIdsByAssetId.get(BLOODKNIGHT.id)).toEqual([13]);
    // Slots are per asset, so both meshes start at 0.
    expect(plan.byActorId.get(10)?.slot).toBe(0);
    expect(plan.byActorId.get(11)?.slot).toBe(0);
    expect(plan.byActorId.get(12)?.slot).toBe(1);
    expect(plan.byActorId.get(13)?.slot).toBe(0);
  });

  it('leaves unmodelled, friendly, and player actors out of the plan (capsule fallback)', () => {
    const lookup = makeLookup([
      {
        10: actorAt('enemy', 'Unmodelled Trash Mob'),
        11: actorAt('friendly_npc', 'Blood Knight'),
        12: actorAt('player', 'Blood Knight'),
        13: actorAt('pet', 'Blood Knight'),
        14: actorAt('enemy', 'Blood Knight'),
      },
    ]);

    const plan = buildStaticModelInstancingPlan(lookup, [10, 11, 12, 13, 14], 'prototype');

    expect(plan.assets).toEqual([BLOODKNIGHT]);
    expect(plan.byActorId.has(10)).toBe(false);
    expect(plan.byActorId.has(11)).toBe(false);
    expect(plan.byActorId.has(12)).toBe(false);
    expect(plan.byActorId.has(13)).toBe(false);
    expect(plan.byActorId.get(14)?.asset).toBe(BLOODKNIGHT);
  });

  it('returns the empty plan without the prototype opt-in', () => {
    const lookup = makeLookup([{ 10: actorAt('enemy', 'Blood Knight') }]);

    expect(buildStaticModelInstancingPlan(lookup, [10], 'off')).toBe(EMPTY_STATIC_MODEL_PLAN);
  });

  it('returns the empty plan for a missing lookup, no actors, or no matches', () => {
    const lookup = makeLookup([{ 10: actorAt('enemy', 'Unmodelled Trash Mob') }]);

    expect(buildStaticModelInstancingPlan(null, [10], 'prototype')).toBe(EMPTY_STATIC_MODEL_PLAN);
    expect(buildStaticModelInstancingPlan(lookup, [], 'prototype')).toBe(EMPTY_STATIC_MODEL_PLAN);
    expect(buildStaticModelInstancingPlan(lookup, [10], 'prototype')).toBe(EMPTY_STATIC_MODEL_PLAN);
  });

  it('still finds an actor that only appears late in the fight', () => {
    // Recent-event visibility can keep an NPC out of the earliest buckets entirely, so the scan must
    // not be capped by timestamp.
    const player = actorAt('player', 'Someone');
    const knight = actorAt('enemy', 'Blood Knight');
    const frames: Array<Record<number, ActorPosition>> = Array.from({ length: 40 }, () => ({
      10: player,
    }));
    frames[39] = { 10: player, 11: knight };

    const plan = buildStaticModelInstancingPlan(makeLookup(frames), [10, 11], 'prototype');

    expect(plan.byActorId.get(11)?.asset).toBe(BLOODKNIGHT);
  });

  it('stops scanning once every known actor has been sampled', () => {
    const knight = actorAt('enemy', 'Blood Knight');
    const frames = Array.from({ length: 500 }, () => ({ 10: knight }));

    buildStaticModelInstancingPlan(makeLookup(frames), [10], 'prototype');

    // One sample per distinct actor, not one per timestamp.
    expect(mockResolve).toHaveBeenCalledTimes(1);
  });

  it('samples an actor once even when it appears in every frame', () => {
    const knight = actorAt('enemy', 'Blood Knight');
    const lookup = makeLookup([{ 10: knight }, { 10: knight }, { 10: knight }]);

    const plan = buildStaticModelInstancingPlan(lookup, [10], 'prototype');

    expect(plan.actorIdsByAssetId.get(BLOODKNIGHT.id)).toEqual([10]);
  });

  it('ignores actors the caller did not list', () => {
    const lookup = makeLookup([
      { 10: actorAt('enemy', 'Blood Knight'), 11: actorAt('enemy', 'Blood Knight') },
    ]);

    const plan = buildStaticModelInstancingPlan(lookup, [10], 'prototype');

    expect(plan.actorIdsByAssetId.get(BLOODKNIGHT.id)).toEqual([10]);
    expect(plan.byActorId.has(11)).toBe(false);
  });
});

describe('composeStaticModelInstanceColor', () => {
  it('is the identity for a neutral tint on a living actor', () => {
    expect(composeStaticModelInstanceColor(NEUTRAL_MODEL_TINT, 1)).toBe(NEUTRAL_MODEL_TINT);
  });

  it('multiplies the dead-darken into the tint', () => {
    expect(composeStaticModelInstanceColor([1, 1, 1], 0.45)).toEqual([0.45, 0.45, 0.45]);
    expect(composeStaticModelInstanceColor([1.2, 0.5, 0.5], 0.5)).toEqual([0.6, 0.25, 0.25]);
  });

  it('passes a live tint through unchanged', () => {
    expect(composeStaticModelInstanceColor([1.2, 0.55, 0.55], 1)).toEqual([1.2, 0.55, 0.55]);
  });
});
