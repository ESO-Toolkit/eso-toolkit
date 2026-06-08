import * as THREE from 'three';

/**
 * Texture-space sharpening for the replay floor map, injected into the material's compiled fragment
 * shader via `onBeforeCompile`.
 *
 * WHY a shader sharpen (not a post-process pass): the floor map is a flat image stretched over a big
 * plane and viewed obliquely, so it reads soft even with full anisotropy/mipmaps. A 4-neighbour
 * unsharp mask in the sampler recovers crisp edges on the art specifically. Doing it on the material
 * means it runs inside the scene's existing on-demand `gl.render` (RenderLoop in Arena3DScene) — zero
 * extra per-frame cost, no EffectComposer, no second renderer to fight the idle-pause render gate, and
 * no new dependency.
 *
 * The kernel offsets are scaled by `fwidth(vMapUv)` so the sharpen is screen-space-stable: it tracks
 * the map's on-screen footprint regardless of camera distance/foreshortening, instead of sharpening a
 * fixed texel radius that would over/under-shoot as the camera moves.
 *
 * Honesty note: unsharp masking only accentuates contrast already present in the (AI-upscaled) source;
 * it does not invent geography. `strength` is clamped so it can't ring/halo into garbage.
 */

const MAX_SHARPEN_STRENGTH = 1.5;

/** Per-perf-tier sharpen strength. Low tier gets none (also the cheapest path). */
export function sharpenStrengthForTier(tier: 'low' | 'medium' | 'high'): number {
  switch (tier) {
    case 'low':
      return 0;
    case 'medium':
      return 0.6;
    case 'high':
    default:
      return 1.0;
  }
}

// Replacement for three's `<map_fragment>` chunk. Same role (sample the map into diffuseColor) plus a
// 4-tap cross unsharp mask. Guarded on USE_MAP exactly like the stock chunk so a material with no map
// still compiles. `uFloorSharpen` is the strength uniform (0 = identical to stock sampling).
const SHARPEN_MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  #ifdef FLOOR_SHARPEN
    if ( uFloorSharpen > 0.0 ) {
      // Screen-space-stable offset: one on-screen "texel step" of the map UV.
      vec2 px = fwidth( vMapUv );
      vec4 n = texture2D( map, vMapUv + vec2( px.x, 0.0 ) )
             + texture2D( map, vMapUv - vec2( px.x, 0.0 ) )
             + texture2D( map, vMapUv + vec2( 0.0, px.y ) )
             + texture2D( map, vMapUv - vec2( 0.0, px.y ) );
      // Unsharp mask: push the centre away from its neighbour average.
      vec3 sharpened = sampledDiffuseColor.rgb + uFloorSharpen * ( sampledDiffuseColor.rgb - 0.25 * n.rgb );
      sampledDiffuseColor.rgb = clamp( sharpened, 0.0, 1.0 );
    }
  #endif
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif
`;

/**
 * Attach (or update) the unsharp-mask sharpen on a floor material. Safe to call repeatedly: it only
 * recompiles the shader the first time, and afterwards just updates the live `uFloorSharpen` uniform.
 *
 * @param material the floor mesh material
 * @param strength 0 disables the effect (uniform set to 0); clamped to a sane ceiling
 */
export function setupFloorSharpen(
  material: THREE.MeshPhongMaterial | null | undefined,
  strength: number,
): void {
  if (!material) {
    return;
  }
  const clamped = Math.max(0, Math.min(MAX_SHARPEN_STRENGTH, strength));

  // If already wired, just update the live uniform — no recompile.
  const existing = (material as unknown as { userData: { floorSharpenUniform?: { value: number } } })
    .userData?.floorSharpenUniform;
  if (existing) {
    existing.value = clamped;
    return;
  }

  material.defines = { ...(material.defines ?? {}), FLOOR_SHARPEN: '' };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFloorSharpen = { value: clamped };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      SHARPEN_MAP_FRAGMENT,
    );
    // Stash the uniform object so later strength changes update it without a recompile.
    material.userData.floorSharpenUniform = shader.uniforms.uFloorSharpen;
  };
  // Distinct cache key so this program is cached separately from a stock Phong program.
  material.customProgramCacheKey = () => 'floor-sharpen';
  material.needsUpdate = true;
}
