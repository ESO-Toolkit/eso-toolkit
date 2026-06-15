import * as THREE from 'three';

/**
 * Texture-space sharpening for the replay floor map, injected into the material's compiled fragment
 * shader via `onBeforeCompile`.
 *
 * WHY a shader sharpen (not a post-process pass): the floor map is a flat image stretched over a big
 * plane and viewed obliquely, so it reads soft even with full anisotropy/mipmaps. An adaptive
 * sharpen in the sampler recovers crisp edges on the art specifically. Doing it on the material
 * means it runs inside the scene's existing on-demand `gl.render` (RenderLoop in Arena3DScene) — zero
 * extra per-frame cost, no EffectComposer, no second renderer to fight the idle-pause render gate, and
 * no new dependency.
 *
 * WHY CAS (AMD FidelityFX Contrast Adaptive Sharpening) over a plain unsharp mask: a fixed unsharp
 * mask sharpens flat regions and high-contrast edges by the SAME amount, so it haloes/rings the
 * already-sharp edges (the worst artefact on an AI-upscaled map) while under-sharpening the soft
 * mid-contrast detail you actually want crisper. CAS scales the sharpen amount INVERSELY to local
 * contrast — it leaves crisp edges nearly untouched and lifts the soft interior — and then CLAMPS the
 * result to the local 3×3 luminance min/max, which makes overshoot (ring/halo) mathematically
 * impossible. The classic FidelityFX kernel: a diamond of 4 + the 4 diagonals (8 taps), a contrast
 * weight `w` from the min/max ratio, blended as `(centre + w·neighbours) / (1 + 8·w)`.
 *
 * The kernel offsets are scaled by `fwidth(vMapUv)` so the sharpen is screen-space-stable: it tracks
 * the map's on-screen footprint regardless of camera distance/foreshortening, instead of sharpening a
 * fixed texel radius that would over/under-shoot as the camera moves.
 *
 * Honesty note: contrast-adaptive sharpening only accentuates contrast already present in the
 * (AI-upscaled) source; it does not invent geography. `strength` is clamped, and the min/max clamp
 * guarantees no value leaves the range its own neighbourhood already spans.
 */

const MAX_SHARPEN_STRENGTH = 1.5;

/** Per-perf-tier sharpen strength. Low tier gets none (also the cheapest path). */
export function sharpenStrengthForTier(tier: 'low' | 'medium' | 'high'): number {
  switch (tier) {
    case 'low':
      return 0;
    case 'medium':
      return 0.5;
    case 'high':
    default:
      return 0.8;
  }
}

// Replacement for three's `<map_fragment>` chunk. Same role (sample the map into diffuseColor) plus a
// CAS (Contrast Adaptive Sharpening) pass. Guarded on USE_MAP exactly like the stock chunk so a
// material with no map still compiles. `uFloorSharpen` is the strength uniform (0 = identical to
// stock sampling). The kernel reads 8 neighbours (diamond + diagonals) around the centre tap.
const SHARPEN_MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  #ifdef FLOOR_SHARPEN
    if ( uFloorSharpen > 0.0 ) {
      // Screen-space-stable offset: one on-screen "texel step" of the map UV, so the kernel tracks
      // the map's on-screen footprint regardless of camera distance/foreshortening.
      vec2 px = fwidth( vMapUv );
      // 3x3 neighbourhood. d* = diamond (axis) taps, x* = diagonal taps; e = centre (already sampled).
      vec3 dn = texture2D( map, vMapUv + vec2( 0.0,  px.y ) ).rgb;
      vec3 ds = texture2D( map, vMapUv + vec2( 0.0, -px.y ) ).rgb;
      vec3 de = texture2D( map, vMapUv + vec2( px.x,  0.0 ) ).rgb;
      vec3 dw = texture2D( map, vMapUv + vec2(-px.x,  0.0 ) ).rgb;
      vec3 xne = texture2D( map, vMapUv + vec2( px.x,  px.y ) ).rgb;
      vec3 xnw = texture2D( map, vMapUv + vec2(-px.x,  px.y ) ).rgb;
      vec3 xse = texture2D( map, vMapUv + vec2( px.x, -px.y ) ).rgb;
      vec3 xsw = texture2D( map, vMapUv + vec2(-px.x, -px.y ) ).rgb;
      vec3 e = sampledDiffuseColor.rgb;
      // Per-channel min/max over the full ring + centre — the CAS clamp window. Output is clamped to
      // [mn,mx] so the sharpen can never overshoot its own neighbourhood (no ring/halo).
      vec3 mn = min( e, min( min( min( dn, ds ), min( de, dw ) ), min( min( xne, xnw ), min( xse, xsw ) ) ) );
      vec3 mx = max( e, max( max( max( dn, ds ), max( de, dw ) ), max( max( xne, xnw ), max( xse, xsw ) ) ) );
      // CAS contrast weight: high where the local window is FLAT (mx≈mn → sharpen hard), low where it
      // already has strong contrast (mx≫mn → leave edges alone). amp = sqrt(min/(max)) per FidelityFX,
      // using the darkest headroom so a near-white or near-black window both behave. Luminance-driven
      // so a single scalar weight steers all three channels coherently.
      float lmn = dot( mn, vec3( 0.299, 0.587, 0.114 ) );
      float lmx = dot( mx, vec3( 0.299, 0.587, 0.114 ) );
      float amp = sqrt( clamp( min( lmn, 1.0 - lmx ) / max( lmx, 1e-4 ), 0.0, 1.0 ) );
      // Map amp → a small negative neighbour weight w (the CAS "peak" knob folds in here via strength).
      // The classic kernel blends centre against the 8 neighbours: (e + w*sum) / (1 + 8*w). A negative
      // w sharpens (subtracts the surround). The stability bound is w >= -1/8 (so 1 + 8*w stays >= 0
      // and the divisor never collapses); clamp the amp·strength product to [0,1] BEFORE scaling by
      // 1/8 so even the ceiling strength (1.5) can never push the divisor non-positive.
      // Cap just under 1 so the divisor 1+8*w stays strictly positive (>=0.04), never a div-by-zero.
      float k = clamp( amp * uFloorSharpen, 0.0, 0.96 );
      float w = -k * 0.125;
      vec3 sum = dn + ds + de + dw + xne + xnw + xse + xsw;
      vec3 sharpened = ( e + w * sum ) / ( 1.0 + 8.0 * w );
      // Clamp to the local window — the guarantee that no halo/ring can appear.
      sampledDiffuseColor.rgb = clamp( sharpened, mn, mx );
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
  const existing = (
    material as unknown as { userData: { floorSharpenUniform?: { value: number } } }
  ).userData?.floorSharpenUniform;
  if (existing) {
    existing.value = clamped;
    return;
  }

  material.defines = { ...(material.defines ?? {}), FLOOR_SHARPEN: '' };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFloorSharpen = { value: clamped };
    // Custom uniforms added via onBeforeCompile are NOT auto-declared in the GLSL — three only
    // injects declarations for uniforms it knows about. Prepend the declaration ourselves, or the
    // SHARPEN_MAP_FRAGMENT chunk references an undeclared identifier and the fragment shader fails to
    // compile (→ a blank floor). Declared outside the #ifdef so it's always valid GLSL.
    shader.fragmentShader = `uniform float uFloorSharpen;\n${shader.fragmentShader}`.replace(
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
