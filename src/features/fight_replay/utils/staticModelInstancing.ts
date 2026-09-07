import type {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  NEUTRAL_MODEL_TINT,
  type NpcModelPreviewMode,
  type StaticReplayActorModelAsset,
  type StaticReplayActorModelTint,
  resolveReplayActorModel,
  resolveStaticModelTint,
} from './replayActorModelRegistry';

/**
 * Which reconstructed model each actor in a fight renders with, and where it sits in that model's
 * InstancedMesh.
 *
 * The renderer used to drive exactly ONE non-instanced `<primitive>` per fight and deliberately
 * took only the first matching actor. That is correct for a lone boss and wrong for anything that
 * spawns in packs — Kyne's Aegis fields two Half-Giant Raiders and several knights, so shipping a
 * trash asset under the old path would have given a mesh to one actor and left its identical
 * siblings as capsules, which reads as a bug rather than as a fallback.
 *
 * The plan resolves that up front: every actor that maps to a registry asset gets a `slot` in that
 * asset's own InstancedMesh, so N actors sharing one reconstruction cost one draw call, and a fight
 * containing a boss plus a trash type simply gets two meshes. Slots also carry a per-instance tint,
 * which is what lets a single mesh serve recolour variants.
 */
export interface StaticModelActorAssignment {
  asset: StaticReplayActorModelAsset;
  /** Instance index inside `asset`'s InstancedMesh. Stable for the lifetime of the plan. */
  slot: number;
  /** Linear RGB multiplier for this actor. Always populated; neutral when nothing is configured. */
  tint: StaticReplayActorModelTint;
}

export interface StaticModelInstancingPlan {
  /** Distinct assets this fight needs, in first-seen order. One InstancedMesh per entry. */
  assets: readonly StaticReplayActorModelAsset[];
  /** actorId → assignment. Absent means "no model" — that actor keeps the capsule fallback. */
  byActorId: ReadonlyMap<number, StaticModelActorAssignment>;
  /**
   * assetId → slot → actorId. This is the instanceId→actorId table the model meshes' pointer
   * handlers read, mirroring how every other instanced layer resolves a click.
   */
  actorIdsByAssetId: ReadonlyMap<string, readonly number[]>;
}

export const EMPTY_STATIC_MODEL_PLAN: StaticModelInstancingPlan = {
  assets: [],
  byActorId: new Map(),
  actorIdsByAssetId: new Map(),
};

/**
 * The reconstructed asset an actor should use, or null.
 *
 * Wraps the registry resolver and narrows to the `static-boss` renderer, so the player flipbook
 * (which resolves for `type === 'player'`) can never leak into the model path.
 */
export function getStaticModelForActor(
  actor: Pick<ActorPosition, 'type'> & { name?: string },
  npcPreviewMode: NpcModelPreviewMode,
): StaticReplayActorModelAsset | null {
  const asset = resolveReplayActorModel(actor, npcPreviewMode);
  return asset?.renderer === 'static-boss' ? asset : null;
}

/**
 * Scan the lookup once and assign every model-backed actor to an instance slot.
 *
 * Correctness vs cost, unchanged from the single-boss scan this replaces: a fixed timestamp cap is
 * UNSOUND, because an actor with no recorded death is gated by recent-event visibility in
 * `CalculateActorPositions` and can be absent from the earliest buckets until its first event — a
 * small cap would miss it and leave it on the capsule for the whole replay. So we walk timestamps
 * but sample each distinct actor exactly ONCE and stop as soon as every id in `actorIds` has been
 * seen. That terminates early for matching AND non-matching fights while still checking every actor,
 * so a late-spawning boss (or a trash pack that only appears mid-fight) is still found.
 *
 * Iteration order is deterministic: integer-like object keys enumerate in ascending numeric order,
 * so both the asset order and the slot order depend only on the lookup, never on scan timing.
 */
export function buildStaticModelInstancingPlan(
  lookup: TimestampPositionLookup | null,
  actorIds: readonly number[],
  npcPreviewMode: NpcModelPreviewMode,
): StaticModelInstancingPlan {
  const positions = lookup?.positionsByTimestamp;
  if (!positions || actorIds.length === 0) return EMPTY_STATIC_MODEL_PLAN;

  const assets: StaticReplayActorModelAsset[] = [];
  const byActorId = new Map<number, StaticModelActorAssignment>();
  const actorIdsByAssetId = new Map<string, number[]>();
  const wanted = new Set(actorIds);
  const seen = new Set<number>();

  for (const ts of Object.keys(positions)) {
    const atTs = positions[Number(ts)];
    for (const id of Object.keys(atTs)) {
      const actorId = Number(id);
      // Only actors the caller knows about, and only once each.
      if (seen.has(actorId) || !wanted.has(actorId)) continue;
      seen.add(actorId);
      const actor = atTs[actorId];
      const asset = getStaticModelForActor(actor, npcPreviewMode);
      if (!asset) continue;
      let slots = actorIdsByAssetId.get(asset.id);
      if (!slots) {
        slots = [];
        actorIdsByAssetId.set(asset.id, slots);
        assets.push(asset);
      }
      byActorId.set(actorId, {
        asset,
        slot: slots.length,
        tint: resolveStaticModelTint(asset, actor.name),
      });
      slots.push(actorId);
    }
    if (seen.size >= wanted.size) break; // every distinct actor sampled
  }

  if (assets.length === 0) return EMPTY_STATIC_MODEL_PLAN;
  return { assets, byActorId, actorIdsByAssetId };
}

/**
 * Fold the per-instance tint and the dead-darken into the one colour the shader multiplies into the
 * baked albedo. Death used to be written straight onto the shared material, which is impossible once
 * N actors share it — and mutating a material per frame recompiles it. `InstancedMesh.instanceColor`
 * carries both terms per instance instead, so the material is never touched after load.
 */
export function composeStaticModelInstanceColor(
  tint: StaticReplayActorModelTint,
  darken: number,
): StaticReplayActorModelTint {
  if (darken === 1 && tint === NEUTRAL_MODEL_TINT) return NEUTRAL_MODEL_TINT;
  return [tint[0] * darken, tint[1] * darken, tint[2] * darken];
}
