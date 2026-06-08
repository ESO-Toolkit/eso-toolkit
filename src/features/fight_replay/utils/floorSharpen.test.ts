import * as THREE from 'three';

import { setupFloorSharpen, sharpenStrengthForTier } from './floorSharpen';

describe('sharpenStrengthForTier', () => {
  it('disables sharpen on the low tier', () => {
    expect(sharpenStrengthForTier('low')).toBe(0);
  });

  it('increases with tier (low < medium < high)', () => {
    expect(sharpenStrengthForTier('low')).toBeLessThan(sharpenStrengthForTier('medium'));
    expect(sharpenStrengthForTier('medium')).toBeLessThan(sharpenStrengthForTier('high'));
  });
});

describe('setupFloorSharpen', () => {
  it('is a no-op for a null material (does not throw)', () => {
    expect(() => setupFloorSharpen(null, 1.0)).not.toThrow();
  });

  it('sets the FLOOR_SHARPEN define and an onBeforeCompile hook on first call', () => {
    const mat = new THREE.MeshPhongMaterial();
    const versionBefore = mat.version;
    setupFloorSharpen(mat, 1.0);
    expect(mat.defines?.FLOOR_SHARPEN).toBe('');
    expect(typeof mat.onBeforeCompile).toBe('function');
    // `needsUpdate` is a write-only setter (bumps version); assert the version bumped instead.
    expect(mat.version).toBeGreaterThan(versionBefore);
    expect(typeof mat.customProgramCacheKey).toBe('function');
    expect(mat.customProgramCacheKey()).toBe('floor-sharpen');
  });

  it('injects the unsharp-mask chunk in place of <map_fragment>', () => {
    const mat = new THREE.MeshPhongMaterial();
    setupFloorSharpen(mat, 1.0);
    // Simulate three calling the hook with a shader carrying the stock include.
    const shader = { uniforms: {} as Record<string, unknown>, fragmentShader: 'a\n#include <map_fragment>\nb' };
    (mat.onBeforeCompile as (s: typeof shader) => void)(shader);
    expect(shader.fragmentShader).not.toContain('#include <map_fragment>');
    // The uniform must be DECLARED in the GLSL (not just added to shader.uniforms), or the shader
    // fails to compile with an undeclared-identifier error → blank floor. This guards that bug.
    expect(shader.fragmentShader).toContain('uniform float uFloorSharpen;');
    expect(shader.fragmentShader).toContain('uFloorSharpen >');
    expect((shader.uniforms.uFloorSharpen as { value: number }).value).toBeCloseTo(1.0);
    // The uniform is stashed for later live updates.
    expect(mat.userData.floorSharpenUniform).toBe(shader.uniforms.uFloorSharpen);
  });

  it('updates the live uniform without re-recompiling on a second call', () => {
    const mat = new THREE.MeshPhongMaterial();
    setupFloorSharpen(mat, 1.0);
    const firstHook = mat.onBeforeCompile;
    const shader = { uniforms: {} as Record<string, unknown>, fragmentShader: '#include <map_fragment>' };
    (mat.onBeforeCompile as (s: typeof shader) => void)(shader);

    setupFloorSharpen(mat, 0.3); // second call after compile
    expect(mat.onBeforeCompile).toBe(firstHook); // hook not replaced
    expect((mat.userData.floorSharpenUniform as { value: number }).value).toBeCloseTo(0.3);
  });

  it('clamps strength to a sane ceiling and floor', () => {
    const mat = new THREE.MeshPhongMaterial();
    setupFloorSharpen(mat, 99);
    const shader = { uniforms: {} as Record<string, unknown>, fragmentShader: '#include <map_fragment>' };
    (mat.onBeforeCompile as (s: typeof shader) => void)(shader);
    expect((shader.uniforms.uFloorSharpen as { value: number }).value).toBeLessThanOrEqual(1.5);

    setupFloorSharpen(mat, -5);
    expect((mat.userData.floorSharpenUniform as { value: number }).value).toBe(0);
  });
});
