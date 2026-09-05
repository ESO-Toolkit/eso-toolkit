import type { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

import {
  COOL_STICKMAN_ASSET,
  STATIC_REPLAY_ACTOR_MODEL_ASSETS,
  findStaticActorModel,
  normalizeActorName,
  parseNpcModelPreviewMode,
  resolveReplayActorModel,
} from './replayActorModelRegistry';

type TestActor = Pick<ActorPosition, 'type'> & { name?: string };

const actor = (type: ActorPosition['type'], name?: string): TestActor => ({ type, name });

describe('parseNpcModelPreviewMode', () => {
  it('only accepts the exact prototype value', () => {
    expect(parseNpcModelPreviewMode('prototype')).toBe('prototype');
    expect(parseNpcModelPreviewMode('Prototype')).toBe('off');
    expect(parseNpcModelPreviewMode('true')).toBe('off');
    expect(parseNpcModelPreviewMode('')).toBe('off');
    expect(parseNpcModelPreviewMode(null)).toBe('off');
  });
});

describe('normalizeActorName', () => {
  it('folds case, whitespace, apostrophes, and ESO Logs instance suffixes', () => {
    expect(normalizeActorName('  Yandir   the Butcher ')).toBe('yandir the butcher');
    expect(normalizeActorName('Yandir the Butcher #2')).toBe('yandir the butcher');
    expect(normalizeActorName('Yandir the Butcher #17')).toBe('yandir the butcher');
    expect(normalizeActorName('Kyne’s Aegis')).toBe("kyne's aegis");
    expect(normalizeActorName(undefined)).toBe('');
  });

  it('does not strip a mid-name hash that is not an instance suffix', () => {
    expect(normalizeActorName('Boss #2 Phase')).toBe('boss #2 phase');
  });
});

describe('findStaticActorModel', () => {
  it('matches a known boss by exact normalized name', () => {
    expect(findStaticActorModel(actor('boss', 'Yandir the Butcher'))?.id).toBe(
      'yandir-the-butcher-overview-v1',
    );
  });

  it('matches the same boss when ESO Logs reports it as a plain enemy or adds an instance suffix', () => {
    expect(findStaticActorModel(actor('enemy', 'yandir the butcher'))?.id).toBe(
      'yandir-the-butcher-overview-v1',
    );
    expect(findStaticActorModel(actor('boss', 'Yandir the Butcher #2'))?.id).toBe(
      'yandir-the-butcher-overview-v1',
    );
  });

  it('refuses unsafe partial matches so an NPC never borrows another actor mesh', () => {
    expect(findStaticActorModel(actor('boss', 'Yandir'))).toBeNull();
    expect(findStaticActorModel(actor('boss', 'Yandir the Butchers Apprentice'))).toBeNull();
    expect(findStaticActorModel(actor('enemy', 'Shade of Yandir the Butcher'))).toBeNull();
  });

  it('does not give hostile art to friendly actor types', () => {
    expect(findStaticActorModel(actor('player', 'Yandir the Butcher'))).toBeNull();
    expect(findStaticActorModel(actor('friendly_npc', 'Yandir the Butcher'))).toBeNull();
    expect(findStaticActorModel(actor('pet', 'Yandir the Butcher'))).toBeNull();
  });

  it('returns null for unknown and unnamed actors', () => {
    expect(findStaticActorModel(actor('boss', 'Some Unshipped Boss'))).toBeNull();
    expect(findStaticActorModel(actor('enemy', undefined))).toBeNull();
    expect(findStaticActorModel(actor('enemy', '   '))).toBeNull();
  });
});

describe('resolveReplayActorModel', () => {
  it('always gives players the CC0 flipbook regardless of preview mode', () => {
    expect(resolveReplayActorModel(actor('player', 'Someone'), 'off')).toBe(COOL_STICKMAN_ASSET);
    expect(resolveReplayActorModel(actor('player', 'Someone'), 'prototype')).toBe(
      COOL_STICKMAN_ASSET,
    );
  });

  it('keeps every hostile on the capsule until the prototype flag is set', () => {
    expect(resolveReplayActorModel(actor('boss', 'Yandir the Butcher'), 'off')).toBeNull();
    expect(resolveReplayActorModel(actor('enemy', 'Half-Giant Raider'), 'off')).toBeNull();
  });

  it('resolves a shipped boss only in prototype mode', () => {
    expect(resolveReplayActorModel(actor('boss', 'Yandir the Butcher'), 'prototype')?.id).toBe(
      'yandir-the-butcher-overview-v1',
    );
  });

  it('resolves each shipped Kyne’s Aegis boss to its own asset', () => {
    expect(resolveReplayActorModel(actor('boss', 'Captain Vrol'), 'prototype')?.id).toBe(
      'captain-vrol-overview-v2',
    );
    expect(resolveReplayActorModel(actor('enemy', 'captain vrol #3'), 'prototype')?.id).toBe(
      'captain-vrol-overview-v2',
    );
  });

  it('falls back to the capsule for unrecognized hostiles instead of substituting another model', () => {
    expect(resolveReplayActorModel(actor('enemy', 'Unmodelled Trash Mob'), 'prototype')).toBeNull();
    // Falgravn has no shipped asset yet: he must stay on the capsule, never borrow Vrol's body.
    expect(resolveReplayActorModel(actor('boss', 'Lord Falgravn'), 'prototype')).toBeNull();
    expect(resolveReplayActorModel(actor('enemy', 'Half-Giant Raider'), 'prototype')).toBeNull();
    expect(resolveReplayActorModel(actor('boss', 'Vrol'), 'prototype')).toBeNull();
  });

  it('keeps friendly npcs and pets on the capsule', () => {
    expect(resolveReplayActorModel(actor('friendly_npc', 'Ally'), 'prototype')).toBeNull();
    expect(resolveReplayActorModel(actor('pet', 'Twilight'), 'prototype')).toBeNull();
  });
});

describe('registry catalog integrity', () => {
  it('ships provenance and a runtime path for every reconstructed asset', () => {
    for (const asset of STATIC_REPLAY_ACTOR_MODEL_ASSETS) {
      expect(asset.path).toMatch(/^models\/.+\.glb$/);
      expect(asset.provenance.attributionFile).toMatch(/^public\/models\/.+\.md$/);
      expect(asset.provenance.sourceUrl).toMatch(/^https:\/\//);
      expect(asset.provenance.designation).toBe('project-authorized-fan-prototype');
      expect(asset.transform.modelHeight).toBeGreaterThan(0);
      expect(asset.transform.scale).toBeGreaterThan(0);
    }
  });

  it('stores aliases already normalized so lookups can compare directly', () => {
    for (const asset of STATIC_REPLAY_ACTOR_MODEL_ASSETS) {
      expect(asset.aliases.length).toBeGreaterThan(0);
      for (const alias of asset.aliases) {
        expect(alias).toBe(normalizeActorName(alias));
      }
    }
  });

  it('never lets two assets claim the same alias', () => {
    const seen = new Set<string>();
    for (const asset of STATIC_REPLAY_ACTOR_MODEL_ASSETS) {
      for (const alias of asset.aliases) {
        expect(seen.has(alias)).toBe(false);
        seen.add(alias);
      }
    }
  });

  it('uses unique asset ids', () => {
    const ids = STATIC_REPLAY_ACTOR_MODEL_ASSETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
