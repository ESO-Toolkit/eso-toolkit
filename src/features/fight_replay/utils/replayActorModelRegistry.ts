import type { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

export const NPC_MODEL_PREVIEW_PARAM = 'npcModels';

export type NpcModelPreviewMode = 'off' | 'prototype';

interface LicensedReplayActorModelAsset {
  id: 'cool-stickman-flipbook';
  path: string;
  renderer: 'instanced-pose-flipbook';
  license: {
    spdx: 'CC0-1.0';
    author: string;
    sourceUrl: string;
    attributionFile: string;
  };
}

export interface StaticReplayActorModelAsset {
  id: string;
  path: string;
  renderer: 'static-boss';
  /** Hostile classes this asset may represent. ESO Logs does not tag every encounter boss
   *  with subType=Boss, so bosses accept `enemy` as well as `boss`. */
  actorTypes: readonly ActorPosition['type'][];
  /** Fully normalized names (see `normalizeActorName`). Matching is EXACT against this list —
   *  never a substring test, so "Vampire Infuser Acolyte" can never borrow the Infuser's mesh. */
  aliases: readonly string[];
  transform: {
    orientEuler: readonly [number, number, number];
    scale: number;
    yOffset: number;
    yawOffset: number;
    modelHeight: number;
  };
  provenance: {
    designation: 'project-authorized-fan-prototype';
    sourceUrl: string;
    attributionFile: string;
  };
}

export type ReplayActorModelAsset = LicensedReplayActorModelAsset | StaticReplayActorModelAsset;

/** The CC0 humanoid flipbook used for players. Separate from the reconstructed catalog because it
 *  ships under a real open license rather than the project-authorized fan-prototype designation. */
export const COOL_STICKMAN_ASSET: LicensedReplayActorModelAsset = {
  id: 'cool-stickman-flipbook',
  path: 'models/coolstickman-walk.glb',
  renderer: 'instanced-pose-flipbook',
  license: {
    spdx: 'CC0-1.0',
    author: 'Polygonal Mind',
    sourceUrl: 'https://www.opensourceavatars.com/en/finder?avatar=coolstickman',
    attributionFile: 'public/models/LICENSE-coolstickman.md',
  },
};

const HOSTILE_ACTOR_TYPES = ['boss', 'enemy'] as const;

/**
 * Every reconstructed replay model must enter through this catalog with its provenance recorded.
 * Adding an entry here is what makes an asset reachable at runtime.
 */
export const STATIC_REPLAY_ACTOR_MODEL_ASSETS: readonly StaticReplayActorModelAsset[] = [
  {
    id: 'yandir-the-butcher-overview-v2',
    path: 'models/fight-replay/npcs/yandir-the-butcher-overview-v2.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['yandir the butcher'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9927,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/82-yandir-the-butcher',
      attributionFile: 'public/models/fight-replay/npcs/README-yandir-the-butcher-overview-v2.md',
    },
  },
  {
    id: 'captain-vrol-overview-v2',
    path: 'models/fight-replay/npcs/captain-vrol-overview-v2.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['captain vrol'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9938,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/83-captain-vrol',
      attributionFile: 'public/models/fight-replay/npcs/README-captain-vrol-overview-v2.md',
    },
  },
];

export function parseNpcModelPreviewMode(value: string | null): NpcModelPreviewMode {
  return value === 'prototype' ? 'prototype' : 'off';
}

/**
 * Normalize an ESO Logs actor name for registry lookup.
 *
 * ESO Logs appends a ` #N` instance suffix when an encounter spawns more than one copy of the same
 * NPC (`Lord Falgravn #2`), and the client's own fight grouping already strips it. Apostrophes vary
 * between the typographic and straight forms across ESO data sources, so they are folded too.
 */
export function normalizeActorName(name: string | undefined): string {
  return (
    name
      ?.trim()
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/\s+#\d+$/, '')
      .replace(/\s+/g, ' ') ?? ''
  );
}

/** Exact-alias lookup over the reconstructed catalog. Returns null for anything unrecognized. */
export function findStaticActorModel(
  actor: Pick<ActorPosition, 'type'> & { name?: string },
): StaticReplayActorModelAsset | null {
  const normalizedName = normalizeActorName(actor.name);
  if (!normalizedName) return null;
  return (
    STATIC_REPLAY_ACTOR_MODEL_ASSETS.find(
      (asset) =>
        asset.actorTypes.includes(actor.type) &&
        asset.aliases.some((alias) => alias === normalizedName),
    ) ?? null
  );
}

/**
 * Resolve the model an actor should render with.
 *
 * Returning null is intentional and load-bearing: callers keep the capsule fallback, so a missing,
 * unsupported, or failed model can never make an actor vanish. Unrecognized hostiles deliberately
 * stay on the capsule rather than borrowing another actor's mesh — a wrong body is more misleading
 * in a tactical replay than an abstract one. Reconstructed art stays behind the explicit prototype
 * opt-in while its visual quality, performance, and rights review are pending.
 */
export function resolveReplayActorModel(
  actor: Pick<ActorPosition, 'type'> & { name?: string },
  npcPreviewMode: NpcModelPreviewMode,
): ReplayActorModelAsset | null {
  if (actor.type === 'player') return COOL_STICKMAN_ASSET;
  if (npcPreviewMode !== 'prototype') return null;
  return findStaticActorModel(actor);
}
