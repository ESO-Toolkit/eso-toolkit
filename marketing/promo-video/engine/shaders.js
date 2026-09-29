// GLSL for the particle field, the nebula backdrop and the post-processing chain.

const DOF = `
uniform mat4 uViewProj;
uniform mat4 uView;
uniform float uViewH;
uniform float uFocus;
uniform float uAperture;

// Thin-lens-ish depth of field for point sprites: out-of-focus points grow and dim so their
// energy is conserved, which reads as bokeh.
float sprite(vec3 p, float worldSize, out float energy) {
  vec4 v = uView * vec4(p, 1.0);
  float depth = max(0.2, -v.z);
  gl_Position = uViewProj * vec4(p, 1.0);
  float px = max(1.6, worldSize * uViewH / depth);
  float coc = abs(depth - uFocus) / depth * uAperture * uViewH;
  float size = min(px + coc, 160.0);
  energy = (px * px) / (size * size);
  return size;
}
`;

export const PARTICLE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aFrom;
layout(location = 1) in vec3 aFromX;
layout(location = 2) in vec4 aTo;
layout(location = 3) in vec3 aToX;
layout(location = 4) in vec4 aSeed;

uniform float uMorph;
uniform float uSpread;
uniform float uSwirl;
uniform float uTime;
uniform float uFlow;
uniform float uSpin;
uniform float uTilt;
uniform int uWarpFrom;
uniform int uWarpTo;
uniform vec3 uColFrom;
uniform vec3 uColTo;
uniform vec3 uAccFrom;
uniform vec3 uAccTo;
uniform vec3 uAcc2From;
uniform vec3 uAcc2To;
uniform float uDrift;
uniform float uSize;
uniform float uGain;
${DOF}
out vec3 vCol;
out float vA;

vec3 rotY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

