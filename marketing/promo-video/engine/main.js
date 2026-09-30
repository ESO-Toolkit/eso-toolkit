// Frame renderer. Two WebGL2 layers: the background (full-frame footage, backdrop, particle
// field) and a sharp foreground (flying elements, pixel morphs). The compositor blurs and dims
// the background for focus pulls, applies camera blur, draws Liquid Glass panels that refract
// it, then lays the Canvas2D type on top; bloom, tone mapping and grain follow.
// `renderFrame(i)` is deterministic for a given index.

import { PALETTE, TIMELINE, camera, frame as direct, look, particleState } from './director.js';
import { COUNT, buildFormations } from './formations.js';
import { FULLSCREEN_VS, bindTarget, createContext, fullscreen, program, target } from './gl.js';
import { mat4, rng } from './math.js';
import { loadLogo } from './overlay.js';
import * as SH from './shaders.js';
import { createStage, stageCamera } from './stage.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') ?? 1920);
const H = Number(params.get('h') ?? 1080);
const SS = 2; // supersampling
const SUBFRAMES = Number(params.get('subframes') ?? 4); // particle motion-blur samples
const SHUTTER = 0.5;
const FPS = TIMELINE.fps;

const CAPTURES = '../out/captures';
const STILLS = [
  'el-damage',
  'el-player',
  'tk-insights',
  'tk-players',
  'tk-scribing',
  'tk-build',
  'tk-calculator',
  'tk-build-leaderboard',
  'tk-scribe-0',
  'tk-scribe-1',
  'tk-scribe-2',
  'tk-scribe-3',
  'tk-roster-builder',
  'tk-roster-perfight',
  'tk-roster-view',
  'tk-roster-hub',
  'tk-discord-bot',
  'tk-kalpa',
  'tk-kalpa-features',
  'tk-pack-hub',
  'tk-deaths',
  'tk-synergies',
];
const CLIPS = {
  'el-replay': [1920, 1080],
  'tk-replay': [1920, 1080],
  'el-replay-tall': [1080, 1920],
  'tk-replay-tall': [1080, 1920],
};
const LAYOUTS = [
  'el-damage',
  'el-player',
  'tk-players',
  'tk-scribing',
  'tk-build',
  'tk-calculator',
  'tk-build-leaderboard',
  'tk-scribe',
  'tk-roster-builder',
  'tk-roster-perfight',
  'tk-roster-view',
  'tk-roster-hub',
  'tk-discord-bot',
  'tk-kalpa',
  'tk-kalpa-features',
  'tk-pack-hub',
];

