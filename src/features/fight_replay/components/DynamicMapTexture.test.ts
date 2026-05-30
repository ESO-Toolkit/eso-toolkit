import * as THREE from 'three';

import { generateFallbackTexture } from './DynamicMapTexture';

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
