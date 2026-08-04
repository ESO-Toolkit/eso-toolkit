/**
 * @jest-environment jsdom
 *
 * Direct coverage for the PR #1400 itemIdMap async init gate — the fetched-JSON
 * load path (`preloadItemData`), its retry-after-failure reset, the HTTP non-ok
 * rejection, the "never latch a pre-init result" accessor guard, and the
 * `useItemDataReady` failed/ready transitions. Every OTHER itemIdMap test
 * bypasses this gate via `__initItemIdMapFromJson` (src/test/initItemData.ts),
 * so those branches are otherwise untested.
 *
 * jsdom has no `fetch`, so each test loads a FRESH module instance (module-scope
 * singleton state: `itemIdMap`, `itemDataReady`, `itemDataPromise`) via
 * `jest.isolateModules` and drives a mocked `global.fetch`. The module is
 * required while `fetch` is undefined so its eager module-eval load
 * (`if (typeof fetch === 'function')`) is skipped and each test controls the
 * fetch call count itself. `resetMocks: true` wipes mock implementations between
 * tests, so every `jest.fn()` is created inside its own test.
 */
import { renderHook, waitFor } from '@testing-library/react';

import { useItemDataReady } from '@/hooks/useItemDataReady';

import type { ItemInfo } from './itemIdMap';

type ItemIdMapModule = typeof import('./itemIdMap');

// Two synthetic items with hardcoded slots — enough for getItemsBySlot to return
// a non-empty, deterministic result post-init. IDs are far above the real range
// so they never collide with the collection index.
const HEAD_ITEM_ID = 900001;
const FIXTURE: Record<number, ItemInfo> = {
  [HEAD_ITEM_ID]: { name: 'Test Set Head', setName: 'Test Set', type: 'Heavy', slot: 'head' },
  900002: { name: 'Test Set Chest', setName: 'Test Set', type: 'Heavy', slot: 'chest' },
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

function loadItemIdMap(): ItemIdMapModule {
  let mod!: ItemIdMapModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./itemIdMap') as ItemIdMapModule;
  });
  return mod;
}

describe('itemIdMap async init gate', () => {
  beforeEach(() => {
    // Ensure the module's eager module-eval fetch is skipped on require.
    clearFetch();
    jest.resetModules();
  });

  afterEach(() => {
    clearFetch();
  });

  it('populates the map and flips ready on a successful fetch', async () => {
    const mod = loadItemIdMap();
    const mockFetch = jest.fn().mockResolvedValue(okJsonResponse(FIXTURE));
    setFetch(mockFetch);

    expect(mod.isItemDataReady()).toBe(false);
    await expect(mod.preloadItemData()).resolves.toBeUndefined();

    expect(mod.isItemDataReady()).toBe(true);
    expect(mod.getItemInfo(HEAD_ITEM_ID)).toMatchObject({ setName: 'Test Set', slot: 'head' });

    // Once ready, preloadItemData short-circuits — no additional fetch.
    await mod.preloadItemData();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects when the fetch resolves with a non-ok HTTP status', async () => {
    const mod = loadItemIdMap();
    const mockFetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
    setFetch(mockFetch);

    await expect(mod.preloadItemData()).rejects.toThrow('HTTP 500');
    expect(mod.isItemDataReady()).toBe(false);
  });

  it('rejects on fetch failure and retries with a NEW fetch on the next call', async () => {
    const mod = loadItemIdMap();
    const mockFetch = jest.fn().mockRejectedValue(new Error('network down'));
    setFetch(mockFetch);

    await expect(mod.preloadItemData()).rejects.toThrow('network down');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // The rejected promise must NOT be re-awaited — a second call issues a fresh
    // fetch (itemDataPromise reset on failure).
    await expect(mod.preloadItemData()).rejects.toThrow('network down');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mod.isItemDataReady()).toBe(false);
  });

  it('getItemsBySlot returns [] pre-init without latching, full results post-init', () => {
    const mod = loadItemIdMap();

    // Pre-init: empty map → no slot results.
    expect(mod.isItemDataReady()).toBe(false);
    expect(mod.getItemsBySlot('head')).toEqual([]);

    // The pre-init [] must NOT have been cached — after data lands the same slot
    // now resolves its full result set instead of serving a stale empty list.
    mod.__initItemIdMapFromJson(FIXTURE);
    expect(mod.isItemDataReady()).toBe(true);

    const results = mod.getItemsBySlot('head');
    expect(results.some((entry) => entry.itemId === HEAD_ITEM_ID)).toBe(true);

    // Post-init results ARE cached (stable identity) — the guard only blocks the
    // pre-init computation.
    expect(mod.getItemsBySlot('head')).toBe(results);
  });

  // This test drives the top-level (shared) itemIdMap instance through the hook
  // rather than an isolateModules copy — renderHook needs the hook to use the
  // same React instance as @testing-library/react, which isolateModules would
  // duplicate. The shared instance starts unready (its eager module-eval load is
  // skipped when fetch is undefined) and no other test in this file touches it.
  it('useItemDataReady flips failed after rejection then ready after a successful retry', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(okJsonResponse(FIXTURE));
    setFetch(mockFetch);

    const first = renderHook(() => useItemDataReady());
    await waitFor(() => expect(first.result.current.failed).toBe(true));
    expect(first.result.current.ready).toBe(false);
    first.unmount();

    // A later mount retries (promise was reset on failure) and this time succeeds.
    const second = renderHook(() => useItemDataReady());
    await waitFor(() => expect(second.result.current.ready).toBe(true));
    expect(second.result.current.failed).toBe(false);
    second.unmount();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