vec3 rotX(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

// Accent 0..1 blends toward the formation's accent; 2 selects its secondary accent.
vec3 pick(vec3 base, vec3 acc, vec3 acc2, float a) {
  return a > 1.5 ? acc2 : mix(base, acc, a);
}

vec3 warp(vec3 p, int mode, float spinFlag, vec4 s) {
  if (mode == 1) {
    // A flowing stream: particles travel along x and wrap; the path bends through space.
    float x = mod(p.x + 18.0 + uFlow * (1.1 + s.w * 2.2), 36.0) - 18.0;
    float y = p.y + sin(x * 0.26 + 0.8) * 1.1 + sin(x * 0.09 - 1.1) * 0.9;
    float z = p.z + cos(x * 0.17 + 0.4) * 2.0;
    return vec3(x, y, z);
  }
  if (mode == 3) return rotX(p, uTilt);
  return rotY(p, uSpin * spinFlag);
}

void main() {
  float k = clamp((uMorph - aToX.x * uSpread) / max(1e-4, 1.0 - uSpread), 0.0, 1.0);
  k = k < 0.5 ? 4.0 * k * k * k : 1.0 - pow(-2.0 * k + 2.0, 3.0) / 2.0;

  vec3 a = warp(aFrom.xyz, uWarpFrom, aFromX.z, aSeed);
  vec3 b = warp(aTo.xyz, uWarpTo, aToX.z, aSeed);
  vec3 p = mix(a, b, k);

  // Travel on a curved path rather than a straight line.
  vec3 dir = normalize(aSeed.xyz * 2.0 - 1.0 + vec3(1e-3));
  p += dir * sin(3.14159 * k) * uSwirl * (0.35 + aSeed.w);

  // A little life everywhere.
  p += vec3(
    sin(uTime * 0.7 + aSeed.x * 40.0),
    sin(uTime * 0.9 + aSeed.y * 40.0),
    sin(uTime * 0.6 + aSeed.z * 40.0)
  ) * uDrift * (0.3 + aSeed.w);

  float alpha = mix(aFrom.w, aTo.w, k);
  vec3 col = mix(pick(uColFrom, uAccFrom, uAcc2From, aFromX.y), pick(uColTo, uAccTo, uAcc2To, aToX.y), k);

  float energy;
  float size = sprite(p, uSize * (0.55 + 0.9 * aSeed.y), energy);
  gl_PointSize = alpha < 0.002 ? 0.0 : size;
  vCol = col;
  vA = alpha * energy * uGain * (0.6 + 0.4 * aSeed.w);
}`;

export const SPRITE_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vA;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float g = (exp(-r2 * 3.2) - exp(-3.2)) / (1.0 - exp(-3.2));
  o = vec4(vCol * vA * g, 1.0);
}`;

const NOISE = `
// 2D simplex noise (Ian McEwan / Ashima Arts, MIT).
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += a * (snoise(p) * 0.5 + 0.5);
    p = rot * p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
`;

export const NEBULA_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uAspect;
uniform vec2 uPan;
uniform float uTime;
uniform float uIntensity;
${NOISE}
void main() {
  vec2 p = (vUv - 0.5) * uAspect + uPan;
  float n1 = fbm(p * 1.6 + vec2(uTime * 0.01, 0.0));
  float n2 = fbm(p * 2.4 - vec2(0.0, uTime * 0.012) + 7.0);
  float n3 = fbm(p * 0.9 + 3.0);
  vec3 base = mix(vec3(0.004, 0.006, 0.014), vec3(0.008, 0.012, 0.03), vUv.y);
  vec3 violet = vec3(0.07, 0.025, 0.16) * pow(smoothstep(0.5, 0.95, n1), 2.4);
  vec3 cyan = vec3(0.0, 0.05, 0.085) * pow(smoothstep(0.55, 0.95, n2), 2.4);
  vec3 dust = vec3(0.02, 0.016, 0.04) * smoothstep(0.55, 0.9, n3);
  vec3 c = base + (violet + cyan + dust) * uIntensity;
  // Sparse distant stars.
  vec2 g = floor(p * 90.0);
  float s = hash(g);
  float star = step(0.9965, s) * pow(max(0.0, 1.0 - length(fract(p * 90.0) - 0.5) * 3.0), 3.0);
  c += vec3(0.7, 0.8, 1.0) * star * (0.4 + 0.6 * sin(uTime * 2.0 + s * 60.0)) * uIntensity;
  o = vec4(c, 1.0);
}`;

export const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene;
uniform sampler2D uUi;
uniform float uExposure;
void main() {
  vec3 scene = texture(uScene, vUv).rgb * uExposure;
  vec4 ui = texture(uUi, vUv);
  vec3 uiLin = pow(max(ui.rgb, 0.0), vec3(2.2)) * ui.a;
  o = vec4(scene * (1.0 - ui.a) + uiLin, 1.0);
}`;

export const PREFILTER_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform float uThreshold;
void main() {
  vec3 c = texture(uSrc, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  float knee = uThreshold * 0.6;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float w = max(soft, br - uThreshold) / max(br, 1e-4);
  o = vec4(c * w, 1.0);
}`;

export const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec2 t = uTexel;
  vec3 a = texture(uSrc, vUv + t * vec2(-2, 2)).rgb;
  vec3 b = texture(uSrc, vUv + t * vec2(0, 2)).rgb;
  vec3 c = texture(uSrc, vUv + t * vec2(2, 2)).rgb;
  vec3 d = texture(uSrc, vUv + t * vec2(-2, 0)).rgb;
  vec3 e = texture(uSrc, vUv).rgb;
  vec3 f = texture(uSrc, vUv + t * vec2(2, 0)).rgb;
  vec3 g = texture(uSrc, vUv + t * vec2(-2, -2)).rgb;
  vec3 h = texture(uSrc, vUv + t * vec2(0, -2)).rgb;
  vec3 i = texture(uSrc, vUv + t * vec2(2, -2)).rgb;
  vec3 j = texture(uSrc, vUv + t * vec2(-1, 1)).rgb;
  vec3 k = texture(uSrc, vUv + t * vec2(1, 1)).rgb;
  vec3 l = texture(uSrc, vUv + t * vec2(-1, -1)).rgb;
  vec3 m = texture(uSrc, vUv + t * vec2(1, -1)).rgb;
  vec3 s = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  o = vec4(s, 1.0);
}`;

export const UP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uWeight;
void main() {
  vec2 t = uTexel;
  vec3 s = texture(uSrc, vUv).rgb * 4.0;
  s += (texture(uSrc, vUv + t * vec2(-1, 0)).rgb + texture(uSrc, vUv + t * vec2(1, 0)).rgb +
        texture(uSrc, vUv + t * vec2(0, -1)).rgb + texture(uSrc, vUv + t * vec2(0, 1)).rgb) * 2.0;
  s += texture(uSrc, vUv + t * vec2(-1, -1)).rgb + texture(uSrc, vUv + t * vec2(1, -1)).rgb +
       texture(uSrc, vUv + t * vec2(-1, 1)).rgb + texture(uSrc, vUv + t * vec2(1, 1)).rgb;
  o = vec4(s / 16.0 * uWeight, 1.0);
}`;

export const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr;
uniform sampler2D uBloom;
uniform float uBloomAmt;
uniform float uFrame;
uniform float uFade;
uniform float uAberration;
uniform vec2 uRes;

// Khronos PBR Neutral: leaves colours below ~0.8 untouched (so screenshots and type keep their
// real colours) and rolls highlights off smoothly.
vec3 neutral(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, newPeak * vec3(1.0), g);
}
float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
void main() {
  vec2 c = vUv - 0.5;
  vec2 off = c * uAberration * dot(c, c);
  vec3 hdr = vec3(
    texture(uHdr, vUv - off).r,
    texture(uHdr, vUv).g,
    texture(uHdr, vUv + off).b
  );
  vec3 col = hdr + texture(uBloom, vUv).rgb * uBloomAmt;
  col = neutral(col);
  float vig = smoothstep(1.05, 0.25, length(c * vec2(uRes.x / uRes.y, 1.0) * 0.9));
  col *= mix(0.62, 1.0, vig);
  col = pow(col, vec3(1.0 / 2.2));
  float grain = hash(vec3(gl_FragCoord.xy, uFrame)) - 0.5;
  col += grain * 0.016;
  col *= uFade;
  o = vec4(col, 1.0);
}`;
