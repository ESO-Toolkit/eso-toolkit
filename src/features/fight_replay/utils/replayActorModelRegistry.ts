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

/**
 * Linear RGB multiplier applied on top of an asset's baked albedo, per rendered instance.
 *
 * ESO reuses one body across recolour variants — Blood Knight, Crimson Knight and Bitter Knight are
 * all UESP species "Bloodknight" — so one reconstruction can serve all three if the renderer can
 * shift its colour per instance. `[1, 1, 1]` is the identity and is what every entry that omits a
 * tint gets, so adding this field cannot change how an existing asset looks.
 */
export type StaticReplayActorModelTint = readonly [number, number, number];

/** Identity tint. Multiplying by this leaves the baked albedo exactly as authored. */
export const NEUTRAL_MODEL_TINT: StaticReplayActorModelTint = [1, 1, 1];

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
  /** Optional tint applied to every actor that resolves to this asset. Omit for "as authored". */
  tint?: StaticReplayActorModelTint;
  /**
   * Optional per-alias tint overrides, keyed by the same NORMALIZED alias strings as `aliases`.
   * This is what lets one mesh serve recolour variants: register every variant name as an alias,
   * then give each its own tint here. An alias with no entry falls back to `tint`, then to neutral.
   */
  aliasTints?: Readonly<Record<string, StaticReplayActorModelTint>>;
  transform: {
    orientEuler: readonly [number, number, number];
    scale: number;
    yOffset: number;
    yawOffset: number;
    modelHeight: number;
  };
  provenance: {
    /** NOTE: this single value no longer describes the whole catalog. Most assets are
     *  reconstructions built from published screenshots; a subset at the end of the list is ESO's
     *  own geometry and texture extracted verbatim from the game client. Those have a materially
     *  different rights position that has NOT been cleared, and the distinction is recorded in
     *  each asset's README and in the manifest rather than here, because widening this union
     *  would change the runtime contract every consumer and test already relies on. */
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
    // `The Serpent's Image` is the Sanctum Ophidia mini boss that is explicitly the Celestial
    // Serpent's duplicate — the same creature, not a lookalike — so this is a faithful reuse
    // rather than a stand-in. Alias only; no second asset and no scale change, because the
    // Image is presented at the Serpent's own size.
    aliases: ['the serpent', "the serpent's image"],
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

  {
    id: 'orphic-shattered-shard-overview-v1',
    path: 'models/fight-replay/npcs/orphic-shattered-shard-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    // Only the exact encounter name. The reference page is titled for the SPECIES
    // ("Shattered Shard"), but aliasing that bare name would let any other shard-kin actor
    // borrow this body, which is precisely what the registry refuses to do.
    aliases: ['orphic shattered shard'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.982,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/characters/post/180-shattered-shard',
      attributionFile:
        'public/models/fight-replay/npcs/README-orphic-shattered-shard-overview-v1.md',
    },
  },

  // --- Lesser enemies (trash and mini bosses) -------------------------------------------------
  // Built to a much smaller budget than the bosses above: ~5,000 triangles, a 512px atlas and
  // ~300-340 KB each, against the boss profile's 45,000-70,000 triangles, 1024px and ~1.7-2.3 MB.
  // The reason is arithmetic rather than taste — a boss appears once, trash appears dozens of times
  // at once, so the boss budget would put well over a million triangles a frame on screen.
  //
  // Scales here are anchored on the player figure (HUMANOID_TARGET_HEIGHT, 0.95 world units) rather
  // than on the boss convention of ~2.49, so rank-and-file enemies do not render at boss size. None
  // of the reference pages publish real-world dimensions, so every scale below is a judgment call
  // and is flagged as such in the asset's README.
  {
    id: 'bloodknight-overview-v1',
    path: 'models/fight-replay/npcs/bloodknight-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    // One build, three encounters. The reference post states outright that this model serves
    // generic Bloodknights, Gray Host Bloodknights, Bitter Knights and Crimson Knights.
    aliases: ['blood knight', 'crimson knight', 'bitter knight'],
    // Tint MULTIPLIES, so it can darken a channel but never raise one. That is workable here only
    // because the base plate measures #696264, a near-neutral steel, which can reach both a warm and
    // a cold sibling. A strongly-hued base could not, which is why the Frost/Crystal atronach pair
    // ships as two atlases instead of one tinted mesh.
    //
    // Keys must be the same PRE-NORMALIZED lowercase strings as `aliases`: resolveStaticModelTint
    // normalizes the incoming actor name but NOT these keys, so 'Crimson Knight' would silently
    // never match and produce no type error.
    aliasTints: {
      'blood knight': [1, 1, 1],
      // Estimates, not measurements: no reference plate exists for either sibling, so these are
      // derived from the names and must be eyeballed in game.
      'crimson knight': [1.0, 0.55, 0.55],
      'bitter knight': [0.72, 0.84, 1.0],
    },
    transform: {
      orientEuler: [0, 0, 0],
      scale: 0.55,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9974,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/33-bloodknight',
      attributionFile: 'public/models/fight-replay/npcs/README-bloodknight-overview-v1.md',
    },
  },
  {
    // Same mesh as the Frost Atronach below, generated once and reused. They are two assets rather
    // than one tinted asset because they differ in HUE (iridescent glass against uniform ice), and
    // a multiply tint cannot raise a channel.
    id: 'crystal-atronach-overview-v1',
    path: 'models/fight-replay/npcs/crystal-atronach-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['crystal atronach'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 0.95,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2.0,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/179-crystal-atronach',
      attributionFile: 'public/models/fight-replay/npcs/README-crystal-atronach-overview-v1.md',
    },
  },
  {
    id: 'frost-atronach-overview-v1',
    path: 'models/fight-replay/npcs/frost-atronach-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['frost atronach'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 0.95,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2.0,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/153-frost-atronach',
      attributionFile: 'public/models/fight-replay/npcs/README-frost-atronach-overview-v1.md',
    },
  },
  {
    // The first ARCHETYPE asset: one body aliased to a measured family of names rather than to one
    // encounter. Skeletons are the largest creature archetype in the dungeon corpus, and every
    // dungeon NPC is a capsule today.
    //
    // The 32 aliases below are real ESO Logs actor names harvested from 250 dungeon reports, not
    // guesses, and they cover 342 fight-appearances. The selection is deliberately conservative —
    // a keyword sweep for skeleton/bone/draugr matches 79 names, and most of the rest are NOT a
    // bare humanoid skeleton and would be a wrong body:
    //   - Draugr and Draugrkin (~170 appearances) are Nordic undead with flesh and armour.
    //   - Skeletal Bear / Werewolf / Hound / Guar / Senche-Lion / Dire Wolf / Charger are QUADRUPEDS.
    //   - Bone Colossus is a giant with its own extracted mesh; Flamebreath Skull is a floating head.
    //   - Blackmarrow * are living necromancers; * Skullguard are titled humanoids.
    //   - Bonelords are floating tentacled creatures, not skeletons.
    //   - Boss-subType skeletons (Skeletal Destroyer) are excluded on TIER, not species: this entry
    //     is scaled to the player figure, and a boss needs its own entry per the standing rule.
    id: 'boneman-overview-v1',
    path: 'models/fight-replay/npcs/boneman-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: [
      'skeletal archer',
      'skeletal berserker',
      'skeletal foot soldier',
      'skeletal warrior',
      'skeletal ravager',
      'skeletal stalker',
      'skeletal bruiser',
      'skeletal executioner',
      'skeletal warden',
      'skeleton',
      'skeletal pyromancer',
      'darkfern skeleton',
      'skeletal soldier',
      'venomous skeleton',
      'skeletal defender',
      'skeletal healer',
      'skeletal mage',
      'skeletal sacrifice',
      'skeletal spellbinder',
      'skeletal torturer',
      'skeletal runecaster',
      'skeletal cutthroat',
      'skeletal thrall',
      'skeletal assassin',
      'skeletal flame shaper',
      'boneman archer',
      'boneman warrior',
      'skeletal harrier',
      'imbued skeleton',
      'skeletal protector',
      'skeletal sorcerer',
      'ice skeleton',
    ],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 0.95,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2.0,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/125-boneman-man-mer',
      attributionFile: 'public/models/fight-replay/npcs/README-boneman-overview-v1.md',
    },
  },
  {
    // Appears in four Cloudrest encounter slots — the highest count of any single lesser-enemy name.
    // Also the weakest build of its batch: 32.6% of texels face neither camera, because six legs
    // splayed from a deep body is near worst-case for two views. See its README.
    id: 'yaghra-monstrosity-overview-v1',
    path: 'models/fight-replay/npcs/yaghra-monstrosity-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['yaghra monstrosity'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 0.9,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.468,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/120-yaghra-monstrosity',
      attributionFile: 'public/models/fight-replay/npcs/README-yaghra-monstrosity-overview-v1.md',
    },
  },
  {
    // Wider than it is tall, so the prepare step normalized its WINGSPAN and it exports only 0.7279
    // units high. The scale below restores a ~1.13 world height rather than leaving it flattened —
    // the same case as Saint Olms and Lord Falgravn.
    id: 'ash-titan-overview-v1',
    path: 'models/fight-replay/npcs/ash-titan-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['ash titan'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.55,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 0.7279,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/112-ash-titan',
      attributionFile: 'public/models/fight-replay/npcs/README-ash-titan-overview-v1.md',
    },
  },
  {
    // The cleanest build in the catalog by blind area: 4.5% of texels face neither camera, and only
    // 74 charts.
    id: 'fire-behemoth-overview-v1',
    path: 'models/fight-replay/npcs/fire-behemoth-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['fire behemoth'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.0,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 1.9947,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/65-fire-behemoth',
      attributionFile: 'public/models/fight-replay/npcs/README-fire-behemoth-overview-v1.md',
    },
  },
  {
    // Completes Sanctum Ophidia. Not aliased to a bare 'lamia': the same red mesh serves generic
    // lamias and six other named uniques, all of them smaller than the boss.
    id: 'ozara-overview-v1',
    path: 'models/fight-replay/npcs/ozara-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['ozara'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/117-lamia-red',
      attributionFile: 'public/models/fight-replay/npcs/README-ozara-overview-v1.md',
    },
  },
  {
    // Not aliased to a bare 'harvester': Dagonic Harvesters appear as ordinary trash in Blackwood
    // content and are a different size from the Rockgrove boss.
    id: 'xalvakka-overview-v1',
    path: 'models/fight-replay/npcs/xalvakka-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['xalvakka'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/84-harvester-dagonic',
      attributionFile: 'public/models/fight-replay/npcs/README-xalvakka-overview-v1.md',
    },
  },

  // --- Route B: extracted ESO geometry, colour projected from reference plates -----------------
  // Unlike every reconstruction above, the MESH here is ESO's own, lifted from the client; only the
  // colour comes from screenshots. Each of these was previously filed unbuildable because two-view
  // reconstruction could not infer their geometry — exact geometry makes that objection moot. No GPU
  // is involved at all, since the reconstruction stage is skipped.
  //
  // The trade is in the texture: roughly half of each atlas is chart-local neighbour fill rather
  // than observed colour, because none of these galleries publishes a profile view. Honest at replay
  // distance, not at close-up. See each README.
  {
    id: 'oaxiltso-overview-v1',
    path: 'models/fight-replay/npcs/oaxiltso-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['oaxiltso'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/83-oaxiltso',
      attributionFile: 'public/models/fight-replay/npcs/README-oaxiltso-overview-v1.md',
    },
  },
  {
    // Scaled on WIDTH, not height: normalised she is 3.86 x 3.17 x 2.0, so the family default of
    // 1.25 would put her 4.83 units across — about five player-widths. 1.0 keeps her 2.0 tall.
    id: 'tideborn-taleria-overview-v1',
    path: 'models/fight-replay/npcs/tideborn-taleria-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['tideborn taleria'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.0,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/119-tideborn-taleria',
      attributionFile: 'public/models/fight-replay/npcs/README-tideborn-taleria-overview-v1.md',
    },
  },
  {
    // Completes Aetherian Archive. Deliberately NOT aliased to a bare 'storm atronach': the same
    // mesh serves generic storm atronachs as trash across most of the game, at a much smaller
    // size, and `transform` is per-asset — a trash tier would have to be its own entry pointing
    // at this same `path`, the way `craglorn-troll-trash-overview-v1` reuses Stonebreaker.
    id: 'lightning-storm-atronach-overview-v1',
    path: 'models/fight-replay/npcs/lightning-storm-atronach-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['lightning storm atronach'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://esomodelviewer.com/creatures/post/154-storm-atronach',
      attributionFile:
        'public/models/fight-replay/npcs/README-lightning-storm-atronach-overview-v1.md',
    },
  },

  // --- Extracted game assets, NOT reconstructions -------------------------------------------
  // Everything above is modelled from published screenshots. The four below are ESO's own mesh
  // and ESO's own hand-authored diffuse atlas, lifted verbatim out of the client (see each
  // README for the blob path). They keep the `project-authorized-fan-prototype` designation only
  // because that is the sole value the type admits — their rights position is materially
  // different and redistribution has NOT been cleared. See the manifest's licensing section.
  {
    id: 'stonebreaker-overview-v1',
    path: 'models/fight-replay/npcs/stonebreaker-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['stonebreaker'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://github.com/ESO-Toolkit/eso-toolkit/tree/feat/trial-boss-textures',
      attributionFile: 'public/models/fight-replay/npcs/README-stonebreaker-overview-v1.md',
    },
  },
  {
    // Sanctum Ophidia's Rockheaver and Berserker Trolls, on the Craglorn troll body already
    // shipping as Stonebreaker. This one is a species match rather than a guess: the asset IS
    // ESO's `Troll_Craglorn_Boss` mesh with the game's own hand-authored atlas, and both trash
    // names are Craglorn trolls. What it is NOT is the individual — Stonebreaker is the
    // boss-tier variant, so the same body at boss size would read as three Stonebreakers.
    // Rendered at 0.85x the boss scale for that reason. No plate exists for either variant, so
    // no `aliasTints` is set: any colour difference between them is unmeasured and guessing at
    // it would be less honest than shipping both as authored.
    id: 'craglorn-troll-trash-overview-v1',
    path: 'models/fight-replay/npcs/stonebreaker-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    aliases: ['rockheaver troll', 'berserker troll'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.0625,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://github.com/ESO-Toolkit/eso-toolkit/tree/feat/trial-boss-textures',
      attributionFile: 'public/models/fight-replay/npcs/README-stonebreaker-overview-v1.md',
    },
  },
  {
    id: 'possessed-mantikora-overview-v1',
    path: 'models/fight-replay/npcs/possessed-mantikora-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    // Deliberately NOT aliased to a bare 'mantikora': the Celestial Serpent encounter spawns
    // ordinary Mantikora adds, and giving them the boss body would misread the fight.
    aliases: ['possessed mantikora'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://github.com/ESO-Toolkit/eso-toolkit/tree/feat/trial-boss-textures',
      attributionFile: 'public/models/fight-replay/npcs/README-possessed-mantikora-overview-v1.md',
    },
  },
  {
    id: 'foundation-stone-atronach-overview-v1',
    path: 'models/fight-replay/npcs/foundation-stone-atronach-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    // Not aliased to a bare 'stone atronach' — generic stone atronachs appear as trash in several
    // trials and are a different, smaller creature.
    aliases: ['foundation stone atronach'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://github.com/ESO-Toolkit/eso-toolkit/tree/feat/trial-boss-textures',
      attributionFile:
        'public/models/fight-replay/npcs/README-foundation-stone-atronach-overview-v1.md',
    },
  },
  {
    id: 'cloudrest-gryphon-overview-v1',
    path: 'models/fight-replay/npcs/cloudrest-gryphon-overview-v1.glb',
    renderer: 'static-boss',
    actorTypes: HOSTILE_ACTOR_TYPES,
    // The three Welkynar mounts. These names come from the curated encounter notes in
    // `trial-encounters.ts`, not from an observed ESO Logs actor list, so they are the one part
    // of this entry that is unverified against live data. A miss is silent and harmless: the
    // gryphon simply keeps the capsule.
    aliases: ['falarielle', 'silaeda', 'belanaril'],
    transform: {
      orientEuler: [0, 0, 0],
      scale: 1.25,
      yOffset: 0,
      yawOffset: 0,
      modelHeight: 2,
    },
    provenance: {
      designation: 'project-authorized-fan-prototype',
      sourceUrl: 'https://github.com/ESO-Toolkit/eso-toolkit/tree/feat/trial-boss-textures',
      attributionFile: 'public/models/fight-replay/npcs/README-cloudrest-gryphon-overview-v1.md',
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

/**
 * The tint an actor should render this asset with.
 *
 * Alias tint wins over the asset-wide tint, which wins over neutral. Resolution is by normalized
 * name so the ` #2` instance suffix and apostrophe variants behave exactly as they do for lookup.
 */
export function resolveStaticModelTint(
  asset: StaticReplayActorModelAsset,
  actorName: string | undefined,
): StaticReplayActorModelTint {
  const normalizedName = normalizeActorName(actorName);
  return asset.aliasTints?.[normalizedName] ?? asset.tint ?? NEUTRAL_MODEL_TINT;
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
