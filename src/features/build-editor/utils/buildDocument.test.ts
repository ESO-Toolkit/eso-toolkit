import {
  CompressionStream as NodeCompressionStream,
  DecompressionStream as NodeDecompressionStream,
} from 'node:stream/web';

import { encodeBuildToURL } from '@/utils/buildEncoding';

import buildEditorReducer from '../store/buildEditorSlice';
import type { Build } from '../types/build.types';

import {
  createBuildDocumentBlob,
  isBuild,
  migrateLegacyStoredBuild,
  parseBuildDocument,
  serializeBuildDocument,
} from './buildDocument';

if (typeof (globalThis as { CompressionStream?: unknown }).CompressionStream === 'undefined') {
  (globalThis as { CompressionStream?: unknown }).CompressionStream = NodeCompressionStream;
}
if (typeof (globalThis as { DecompressionStream?: unknown }).DecompressionStream === 'undefined') {
  (globalThis as { DecompressionStream?: unknown }).DecompressionStream = NodeDecompressionStream;
}

const makeBuild = (): Build => {
  const initial = buildEditorReducer(undefined, { type: 'test/initial' }).build;
  return {
    ...initial,
    name: 'Lossless Build',
    addonImportString: 'CSPS_IMPORT_STRING',
    trialTags: ['lucent_citadel'],
    guide: {
      content: '# Rotation\nKeep every guide field.',
      youtubeUrl: 'https://www.youtube.com/watch?v=example',
      bannerImageUrl: 'https://example.com/banner.png',
    },
    setups: [
      {
        ...initial.setups[0],
        screenshots: ['data:image/png;base64,ZnVsbC1maWRlbGl0eQ=='],
        skilledAbilities: [{ abilityId: 123, morph: 2 }],
        scribedAbilityIds: [456],
        quickslots: [{ type: 5, id: 789 }],
        statOverrides: {
          ...initial.setups[0].statOverrides!,
          weaponDamage: 6500,
        },
      },
    ],
  };
};

describe('build documents', () => {
  it('round-trips every editable field without using the lossy link codec', async () => {
    const build = makeBuild();

    await expect(parseBuildDocument(serializeBuildDocument(build))).resolves.toEqual(build);
  });

  it('accepts legacy raw Build JSON exports', async () => {
    const build = makeBuild();

    await expect(parseBuildDocument(JSON.stringify(build))).resolves.toEqual(build);
  });

  it('creates a parseable lossless Blob without a monolithic export string', async () => {
    const build = makeBuild();
    const blob = await createBuildDocumentBlob(build);
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });

    expect(blob.type).toBe('application/json;charset=utf-8');
    await expect(parseBuildDocument(source)).resolves.toEqual(build);
  });

  it('rejects objects that do not have the editor core shape', () => {
    expect(isBuild({ id: 'not-enough-fields' })).toBe(false);
  });

  it.each([
    ['attributes', { attributes: { magicka: 64, health: 0 } }],
    ['gear', { gear: { 0: null } }],
    ['skills', { skills: { 0: {}, 1: null } }],
    ['champion points', { cp: { warfare: { slots: null, passives: {} } } }],
    ['consumables', { consumables: { potions: {}, food: {} } }],
    ['passives', { passives: [1, 'invalid'] }],
    ['screenshots', { screenshots: 'not-an-array' }],
    ['stat overrides', { statOverrides: { buffs: [] } }],
  ])('rejects malformed nested setup %s', async (_field, malformedSetup) => {
    const build = makeBuild();
    const document = JSON.parse(serializeBuildDocument(build)) as {
      build: ReturnType<typeof makeBuild>;
    };
    Object.assign(document.build.setups[0], malformedSetup);

    await expect(parseBuildDocument(JSON.stringify(document))).resolves.toBeUndefined();
  });

  it('rejects documents with unsupported versions', async () => {
    const document = JSON.parse(serializeBuildDocument(makeBuild())) as { version: number };
    document.version = 2;

    await expect(parseBuildDocument(JSON.stringify(document))).resolves.toBeUndefined();
  });

  it.each([
    ['class', { esoClass: 'bard' }],
    ['role', { role: 'support' }],
    ['game mode', { gameMode: 'housing' }],
    ['class skill line', { classSkillLines: ['class.fake', null, null] }],
    ['setup order', { settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [1] } }],
  ])('rejects an invalid build %s', async (_field, invalidFields) => {
    const document = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    Object.assign(document.build, invalidFields);

    await expect(parseBuildDocument(JSON.stringify(document))).resolves.toBeUndefined();
  });

  it('rejects more setups and champion slots than the editor supports', async () => {
    const tooManySetups = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    tooManySetups.build.setups = Array.from({ length: 6 }, (_, index) => ({
      ...tooManySetups.build.setups[0],
      id: `setup-${index}`,
    }));
    tooManySetups.build.settings.setupOrder = [0, 1, 2, 3, 4, 5];

    await expect(parseBuildDocument(JSON.stringify(tooManySetups))).resolves.toBeUndefined();

    const tooManyChampionSlots = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    tooManyChampionSlots.build.setups[0].cp.warfare.slots = [1, 2, 3, 4, 5];

    await expect(parseBuildDocument(JSON.stringify(tooManyChampionSlots))).resolves.toBeUndefined();
  });

  it('rejects screenshots outside the editor count, MIME, and size limits', async () => {
    const unsupportedMime = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    unsupportedMime.build.setups[0].screenshots = ['data:image/svg+xml;base64,PHN2Zy8+'];
    await expect(parseBuildDocument(JSON.stringify(unsupportedMime))).resolves.toBeUndefined();

    const tooMany = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    tooMany.build.setups[0].screenshots = Array.from(
      { length: 9 },
      () => 'data:image/png;base64,AA==',
    );
    await expect(parseBuildDocument(JSON.stringify(tooMany))).resolves.toBeUndefined();

    const oversized = JSON.parse(serializeBuildDocument(makeBuild())) as {
      build: ReturnType<typeof makeBuild>;
    };
    oversized.build.setups[0].screenshots = [`data:image/png;base64,${'A'.repeat(6_990_512)}`];
    await expect(parseBuildDocument(JSON.stringify(oversized))).resolves.toBeUndefined();
  });

  it('continues to decode legacy compact exports', async () => {
    const build = makeBuild();
    const compact = await encodeBuildToURL(build);

    await expect(parseBuildDocument(compact)).resolves.toMatchObject({
      name: build.name,
      setups: [
        expect.objectContaining({
          name: build.setups[0].name,
          attributes: build.setups[0].attributes,
        }),
      ],
    });
  });

  it('migrates pre-subclassing stored builds and removes unsupported historical screenshots', () => {
    const legacy = JSON.parse(JSON.stringify(makeBuild())) as Record<string, unknown>;
    delete legacy.classSkillLines;
    delete legacy.classMasteryPassives;
    const setups = legacy.setups as Build['setups'];
    setups[0].screenshots = ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,AA=='];

    const migrated = migrateLegacyStoredBuild(legacy);

    expect(migrated?.classSkillLines).toHaveLength(3);
    expect(migrated?.classMasteryPassives).toEqual([]);
    expect(migrated?.setups[0].screenshots).toEqual(['data:image/png;base64,AA==']);
  });
});
