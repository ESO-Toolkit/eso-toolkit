/**
 * @jest-environment jsdom
 *
 * Collection data is a fetched Vite asset in production. These tests keep the
 * module's eager preload disabled while requiring it, then exercise the shared
 * readiness gate and retry behavior directly.
 */

type ItemSetCollectionsModule = typeof import('./itemSetCollections');

const FIXTURE = {
  metadata: {
    generatedAt: 'test',
    source: 'test',
    totalPieces: 1,
    totalItems: 1,
    unknownSlotCount: 0,
  },
  slotMasks: {
    '1': { category: 'armor' as const, slot: 'head', weight: 'light' as const },
  },
  items: {
    '900001': { setId: 42, slotMask: 1, category: 'armor' as const },
  },
};

function okJsonResponse(data: unknown): Partial<Response> {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

function setFetch(fn: jest.Mock): void {
  (globalThis as { fetch?: typeof fetch }).fetch = fn as unknown as typeof fetch;
}

function clearFetch(): void {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
}

function loadCollections(): ItemSetCollectionsModule {
  let mod!: ItemSetCollectionsModule;
  jest.isolateModules(() => {
    mod = require('./itemSetCollections') as ItemSetCollectionsModule;
  });
  return mod;
}

describe('item-set collection async gate', () => {
  beforeEach(() => {
    clearFetch();
    jest.resetModules();
  });

  afterEach(() => {
    clearFetch();
  });

  it('loads the fetched asset and keeps synchronous lookups behind readiness', async () => {
    const mod = loadCollections();
    const mockFetch = jest.fn().mockResolvedValue(okJsonResponse(FIXTURE));
    setFetch(mockFetch);

    expect(mod.isItemSetCollectionsReady()).toBe(false);
    expect(mod.getCollectionItem(900001)).toBeUndefined();
    expect(mod.getCollectionItemIdsBySlot('head')).toEqual(new Set());

    await expect(mod.preloadItemSetCollections()).resolves.toBeUndefined();

    expect(mod.isItemSetCollectionsReady()).toBe(true);
    expect(mod.getCollectionItem(900001)).toMatchObject({
      itemId: 900001,
      setId: 42,
      slotType: 'head',
    });
    expect(mod.getCollectionItemIdsBySlot('head')).toEqual(new Set([900001]));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('resets the rejected promise so a later call retries', async () => {
    const mod = loadCollections();
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(okJsonResponse(FIXTURE));
    setFetch(mockFetch);

    await expect(mod.preloadItemSetCollections()).rejects.toThrow('network down');
    expect(mod.isItemSetCollectionsReady()).toBe(false);

    await expect(mod.preloadItemSetCollections()).resolves.toBeUndefined();
    expect(mod.isItemSetCollectionsReady()).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not latch pre-load empty results when initialized later', () => {
    const mod = loadCollections();

    expect(mod.getCollectionItemIdsBySlot('head')).toEqual(new Set());
    mod.__initItemSetCollectionsFromJson(FIXTURE);

    const ids = mod.getCollectionItemIdsBySlot('head');
    expect(ids).toEqual(new Set([900001]));
    expect(mod.findCollectionItemBySetAndSlotType(42, 'head')).toMatchObject({
      itemId: 900001,
      slotType: 'head',
    });
  });
});
