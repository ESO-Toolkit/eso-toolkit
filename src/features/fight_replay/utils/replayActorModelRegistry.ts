import type { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

export const NPC_MODEL_PREVIEW_PARAM = 'npcModels';

export type NpcModelPreviewMode = 'off' | 'prototype';

export interface ReplayActorModelAsset {
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

/** Every replay model must enter through this catalog with its provenance recorded. */
export const REPLAY_ACTOR_MODEL_ASSETS = {
  coolStickman: {
    id: 'cool-stickman-flipbook',
    path: 'models/coolstickman-walk.glb',
    renderer: 'instanced-pose-flipbook',
    license: {
      spdx: 'CC0-1.0',
      author: 'Polygonal Mind',
      sourceUrl: 'https://www.opensourceavatars.com/en/finder?avatar=coolstickman',
      attributionFile: 'public/models/LICENSE-coolstickman.md',
    },
  },
} as const satisfies Record<string, ReplayActorModelAsset>;

export function parseNpcModelPreviewMode(value: string | null): NpcModelPreviewMode {
  return value === 'prototype' ? 'prototype' : 'off';
}

/**
 * Returning null is intentional: callers keep the capsule fallback so a missing, unsupported, or
 * failed model can never make an actor vanish. Prototype mode reuses licensed art to validate the
 * hostile-NPC pipeline without committing derivative ESO assets.
 */
export function resolveReplayActorModel(
  actor: Pick<ActorPosition, 'type'>,
  npcPreviewMode: NpcModelPreviewMode,
): ReplayActorModelAsset | null {
  if (actor.type === 'player') return REPLAY_ACTOR_MODEL_ASSETS.coolStickman;
  if (npcPreviewMode === 'prototype' && (actor.type === 'enemy' || actor.type === 'boss')) {
    return REPLAY_ACTOR_MODEL_ASSETS.coolStickman;
  }
  return null;
}
