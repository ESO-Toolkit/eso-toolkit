// "Stage" rendering: screenshots on floating 3D cards, and pixel particles that carry an image's
// colours from one card to another.
//
// Stage space is measured in output pixels: x right, y down, z toward the viewer. The camera
// sits in front of the z = 0 plane at the distance where that plane maps 1:1 to the frame, so a
// card at z = 0 lands exactly on the pixel rectangle it is given.

import { program } from './gl.js';
import { mat4 } from './math.js';

/** Particle grid for morphs; the card dissolve masks use the same cells. */
export const GRID = [320, 180];

export function stageCamera(W, H, fovDeg = 32) {
  const fov = (fovDeg * Math.PI) / 180;
  const D = H / 2 / Math.tan(fov / 2);
  const view = new Float32Array([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, -W / 2, H / 2, -D, 1]);
  const proj = mat4.perspective(fov, W / H, 10, D * 6);
  return { W, H, D, viewProj: mat4.multiply(proj, view) };
}

/** Model matrix taking the unit quad ([-0.5, 0.5]², y down) to a card's place in stage space. */
export function cardModel(c) {
  const { x, y, z = 0, w, h, rotX = 0, rotY = 0, rotZ = 0 } = c;
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const cz = Math.cos(rotZ);
  const sz = Math.sin(rotZ);
  // R = Rz * Ry * Rx, columns scaled by the card size.
  const r00 = cz * cy;
  const r10 = sz * cy;
  const r20 = -sy;
  const r01 = cz * sy * sx - sz * cx;
  const r11 = sz * sy * sx + cz * cx;
  const r21 = cy * sx;
  const r02 = cz * sy * cx + sz * sx;
  const r12 = sz * sy * cx - cz * sx;
  const r22 = cy * cx;
  return new Float32Array([
    r00 * w,
    r10 * w,
    r20 * w,
    0,
    r01 * h,
    r11 * h,
    r21 * h,
    0,
    r02,
    r12,
    r22,
    0,
    x,
    y,
    z,
    1,
  ]);
}

/** Projects a stage point to output pixels. */
export function toScreen(cam, p) {
  const m = cam.viewProj;
  const X = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const Y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const Wc = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [((X / Wc) * 0.5 + 0.5) * cam.W, (1 - ((Y / Wc) * 0.5 + 0.5)) * cam.H];
}

/** Screen position of a point given in card-local coordinates ([-0.5, 0.5]², y down). */
export function cardPoint(cam, c, u, v) {
  const m = cardModel(c);
  return toScreen(cam, [
    m[0] * u + m[4] * v + m[12],
    m[1] * u + m[5] * v + m[13],
    m[2] * u + m[6] * v + m[14],
  ]);
}

/** Screen rectangle of a source-pixel rectangle inside an unrotated card. */
export function cardRect(cam, c, src) {
  const [cx, cy, cw, ch] = c.uv;
  const a = cardPoint(cam, c, (src[0] - cx) / cw - 0.5, (src[1] - cy) / ch - 0.5);
  const b = cardPoint(cam, c, (src[0] + src[2] - cx) / cw - 0.5, (src[1] + src[3] - cy) / ch - 0.5);
  return [a[0], a[1], b[0] - a[0], b[1] - a[1]];
}

// ------------------------------------------------------------------------------------------
// Shaders

const STAGGER = `
float cellHash(vec2 c) {
  vec3 p = fract(vec3(c.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
// When a cell leaves (morph source) or lands (morph target), in [0, 1] of the spread window.
float stagger(vec2 uv, vec2 grid, vec3 sweep) {
  vec2 cell = floor(uv * grid);
  float s = clamp(dot((cell + 0.5) / grid, sweep.xy) + sweep.z, 0.0, 1.0);
  return clamp(s * 0.82 + cellHash(cell) * 0.18, 0.0, 1.0);
}
// Unclamped per-cell flight progress: < 0 not left yet, > 1 landed.
float flight(vec2 uv, vec2 grid, vec3 sweep, float p, float spread) {
  return (p - stagger(uv, grid, sweep) * spread) / max(1e-4, 1.0 - spread);
}
const float HANDOFF = 0.05;
`;

