import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

import { normalizeActorName, type StaticReplayActorModelAsset } from './replayActorModelRegistry';

export interface DraftModelEntry {
  id: string;
  name: string;
  kind: 'lesser' | 'boss';
  family: string;
  model: string;
  clayModel?: string;
  referenceImage: string;
  previewImage: string;
  sourceUrl: string;
  reviewNote: string;
  triangleCount?: number;
  bytes?: number;
  modelHeight?: number;
}

export interface DraftModelManifest {
  status: 'draft-unaccepted';
  entries: DraftModelEntry[];
  totalBytes: number;
}

/** Reject an incomplete or accidentally published runtime manifest. */
export function parseDraftModelManifest(value: unknown): DraftModelManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('The draft gallery manifest is invalid.');
  }
  const manifest = value as Partial<DraftModelManifest>;
  const ids = new Set<string>();
  if (
    manifest.status !== 'draft-unaccepted' ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.length === 0 ||
    !manifest.entries.every((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const strings = [
        entry.id,
        entry.name,
        entry.family,
        entry.model,
        entry.referenceImage,
        entry.previewImage,
        entry.sourceUrl,
        entry.reviewNote,
      ];
      if (strings.some((field) => typeof field !== 'string' || field.length === 0)) return false;
      if (!['lesser', 'boss'].includes(entry.kind) || ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    })
  ) {
    throw new Error('The draft gallery manifest is invalid.');
  }
  return manifest as DraftModelManifest;
}

/**
 * Exact names for opt-in review only. Generic species use provisional representations: an actor
 * name does not verify the draft's color or encounter skin. Named bosses never borrow species
 * meshes. The female Dark Elf zombie has no verified runtime identity and is deliberately absent.
 * Keep the two Haj Mota variants separate even though their manifest families are identical.
 */
export const DRAFT_REPLAY_MODEL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'archcustodian-four-native': ['archcustodian'],
  'count-ryelaz-complete-folded-front': ['count ryelaz'],
  'yaseyla-main-phase-lower-res-experimental': ['exarchanic yaseyla'],
  'ogrim-basic-green-native': ['ogrim'],
  'dwarven-centurion-oblique-pair': ['dwarven centurion'],
  'dwarven-sphere-oblique-pair': ['dwarven sphere'],
  'wolf-basic-oblique-front': ['wolf'],
  'flame-atronach-native-pair': ['flame atronach'],
  'strangler-native-front': ['strangler'],
  'lamia-golden-native-front': ['lamia'],
  'bull-horned-magma-frog-native-front': ['magma frog', 'bull-horned magma frog'],
  'argonian-behemoth-green-native-pair': ['argonian behemoth'],
  'stone-atronach-native-front': ['stone atronach'],
  'harpy-native-front': ['harpy'],
  'banekin-crouched-native-front': ['banekin'],
  'bear-brown-native-front': ['bear'],
  'crocodile-native-front': ['crocodile'],
  'kwama-warrior-native-front': ['kwama warrior'],
  'haj-mota-exact-rgb-pair': ['haj mota'],
  'coral-haj-mota-exact-rgb-pair': ['coral haj mota'],
  'wamasu-green-oblique-pair': ['wamasu'],
  'daedroth-green-native-pair': ['daedroth'],
  'gryphon-brown-folded-oblique-pair': ['gryphon'],
  'daedric-titan-blue-winged-pair': ['daedric titan'],
  'iron-atronach-native-pair': ['iron atronach'],
  'storm-atronach-native-pair': ['storm atronach'],
  'frost-atronach-native-pair': ['frost atronach'],
};

/** Construct a review asset without adding it to the accepted runtime registry. */
export function createDraftReplayModelAsset(entry: DraftModelEntry): StaticReplayActorModelAsset {
  return {
    id: `draft-preview-${entry.id}`,
    path: `replay-model-drafts/${entry.model}`,
    renderer: 'static-boss',
    actorTypes: ['enemy', 'boss'],
    aliases: DRAFT_REPLAY_MODEL_ALIASES[entry.id] ?? [],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: entry.modelHeight ?? 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: entry.sourceUrl,
      attributionFile: 'public/replay-model-drafts/manifest.json',
    },
  };
}

/** Match only recorded hostile actors, including packs and actors first seen late in the fight. */
export function buildDraftModelOverrides(
  lookup: TimestampPositionLookup | null,
  entries: readonly DraftModelEntry[] = [],
): ReadonlyMap<number, StaticReplayActorModelAsset> {
  const overrides = new Map<number, StaticReplayActorModelAsset>();
  if (!lookup || entries.length === 0) return overrides;
  const assetsByAlias = new Map<string, StaticReplayActorModelAsset>();
  for (const entry of entries) {
    const asset = createDraftReplayModelAsset(entry);
    for (const alias of asset.aliases) assetsByAlias.set(alias, asset);
  }
  const wanted = lookup.actorIds ? new Set(lookup.actorIds) : undefined;
  const seen = new Set<number>();
  for (const frame of Object.values(lookup.positionsByTimestamp)) {
    for (const [id, actor] of Object.entries(frame)) {
      const actorId = Number(id);
      if ((wanted && !wanted.has(actorId)) || seen.has(actorId)) continue;
      seen.add(actorId);
      if (actor.type !== 'enemy' && actor.type !== 'boss') continue;
      const asset = assetsByAlias.get(normalizeActorName(actor.name));
      if (asset) overrides.set(actorId, asset);
    }
    if (wanted && seen.size === wanted.size) break;
  }
  return overrides;
}
