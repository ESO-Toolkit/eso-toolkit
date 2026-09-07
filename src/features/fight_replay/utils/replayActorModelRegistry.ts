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
  {
    id: 'saint-llothis-overview-v1',
    path: 'models/fight-replay/npcs/saint-llothis-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['saint llothis the pious'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9943,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/89-saint-llothis-the-pious',
      attributionFile: 'public/models/fight-replay/npcs/README-saint-llothis-overview-v1.md',
    },
  },
  {
    id: 'saint-felms-overview-v1',
    path: 'models/fight-replay/npcs/saint-felms-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['saint felms the bold'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9951,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/88-saint-felms-the-bold',
      attributionFile: 'public/models/fight-replay/npcs/README-saint-felms-overview-v1.md',
    },
  },

  {
    id: 'the-warrior-overview-v1',
    path: 'models/fight-replay/npcs/the-warrior-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['the warrior'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9938,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/172-the-warrior',
      attributionFile: 'public/models/fight-replay/npcs/README-the-warrior-overview-v1.md',
    },
  },
  {
    id: 'the-mage-overview-v1',
    path: 'models/fight-replay/npcs/the-mage-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['the mage'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9928,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/173-the-mage',
      attributionFile: 'public/models/fight-replay/npcs/README-the-mage-overview-v1.md',
    },
  },
  {
    id: 'shade-of-galenwe-overview-v1',
    path: 'models/fight-replay/npcs/shade-of-galenwe-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['shade of galenwe'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9939,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/233-shade-of-galenwe',
      attributionFile: 'public/models/fight-replay/npcs/README-shade-of-galenwe-overview-v1.md',
    },
  },
  {
    id: 'shade-of-siroria-overview-v1',
    path: 'models/fight-replay/npcs/shade-of-siroria-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['shade of siroria'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9939,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/234-shade-of-siroria',
      attributionFile: 'public/models/fight-replay/npcs/README-shade-of-siroria-overview-v1.md',
    },
  },
  {
    id: 'shade-of-relequen-overview-v1',
    path: 'models/fight-replay/npcs/shade-of-relequen-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['shade of relequen'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9935,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/235-shade-of-relequen',
      attributionFile: 'public/models/fight-replay/npcs/README-shade-of-relequen-overview-v1.md',
    },
  },
  {
    id: 'the-serpent-overview-v1',
    path: 'models/fight-replay/npcs/the-serpent-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['the serpent'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9938,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/169-the-serpent',
      attributionFile: 'public/models/fight-replay/npcs/README-the-serpent-overview-v1.md',
    },
  },

  {
    id: 'varlariel-overview-v1',
    path: 'models/fight-replay/npcs/varlariel-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['varlariel'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9815,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/74-wispmother-light',
      attributionFile: 'public/models/fight-replay/npcs/README-varlariel-overview-v1.md',
    },
  },

  {
    id: 'saint-olms-overview-v1',
    path: 'models/fight-replay/npcs/saint-olms-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['saint olms the just', 'saint olms'],
    transform: {
      orientEuler: [0, 0, 0],
      // Every other asset in this catalog is normalized so its HEIGHT is ~1.99 and then scaled
      // by 1.25, giving ~2.49 world units tall. Olms is the first subject wider than it is tall
      // (1.9934 wingspan against 0.7384 height), so the prepare step normalized his WINGSPAN to
      // ~2 instead. Scaling him by 1.25 would therefore stand him only 0.92 units tall — a
      // flattened bat on the floor. The scale below restores the family's ~2.49 world height,
      // which puts his wingspan at ~6.7 units. He is genuinely enormous in game, so a footprint
      // several times a humanoid boss' is expected rather than a bug.
      scale: 3.372,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 0.7384,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/90-saint-olms-the-just',
      attributionFile: 'public/models/fight-replay/npcs/README-saint-olms-overview-v1.md',
    },
  },

  {
    id: 'lord-falgravn-overview-v1',
    path: 'models/fight-replay/npcs/lord-falgravn-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['lord falgravn', 'falgravn'],
    transform: {
      orientEuler: [0, 0, 0],
      // Second subject wider than tall (1.9933 wingspan against 1.4885 height), so the prepare
      // step normalized his WINGSPAN to ~2 rather than his height, and the family's usual 1.25
      // would stand him only 1.86 units tall. This restores the family's ~2.49 world height and
      // puts his wingspan at ~3.34 units. Far less extreme than Olms' 3.372 because Falgravn is
      // an upright biped whose wings are roughly as wide as he is tall, not a low wide construct.
      scale: 1.6744,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.4885,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/32-vampire-lord',
      attributionFile: 'public/models/fight-replay/npcs/README-lord-falgravn-overview-v1.md',
    },
  },
];

/**
 * Resolve an asset's catalog path to a URL the loader can fetch.
 *
 * Catalog paths are stored relative to the deployment root (`models/...`). They MUST be joined to
 * the app's base URL rather than handed to a loader as-is: a bare relative path resolves against the
 * *current route*, and the replay always lives on a nested one (`/report/<code>/fight/<n>/replay`),
 * so the request lands on a path that does not exist. The failure is quiet — the loader errors and
 * the capsule fallback takes over — so a broken URL looks exactly like "this boss has no model".
 *
 * Kept free of `import.meta` so it stays unit-testable; callers pass `import.meta.env.BASE_URL`.
 */
export function resolveReplayModelUrl(path: string, baseUrl: string | undefined): string {
  const base = baseUrl && baseUrl.length > 0 ? baseUrl : '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\/+/, '')}`;
}

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
