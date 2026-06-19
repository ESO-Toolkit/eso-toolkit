/**
 * Guards the invariant the publish dialog relies on: re-encoding a build with a
 * changed settings.visibility produces a blob that decodes back to the new
 * value. If this broke, the embedded visibility could desync from the server's
 * hub metadata and mislead client-side share gating.
 *
 * Runs in jsdom (the encoder touches `window`), so polyfill the compression
 * streams it needs from Node — jsdom does not expose CompressionStream.
 */
import {
  CompressionStream as NodeCompressionStream,
  DecompressionStream as NodeDecompressionStream,
} from 'node:stream/web';

if (typeof (globalThis as { CompressionStream?: unknown }).CompressionStream === 'undefined') {
  (globalThis as { CompressionStream?: unknown }).CompressionStream = NodeCompressionStream;
}
if (typeof (globalThis as { DecompressionStream?: unknown }).DecompressionStream === 'undefined') {
  (globalThis as { DecompressionStream?: unknown }).DecompressionStream = NodeDecompressionStream;
}

import type {
  Build,
  BuildChampionPoints,
  BuildSetup,
  BuildVisibility,
} from '../features/build-editor/types/build.types';
import { decodeBuildFromURL, encodeBuildToURL } from './buildEncoding';

const makeEmptyCP = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

const makeSetup = (): BuildSetup => ({
  id: 'setup-1',
  name: 'Default',
  attributes: { magicka: 0, health: 0, stamina: 0 },
  curse: 'none',
  mundusStone: '',
  gear: {},
  skills: { 0: {}, 1: {} },
  cp: makeEmptyCP(),
  consumables: { potions: [], food: {} },
  passives: [],
  screenshots: [],
});

const makeBuild = (visibility: BuildVisibility): Build => ({
  id: 'build-1',
  name: 'Test Build',
  shortDescription: '',
  esoClass: 'any-class',
  classSkillLines: [null, null, null],
  classMasteryPassives: [],
  role: 'magicka-dps',
  gameMode: 'pve',
  races: [],
  setups: [makeSetup()],
  guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
  settings: { visibility, dlc: 'Base Game', setupOrder: [0] },
  addonImportString: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

// Mirrors the publish dialog: decode the stored blob, override visibility,
// re-encode, and return the synced blob.
const resyncVisibility = async (buildData: string, next: BuildVisibility): Promise<string> => {
  const decoded = await decodeBuildFromURL(buildData);
  if (!decoded) throw new Error('decode failed');
  return encodeBuildToURL({ ...decoded, settings: { ...decoded.settings, visibility: next } });
};

describe('build encoding — visibility sync', () => {
  it.each<[BuildVisibility, BuildVisibility]>([
    ['public', 'private'],
    ['public', 'link-only'],
    ['private', 'public'],
    ['link-only', 'private'],
  ])('re-encoding %s → %s lands the new visibility in the blob', async (from, to) => {
    const original = await encodeBuildToURL(makeBuild(from));
    const fromDecoded = await decodeBuildFromURL(original);
    expect(fromDecoded?.settings.visibility).toBe(from);

    const resynced = await resyncVisibility(original, to);
    const toDecoded = await decodeBuildFromURL(resynced);
    expect(toDecoded?.settings.visibility).toBe(to);
  });
});