const CARD_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
uniform mat4 uMVP;
uniform vec2 uPad;
out vec2 vLocal;
void main() {
  vec2 p = aPos * (1.0 + uPad);
  vLocal = p;
  gl_Position = uMVP * vec4(p, 0.0, 1.0);
}`;

const CARD_FS = `#version 300 es
precision highp float;
in vec2 vLocal;
out vec4 o;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec4 uUvA;
uniform vec4 uUvB;
uniform float uMixB;
uniform float uAlpha;
uniform vec2 uSize;
uniform float uRadius;
uniform float uBright;
uniform int uMode;        // 0 card, 1 shadow
uniform int uDissolve;    // 0 none, 1 leaving (morph source), 2 arriving (morph target)
uniform float uP;
uniform float uSpread;
uniform vec3 uSweep;
uniform vec2 uGrid;
uniform vec3 uTint;
uniform float uTintAmt;
${STAGGER}
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
void main() {
  vec2 px = vLocal * uSize;
  float d = box(px, uSize * 0.5, uRadius);
  if (uMode == 1) {
    float a = (1.0 - smoothstep(-uRadius, 150.0, d)) * 0.6 * uAlpha;
    o = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  float mask = clamp(0.5 - d, 0.0, 1.0);
  if (mask <= 0.0) discard;
  vec2 uv = vLocal + 0.5;
  if (uDissolve != 0) {
    float k = flight(uv, uGrid, uSweep, uP, uSpread);
    mask *= uDissolve == 1 ? 1.0 - smoothstep(0.0, HANDOFF, k) : smoothstep(1.0, 1.0 + HANDOFF, k);
    if (mask <= 0.0) discard;
  }
  vec3 a = lin(texture(uTexA, uUvA.xy + uv * uUvA.zw).rgb);
  vec3 c = a;
  if (uMixB > 0.0) c = mix(a, lin(texture(uTexB, uUvB.xy + uv * uUvB.zw).rgb), uMixB);
  c = mix(c, c * uTint, uTintAmt);
  // A faint lit rim, like the edge of a glass panel.
  float rim = smoothstep(-2.5, -0.5, d) * (1.0 - smoothstep(-0.5, 0.5, d));
  c += vec3(0.16, 0.22, 0.3) * rim;
  float a2 = mask * uAlpha;
  o = vec4(c * uBright * a2, a2);
}`;

const MORPH_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
layout(location = 1) in vec4 aSeed;
uniform mat4 uVP;
uniform mat4 uFromM;
uniform mat4 uToM;
uniform int uFromMode;   // 0 card, 1 band of events
uniform int uToMode;     // 0 card, 2 point
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec4 uUvA;
uniform vec4 uUvB;
uniform float uP;
uniform float uSpread;
uniform float uSwirl;
uniform float uTime;
uniform vec3 uSweep;
uniform vec2 uGrid;
uniform vec2 uStage;
uniform vec3 uPoint;
uniform vec3 uBandColor;
uniform float uGain;
uniform float uD;
uniform float uCell;
${STAGGER}
out vec3 vCol;
out float vA;
vec3 lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 band(vec2 uv, vec4 s) {
  float x = (fract(uv.x + s.x * 0.03 + uTime * 0.035) * 1.3 - 0.15) * uStage.x;
  float spreadY = (s.y - 0.5) * 2.0;
  float y = uStage.y * 0.5 + sin(x * 0.0032 + uTime * 0.7) * uStage.y * 0.09 + spreadY * abs(spreadY) * uStage.y * 0.07;
  return vec3(x, y, (s.z - 0.5) * 500.0);
}
void main() {
  float k = flight(aUv, uGrid, uSweep, uP, uSpread);
  float e = clamp(k, 0.0, 1.0);
  e = e < 0.5 ? 4.0 * e * e * e : 1.0 - pow(-2.0 * e + 2.0, 3.0) / 2.0;
  vec3 a = uFromMode == 1 ? band(aUv, aSeed) : (uFromM * vec4(aUv - 0.5, 0.0, 1.0)).xyz;
  vec3 b = uToMode == 2 ? uPoint + (aSeed.xyz - 0.5) * vec3(90.0, 90.0, 160.0) : (uToM * vec4(aUv - 0.5, 0.0, 1.0)).xyz;
  vec3 dir = normalize(aSeed.zxy * 2.0 - 1.0 + vec3(1e-3));
  dir.z = abs(dir.z) * 1.6 + 0.3;
  vec3 p = mix(a, b, e) + dir * sin(3.14159 * e) * uSwirl * (0.35 + aSeed.w);

  vec3 ca = uFromMode == 1 ? uBandColor : lin(texture(uTexA, uUvA.xy + aUv * uUvA.zw).rgb);
  vec3 cb = uToMode == 2 ? uBandColor : lin(texture(uTexB, uUvB.xy + aUv * uUvB.zw).rgb);
  vec3 col = mix(ca, cb, smoothstep(0.3, 0.8, e));
  // Flying particles glow, then settle back to the exact image colour.
  col *= 1.0 + 1.4 * sin(3.14159 * e);

  float alpha = uFromMode == 1 ? 1.0 : smoothstep(0.0, HANDOFF, k);
  alpha *= uToMode == 2 ? 1.0 - smoothstep(0.65, 1.0, e) : 1.0 - smoothstep(1.0, 1.0 + HANDOFF, k);
  if (uFromMode == 1) alpha *= 0.55 + 0.45 * aSeed.w;

  gl_Position = uVP * vec4(p, 1.0);
  float depth = max(10.0, uD - p.z);
  gl_PointSize = alpha < 0.002 ? 0.0 : uCell * 1.45 * uD / depth;
  vCol = col;
  vA = alpha * uGain;
}`;

const MORPH_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vA;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float g = exp(-r2 * 2.2);
  o = vec4(vCol * vA * g, 1.0);
}`;

// ------------------------------------------------------------------------------------------

export function createStage(gl) {
  const cardProg = program(gl, CARD_VS, CARD_FS);
  const morphProg = program(gl, MORPH_VS, MORPH_FS);

  const quadVao = gl.createVertexArray();
  gl.bindVertexArray(quadVao);
  const qb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const [gx, gy] = GRID;
  const n = gx * gy;
  const uv = new Float32Array(n * 2);
  const seed = new Float32Array(n * 4);
  let s = 12345;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let j = 0; j < gy; j++) {
    for (let i = 0; i < gx; i++) {
      const k = j * gx + i;
      uv[k * 2] = (i + 0.5) / gx;
      uv[k * 2 + 1] = (j + 0.5) / gy;
    }
  }
  for (let i = 0; i < seed.length; i++) seed[i] = rand();
  const morphVao = gl.createVertexArray();
  gl.bindVertexArray(morphVao);
  for (const [loc, data, size] of [
    [0, uv, 2],
    [1, seed, 4],
  ]) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);

  const uvRect = (tex, r) => [
    r[0] / tex.width,
    r[1] / tex.height,
    r[2] / tex.width,
    r[3] / tex.height,
  ];

  function morphUniforms(p, m) {
    p.f('uP', m.progress)
      .f('uSpread', m.spread ?? 0.6)
      .f('uSweep', ...(m.sweep ?? [1, 0, 0]))
      .f('uGrid', gx, gy);
  }

  /** Draws one card (and its shadow) into the bound target. `tex(name)` resolves textures. */
  function drawCard(cam, c, tex, ss) {
    const A = tex(c.tex);
    const B = c.texB ? tex(c.texB) : A;
    const mvp = mat4.multiply(cam.viewProj, cardModel(c));
    const radius = (c.radius ?? 18) * ss;
    const p = cardProg.use();
    p.m4('uMVP', mvp)
      .f('uSize', c.w * ss, c.h * ss)
      .f('uRadius', radius)
      .f('uAlpha', c.alpha ?? 1)
      .tex('uTexA', 0, A.tex)
      .tex('uTexB', 1, B.tex)
      .f('uUvA', ...uvRect(A, c.uv))
      .f('uUvB', ...uvRect(B, c.uvB ?? c.uv))
      .f('uMixB', c.mixB ?? 0)
      .f('uBright', c.bright ?? 0.93)
      .f('uTint', ...(c.tint ?? [1, 1, 1]))
      .f('uTintAmt', c.tintAmt ?? 0);
    const d = c.dissolve;
    p.i('uDissolve', d ? (d.role === 'from' ? 1 : 2) : 0);
    if (d) morphUniforms(p, d.morph);
    gl.bindVertexArray(quadVao);
    if (c.shadow !== false) {
      const pad = 90 / Math.max(1, Math.min(c.w, c.h));
      p.i('uMode', 1).f(
        'uPad',
        (pad * 2 * Math.min(c.w, c.h)) / c.w,
        (pad * 2 * Math.min(c.w, c.h)) / c.h,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    p.i('uMode', 0).f('uPad', 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /** Draws a morph's particles (additive). */
  function drawMorph(cam, m, tex, time, gain, ss) {
    const from = m.from.card;
    const to = m.to.card;
    const A = from ? tex(from.tex) : tex('white');
    const B = to ? tex(to.tex) : tex('white');
    const cellW = from ? from.w / gx : to ? to.w / gx : cam.W / gx;
    const p = morphProg.use();
    p.m4('uVP', cam.viewProj)
      .m4('uFromM', from ? cardModel(from) : new Float32Array(16))
      .m4('uToM', to ? cardModel(to) : new Float32Array(16))
      .i('uFromMode', m.from.type === 'band' ? 1 : 0)
      .i('uToMode', m.to.type === 'point' ? 2 : 0)
      .tex('uTexA', 0, A.tex)
      .tex('uTexB', 1, B.tex)
      .f('uUvA', ...(from ? uvRect(A, from.uv) : [0, 0, 1, 1]))
      .f('uUvB', ...(to ? uvRect(B, to.uv) : [0, 0, 1, 1]))
      .f('uSwirl', m.swirl ?? 200)
      .f('uTime', time)
      .f('uStage', cam.W, cam.H)
      .f('uPoint', ...(m.to.at ?? [0, 0, 0]))
      .f('uBandColor', ...(m.color ?? [0.35, 0.72, 1.0]))
      .f('uGain', gain * (m.gain ?? 1))
      .f('uD', cam.D)
      .f('uCell', Math.max(1.5, cellW) * ss);
    morphUniforms(p, m);
    gl.bindVertexArray(morphVao);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);
  }

  return { drawCard, drawMorph };
}
