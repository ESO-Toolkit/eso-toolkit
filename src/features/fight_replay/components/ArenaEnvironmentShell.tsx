import { Billboard, Sparkles, Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Lore-accurate Elder Scrolls cosmic backdrop. The arena (flat 2D map + figures) floats inside the
 * dome of Oblivion, under Tamriel's sky. Everything here is OUTSIDE/ABOVE the 0..size play footprint
 * (dome, stars, moons, planet-eyes, nebula) — it never moves an actor or touches the coordinate
 * contract; pure backdrop (the honesty line from .scratch/3D-WORLD-PLAN.md §2).
 *
 * Grounded in TES canon (.scratch/ESO-COSMOS-SPEC.md), the four facts that make it read as Elder
 * Scrolls rather than generic space:
 *  1. Stars are HOLES into Aetherius (the Magna-Ge's escape), all the SAME radiant light → a uniform
 *     warm-white field, NOT varied hues (saturation 0).
 *  2. The two moons: Masser (larger, rust-RED — Mars-like, Lorkhan's withered corpse) and Secunda
 *     (smaller, pale BLUE-GREY); their terminators shade toward one shared sun (Magnus).
 *  3. Aetherius is the realm of SEARING LIGHT → the one bright variant (with a dark horizon floor so
 *     the map stays legible).
 *  4. The void is the inside of Oblivion's dome → deep indigo, never pure black.
 *
 * Gate: dome/moons/planet-eyes/nebula are static (render once, free under the on-demand RenderLoop).
 * drei <Stars>/<Sparkles> drift only while the scene is already painting; they freeze harmlessly on a
 * paused idle frame. Dropped in performance mode.
 */

export type CosmicVariant = 'tamriel' | 'aetherius' | 'deadlands' | 'void-nights';

export interface ArenaEnvironmentShellProps {
  size: number;
  centerX: number;
  centerZ: number;
  performanceMode?: boolean;
  /** Which cosmic backdrop to render. Default 'tamriel'. */
  variant?: CosmicVariant;
}

/**
 * Celestial bodies sit on the LOWER dome, near the horizon band — not overhead. The replay camera
 * looks almost flat across the 100×100 plane (eye height ≈4u, pitch ≈−6°), so anything with a high
 * Y is above the top edge of the frame. Each body is placed by (azimuth, elevation) on a sphere of
 * radius ≈ dome radius: azimuth spreads them around the full circle so SOME are in view whichever way
 * the user orbits; elevation is kept low (0.05–0.35 rad) so they ride just above the horizon where the
 * camera actually looks. Computed in placeOnDome().
 */
interface MoonSpec {
  name: string;
  color: string;
  glow: string;
  r: number; // ×size
  azimuth: number; // radians around the dome (0 = +x)
  elevation: number; // radians above the horizon (small → near horizon)
  litFraction: number; // 0..1 phase (gibbous/crescent)
}

interface PlanetEyeSpec {
  name: string;
  core: string;
  halo: string;
  /** Optional second concentric halo (Arkay's death-violet rim over its life-green halo). */
  rim?: string;
  azimuth: number;
  elevation: number;
}

/** World position on the dome from azimuth/elevation, relative to the arena center. dist = dome radius. */
function placeOnDome(
  azimuth: number,
  elevation: number,
  dist: number,
  center: [number, number, number],
): [number, number, number] {
  const cosE = Math.cos(elevation);
  return [
    center[0] + Math.cos(azimuth) * cosE * dist,
    Math.sin(elevation) * dist,
    center[2] + Math.sin(azimuth) * cosE * dist,
  ];
}

interface VariantSpec {
  sky: [string, string]; // [horizon, crown]
  /** Analytic single-scatter horizon band: a tint concentrated low on the dome. */
  horizonTint: string;
  horizonStrength: number;
  fog: string;
  nebula: string[];
  nebulaOpacity: number;
  starCount: number;
  /** Shared sun direction (Magnus) for coherent moon terminators. */
  sunDirection: [number, number, number];
  moons: MoonSpec[];
  planetEyes: PlanetEyeSpec[];
  /** The Serpent — the wandering 13th, a shallow sickly-green S of dim un-stars. */
  serpent: boolean;
  /** The Tower constellation — the Thief's charge, a bold recognizable sigil. */
  tower: boolean;
  /** Mnemoli, the Blue Star — the one named off-hue Magna-Ge. */
  mnemoli: boolean;
  /** The Magna-Ge cluster — a tight knot of brighter star-holes (the fleeing fleet). */
  magnaGe: boolean;
  /** Deadlands red bleed — a dull oxblood smear low on the far horizon (fight-specific). */
  deadlandsBleed: boolean;
  /** Aetherius warm-gold "milky way" band of leaking light (Magnus's leak). */
  aetheriusBand: boolean;
  /** Magicka-mote shimmer (drei Sparkles), for the radiant light-realm. */
  sparkles: boolean;
}

// Shared sun (Magnus) direction that lights the moons' terminators. Comes from the upper-right so both
// moons read as gibbous/crescent rather than flat-lit, and consistently with each other.
const SUN = [0.72, 0.32, 0.62] as [number, number, number];

// The replay camera rests looking across the map at azimuth ≈ −0.79 rad (−45°). Backdrop features are
// anchored to this so something interesting greets the default view, then spread around the full dome.
const RESTING_LOOK_AZ = -0.79;
const NEBULA_RING_COUNT = 7;
// Where the Sun-hole Magnus leaks its warm-gold light — a clear quadrant away from the moons.
const MAGNUS_LEAK_AZ = 1.57;
// The torn Gate's Deadlands stain — far horizon, true opposite of the resting look (brooding behind you).
const DEADLANDS_BLEED_AZ = 2.35;
// The Magna-Ge fleet — a tight knot of brighter star-holes (deterministic offsets in az/el + brightness).
const MAGNA_GE_POINTS: { daz: number; del: number; b: number }[] = [
  { daz: 0.0, del: 0.0, b: 1 },
  { daz: 0.03, del: 0.015, b: 0.7 },
  { daz: -0.025, del: 0.02, b: 0.5 },
  { daz: 0.045, del: -0.01, b: 0.8 },
  { daz: -0.04, del: -0.015, b: 0.6 },
  { daz: 0.015, del: 0.03, b: 0.4 },
  { daz: -0.01, del: -0.025, b: 0.9 },
  { daz: 0.06, del: 0.02, b: 0.3 },
  { daz: -0.055, del: 0.005, b: 0.5 },
  { daz: 0.025, del: -0.03, b: 0.6 },
  { daz: 0.0, del: 0.04, b: 0.4 },
  { daz: -0.03, del: 0.035, b: 0.5 },
];

// Masser & Secunda — placed on opposite sides of the dome at low elevation so one is almost always in
// the user's view as they orbit. Masser dominant, Secunda the small companion.
// IMPORTANT: with the near-flat replay camera (eye ≈4u, pitch ≈−6°), the on-screen sky band is only
// elevation ≈0.03–0.17 rad on the dome — anything higher is above the top edge. So all bodies stay LOW.
// Azimuths spread around the full circle so different ones swing into view as the user orbits.
const MASSER: MoonSpec = {
  name: 'Masser',
  color: '#d06a50', // warm rust-red (Mars-like), not crimson, not tan
  glow: '#b04a36',
  r: 0.16, // larger, dominant in the sky (Masser is the big moon)
  azimuth: -1.15, // near the default look direction (≈−0.79) so it greets the resting view
  elevation: 0.12,
  litFraction: 0.72, // gibbous
};
const SECUNDA: MoonSpec = {
  name: 'Secunda',
  color: '#d2dce6', // cool pale grey
  glow: '#9fb4c5',
  r: 0.075, // small companion
  azimuth: -0.2, // off to the other side, swings in as you orbit
  elevation: 0.14,
  litFraction: 0.4, // crescent-to-half
};

// The three Aedra planet-eyes (the planets ARE the gods, marking the Guardians' eyes). Each halo is
// coloured to its god's iconography so the bright point reads as THAT deity watching the sky:
//  Akatosh = eye of the Warrior (Dragon of Time, gold); Julianos = the Mage (wisdom, sapphire);
//  Arkay = the Thief (life & death — life-green core halo + a death-violet outer rim).
const AKATOSH: PlanetEyeSpec = { name: 'Akatosh', core: '#ffffff', halo: '#ffcf7a', azimuth: -0.6, elevation: 0.16 };
const JULIANOS: PlanetEyeSpec = { name: 'Julianos', core: '#ffffff', halo: '#acc6ff', azimuth: 2.4, elevation: 0.15 };
const ARKAY: PlanetEyeSpec = {
  name: 'Arkay',
  core: '#ffffff',
  halo: '#bfe6c4', // life-green
  rim: '#c9b6ff', // death-violet outer rim (Arkay = god of life AND death)
  azimuth: 1.3,
  elevation: 0.17,
};

const VARIANTS: Record<CosmicVariant, VariantSpec> = {
  // Nirn night sky under the two moons — the canonical default.
  tamriel: {
    sky: ['#0f1830', '#243465'], // deep night-blue horizon → richer blue crown
    horizonTint: '#3a5a8c', // cool airy blue scatter low on the dome
    horizonStrength: 0.16,
    fog: '#0f1830',
    nebula: ['#4a5fc0', '#6a3fb0', '#2f8ca0'], // blue, violet, teal drifts
    nebulaOpacity: 0.55,
    starCount: 9000, // denser so it reads as a star-filled sky, not a few dots
    sunDirection: SUN,
    moons: [MASSER, SECUNDA],
    planetEyes: [AKATOSH, JULIANOS, ARKAY],
    serpent: true, // the wandering Serpent un-stars slink along the Tamriel horizon
    tower: true, // the Thief's Tower stands beside Arkay's eye
    mnemoli: true, // the lone named Blue Star
    magnaGe: true, // the fleeing fleet of star-holes
    deadlandsBleed: true, // SIGNATURE: the torn Gate to Dagon's Deadlands stains Blackwood's horizon
    aetheriusBand: true,
    sparkles: false,
  },
  // The radiant light-realm — bright crown, dark horizon floor so the map stays legible.
  aetherius: {
    sky: ['#5a5a52', '#f4ecd2'],
    horizonTint: '#e8c98a', // warm gold scatter at the radiant horizon
    horizonStrength: 0.12,
    fog: '#cdbf9a',
    nebula: ['#e8d9a8', '#f5ead0'],
    nebulaOpacity: 0.4,
    starCount: 2500,
    sunDirection: SUN,
    moons: [],
    planetEyes: [ARKAY],
    serpent: false,
    tower: false,
    mnemoli: false,
    magnaGe: false,
    deadlandsBleed: false,
    aetheriusBand: true,
    sparkles: true,
  },
  // Mehrunes Dagon's Deadlands — perpetual burning-red storm void.
  deadlands: {
    sky: ['#1a0604', '#3a0d06'],
    horizonTint: '#8a2410', // burning ember scatter along the Deadlands horizon
    horizonStrength: 0.22,
    fog: '#1a0604',
    nebula: ['#5a1208', '#7a2a10', '#3a0d22'],
    nebulaOpacity: 0.32,
    starCount: 1800,
    sunDirection: SUN,
    // One sullen ember-sun low on the horizon (Dagon's burning astronomy).
    moons: [
      { name: 'Ember Sun', color: '#c23a1e', glow: '#7a2010', r: 0.36, azimuth: Math.PI * 0.5, elevation: 0.12, litFraction: 1 },
    ],
    planetEyes: [ARKAY],
    serpent: true,
    tower: false,
    mnemoli: false,
    magnaGe: false,
    deadlandsBleed: false,
    aetheriusBand: false,
    sparkles: false,
  },
  // The Void Nights — a moonless sky (4E 98–100). Era easter egg, not canon for ESO's 2E 582.
  'void-nights': {
    sky: ['#070a14', '#0e1226'],
    horizonTint: '#1c2c4a', // faint cold scatter — a colder, dimmer night than tamriel
    horizonStrength: 0.1,
    fog: '#070a14',
    nebula: ['#1c2438', '#2a2342'],
    nebulaOpacity: 0.2,
    starCount: 5500,
    sunDirection: SUN,
    moons: [], // the whole point: no moons
    planetEyes: [AKATOSH, JULIANOS],
    serpent: false,
    tower: false,
    mnemoli: true, // even moonless, the Blue Star endures
    magnaGe: true,
    deadlandsBleed: false,
    aetheriusBand: true,
    sparkles: false,
  },
};

/**
 * Vertical-gradient sky dome, BackSide, toneMapped off. The gradient is computed PER-FRAGMENT (not
 * per-vertex) and dithered with a tiny ordered-noise term: a big smooth two-colour gradient quantises
 * to visible bands at 8-bit, so a sub-LSB dither breaks the banding into imperceptible noise. Static —
 * renders once under the on-demand gate.
 */
function useSkyDome(
  radius: number,
  sky: [string, string],
  horizonTint: string,
  horizonStrength: number,
): { geometry: THREE.IcosahedronGeometry; material: THREE.ShaderMaterial } {
  return useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(radius, 4);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(sky[0]) },
        uCrown: { value: new THREE.Color(sky[1]) },
        uRadius: { value: radius },
        uHorizonTint: { value: new THREE.Color(horizonTint) },
        uHorizonStrength: { value: horizonStrength },
      },
      vertexShader: /* glsl */ `
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon;
        uniform vec3 uCrown;
        uniform float uRadius;
        uniform vec3 uHorizonTint;
        uniform float uHorizonStrength;
        varying vec3 vLocal;
        // cheap ordered-ish hash dither in [-0.5,0.5], scaled to ~1 LSB
        float dither(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        }
        void main() {
          float t = clamp((vLocal.y / uRadius) * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uHorizon, uCrown, t * t);
          // Analytic single-scatter horizon band: a warm/cool tint concentrated low on the dome
          // (where the air mass is thickest), falling off cubically toward the crown — the stylized
          // stand-in for atmospheric scattering (no night-sky radiance model exists). Added BEFORE
          // the dither so the dither still kills banding on the combined gradient.
          float h = pow(1.0 - t, 3.0);
          col += uHorizonTint * (h * uHorizonStrength);
          col += dither(gl_FragCoord.xy) * (1.5 / 255.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      toneMapped: false,
      depthWrite: false,
    });
    return { geometry, material };
  }, [radius, sky, horizonTint, horizonStrength]);
}

/** Soft isotropic radial glow texture (nebula clouds / halos). */
function makeRadialTexture(color: string): THREE.CanvasTexture {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
    const col = new THREE.Color(color);
    const [r, gr, b] = [col.r * 255, col.g * 255, col.b * 255].map(Math.round);
    g.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    g.addColorStop(0.5, `rgba(${r},${gr},${b},0.35)`);
    g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, px, px);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * An equirectangular moon SURFACE map (base colour + soft maria patches), for wrapping on a sphere.
 * No baked terminator or limb-darkening — a real lit sphere computes those from the sun direction, so
 * the moon shades correctly from every orbit angle instead of foreshortening like a flat disc.
 */
function makeMoonSurfaceTexture(baseColor: string, glowColor: string): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const base = new THREE.Color(baseColor);
    const dark = new THREE.Color(glowColor).multiplyScalar(0.55);
    const hex = (c: THREE.Color): string =>
      `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    ctx.fillStyle = hex(base);
    ctx.fillRect(0, 0, w, h);
    const seed = (n: number): number => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    // maria: many small, soft, varied dark patches, denser near the equator (deterministic)
    ctx.fillStyle = hex(dark);
    for (let i = 0; i < 70; i++) {
      const bx = seed(i + 1) * w;
      const by = (0.2 + seed(i + 50) * 0.6) * h;
      const br = (0.015 + seed(i + 99) * 0.05) * w;
      ctx.globalAlpha = 0.1 + seed(i + 7) * 0.22;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    // a few brighter highland flecks for surface variation
    const light = new THREE.Color(baseColor).lerp(new THREE.Color('#ffffff'), 0.25);
    ctx.fillStyle = hex(light);
    for (let i = 0; i < 40; i++) {
      const bx = seed(i + 200) * w;
      const by = seed(i + 250) * h;
      const br = (0.008 + seed(i + 299) * 0.02) * w;
      ctx.globalAlpha = 0.08 + seed(i + 27) * 0.12;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Bake a constellation figure — bright star dots plus optional connecting lines — into a transparent
 * square texture, for a billboarded sprite. Coordinates are in [-1.3..1.3] figure space (origin = sprite
 * center); the sprite's world scale maps that span to units. This is what lets a recognizable sigil (the
 * Tower, the Serpent's S) read at backdrop distance, which a bare cluster of points cannot.
 */
function makeConstellationTexture(
  dots: { x: number; y: number; r?: number }[],
  lines: [number, number][],
  dotColor: string,
  lineColor: string,
  lineOpacity: number,
): THREE.CanvasTexture {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  // figure space [-1.3,1.3] → canvas [pad, px-pad], Y up
  const pad = px * 0.12;
  const span = 2.6;
  const toX = (x: number): number => pad + ((x + 1.3) / span) * (px - 2 * pad);
  const toY = (y: number): number => px - (pad + ((y + 1.3) / span) * (px - 2 * pad));
  if (ctx) {
    // connecting lines first (under the dots)
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = lineOpacity;
    ctx.lineWidth = px * 0.012;
    ctx.lineCap = 'round';
    for (const [a, b] of lines) {
      ctx.beginPath();
      ctx.moveTo(toX(dots[a].x), toY(dots[a].y));
      ctx.lineTo(toX(dots[b].x), toY(dots[b].y));
      ctx.stroke();
    }
    // star dots with a soft glow
    ctx.globalAlpha = 1;
    for (const d of dots) {
      const cx = toX(d.x);
      const cy = toY(d.y);
      const rad = (d.r ?? 1) * px * 0.022;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 3);
      const col = new THREE.Color(dotColor);
      const [r, gg, bb] = [col.r * 255, col.g * 255, col.b * 255].map(Math.round);
      g.addColorStop(0, `rgba(${r},${gg},${bb},1)`);
      g.addColorStop(0.35, `rgba(${r},${gg},${bb},0.6)`);
      g.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SceneFog: React.FC<{ color: string; near: number; far: number }> = ({ color, near, far }) => {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.Fog(new THREE.Color(color).getHex(), near, far);
    return () => {
      scene.fog = prev;
    };
  }, [scene, color, near, far]);
  return null;
};

/** Billboarded glow disc (nebula cloud / halo). Additive by default (halos); normal blend reads as a
 * distinct-hue cloud over the dome (nebula), since additive same-hue-on-dome just brightens invisibly. */
const GlowSprite: React.FC<{
  color: string;
  position: [number, number, number];
  scale: number;
  opacity?: number;
  blending?: THREE.Blending;
}> = ({ color, position, scale, opacity = 0.5, blending = THREE.AdditiveBlending }) => {
  const texture = useMemo(() => makeRadialTexture(color), [color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        blending={blending}
        depthWrite={false}
        depthTest={false}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </sprite>
  );
};

/**
 * Self-contained lit-moon shader. Oren-Nayar diffuse (roughness ~0.85) models a rough, dusty rocky body
 * far better than Lambertian — the terminator stays bright further toward the limb the way a real moon
 * does, instead of falling off too fast. A faint earthshine floor keeps the night side from going pure
 * black. The sunlit face is driven to HDR (>1) so the existing thresholded bloom makes the moon glow
 * rather than reading as a flat decal. Self-lit (no scene lights → actor lighting untouched), toneMapped
 * off so the colour reaches bloom pre-tonemap. A real sphere → a correct terminator from every orbit angle.
 */
function makeMoonMaterial(
  surface: THREE.Texture,
  sunDir: THREE.Vector3,
  tint: string,
  hdrGain: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: surface },
      uSun: { value: sunDir.clone().normalize() },
      uTint: { value: new THREE.Color(tint) },
      uHdrGain: { value: hdrGain },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewW = cameraPosition - worldPos.xyz; // cameraPosition is a built-in ShaderMaterial uniform
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSun;
      uniform vec3 uTint;
      uniform float uHdrGain;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewW;
      void main() {
        vec3 albedo = texture2D(uMap, vUv).rgb * uTint;
        vec3 N = normalize(vNormalW);
        vec3 L = normalize(uSun);
        vec3 V = normalize(vViewW);
        float ndl = dot(N, L);
        float ndv = dot(N, V);
        // Oren-Nayar diffuse (rough rocky body). roughness 0.85 → sigma^2 in A/B terms.
        float sigma2 = 0.85 * 0.85;
        float A = 1.0 - 0.5 * sigma2 / (sigma2 + 0.33);
        float B = 0.45 * sigma2 / (sigma2 + 0.09);
        float ti = acos(clamp(ndl, -1.0, 1.0));
        float tr = acos(clamp(ndv, -1.0, 1.0));
        float alpha = max(ti, tr);
        float beta = min(ti, tr);
        // azimuth difference between light and view projected onto the surface
        vec3 Lp = normalize(L - N * ndl);
        vec3 Vp = normalize(V - N * ndv);
        float cosPhi = max(0.0, dot(Lp, Vp));
        float on = max(0.0, ndl) * (A + B * cosPhi * sin(alpha) * tan(beta));
        // soft wrap on the cosine term keeps the terminator a smooth gradient, not a hard line
        float wrap = clamp((ndl + 0.18) / 1.18, 0.0, 1.0);
        float lit = on * smoothstep(0.0, 1.0, wrap);
        // earthshine floor on the night side + HDR-driven sunlit face (>1 feeds bloom)
        float shade = mix(0.06, uHdrGain, clamp(lit, 0.0, 1.0));
        gl_FragColor = vec4(albedo * shade, 1.0);
      }
    `,
    toneMapped: false,
    depthWrite: false,
  });
}

/** A moon as a real lit sphere (maria surface + sun-driven terminator) with a soft glow halo. */
const Moon: React.FC<{
  spec: MoonSpec;
  size: number;
  center: [number, number, number];
  domeDist: number;
  sunDir: [number, number, number];
}> = ({ spec, size, center, domeDist, sunDir }) => {
  const surface = useMemo(() => makeMoonSurfaceTexture(spec.color, spec.glow), [spec.color, spec.glow]);
  const material = useMemo(
    // hdrGain >1 pushes the sunlit face past the bloom threshold so the moon glows (not a flat decal).
    () => makeMoonMaterial(surface, new THREE.Vector3(...sunDir), '#ffffff', 1.9),
    [surface, sunDir],
  );
  useEffect(
    () => () => {
      surface.dispose();
      material.dispose();
    },
    [surface, material],
  );
  const radius = size * spec.r;
  const position = placeOnDome(spec.azimuth, spec.elevation, domeDist, center);
  return (
    <group position={position}>
      <GlowSprite color={spec.glow} position={[0, 0, 0]} scale={radius * 4.5} opacity={0.35} />
      <mesh material={material}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
    </group>
  );
};

/** An Aedra planet-eye: a crisp bright core disc + a colored halo. */
const PlanetEye: React.FC<{
  spec: PlanetEyeSpec;
  size: number;
  center: [number, number, number];
  domeDist: number;
}> = ({ spec, size, center, domeDist }) => {
  const position = placeOnDome(spec.azimuth, spec.elevation, domeDist, center);
  const core = size * 0.022;
  return (
    <group position={position}>
      {spec.rim && (
        <GlowSprite color={spec.rim} position={[0, 0, -0.15]} scale={core * 13} opacity={0.18} />
      )}
      <GlowSprite color={spec.halo} position={[0, 0, -0.1]} scale={core * 8} opacity={0.3} />
      <Billboard>
        <mesh>
          <circleGeometry args={[core, 24]} />
          <meshBasicMaterial color={spec.core} toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
};

interface ConstellationSpec {
  dots: { x: number; y: number; r?: number }[];
  lines: [number, number][];
  dotColor: string;
  lineColor: string;
  lineOpacity: number;
  span: number; // ×size, total figure width/height in world units
  azimuth: number;
  elevation: number;
  blending: THREE.Blending;
  opacity: number;
}

/** A recognizable constellation figure (dots + lines) baked into one billboarded sprite on the dome. */
const Constellation: React.FC<{
  spec: ConstellationSpec;
  size: number;
  center: [number, number, number];
  domeDist: number;
}> = ({ spec, size, center, domeDist }) => {
  const texture = useMemo(
    () => makeConstellationTexture(spec.dots, spec.lines, spec.dotColor, spec.lineColor, spec.lineOpacity),
    [spec.dots, spec.lines, spec.dotColor, spec.lineColor, spec.lineOpacity],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const position = placeOnDome(spec.azimuth, spec.elevation, domeDist, center);
  const s = size * spec.span;
  return (
    <sprite position={position} scale={[s, s, 1]}>
      <spriteMaterial
        map={texture}
        blending={spec.blending}
        depthWrite={false}
        depthTest={false}
        transparent
        opacity={spec.opacity}
        toneMapped={false}
      />
    </sprite>
  );
};

// The Tower — charge of the Thief; the most unmistakable TES sigil (a literal tower). The one bold new
// figure. Figure space [-1.3..1.3]; lines (verticals + crenellated peak) are what make it read.
const TOWER: ConstellationSpec = {
  dots: [
    { x: 0.0, y: 1.25, r: 1.1 }, // 0 peak
    { x: -0.3, y: 1.0 }, // 1 merlon-L
    { x: 0.3, y: 1.0 }, // 2 merlon-R
    { x: -0.3, y: 0.2 }, // 3 wall-L
    { x: 0.3, y: 0.2 }, // 4 wall-R
    { x: -0.3, y: -1.0 }, // 5 base-L
    { x: 0.3, y: -1.0 }, // 6 base-R
  ],
  lines: [
    [3, 5],
    [4, 6], // walls
    [1, 0],
    [0, 2], // crenellated peak
    [5, 6], // floor
  ],
  dotColor: '#fff4e0',
  lineColor: '#bcccea',
  lineOpacity: 0.42,
  span: 0.16,
  azimuth: 1.3, // beside the Arkay / Thief eye
  elevation: 0.1, // center low so the merlon peak (≈+0.07 rad) stays under the 0.17 band top
  blending: THREE.AdditiveBlending,
  opacity: 1.0,
};

// The Serpent — the wandering 13th, with no Guardian. Four+ sickly-green "un-stars" that emit dim,
// wrong-hued light (not dark voids), rendered as a shallow slithering S in normal blend.
const SERPENT: ConstellationSpec = {
  dots: [
    { x: -1.0, y: -0.15 },
    { x: -0.5, y: 0.15 },
    { x: 0.0, y: -0.1 },
    { x: 0.5, y: 0.15 },
    { x: 1.0, y: -0.1, r: 1.4 }, // head
    { x: 1.22, y: -0.05, r: 0.6 }, // tongue
  ],
  lines: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ],
  dotColor: '#7ec88a',
  lineColor: '#7ec88a',
  lineOpacity: 0.4,
  span: 0.2,
  azimuth: 0.6,
  elevation: 0.11, // shallow S, low and slithering near the horizon
  blending: THREE.NormalBlending,
  opacity: 0.85,
};

export const ArenaEnvironmentShell: React.FC<ArenaEnvironmentShellProps> = ({
  size,
  centerX,
  centerZ,
  performanceMode = false,
  variant = 'tamriel',
}) => {
  const spec = VARIANTS[variant];
  const radius = size * 2.4;
  const sky = useSkyDome(radius, spec.sky, spec.horizonTint, spec.horizonStrength);

  useEffect(() => {
    const { geometry, material } = sky;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [sky]);

  if (performanceMode) {
    return null;
  }

  const center: [number, number, number] = [centerX, 0, centerZ];
  // Celestials ride the dome at ~0.92× the dome radius so they sit just inside the starfield shell.
  const domeDist = radius * 0.92;

  return (
    <group>
      {/* Gradient sky dome — the inside of Oblivion's shell. */}
      <mesh geometry={sky.geometry} material={sky.material} position={center} renderOrder={-3} />

      {/* Starfield — holes into Aetherius: uniform warm-white pinpricks (saturation 0). Two shells:
          a dense fine field + a sparser field of larger "bright" stars, both tuned bigger than drei's
          default so they actually read at backdrop distance through the thin visible sky band. */}
      <group position={center}>
        <Stars
          radius={radius * 0.8}
          depth={size * 1.2}
          count={performanceMode ? 1500 : spec.starCount}
          factor={size * 0.16}
          saturation={0}
          fade
          speed={0.4}
        />
        <Stars
          radius={radius * 0.78}
          depth={size}
          count={performanceMode ? 200 : Math.round(spec.starCount * 0.08)}
          factor={size * 0.4}
          saturation={0}
          fade
          speed={0.3}
        />
      </group>

      {/* Magnus light-leak — the Sun is the FIRST and LARGEST tear into Aetherius; at night its biggest
          piercing bleeds a warm-gold glow up from ONE horizon spot (a clear quadrant from the moons), the
          flanks falling off in a gaussian so it reads as one source, not a uniform band. */}
      {spec.aetheriusBand &&
        [-3, -2, -1, 0, 1, 2, 3].map((k) => {
          const anchor = MAGNUS_LEAK_AZ;
          const az = anchor + k * 0.26;
          const falloff = Math.exp(-(k * k) / 4); // gaussian about the anchor
          const pos = placeOnDome(az, 0.04 + 0.04 * falloff, domeDist, center);
          return (
            <GlowSprite
              key={`band-${k}`}
              color="#e8c888"
              // Kept low: it's additive and bloom amplifies it, so a higher opacity washes the sky gold.
              position={pos}
              scale={size * (2.0 + 0.7 * falloff)}
              opacity={0.05 + 0.1 * falloff}
            />
          );
        })}

      {/* Nebula / atmosphere clouds — distinct-hue drifts ringed densely around the dome at the upper
          edge of the visible band, so a colored cloud is always in view as the user orbits. Anchored so
          one sits near the resting look direction (≈−0.79 rad). Normal blend so the hue reads against
          the dome rather than just brightening it. */}
      {Array.from({ length: NEBULA_RING_COUNT }).map((_, i) => {
        const color = spec.nebula[i % spec.nebula.length];
        const az = RESTING_LOOK_AZ + (i / NEBULA_RING_COUNT) * Math.PI * 2;
        const pos = placeOnDome(az, 0.1 + (i % 3) * 0.04, domeDist, center);
        return (
          <GlowSprite
            key={`neb-${i}`}
            color={color}
            position={pos}
            scale={size * (2.8 + 0.4 * (i % 3))}
            opacity={spec.nebulaOpacity}
            blending={THREE.NormalBlending}
          />
        );
      })}

      {/* The two moons (or the Deadlands ember-sun) — lit spheres shaded from the shared Magnus sun. */}
      {spec.moons.map((m) => (
        <Moon
          key={m.name}
          spec={m}
          size={size}
          center={center}
          domeDist={domeDist}
          sunDir={spec.sunDirection}
        />
      ))}

      {/* Aedra planet-eyes (the planets are the gods). */}
      {spec.planetEyes.map((p) => (
        <PlanetEye key={p.name} spec={p} size={size} center={center} domeDist={domeDist} />
      ))}

      {/* The Tower — the Thief's charge; the one bold recognizable sigil, beside Arkay's eye. */}
      {spec.tower && <Constellation spec={TOWER} size={size} center={center} domeDist={domeDist} />}

      {/* The Serpent — the wandering 13th, a shallow green S of dim un-stars (light, not void). */}
      {spec.serpent && <Constellation spec={SERPENT} size={size} center={center} domeDist={domeDist} />}

      {/* Mnemoli, the Blue Star — the one named Magna-Ge, a lone off-hue point with a dark gap around it. */}
      {spec.mnemoli && (
        <group position={placeOnDome(0.4, 0.1, domeDist, center)}>
          <GlowSprite color="#6fa8ff" position={[0, 0, -0.1]} scale={size * 0.05} opacity={0.4} />
          <mesh>
            <circleGeometry args={[size * 0.01, 20]} />
            <meshBasicMaterial color="#cfe2ff" toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* The Magna-Ge cluster — a tight knot of brighter star-holes (the fleet that fled Magnus into
          Aetherius) over a faint backing wash so the eye reads "a thing is here", not "denser stars". */}
      {spec.magnaGe && (
        <group>
          <GlowSprite
            color="#e8dcc2"
            position={placeOnDome(-2.0, 0.12, domeDist, center)}
            scale={size * 2.2}
            opacity={0.1}
          />
          {MAGNA_GE_POINTS.map((p, i) => (
            <mesh key={`magnage-${i}`} position={placeOnDome(-2.0 + p.daz, 0.12 + p.del, domeDist, center)}>
              <circleGeometry args={[size * (0.004 + 0.003 * p.b), 12]} />
              <meshBasicMaterial color="#ece6da" toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* SIGNATURE (Xalvakka / Rockgrove): the torn Oblivion Gate to Mehrunes Dagon's perpetually-burning
          Deadlands bleeds a dull oxblood stain low on the FAR horizon (opposite the resting look). */}
      {spec.deadlandsBleed &&
        [-1, 0, 1].map((k) => {
          const az = DEADLANDS_BLEED_AZ + k * 0.32;
          const t = 1 - Math.abs(k) * 0.4;
          return (
            <GlowSprite
              key={`bleed-${k}`}
              color={k === 0 ? '#7a2010' : '#3a0d06'}
              position={placeOnDome(az, 0.05, domeDist, center)}
              scale={size * 3.4}
              opacity={0.14 + 0.12 * t}
              blending={THREE.NormalBlending}
            />
          );
        })}

      {/* Magicka-mote shimmer for the radiant light-realm. drei Sparkles drift only while painting. */}
      {spec.sparkles && (
        <Sparkles
          count={40}
          scale={size * 2}
          position={[centerX, size * 0.6, centerZ]}
          size={size * 0.04}
          speed={0.3}
          color="#f4e6bf"
          opacity={0.6}
        />
      )}

      {/* Atmospheric fog hazing only the FAR void — pushed past the dome so it never washes the
          celestials (which sit at ≈domeDist). near at the dome, far well beyond it. */}
      <SceneFog color={spec.fog} near={radius * 1.3} far={radius * 2.6} />

      {/* Recessed dark disc just under + outside the floor so the map reads as seated in the void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.25, centerZ]} renderOrder={-2}>
        <circleGeometry args={[size * 1.5, 64]} />
        <meshBasicMaterial color={spec.sky[0]} toneMapped={false} />
      </mesh>
    </group>
  );
};
