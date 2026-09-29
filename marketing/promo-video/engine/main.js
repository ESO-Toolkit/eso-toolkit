// Frame renderer. Everything is drawn from code: particles on the GPU, typography in Canvas2D,
// then bloom, tone mapping and grain. `renderFrame(i)` is deterministic for a given index.

import {
  POINT_COUNT,
  PALETTE,
  TIMELINE,
  camera,
  look,
  overlay,
  particleState,
  points,
} from './director.js';
import { COUNT, buildFormations } from './formations.js';
import { FULLSCREEN_VS, bindTarget, createContext, fullscreen, program, target } from './gl.js';
import { mat4, rng } from './math.js';
import { loadLogo } from './overlay.js';
import * as SH from './shaders.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') ?? 1920);
const H = Number(params.get('h') ?? 1080);
const SS = 2; // supersampling for the particle pass
const SUBFRAMES = Number(params.get('subframes') ?? 4); // motion blur samples per frame
const SHUTTER = 0.5; // fraction of a frame the shutter stays open
const FPS = TIMELINE.fps;

const status = (msg) => {
  document.title = msg;
};

async function init() {
  await Promise.all(
    ['500', '600', '700']
      .map((w) => document.fonts.load(`${w} 64px "Space Grotesk"`))
      .concat(['400', '500', '600'].map((w) => document.fonts.load(`${w} 24px "Inter"`))),
  );
  await loadLogo();

  const canvas = document.getElementById('gl');
  const gl = createContext(canvas, W, H);
  const draw = fullscreen(gl);

  const progs = {
    particles: program(gl, SH.PARTICLE_VS, SH.SPRITE_FS),
    points: program(gl, SH.POINTS_VS, SH.SPRITE_FS),
    nebula: program(gl, FULLSCREEN_VS, SH.NEBULA_FS),
    composite: program(gl, FULLSCREEN_VS, SH.COMPOSITE_FS),
    prefilter: program(gl, FULLSCREEN_VS, SH.PREFILTER_FS),
    down: program(gl, FULLSCREEN_VS, SH.DOWN_FS),
    up: program(gl, FULLSCREEN_VS, SH.UP_FS),
    final: program(gl, FULLSCREEN_VS, SH.FINAL_FS),
  };

  // Formations -> GPU buffers.
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

  // Dynamic sprites: players and the boss.
  const pointData = new Float32Array(POINT_COUNT * 8);
  const pointVao = gl.createVertexArray();
  const pointBuf = gl.createBuffer();
  gl.bindVertexArray(pointVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
  gl.bufferData(gl.ARRAY_BUFFER, pointData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
  gl.bindVertexArray(null);

  // Render targets.
  const scene = target(gl, W * SS, H * SS);
  const hdr = target(gl, W, H);
  const mips = [];
  for (let k = 1, w = W / 2, h = H / 2; k <= 6; k++, w /= 2, h /= 2)
    mips.push(target(gl, Math.max(2, Math.round(w)), Math.max(2, Math.round(h))));

  // Overlay canvas.
  const ui = document.createElement('canvas');
  ui.width = W;
  ui.height = H;
  const ctx = ui.getContext('2d');
  const uiTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, uiTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const srgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2);

  function viewProjAt(t) {
    const cam = camera(t, W, H);
    const view = mat4.lookAt(cam.eye, cam.target);
    const proj = mat4.perspective(cam.fov, W / H, 0.1, 400);
    return { cam, view, viewProj: mat4.multiply(proj, view) };
  }

  function drawScene(t, weight) {
    const { cam, view, viewProj } = viewProjAt(t);
    const s = particleState(t);
    const [colF, accF, acc2F] = PALETTE[s.seg.from].map(srgb);
    const [colT, accT, acc2T] = PALETTE[s.seg.to].map(srgb);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

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

    const n = points(t, pointData);
    gl.bindVertexArray(pointVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointData, 0, n * 8);
    progs.points
      .use()
      .m4('uViewProj', viewProj)
      .m4('uView', view)
      .f('uViewH', H * SS)
      .f('uFocus', cam.focus)
      .f('uAperture', cam.aperture)
      .f('uGain', weight);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  function renderFrame(frame) {
    const t = frame / FPS;
    const L = look(t);
    const { cam } = viewProjAt(t);

    // Backdrop, then motion-blurred particles accumulated over the shutter interval.
    bindTarget(gl, scene);
    progs.nebula
      .use()
      .f('uAspect', W / H, 1)
      .f('uPan', cam.azimuth * 0.12, cam.eye[1] * 0.012)
      .f('uTime', t)
      .f('uIntensity', L.nebula);
    draw();
    for (let k = 0; k < SUBFRAMES; k++) {
      const dt = ((k + 0.5) / SUBFRAMES - 0.5) * (SHUTTER / FPS);
      drawScene(t + dt, 1 / SUBFRAMES);
    }

    // Typography layer.
    ctx.clearRect(0, 0, W, H);
    overlay(ctx, t, W, H, viewProjAt(t).viewProj, particleState(t).spin);
    gl.bindTexture(gl.TEXTURE_2D, uiTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ui);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    // Resolve the supersampled scene and lay the type over it.
    bindTarget(gl, hdr);
    progs.composite
      .use()
      .tex('uScene', 0, scene.tex)
      .tex('uUi', 1, uiTex)
      .f('uExposure', L.exposure);
    draw();

    // Bloom: threshold, downsample chain, additive upsample.
    bindTarget(gl, mips[0]);
    progs.prefilter.use().tex('uSrc', 0, hdr.tex).f('uThreshold', 0.9);
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
      .f('uBloomAmt', 0.55 * L.bloom)
      .f('uFrame', frame % 97)
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
status('ready');

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
    engine.renderFrame(f);
    const px = engine.readFrame();
    await fetch(`/frame?i=${f}`, { method: 'POST', body: px });
  }
  await fetch('/done', { method: 'POST' });
  status('done');
} else {
  engine.renderFrame(Math.round(Number(params.get('t') ?? 0) * FPS));
}
