import type { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

export interface StaticBossReplayModelAsset {
  id: string;
  path: string;
  aliases: readonly string[];
  provenanceFile: string;
}

export const STATIC_BOSS_REPLAY_MODELS = {
  yandirTheButcher: {
    id: 'yandir-the-butcher-static-v1',
    path: 'models/fight-replay/npcs/yandir-the-butcher-static-v1.glb',
    aliases: ['yandir the butcher'],
    provenanceFile: 'public/models/fight-replay/npcs/README-yandir-the-butcher-static-v1.md',
  },
} as const satisfies Record<string, StaticBossReplayModelAsset>;

function normalizeActorName(name: string | undefined): string {
  return name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

/** Resolve only exact hostile-actor aliases; callers retain the capsule fallback for null. */
export function resolveStaticBossReplayModel(
  actor: Pick<ActorPosition, 'type'> & { name?: string },
): StaticBossReplayModelAsset | null {
  if (actor.type !== 'boss' && actor.type !== 'enemy') return null;

  const normalizedName = normalizeActorName(actor.name);
  return (
    Object.values(STATIC_BOSS_REPLAY_MODELS).find((asset) =>
      asset.aliases.some((alias) => alias === normalizedName),
    ) ?? null
  );
}
