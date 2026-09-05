import * as THREE from 'three';

import {
  applyFloorTexture,
  cacheMapTexture,
  clearMapTextureCache,
  generateFallbackTexture,
  generateMaplessFloorTexture,
  getCachedMapTexture,
  releaseMapTexture,
  retainMapTexture,
} from './DynamicMapTexture';

/**
 * generateFallbackTexture backs the "blank floor" fix: when a CDN map texture fails to
 * load, DynamicMapTexture assigns this procedural grid texture to the material instead of
 * `map = null` (which left a featureless solid-color plane). These tests pin the contract
 * the catch blocks rely on — that the helper always returns a usable, non-null texture —
 * and that it degrades safely in environments without a 2D canvas backend (jsdom, where
 * `getContext('2d')` returns null).
 */
describe('generateFallbackTexture', () => {
  // jsdom has no 2D canvas backend; the real getContext('2d') returns null AND logs a
  // noisy "not implemented" virtual-console warning. Stub it to null so the suite is quiet
  // and deterministic — this also exercises the production null-context guard on every
  // case, which is exactly the environment the guard exists for.
  let getContextSpy: jest.SpyInstance;
  beforeEach(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    getContextSpy.mockRestore();
  });

  it('returns a non-null CanvasTexture (the contract DynamicMapTexture relies on)', () => {
    const texture = generateFallbackTexture();
    expect(texture).not.toBeNull();
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    texture.dispose();
  });

  it('backs the texture with a 512x512 canvas', () => {
    const texture = generateFallbackTexture();
    const canvas = texture.image as HTMLCanvasElement;
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    texture.dispose();
  });

  it('uses clamp-to-edge wrapping and linear filtering for clean floor rendering', () => {
    const texture = generateFallbackTexture();
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    texture.dispose();
  });

  it('does not throw when a 2D context is unavailable (null-context guard)', () => {
    // getContext is stubbed to null (see beforeEach). The eager getContext('2d')! from the
    // original audit suggestion would have NPE'd on the first draw call here; the guard
    // means generation still succeeds, producing a blank-but-valid texture.
    expect(() => generateFallbackTexture().dispose()).not.toThrow();
    expect(getContextSpy).toHaveBeenCalledWith('2d');
  });

  it('returns a fresh texture each call so per-instance disposal is safe', () => {
    // DynamicMapTexture memoizes one per mount and disposes it on unmount. Because the
    // Canvas remounts per fight (key={canvas-<fight.id>}), a shared/disposed singleton
    // would break the next fight viewed — so each call must yield an independent texture.
    const a = generateFallbackTexture();
    const b = generateFallbackTexture();
    expect(a).not.toBe(b);
    expect(a.image).not.toBe(b.image);
    a.dispose();
    b.dispose();
  });
});

/**
 * generateMaplessFloorTexture backs the "deliberate floor for a mapless fight" fix: every trash pull
 * (encounterID 0 — dungeon/trial trash, Cyrodiil/PvP) has an empty fight.maps, so an empty map
 * timeline would otherwise leave a bare dark plane that reads as broken. DynamicMapTexture binds this
 * slate surface instead. Same contract as the error-grid: always a usable, non-null CanvasTexture,
 * safe in a 2D-context-less environment.
 */
describe('generateMaplessFloorTexture', () => {
  let getContextSpy: jest.SpyInstance;
  beforeEach(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    getContextSpy.mockRestore();
  });

  it('returns a non-null CanvasTexture (the contract DynamicMapTexture relies on)', () => {
    const texture = generateMaplessFloorTexture();
    expect(texture).not.toBeNull();
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    texture.dispose();
  });

  it('uses sRGB color space + clamp/linear sampling so it matches the real-map floor', () => {
    const texture = generateMaplessFloorTexture();
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    texture.dispose();
  });

  it('does not throw when a 2D context is unavailable (null-context guard)', () => {
    expect(() => generateMaplessFloorTexture().dispose()).not.toThrow();
    expect(getContextSpy).toHaveBeenCalledWith('2d');
  });

  it('returns a fresh texture each call so per-instance disposal is safe', () => {
    const a = generateMaplessFloorTexture();
    const b = generateMaplessFloorTexture();
    expect(a).not.toBe(b);
    a.dispose();
    b.dispose();
  });
});

/**
 * applyFloorTexture is the contract every async map-load callback (CDN success and
 * failure→fallback, in both the useFrame and useEffect paths) routes through. The
 * on-demand RenderLoop only repaints when something marks the scene dirty; these texture
 * swaps fire from promise callbacks outside any React commit / time change / camera move,
 * so they MUST invoke onTextureChange or a freshly-loaded floor would not paint while
 * playback is paused (until an unrelated dirty event). These tests pin that contract
 * directly — no live R3F canvas required (jsdom can't provide one).
 */
describe('applyFloorTexture', () => {
  const makeMaterial = () =>
    ({ map: null, needsUpdate: false }) as unknown as THREE.MeshPhongMaterial;
  const makeTexture = () => ({}) as unknown as THREE.Texture;

  it('binds the texture and flags the material for a GPU re-upload', () => {
    const material = makeMaterial();
    const texture = makeTexture();
    applyFloorTexture(material, texture);
    expect(material.map).toBe(texture);
    expect(material.needsUpdate).toBe(true);
  });

  it('invokes onTextureChange so the on-demand RenderLoop repaints (paint-correctness)', () => {
    const material = makeMaterial();
    const onTextureChange = jest.fn();
    applyFloorTexture(material, makeTexture(), onTextureChange);
    expect(onTextureChange).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the material has unmounted (ref is null) — no throw, no callback', () => {
    const onTextureChange = jest.fn();
    expect(() => applyFloorTexture(null, makeTexture(), onTextureChange)).not.toThrow();
    expect(onTextureChange).not.toHaveBeenCalled();
  });

  it('works without an onTextureChange (optional dirty signal) — still swaps the texture', () => {
    const material = makeMaterial();
    const texture = makeTexture();
    expect(() => applyFloorTexture(material, texture)).not.toThrow();
    expect(material.map).toBe(texture);
    expect(material.needsUpdate).toBe(true);
  });
});