async function bitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Missing ${url} - run the capture scripts first`);
  return createImageBitmap(await res.blob(), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
}

async function init() {
  await Promise.all([
    ...['500', '600', '700'].map((w) => document.fonts.load(`${w} 64px "Space Grotesk"`)),
    ...['400', '500', '600'].map((w) => document.fonts.load(`${w} 24px "Inter"`)),
  ]);
  await loadLogo();

  const canvas = document.getElementById('gl');
  const gl = createContext(canvas, W, H);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const draw = fullscreen(gl);
  const stage = createStage(gl);
  const stageCam = stageCamera(W, H);

  const progs = {
    particles: program(gl, SH.PARTICLE_VS, SH.SPRITE_FS),
    nebula: program(gl, FULLSCREEN_VS, SH.NEBULA_FS),
    composite: program(gl, FULLSCREEN_VS, SH.COMPOSITE_FS),
    copy: program(gl, FULLSCREEN_VS, SH.COPY_FS),
    prefilter: program(gl, FULLSCREEN_VS, SH.PREFILTER_FS),
    down: program(gl, FULLSCREEN_VS, SH.DOWN_FS),
    up: program(gl, FULLSCREEN_VS, SH.UP_FS),
    final: program(gl, FULLSCREEN_VS, SH.FINAL_FS),
  };

  // --- Textures ------------------------------------------------------------------------------
  const upload = (tex, source) => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  const makeTexture = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return tex;
  };
  const textures = {};
  await Promise.all(
    STILLS.map(async (name) => {
      const img = await bitmap(`${CAPTURES}/${name}.png`);
      const tex = makeTexture();
      upload(tex, img);
      textures[name] = { tex, width: img.width, height: img.height };
      img.close();
    }),
  );
  const white = makeTexture();
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 255]),
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  textures.white = { tex: white, width: 1, height: 1 };
  const clipFrame = {};
  for (const [name, [width, height]] of Object.entries(CLIPS)) {
    textures[name] = { tex: makeTexture(), width, height };
    clipFrame[name] = -1;
  }
  async function useClipFrame(name, index) {
    if (clipFrame[name] === index) return;
    const img = await bitmap(`${CAPTURES}/${name}/f${String(index).padStart(4, '0')}.jpg`);
    upload(textures[name].tex, img);
    textures[name].width = img.width;
    textures[name].height = img.height;
    img.close();
    clipFrame[name] = index;
  }
  const tex = (name) => textures[name];

  // Layout rectangles (CSS pixels) plus each texture's size, so the director can map page
  // coordinates to texture pixels.
  const RECTS = { size: {} };
  await Promise.all(
    LAYOUTS.map(async (name) => {
      RECTS[name] = await (await fetch(`${CAPTURES}/${name}.json`)).json();
    }),
  );
  for (const [name, t] of Object.entries(textures)) RECTS.size[name] = [t.width, t.height];

  // --- World particles ---------------------------------------------------------------------------
  const F = await buildFormations();
  const buffers = {};
  for (const [name, f] of Object.entries(F)) {
    const pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, f.pos, gl.STATIC_DRAW);
    const extra = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, extra);
    gl.bufferData(gl.ARRAY_BUFFER, f.extra, gl.STATIC_DRAW);
    buffers[name] = { pos, extra };
  }
  const seedData = new Float32Array(COUNT * 4);
  const r = rng(3);
  for (let i = 0; i < seedData.length; i++) seedData[i] = r();
  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seedData, gl.STATIC_DRAW);
  const particleVao = gl.createVertexArray();
  const bindFormations = (from, to) => {
    gl.bindVertexArray(particleVao);
    const attach = (loc, buf, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attach(0, buffers[from].pos, 4);
    attach(1, buffers[from].extra, 3);
    attach(2, buffers[to].pos, 4);
    attach(3, buffers[to].extra, 3);
    attach(4, seedBuf, 4);
  };
  const srgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2);

  function drawWorld(t, weight) {
    const s = particleState(t);
    if (s.gain <= 0.001) return;
    const cam = camera(t, W, H);
    const view = mat4.lookAt(cam.eye, cam.target);
    const viewProj = mat4.multiply(mat4.perspective(cam.fov, W / H, 0.1, 400), view);
    const [colF, accF, acc2F] = PALETTE[s.seg.from].map(srgb);
    const [colT, accT, acc2T] = PALETTE[s.seg.to].map(srgb);
    progs.particles
      .use()
      .m4('uViewProj', viewProj)
      .m4('uView', view)
      .f('uViewH', H * SS)
      .f('uFocus', cam.focus)
      .f('uAperture', cam.aperture)
      .f('uMorph', s.morph)
      .f('uSpread', s.spread)
      .f('uSwirl', s.swirl)
      .f('uTime', t)
      .f('uFlow', s.flow)
      .f('uSpin', s.spin)
      .f('uTilt', s.tilt)
      .i('uWarpFrom', s.warpFrom)
      .i('uWarpTo', s.warpTo)
      .f('uColFrom', ...colF)
      .f('uColTo', ...colT)
      .f('uAccFrom', ...accF)
      .f('uAccTo', ...accT)
      .f('uAcc2From', ...acc2F)
      .f('uAcc2To', ...acc2T)
      .f('uDrift', s.drift)
      .f('uSize', s.size)
      .f('uGain', s.gain * weight);
    bindFormations(s.seg.from, s.seg.to);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    gl.bindVertexArray(null);
  }

  // --- Render targets and overlay ------------------------------------------------------------------
  const bg = target(gl, W * SS, H * SS);
  const fg = target(gl, W * SS, H * SS);
  const hdr = target(gl, W, H);
  // Frosted copy of the background for focus pulls and glass: quarter-res, blurred down and up.
  const blurDown = [W, W / 2, W / 4, W / 8].map((w, k) =>
    target(gl, Math.round(w), Math.round(H / 2 ** k)),
  );
  const blurUp = [W / 4, W / 2].map((w) => target(gl, Math.round(w), Math.round((H * w) / W)));
  const mips = [];
  for (let k = 1, w = W / 2, h = H / 2; k <= 6; k++, w /= 2, h /= 2)
    mips.push(target(gl, Math.max(2, Math.round(w)), Math.max(2, Math.round(h))));

  const ui = document.createElement('canvas');
  ui.width = W * SS;
  ui.height = H * SS;
  const ctx = ui.getContext('2d');
  const uiTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, uiTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  async function renderFrame(index) {
    const t = index / FPS;
    const L = look(t);
    const shot = direct(t, W, H, stageCam, RECTS);
    for (const c of shot.cards) if (c.frame !== undefined) await useClipFrame(c.tex, c.frame);

    // Background layer: backdrop, particle field, full-frame footage.
    bindTarget(gl, bg);
    const wc = camera(t, W, H);
    progs.nebula
      .use()
      .f('uAspect', W / H, 1)
      .f('uPan', wc.azimuth * 0.12 + t * 0.004, wc.eye[1] * 0.012)
      .f('uTime', t)
      .f('uIntensity', L.nebula);
    draw();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let k = 0; k < SUBFRAMES; k++)
      drawWorld(t + ((k + 0.5) / SUBFRAMES - 0.5) * (SHUTTER / FPS), 1 / SUBFRAMES);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const c of shot.cards) if (c.layer !== 'fg') stage.drawCard(stageCam, c, tex, SS);

    // Foreground layer: flying elements (premultiplied over) and pixel morphs (additive light).
    bindTarget(gl, fg);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const c of shot.cards) if (c.layer === 'fg') stage.drawCard(stageCam, c, tex, SS);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
    if (shot.morphs.length) {
      for (let k = 0; k < SUBFRAMES; k++) {
        const ts = t + ((k + 0.5) / SUBFRAMES - 0.5) * (SHUTTER / FPS);
        const sub = k === Math.floor(SUBFRAMES / 2) ? shot : direct(ts, W, H, stageCam, RECTS);
        for (const m of sub.morphs) stage.drawMorph(stageCam, m, tex, ts, 1 / SUBFRAMES, SS);
      }
    }
    gl.disable(gl.BLEND);

    // Frosted background.
    let src = bg;
    for (const t2 of blurDown) {
      bindTarget(gl, t2);
      progs.down
        .use()
        .tex('uSrc', 0, src.tex)
        .f('uTexel', 1 / src.width, 1 / src.height);
      draw();
      src = t2;
    }
    for (const t2 of blurUp) {
      bindTarget(gl, t2);
      progs.up
        .use()
        .tex('uSrc', 0, src.tex)
        .f('uTexel', 1 / src.width, 1 / src.height)
        .f('uWeight', 1);
      draw();
      src = t2;
    }

    // Typography; overlays register their glass panels as they draw.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.width, ui.height);
    ctx.setTransform(SS, 0, 0, SS, 0, 0);
    ctx.glass = [];
    for (const o of shot.overlays) o(ctx);
    gl.bindTexture(gl.TEXTURE_2D, uiTex);
    // Upload straight (unpremultiplied) alpha; the composite shader premultiplies in linear light.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ui);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const glass = ctx.glass.slice(0, SH.MAX_GLASS);
    const glassRects = new Float32Array(SH.MAX_GLASS * 4);
    const glassParams = new Float32Array(SH.MAX_GLASS * 4);
    glass.forEach((g, i) => {
      glassRects.set([g.x, g.y, g.w, g.h], i * 4);
      glassParams.set([g.r, g.alpha, 0, 0], i * 4);
    });
    const focus = shot.fx.focus ?? { amount: 0, rects: [] };
    const focusRects = new Float32Array(SH.MAX_FOCUS * 4);
    const focusParams = new Float32Array(SH.MAX_FOCUS * 4);
    focus.rects.slice(0, SH.MAX_FOCUS).forEach((f, i) => {
      focusRects.set(f.rect, i * 4);
      focusParams.set([f.radius ?? 16, f.feather ?? 90, 0, 0], i * 4);
    });

    bindTarget(gl, hdr);
    progs.composite
      .use()
      .tex('uBg', 0, bg.tex)
      .tex('uBlur', 1, src.tex)
      .tex('uFg', 2, fg.tex)
      .tex('uUi', 3, uiTex)
      .f('uRes', W, H)
      .f('uExposure', L.exposure)
      .f('uWhip', ...(shot.fx.whip ?? [0, 0]))
      .f('uZoom', ...(shot.fx.zoom ?? [0.5, 0.5, 0]))
      .f('uFocusAmt', focus.amount)
      .f('uFocusBlur', focus.blur ?? 0.85)
      .f('uFocusDim', focus.dim ?? 0.45)
      .i('uFocusN', Math.min(SH.MAX_FOCUS, focus.rects.length))
      .v4('uFocus', focusRects)
      .v4('uFocusP', focusParams)
      .i('uGlassN', glass.length)
      .v4('uGlass', glassRects)
      .v4('uGlassP', glassParams);
    draw();

    // Bloom.
    bindTarget(gl, mips[0]);
    progs.prefilter.use().tex('uSrc', 0, hdr.tex).f('uThreshold', 1.0);
    draw();
    for (let k = 1; k < mips.length; k++) {
      bindTarget(gl, mips[k]);
      progs.down
        .use()
        .tex('uSrc', 0, mips[k - 1].tex)
        .f('uTexel', 1 / mips[k - 1].width, 1 / mips[k - 1].height);
      draw();
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let k = mips.length - 1; k > 0; k--) {
      bindTarget(gl, mips[k - 1]);
      progs.up
        .use()
        .tex('uSrc', 0, mips[k].tex)
        .f('uTexel', 1 / mips[k].width, 1 / mips[k].height)
        .f('uWeight', 0.9);
      draw();
    }
    gl.disable(gl.BLEND);

    bindTarget(gl, null);
    progs.final
      .use()
      .tex('uHdr', 0, hdr.tex)
      .tex('uBloom', 1, mips[0].tex)
      .f('uBloomAmt', 0.5 * L.bloom)
      .f('uFrame', index % 97)
      .f('uFade', L.fade)
      .f('uAberration', 0.012 * L.aberration)
      .f('uRes', W, H);
    draw();
  }

  const pixels = new Uint8Array(W * H * 4);
  const readFrame = () => {
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  };

  return { renderFrame, readFrame };
}

const engine = await init();
window.engine = engine;
document.title = 'ready';

// Driven by scripts/render.mjs: render a range (video) or a list of frames (stills) and POST
// each frame's raw RGBA to the local render server.
const mode = params.get('mode');
if (mode) {
  const frames =
    mode === 'stills'
      ? params.get('frames').split(',').map(Number)
      : Array.from(
          { length: Number(params.get('end')) - Number(params.get('start')) },
          (_, i) => i + Number(params.get('start')),
        );
  for (const f of frames) {
    await engine.renderFrame(f);
    await fetch(`/frame?i=${f}`, { method: 'POST', body: engine.readFrame() });
  }
  await fetch('/done', { method: 'POST' });
  document.title = 'done';
} else {
  await engine.renderFrame(Math.round(Number(params.get('t') ?? 0) * FPS));
}
