import type {
  ActorPosition,
  TimestampPositionLookup,
} from '../../../workers/calculations/CalculateActorPositions';

import {
  buildDraftModelOverrides,
  createDraftReplayModelAsset,
  type DraftModelEntry,
} from './draftReplayModels';
import { buildDraftReplayLookup } from './draftReplayPreview';
import { resolveReplayActorModel } from './replayActorModelRegistry';

const entry = (id: string): DraftModelEntry => ({
  id,
  name: id,
  kind: 'lesser',
  family: 'Untrusted family',
  model: `models/${id}.glb`,
  referenceImage: 'reference.png',
  previewImage: 'preview.png',
  sourceUrl: 'https://example.com/reference',
  reviewNote: 'Unaccepted draft.',
});

function actor(name: string, type: ActorPosition['type'] = 'enemy'): ActorPosition {
  return { id: 1, name, type, position: [0, 0, 0], rotation: 0, isDead: false };
}

function lookupFor(actors: Record<number, ActorPosition>): TimestampPositionLookup {
  const lookup = buildDraftReplayLookup({ name: 'Fixture', kind: 'lesser' });
  return {
    ...lookup,
    actorIds: Object.keys(actors).map(Number),
    positionsByTimestamp: { 0: actors },
  };
}

describe('buildDraftModelOverrides', () => {
  it('leaves default and missing manifest entries unchanged', () => {
    const lookup = lookupFor({ 1: actor('Wolf') });
    expect(buildDraftModelOverrides(lookup).size).toBe(0);
    expect(buildDraftModelOverrides(null, [entry('wolf-basic-oblique-front')]).size).toBe(0);
    expect(buildDraftModelOverrides(lookup, [entry('unknown-draft')]).size).toBe(0);
    expect(resolveReplayActorModel(actor('Wolf'))).toBeNull();
  });

  it('normalizes exact aliases and assigns every hostile instance to a shared asset', () => {
    const lookup = lookupFor({
      1: actor('  COUNT   RYELAZ #2 ', 'boss'),
      2: actor('Count Ryelaz', 'enemy'),
      3: actor('Count Ryelaz Shade'),
    });
    const overrides = buildDraftModelOverrides(lookup, [
      entry('count-ryelaz-complete-folded-front'),
    ]);
    expect([...overrides.keys()]).toEqual([1, 2]);
    expect(overrides.get(1)).toBe(overrides.get(2));
  });

  it.each([
    ['Archcustodian', 'archcustodian-four-native'],
    ['Exarchanic Yaseyla', 'yaseyla-main-phase-lower-res-experimental'],
  ])('uses the explicit named identity for %s', (name, id) => {
    const overrides = buildDraftModelOverrides(lookupFor({ 1: actor(name, 'boss') }), [entry(id)]);
    expect(overrides.get(1)?.id).toBe(`draft-preview-${id}`);
  });

  it('finds an actor first recorded late and ignores actors outside the fight list', () => {
    const lookup = lookupFor({ 1: actor('Unknown'), 2: actor('Wolf') });
    lookup.positionsByTimestamp = {
      0: { 1: actor('Unknown') },
      40_000: { 2: actor('Wolf'), 3: actor('Wolf') },
    };
    expect([
      ...buildDraftModelOverrides(lookup, [entry('wolf-basic-oblique-front')]).keys(),
    ]).toEqual([2]);
  });

  it('finds late actors from frames when the optional actor list is absent', () => {
    const lookup = lookupFor({ 1: actor('Unknown') });
    delete lookup.actorIds;
    lookup.positionsByTimestamp[40_000] = { 2: actor('Wolf') };
    expect([
      ...buildDraftModelOverrides(lookup, [entry('wolf-basic-oblique-front')]).keys(),
    ]).toEqual([2]);
  });

  it('excludes players, pets, and friendly NPCs even with an exact alias', () => {
    const lookup = lookupFor({
      1: actor('Wolf', 'player'),
      2: actor('Wolf', 'pet'),
      3: actor('Wolf', 'friendly_npc'),
      4: actor('Wolf'),
    });
    expect([
      ...buildDraftModelOverrides(lookup, [entry('wolf-basic-oblique-front')]).keys(),
    ]).toEqual([4]);
  });

  it('keeps generic Haj Mota and Coral Haj Mota distinct despite their shared family', () => {
    const overrides = buildDraftModelOverrides(
      lookupFor({ 1: actor('Haj Mota'), 2: actor('Coral Haj Mota'), 3: actor('Ancient Haj Mota') }),
      [entry('haj-mota-exact-rgb-pair'), entry('coral-haj-mota-exact-rgb-pair')],
    );
    expect(overrides.get(1)?.id).toBe('draft-preview-haj-mota-exact-rgb-pair');
    expect(overrides.get(2)?.id).toBe('draft-preview-coral-haj-mota-exact-rgb-pair');
    expect(overrides.has(3)).toBe(false);
  });

  it('does not infer named bosses, generic zombies, or colors from species names', () => {
    const overrides = buildDraftModelOverrides(
      lookupFor({
        1: actor('Foundation Stone', 'boss'),
        2: actor('Rakkhat', 'boss'),
        3: actor('Silaeda', 'boss'),
        4: actor('Zombie'),
        5: actor('Female Dark Elf Zombie'),
        6: actor('Stone Atronach'),
        7: actor('Wolf Guardian'),
        8: actor('Gray Wolf'),
      }),
      [
        entry('stone-atronach-native-front'),
        entry('daedric-titan-blue-winged-pair'),
        entry('gryphon-brown-folded-oblique-pair'),
        entry('female-dark-elf-zombie-native-front'),
        entry('wolf-basic-oblique-front'),
      ],
    );
    expect([...overrides.keys()]).toEqual([6]);
  });
});

describe('createDraftReplayModelAsset', () => {
  it('retains draft provenance and the gallery transform without promoting the asset', () => {
    expect(
      createDraftReplayModelAsset({ ...entry('wolf-basic-oblique-front'), modelHeight: 3 }),
    ).toMatchObject({
      id: 'draft-preview-wolf-basic-oblique-front',
      path: 'replay-model-drafts/models/wolf-basic-oblique-front.glb',
      actorTypes: ['enemy', 'boss'],
      aliases: ['wolf'],
      transform: { scale: 1.25, modelHeight: 3 },
      provenance: { attributionFile: 'public/replay-model-drafts/manifest.json' },
    });
  });
});