/**
 * cacheMapTexture / getCachedMapTexture back the module-level texture cache that
 * DynamicMapTexture's loadTexture() reads/writes through. It is bounded at
 * MAX_CACHED_MAP_TEXTURES (8, not exported — inferred here by filling the cache to capacity)
 * and MUST behave as a true LRU: the eviction victim is whichever entry was least recently
 * used, not merely least recently inserted. It must also never dispose a texture that a
 * mounted DynamicMapTexture instance still has bound (tracked via retainMapTexture /
 * releaseMapTexture) — disposing a live, GPU-bound texture causes three.js to silently
 * re-upload it on the next render (wasted work) and orphans the GPU resource the cache can no
 * longer reach.
 */
describe('cacheMapTexture / getCachedMapTexture (LRU + live-reference eviction)', () => {
  afterEach(() => {
    clearMapTextureCache();
  });

  // Fills the cache to exactly its capacity (8) with fresh spy-instrumented textures keyed
  // 'map-0'..'map-7', in insertion order. Capacity itself isn't exported, but the reviewer-
  // verified defect report pins it at 8, and filling to exactly that many never triggers an
  // eviction on its own — the next `cacheMapTexture` call is what pushes it over and forces
  // exactly one eviction, which is what each test below inspects.
  const CAPACITY = 8;
  function fillCache(): { keys: string[]; textures: THREE.Texture[]; disposeSpies: jest.Mock[] } {
    const keys: string[] = [];
    const textures: THREE.Texture[] = [];
    const disposeSpies: jest.Mock[] = [];
    for (let i = 0; i < CAPACITY; i++) {
      const key = `map-${i}`;
      const texture = new THREE.Texture();
      const spy = jest.spyOn(texture, 'dispose');
      cacheMapTexture(key, texture);
      keys.push(key);
      textures.push(texture);
      disposeSpies.push(spy);
    }
    return { keys, textures, disposeSpies };
  }

  it('evicts the least-recently-USED entry, not merely the least-recently-inserted one', () => {
    const { keys, disposeSpies } = fillCache();
    const [oldestKey, secondOldestKey] = keys;

    // Read the oldest entry — a true LRU must treat this as a "use" and protect it from
    // being the next eviction victim. Under a FIFO masquerading as LRU (Map iteration order,
    // never refreshed on read) this call is a no-op for ordering purposes and the test below
    // fails: the oldest key is disposed anyway.
    const refreshed = getCachedMapTexture(oldestKey);
    expect(refreshed).toBeDefined();

    // Pushing a 9th distinct entry forces exactly one eviction.
    const ninthTexture = new THREE.Texture();
    cacheMapTexture('map-8', ninthTexture);

    // The just-read entry must survive...
    expect(getCachedMapTexture(oldestKey)).toBeDefined();
    expect(disposeSpies[0]).not.toHaveBeenCalled();

    // ...and the NEXT-oldest (never read) must be the one evicted and disposed instead.
    expect(getCachedMapTexture(secondOldestKey)).toBeUndefined();
    expect(disposeSpies[1]).toHaveBeenCalledTimes(1);

    ninthTexture.dispose();
  });

  it('evicts a still-retained (live) texture from the cache WITHOUT disposing it', () => {
    const { keys, disposeSpies } = fillCache();
    const [oldestKey] = keys;

    // Simulate a mounted DynamicMapTexture instance whose floor material still has this
    // texture bound as `material.map`.
    retainMapTexture(oldestKey);

    // Force eviction of the (untouched, still-oldest) entry.
    const ninthTexture = new THREE.Texture();
    cacheMapTexture('map-8', ninthTexture);

    // It must be gone from the cache (the cache drops its own bookkeeping/ownership)...
    expect(getCachedMapTexture(oldestKey)).toBeUndefined();
    // ...but MUST NOT have been disposed, because it is still live/bound elsewhere. Disposing
    // it here would leave a mounted floor's material.map pointing at a disposed GPU texture.
    expect(disposeSpies[0]).not.toHaveBeenCalled();

    releaseMapTexture(oldestKey);
    ninthTexture.dispose();
  });

  it('disposes an evicted-while-live texture once its last holder releases it', () => {
    const { keys, disposeSpies } = fillCache();
    const [oldestKey] = keys;

    retainMapTexture(oldestKey);

    const ninthTexture = new THREE.Texture();
    cacheMapTexture('map-8', ninthTexture);

    // Evicted but still bound, so not yet disposed (previous test covers this).
    expect(disposeSpies[0]).not.toHaveBeenCalled();

    // Eviction already dropped the cache's only handle to this texture, so release is the
    // sole remaining hook able to free it. If release doesn't dispose here, nothing ever
    // will and the GPU texture leaks for the lifetime of the page — skipping the dispose
    // of a live texture must defer disposal, not abandon it.
    releaseMapTexture(oldestKey);
    expect(disposeSpies[0]).toHaveBeenCalledTimes(1);

    ninthTexture.dispose();
  });
});
