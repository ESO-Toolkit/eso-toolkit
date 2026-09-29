// The film, as a function of time. Every beat is cued from the narration's word timings, so
// panels move on the words that describe them.
//
// Each frame returns:
//   cards    - screenshots on 3D cards in stage space (see stage.js)
//   morphs   - pixel-particle transitions between cards
//   overlays - Canvas2D draws (captions, labels, callouts) in output pixels
// The world particle field for the open and the end card is driven by particleState/camera.

import TIMELINE from '../timeline.json' with { type: 'json' };
import WORDS from '../assets/narration/words.json' with { type: 'json' };
import { LAYOUT } from './formations.js';
import { catmull, ease, mat4, mix, project, range, smoothstep } from './math.js';
import * as UI from './overlay.js';
import { cardRect } from './stage.js';

export { TIMELINE };

const N = TIMELINE.narration;
const deg = (d) => (d * Math.PI) / 180;
const up = (t, a, d = 0.35) => smoothstep(a, a + d, t);
const down = (t, a, d = 0.35) => 1 - smoothstep(a, a + d, t);

// ------------------------------------------------------------------------------------------
// Narration timing

/** Narration words with absolute start/end times. */
export const LINES = Object.fromEntries(
  Object.entries(WORDS).map(([id, v]) => [
    id,
    v.words.map((w) => ({ ...w, start: w.start + N[id], end: w.end + N[id] })),
  ]),
);

/** Absolute time the nth occurrence of a spoken word starts (matching ignores punctuation). */
export function cue(id, word, nth = 1) {
  let seen = 0;
  for (const w of LINES[id]) {
    if (w.say.toLowerCase().replace(/[^a-z0-9'-]/g, '') === word && ++seen === nth) return w.start;
  }
  throw new Error(`No word "${word}" (#${nth}) in narration line "${id}"`);
}

// Key moments, shared with the soundtrack.
const C = {};
C.formPage = cue('logs', 'e-s-o') + 0.1;
C.hit = cue('logs', 'hit');
C.heal = cue('logs', 'heal');
C.buff = cue('logs', 'buff');
C.reads = cue('toolkit', 'reads') - 0.05;
C.just = cue('toolkit', 'just');
C.paste = cue('toolkit', 'paste');
C.thirteen = cue('gear', 'thirteen');
C.gMove = cue('gear', 'e-s-o', 2);
C.groups = cue('gear', 'groups');
C.lays = cue('gear', 'lays');
C.assemble = C.lays + 11 * 0.05 + 0.85 + 0.1;
C.checks = cue('gear', 'checks');
C.that = cue('scribe', 'that');
C.sTk = cue('scribe', 'e-s-o');
C.focus = cue('scribe', 'focus');
C.signature = cue('scribe', 'signature');
C.affix = cue('scribe', 'affix');
C.tilt = cue('replay', 'e-s-o', 2) - 0.25;
C.rebuild = cue('replay', 'rebuilds') - 0.05;
C.send = cue('tools', 'send');
C.calc = cue('tools', 'calculators');
C.o1 = cue('outro', 'e-s-o', 1);
C.o2 = cue('outro', 'e-s-o', 2);
C.free = cue('outro', 'free');
C.url = cue('outro', 'e-s-o-t-k');
export const CUES = C;

// Morph windows.
const M1 = {
  t0: C.formPage,
  t1: C.formPage + 1.8,
  spread: 0.6,
  sweep: [1, 0, 0],
  swirl: 150,
  color: [0.25, 0.62, 1.0],
};
const M2 = { t0: C.reads, t1: C.reads + 1.9, spread: 0.62, sweep: [1, 0, 0], swirl: 240 };
const M3 = { t0: C.rebuild, t1: C.rebuild + 1.9, spread: 0.6, sweep: [0.15, 0.85, 0], swirl: 260 };
const M4 = {
  t0: C.free - 0.55,
  t1: C.free + 1.05,
  spread: 0.55,
  sweep: [1, 0, 0],
  swirl: 220,
  color: [0.3, 0.75, 1.0],
};
const M5 = {
  t0: C.free - 0.45,
  t1: C.free + 1.15,
  spread: 0.55,
  sweep: [-1, 0, 1],
  swirl: 220,
  color: [0.3, 0.75, 1.0],
};

// Sound design reads these.
C.whooshes = [
  N.logs - 0.1,
  C.reads + 0.4,
  N.gear - 0.3,
  C.groups + 0.3,
  C.lays + 0.3,
  C.sTk + 0.3,
  N.replay - 0.4,
  M3.t0 + 0.5,
  C.send,
  C.calc - 0.3,
  N.outro - 0.3,
  M4.t0 + 0.6,
];
C.hits = [
  { t: M1.t1 - 0.3, size: 0.7 },
  { t: M2.t1 - 0.3, size: 0.8 },
  { t: C.assemble + 0.3, size: 0.9 },
  { t: C.sTk + 1.0, size: 0.7 },
  { t: M3.t1 - 0.2, size: 1.1 },
  { t: C.free + 2.2, size: 1.3 },
];
C.duration = TIMELINE.duration;

// ------------------------------------------------------------------------------------------
// Captions

function chunks(words, max) {
  const out = [];
  let cur = [];
  for (const w of words) {
    if (!w.text) {
      if (cur.length) cur[cur.length - 1] = { ...cur.at(-1), end: w.end };
      continue;
    }
    cur.push(w);
    if (/[.?!]$/.test(w.text) || cur.length >= max) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.map((ws) => ({ words: ws, start: ws[0].start, end: ws.at(-1).end }));
}

const CAPTIONED = ['logs', 'toolkit', 'gear', 'scribe', 'replay', 'tools'];
const CAPTIONS = {
  wide: CAPTIONED.flatMap((id) => chunks(LINES[id], 7)),
  tall: CAPTIONED.flatMap((id) => chunks(LINES[id], 4)),
};

// ------------------------------------------------------------------------------------------
// World particles (open and end card)

export const SEGMENTS = [
  { from: 'seed', to: 'seed', t0: -1, t1: 0 },
  { from: 'seed', to: 'river', t0: 0.4, t1: 2.8, spread: 0.55, swirl: 1.4, warpTo: 1 },
  { from: 'river', to: 'seed', t0: 8, t1: 9, warpFrom: 1 },
  { from: 'seed', to: 'logo', t0: C.free + 0.5, t1: C.free + 2.4, spread: 0.72, swirl: 2.4 },
];

export const PALETTE = {
  seed: ['#c9ecff', '#a78bfa', '#a78bfa'],
  river: ['#63cdfb', '#b197fc', '#b197fc'],
  logo: ['#3ab4ee', '#ffffff', '#ffffff'],
};

const LOOK = {
  seed: { gain: 1.0, size: 0.05 },
  river: { gain: 0.55, size: 0.045 },
  logo: { gain: 0.42, size: 0.03 },
};

const worldAlpha = (t) => down(t, 4.7, 1.4) + up(t, C.free + 0.45, 0.45);

export function particleState(t) {
  let seg = SEGMENTS[0];
  for (const s of SEGMENTS) if (t >= s.t0) seg = s;
  const morph = range(t, seg.t0, seg.t1);
  const k = ease.inOutCubic(morph);
  return {
    seg,
    morph,
    spread: seg.spread ?? 0.5,
    swirl: seg.swirl ?? 0,
    warpFrom: seg.warpFrom ?? 0,
    warpTo: seg.warpTo ?? 0,
    gain: mix(LOOK[seg.from].gain, LOOK[seg.to].gain, k) * worldAlpha(t),
    size: mix(LOOK[seg.from].size, LOOK[seg.to].size, k),
    tilt: 0,
    spin: 0,
    flow: t,
    drift: 0.02,
  };
}

const OPEN_CAM = [
  { t: 0, v: [90, 5.6, 0.0, 0, 0, 0, 0.012] },
  { t: 2.3, v: [76, 11.5, 1.5, 0, 0, 0, 0.008] },
  { t: 4.0, v: [84, 13.5, 0.9, 0, 0.2, 0, 0.004] },
  { t: 6.5, v: [88, 14.5, 0.6, 0, 0.2, 0, 0.003] },
];

export function camera(t, width, height) {
  const portrait = height > width;
  const end = t > 20;
  const [az, r, h, tx, ty, tz, aperture] = end
    ? [88 + 4 * range(t, C.free, TIMELINE.duration), 13.5, 0.2, 0, 0.1, 0, 0.0025]
    : catmull(OPEN_CAM, t);
  const radius = portrait ? r * (end ? 1.35 : 1.9) : r;
  const target = [tx, ty, tz];
  const eye = [
    tx + Math.cos(deg(az)) * radius,
    ty + h * (portrait ? 1.6 : 1),
    tz + Math.sin(deg(az)) * radius,
  ];
  return {
    eye,
    target,
    fov: deg(portrait ? 62 : 40),
    focus: Math.hypot(eye[0] - tx, eye[1] - ty, eye[2] - tz),
    aperture,
    azimuth: deg(az),
  };
}

function worldToScreen(t, W, H, p) {
  const cam = camera(t, W, H);
  const vp = mat4.multiply(
    mat4.perspective(cam.fov, W / H, 0.1, 400),
    mat4.lookAt(cam.eye, cam.target),
  );
  return project(p, vp, W, H);
}

export function look(t) {
  let pulse = 0;
  for (const h of C.hits) if (t >= h.t) pulse += h.size * 0.22 * Math.exp(-(t - h.t) * 4.5);
  return {
    exposure: 1 + pulse,
    fade:
      ease.outCubic(range(t, 0, 0.6)) *
      (1 - ease.inCubic(range(t, TIMELINE.duration - 0.9, TIMELINE.duration))),
    bloom: 0.9 + pulse * 0.6,
    nebula: 0.75,
    aberration: 0.25 + pulse * 0.5,
  };
}

// ------------------------------------------------------------------------------------------
// Screenshots

// Crops in capture pixels (the stills are 2x; replay clips are 1x).
const CROP = {
  elDamage: [424, 288, 2621, 1747],
  // 9:16 keeps the tabs, names and bars and drops the right-hand columns.
  elDamageTall: [424, 540, 1560, 1500],
  elPlayerTall: [420, 150, 1920, 1240],
  tkInsights: [1100, 820, 1640, 1275],
  elPlayer: [420, 150, 2640, 1240],
  tkCard: [1102, 41, 802, 1168],
  tkTip: [1134, 1425, 652, 788],
  elReplayWide: [380, 268, 1525, 735],
  elReplayTall: [860, 268, 760, 735],
  tkReplayWide: [60, 0, 1778, 1000],
  tkReplayTall: [600, 0, 700, 1000],
  tkBuild: [418, 163, 3003, 1872],
  tkCalc: [1075, 269, 1690, 1862],
};

// Scribing tooltip rows (label through value), in tk-scribing pixels.
const TIP_ROWS = {
  focus: [1156, 1791, 608, 98],
  signature: [1156, 1889, 608, 132],
  affix: [1156, 2021, 608, 186],
};

function fit(tex, uv, x, y, maxW, maxH, extra = {}) {
  const s = Math.min(maxW / uv[2], maxH / uv[3]);
  return { tex, uv, x, y, z: 0, w: uv[2] * s, h: uv[3] * s, alpha: 1, ...extra };
}

function between(a, b, k) {
  return {
    ...b,
    x: mix(a.x, b.x, k),
    y: mix(a.y, b.y, k),
    z: mix(a.z ?? 0, b.z ?? 0, k),
    w: mix(a.w, b.w, k),
    h: mix(a.h, b.h, k),
    rotX: mix(a.rotX ?? 0, b.rotX ?? 0, k),
    rotY: mix(a.rotY ?? 0, b.rotY ?? 0, k),
    alpha: mix(a.alpha ?? 1, b.alpha ?? 1, k),
  };
}

/** Enter from depth, hold, leave into depth. */
function lifecycle(c, t, tIn, tOut, { from = {}, to = {}, dIn = 0.8, dOut = 0.7 } = {}) {
  const kIn = ease.outCubic(range(t, tIn, tIn + dIn));
  const kOut = ease.inCubic(range(t, tOut, tOut + dOut));
  const enter = between({ ...c, z: (c.z ?? 0) - 420, alpha: 0, ...from }, c, kIn);
  return between(enter, { ...enter, z: (c.z ?? 0) - 380, alpha: 0, ...to }, kOut);
}

const visible = (c) => c.alpha > 0.002;

const screenBox = (a, b, k) => [
  mix(a[0], b[0], k),
  mix(a[1], b[1], k),
  mix(a[2], b[2], k),
  mix(a[3], b[3], k),
];

function label(out, cam, c, text, product, alpha) {
  if (!visible(c) || alpha <= 0.002) return;
  const r = cardRect(cam, c, [c.uv[0], c.uv[1], 0, 0]);
  out.overlays.push((ctx) =>
    UI.sourceLabel(ctx, { x: r[0], y: r[1] - 14, text, product, alpha: alpha * c.alpha }),
  );
}

// ------------------------------------------------------------------------------------------

export function frame(t, W, H, cam, R) {
  const P = H > W;
  const out = { cards: [], morphs: [], overlays: [] };
  const box = P
    ? { x: W / 2, y: H * 0.42, w: W * 0.92, h: H * 0.6 }
    : { x: W / 2, y: H * 0.46, w: W * 0.84, h: H * 0.78 };
  const add = (c) => {
    if (visible(c)) out.cards.push(c);
    return c;
  };
  const addMorph = (m, from, to) => {
    if (t < m.t0 || t > m.t1 + 0.1) return;
    const spec = { ...m, progress: range(t, m.t0, m.t1), from, to };
    out.morphs.push(spec);
    if (from.card) from.card.dissolve = { morph: spec, role: 'from' };
    if (to.card) to.card.dissolve = { morph: spec, role: 'to' };
  };

  // --- Open --------------------------------------------------------------------------------
  out.overlays.push((ctx) =>
    UI.spokenHeadline(ctx, LINES.open, t, {
      x: W / 2,
      y: P ? H * 0.7 : H * 0.8,
      size: P ? 64 : 62,
      end: N.logs - 0.35,
      maxWidth: P ? W - 140 : 1500,
    }),
  );

  // --- ESO Logs page forms from the stream, then becomes ESO Toolkit's read of it -------------
  {
    const push = 1 + 0.03 * range(t, M1.t1, M2.t0);
    const base = fit(
      'el-damage',
      P ? CROP.elDamageTall : CROP.elDamage,
      box.x,
      box.y,
      box.w,
      box.h,
    );
    const elDmg = { ...base, w: base.w * push, h: base.h * push };
    const tkBase = fit('tk-insights', CROP.tkInsights, box.x, box.y, box.w, box.h);
    const dimK = ease.inOutCubic(range(t, C.just - 0.2, C.just + 0.35));
    const tkIns = lifecycle(
      { ...tkBase, alpha: mix(1, 0.3, dimK), z: mix(0, -160, dimK) },
      t,
      M2.t0 - 1,
      N.gear - 0.9,
      { from: { z: 0, alpha: 1 } },
    );

    const showDmg = t >= M1.t0 && t <= M2.t1;
    const showIns = t >= M2.t0 && t < N.gear;
    if (showDmg) add(elDmg);
    if (showIns) add(tkIns);
    addMorph(M1, { type: 'band' }, { type: 'card', card: elDmg });
    addMorph(M2, { type: 'card', card: elDmg }, { type: 'card', card: tkIns });

    if (showDmg) {
      label(out, cam, elDmg, 'ESO Logs', 'esologs', up(t, M1.t1 - 0.4, 0.4) * down(t, M2.t0, 0.4));
      const tabs = R['el-damage'].tabs;
      const beats = [
        [C.hit, tabs['Damage Done']],
        [C.heal, tabs.Healing],
        [C.buff, tabs.Buffs],
      ];
      beats.forEach(([at, rect], i) => {
        const next = beats[i + 1]?.[0] ?? 1e9;
        const a =
          up(t, at - 0.05, 0.2) * (1 - 0.6 * up(t, next - 0.05, 0.2)) * down(t, M2.t0 - 0.3, 0.4);
        const r = cardRect(cam, elDmg, rect);
        out.overlays.push((ctx) => UI.callout(ctx, r, { alpha: a, pad: 4, radius: 8 }));
      });
    }
    if (showIns)
      label(
        out,
        cam,
        tkIns,
        'ESO Toolkit',
        'esotk',
        up(t, M2.t1 - 0.3, 0.3) * down(t, C.just - 0.2, 0.3),
      );

    const pill = up(t, C.just - 0.15, 0.4) * down(t, N.gear - 0.7, 0.5);
    if (pill > 0) {
      out.overlays.push((ctx) =>
        UI.linkPill(ctx, {
          x: W / 2,
          y: box.y,
          alpha: pill,
          morph: range(t, C.paste + 0.1, C.paste + 0.9),
          from: 'esologs.com/reports/',
          to: 'esotk.com/report/',
          code: 'F4f2bMwWtgVKxjB9',
          size: P ? 30 : 38,
        }),
      );
    }
  }

  // --- One tank's gear: rows become set chips, bar entries become icons ----------------------
  const tkCardSide = P
    ? fit('tk-players', CROP.tkCard, W / 2, H * 0.6, W * 0.9, H * 0.4)
    : fit('tk-players', CROP.tkCard, W * 0.72, H * 0.46, W * 0.4, H * 0.8);
  const tkCardScribe = P
    ? fit('tk-players', CROP.tkCard, W / 2, H * 0.22, W * 0.9, H * 0.33)
    : fit('tk-players', CROP.tkCard, W * 0.3, H * 0.46, W * 0.4, H * 0.8);
  {
    const L = R['el-player'];
    const T = R['tk-players'];
    const crop = P ? CROP.elPlayerTall : CROP.elPlayer;
    const solo = fit('el-player', crop, box.x, box.y, box.w, box.h);
    const side = P
      ? fit('el-player', crop, W / 2, H * 0.21, W * 0.94, H * 0.3)
      : fit('el-player', crop, W * 0.27, H * 0.46, W * 0.46, H * 0.5);
    // Rows and bar entries lift out only as far as the visible crop.
    const clip = (r) => [r[0], r[1], Math.min(r[0] + r[2], crop[0] + crop[2]) - r[0], r[3]];
    const moved = between(solo, side, ease.inOutCubic(range(t, C.gMove, C.gMove + 0.7)));
    const leaving = ease.inCubic(range(t, C.sTk, C.sTk + 0.5));
    const elPlayer = lifecycle(
      { ...moved, x: moved.x - leaving * 160, alpha: 1 - leaving },
      t,
      N.gear - 0.5,
      1e9,
    );
    if (t > N.gear - 0.6 && t < C.sTk + 0.6) add(elPlayer);
    label(out, cam, elPlayer, 'ESO Logs', 'esologs', up(t, N.gear, 0.4));

    const toScribe = ease.inOutCubic(range(t, C.sTk, C.sTk + 0.7));
    const tkCard = lifecycle(
      {
        ...between(tkCardSide, tkCardScribe, toScribe),
        alpha: smoothstep(C.assemble, C.assemble + 0.6, t),
      },
      t,
      -1,
      N.replay - 0.8,
    );
    if (t > C.assemble - 0.1 && t < N.replay) add(tkCard);
    label(out, cam, tkCard, 'ESO Toolkit', 'esotk', up(t, C.assemble + 0.3, 0.4));

    // "Thirteen items, one per row."
    if (t > C.thirteen - 0.2 && t < C.gMove + 0.3) {
      const lit = Math.min(13, Math.max(0, Math.floor((t - C.thirteen) / 0.09) + 1));
      L.gear.forEach((row, i) => {
        const at = C.thirteen + i * 0.09;
        const a =
          up(t, at, 0.12) * (1 - 0.65 * up(t, at + 0.25, 0.3)) * down(t, C.gMove - 0.2, 0.4);
        const r = cardRect(cam, elPlayer, clip(row.rect));
        out.overlays.push((ctx) =>
          UI.callout(ctx, r, { alpha: a, pad: 1, radius: 4, width: 1.6, color: '#dfe3ea' }),
        );
      });
      const r = cardRect(cam, elPlayer, [crop[0] + crop[2], crop[1], 0, 0]);
      const a = up(t, C.thirteen, 0.25) * down(t, C.gMove - 0.2, 0.4);
      out.overlays.push((ctx) =>
        counterPill(ctx, r[0], r[1] - 14, `${lit} ${lit === 1 ? 'item' : 'items'}`, a),
      );
    }

    // Flights: a copy of each row lifts out and lands on its set chip; bar entries land on icons.
    const chipFor = (set) => T.chips.find((c) => c.label.endsWith(set));
    const icons = T.icons
      .filter((i) => !i.skill.startsWith('@'))
      .sort(
        (a, b) => Math.round(a.rect[1] / 50) - Math.round(b.rect[1] / 50) || a.rect[0] - b.rect[0],
      );
    const bars = [...L.bars].sort((a, b) => a.bar - b.bar || a.slot - b.slot);
    const flights = [
      ...L.gear.map((row, i) => ({
        src: clip(row.rect),
        dst: chipFor(row.set).rect,
        at: C.groups + i * 0.055,
        dur: 0.95,
        mixFrom: 0.35,
      })),
      ...bars.map((b, i) => ({
        src: clip(b.rect),
        dst: icons[b.bar * 6 + b.slot].rect,
        at: C.lays + i * 0.05,
        dur: 0.85,
        mixFrom: 0.2,
      })),
    ];
    const settle = down(t, C.assemble + 0.45, 0.2);
    for (const f of flights) {
      if (t < f.at || t > C.assemble + 0.7) continue;
      const k = range(t, f.at, f.at + f.dur);
      const e = ease.inOutCubic(k);
      const a = cardRect(cam, side, f.src);
      const b = cardRect(cam, tkCardSide, f.dst);
      const r = screenBox(a, b, e);
      add({
        tex: 'el-player',
        uv: f.src,
        texB: 'tk-players',
        uvB: f.dst,
        mixB: smoothstep(f.mixFrom, 0.85, e),
        x: r[0] + r[2] / 2,
        y: r[1] + r[3] / 2,
        z: Math.sin(Math.PI * e) * 170,
        w: r[2],
        h: r[3],
        rotX: -Math.sin(Math.PI * e) * 0.3,
        radius: mix(2, Math.min(18, b[3] / 2), e),
        alpha: settle,
        shadow: k > 0.02 && k < 0.98,
        bright: 0.95,
      });
      out.overlays.push((ctx) => UI.dim(ctx, a, 0.55 * up(t, f.at, 0.2) * down(t, C.sTk, 0.4)));
      if (k >= 1) {
        const glow = Math.exp(-(t - f.at - f.dur) * 5) * settle;
        out.overlays.push((ctx) =>
          UI.callout(ctx, b, { alpha: glow, pad: 3, radius: 12, width: 2 }),
        );
      }
    }

    // "...and checks the build for common mistakes."
    if (t > C.checks - 0.2 && t < N.scribe + 0.6) {
      const a = up(t, C.checks - 0.1, 0.3) * down(t, N.scribe - 0.1, 0.4);
      const r = cardRect(cam, tkCard, T.check);
      out.overlays.push((ctx) =>
        UI.callout(ctx, r, { alpha: a, color: '#4ade80', pad: 2, radius: 14 }),
      );
      if (!P) {
        const s = cardRect(cam, side, [crop[0], crop[1] + crop[3], 0, 0]);
        out.overlays.push((ctx) => checklist(ctx, s[0], s[1] + 70, t, C.checks + 0.15, a));
      }
    }

    // --- The scribed skill ---------------------------------------------------------------------
    const entry = L.bars.find((b) => b.skill === 'Leashing Soul');
    const icon = T.icons.find((i) => i.skill === 'Leashing Soul');
    if (t > C.that - 0.2 && t < C.sTk + 0.9) {
      const a = up(t, C.that - 0.05, 0.25) * down(t, C.sTk + 0.2, 0.4);
      const er = cardRect(cam, elPlayer, clip(entry.rect));
      const ir = cardRect(cam, tkCard, icon.rect);
      out.overlays.push((ctx) => {
        UI.callout(ctx, er, {
          alpha: a * elPlayer.alpha,
          color: '#dfe3ea',
          pad: 2,
          radius: 6,
          width: 1.8,
        });
        UI.callout(ctx, ir, { alpha: a, pad: 4, radius: 12 });
        if (!P)
          connector(
            ctx,
            [er[0] + er[2], er[1] + er[3] / 2],
            [ir[0], ir[1] + ir[3] / 2],
            a * elPlayer.alpha,
          );
      });
    }
    const tipTarget = P
      ? fit('tk-scribing', CROP.tkTip, W / 2, H * 0.59, W * 0.9, H * 0.38)
      : fit('tk-scribing', CROP.tkTip, W * 0.68, H * 0.46, W * 0.5, H * 0.8);
    if (t > C.sTk + 0.15 && t < N.replay) {
      const k = ease.outCubic(range(t, C.sTk + 0.2, C.sTk + 1.05));
      const ir = cardRect(cam, tkCardScribe, icon.rect);
      const from = {
        ...tipTarget,
        x: ir[0] + ir[2] / 2,
        y: ir[1] + ir[3] / 2,
        w: ir[2],
        h: ir[3],
        alpha: 0,
      };
      const grown = between(from, tipTarget, k);
      const tip = lifecycle(
        { ...grown, alpha: Math.min(1, k * 3), z: Math.sin(Math.PI * k) * 120 },
        t,
        -1,
        N.replay - 0.8,
      );
      add(tip);
      label(out, cam, tip, 'Scribing, decoded', 'esotk', up(t, C.sTk + 0.9, 0.4) * tip.alpha);
      [
        ['focus', C.focus],
        ['signature', C.signature],
        ['affix', C.affix],
      ].forEach(([row, at], i, all) => {
        const next = all[i + 1]?.[1] ?? 1e9;
        const a = up(t, at - 0.05, 0.25) * (1 - 0.55 * up(t, next - 0.05, 0.25)) * tip.alpha;
        const r = cardRect(cam, tip, TIP_ROWS[row]);
        out.overlays.push((ctx) =>
          UI.callout(ctx, r, { alpha: a, color: UI.INK.gold, pad: 2, radius: 8, fill: 0.1 }),
        );
      });
    }
  }

  // --- Replay: from above, then in 3D -------------------------------------------------------------
  {
    const base = P
      ? fit('el-replay', CROP.elReplayTall, W / 2, H * 0.42, W * 0.92, H * 0.6)
      : fit('el-replay', CROP.elReplayWide, W / 2, H * 0.46, W * 0.86, H * 0.8);
    const kt = ease.inOutCubic(range(t, C.tilt, C.tilt + 1.0));
    const tilted = { ...base, rotX: kt * deg(58), y: base.y + kt * H * 0.08, z: -kt * 120 };
    const elReplay = lifecycle(tilted, t, N.replay - 0.7, 1e9);
    elReplay.frame = Math.min(538, Math.max(0, Math.floor((t - (N.replay - 0.7)) * 60)));
    const tkBase = P
      ? fit('tk-replay', CROP.tkReplayTall, W / 2, H * 0.42, W * 0.92, H * 0.62)
      : {
          tex: 'tk-replay',
          uv: CROP.tkReplayWide,
          x: W / 2,
          y: H / 2,
          z: 0,
          w: W,
          h: H,
          alpha: 1,
          radius: 0,
          shadow: false,
        };
    const push = 1 + 0.05 * range(t, M3.t1, N.tools);
    const tkReplay = lifecycle(
      { ...tkBase, w: tkBase.w * push, h: tkBase.h * push },
      t,
      -1,
      N.tools - 0.7,
      { to: { z: -300 } },
    );
    tkReplay.frame = Math.min(598, Math.max(0, Math.floor((t - M3.t0) * 60)));
    if (t > N.replay - 0.8 && t <= M3.t1) add(elReplay);
    if (t >= M3.t0 && t < N.tools + 0.2) add(tkReplay);
    addMorph(M3, { type: 'card', card: elReplay }, { type: 'card', card: tkReplay });
    label(
      out,
      cam,
      elReplay,
      'ESO Logs replay',
      'esologs',
      up(t, N.replay - 0.2, 0.4) * down(t, C.tilt, 0.3),
    );
    const tkLabel = up(t, M3.t1 - 0.2, 0.4) * down(t, N.tools - 0.8, 0.3);
    if (tkLabel > 0) {
      if (P) label(out, cam, tkReplay, 'ESO Toolkit 3D replay', 'esotk', tkLabel);
      else
        out.overlays.push((ctx) =>
          UI.sourceLabel(ctx, {
            x: 64,
            y: 96,
            text: 'ESO Toolkit 3D replay',
            product: 'esotk',
            alpha: tkLabel,
          }),
        );
    }
  }

  // --- Tools --------------------------------------------------------------------------------
  {
    const buildTarget = P
      ? fit('tk-build', CROP.tkBuild, W / 2, H * 0.27, W * 0.94, H * 0.3)
      : fit('tk-build', CROP.tkBuild, W * 0.4, H * 0.46, W * 0.66, H * 0.74, { rotY: -0.12 });
    const calcTarget = P
      ? fit('tk-calculator', CROP.tkCalc, W / 2, H * 0.61, W * 0.9, H * 0.34)
      : fit('tk-calculator', CROP.tkCalc, W * 0.75, H * 0.49, W * 0.4, H * 0.74, {
          rotY: -0.16,
          z: 80,
        });
    const kCalc = ease.inOutCubic(range(t, C.calc - 0.45, C.calc + 0.4));
    const buildNow = P
      ? buildTarget
      : {
          ...buildTarget,
          x: buildTarget.x - kCalc * W * 0.06,
          tint: [0.7, 0.72, 0.8],
          tintAmt: kCalc,
        };
    const tkBuild = lifecycle(buildNow, t, C.send - 0.3, N.outro - 0.7, {
      from: P ? { y: H * 1.2, z: 0 } : { x: W * 1.3, rotY: -0.6, z: 0 },
    });
    const tkCalc = lifecycle(calcTarget, t, C.calc - 0.5, N.outro - 0.6, {
      from: P ? { y: H * 1.3, z: 0 } : { x: W * 1.35, rotY: -0.7, z: 80 },
    });
    if (t > C.send - 0.4 && t < N.outro + 0.2) add(tkBuild);
    if (t > C.calc - 0.6 && t < N.outro + 0.2) add(tkCalc);
    label(
      out,
      cam,
      tkBuild,
      'Build Editor',
      'esotk',
      up(t, C.send + 0.3, 0.4) * down(t, N.outro - 0.8, 0.3),
    );
    label(
      out,
      cam,
      tkCalc,
      'Calculators',
      'esotk',
      up(t, C.calc + 0.2, 0.4) * down(t, N.outro - 0.8, 0.3),
    );
  }

  // --- Outro: the thesis, then everything collapses into the mark -------------------------------
  {
    const elDmg = lifecycle(
      P
        ? fit('el-damage', CROP.elDamageTall, W / 2, H * 0.2, W * 0.8, H * 0.28)
        : fit('el-damage', CROP.elDamage, W * 0.29, H * 0.44, W * 0.42, H * 0.52),
      t,
      C.o1 - 0.35,
      1e9,
    );
    const tkIns = lifecycle(
      P
        ? fit('tk-insights', CROP.tkInsights, W / 2, H * 0.6, W * 0.84, H * 0.28)
        : fit('tk-insights', CROP.tkInsights, W * 0.71, H * 0.44, W * 0.42, H * 0.52),
      t,
      C.o2 - 0.35,
      1e9,
    );
    if (t > C.o1 - 0.4 && t <= M4.t1) add(elDmg);
    if (t > C.o2 - 0.4 && t <= M5.t1) add(tkIns);
    const point = worldToScreen(C.free + 1, W, H, [0, 0, 0]) ?? [W / 2, H / 2];
    addMorph(M4, { type: 'card', card: elDmg }, { type: 'point', at: [point[0], point[1], 0] });
    addMorph(M5, { type: 'card', card: tkIns }, { type: 'point', at: [point[0], point[1], 0] });
    const tagOut = down(t, M4.t0 - 0.1, 0.35);
    label(out, cam, elDmg, 'ESO Logs', 'esologs', up(t, C.o1, 0.4) * tagOut);
    label(out, cam, tkIns, 'ESO Toolkit', 'esotk', up(t, C.o2, 0.4) * tagOut);
    const tag = (c, text, at) => {
      if (!visible(c)) return;
      const r = cardRect(cam, c, [c.uv[0], c.uv[1] + c.uv[3], c.uv[2], 0]);
      out.overlays.push((ctx) =>
        tagline(ctx, text, r[0] + r[2] / 2, r[1] + (P ? 64 : 70), t, at, tagOut, P ? 40 : 44),
      );
    };
    tag(elDmg, 'Records the fight.', C.o1 + 0.3);
    tag(tkIns, 'Helps you understand it.', C.o2 + 0.3);

    const L = LAYOUT.logo;
    const c = worldToScreen(t, W, H, L.center);
    const e = worldToScreen(t, W, H, [L.center[0] + L.size / 2, L.center[1], L.center[2]]);
    if (c && e && t > C.free + 1.8) {
      out.overlays.push((ctx) => endCard(ctx, t, W, H, P, c, Math.abs(e[0] - c[0]) * 2));
    }
  }

  // --- Captions -----------------------------------------------------------------------------------
  const scrim = P ? 0 : up(t, M3.t1 - 0.4, 0.4) * down(t, N.tools - 0.7, 0.5);
  if (scrim > 0) out.overlays.push((ctx) => bottomScrim(ctx, W, H, scrim));
  out.overlays.push((ctx) =>
    UI.captions(ctx, P ? CAPTIONS.tall : CAPTIONS.wide, t, {
      x: W / 2,
      y: P ? H * 0.84 : H - 44,
      size: P ? 44 : 34,
      maxWidth: W - 120,
    }),
  );

  out.cards.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  return out;
}

// ------------------------------------------------------------------------------------------
// Small overlay pieces

function bottomScrim(ctx, W, H, alpha) {
  const g = ctx.createLinearGradient(0, H - 240, 0, H);
  g.addColorStop(0, 'rgba(3, 5, 12, 0)');
  g.addColorStop(1, `rgba(3, 5, 12, ${0.72 * alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 240, W, 240);
}

function counterPill(ctx, right, y, text, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 22px ${UI.FONT.body}`;
  const w = ctx.measureText(text).width + 36;
  UI.roundRect(ctx, right - w, y - 40, w, 40, 20);
  ctx.fillStyle = 'rgba(22, 24, 30, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(223, 227, 234, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#eef2f8';
  ctx.fillText(text, right - w + 18, y - 12);
  ctx.restore();
}

function checklist(ctx, x, y, t, at, alpha) {
  if (alpha <= 0.002) return;
  const items = ['Enchant quality', 'Gear quality', 'CP 160 gear', 'Key buffs'];
  ctx.save();
  ctx.font = `600 18px ${UI.FONT.body}`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = UI.INK.faint;
  ctx.fillText('Build check', x, y);
  items.forEach((item, i) => {
    const a = up(t, at + i * 0.18, 0.25) * alpha;
    if (a <= 0) return;
    const ix = x + (i % 2) * 230;
    const iy = y + 44 + Math.floor(i / 2) * 44;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(ix + 11, iy - 7, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ix + 6, iy - 7);
    ctx.lineTo(ix + 10, iy - 3);
    ctx.lineTo(ix + 17, iy - 12);
    ctx.stroke();
    ctx.font = `500 20px ${UI.FONT.body}`;
    ctx.fillStyle = UI.INK.text;
    ctx.fillText(item, ix + 32, iy);
  });
  ctx.restore();
}

function connector(ctx, a, b, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, 'rgba(223, 227, 234, 0.8)');
  g.addColorStop(1, UI.INK.sky);
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(a[0] + 8, a[1]);
  const mx = (a[0] + b[0]) / 2;
  ctx.bezierCurveTo(mx, a[1], mx, b[1], b[0] - 10, b[1]);
  ctx.stroke();
  ctx.restore();
}

function tagline(ctx, text, x, y, t, at, fade, size) {
  const p = UI.presence(t, at, undefined, 0.8);
  const a = p.v * fade;
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `600 ${size}px ${UI.FONT.display}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = UI.INK.text;
  const blur = (1 - p.i) * 8;
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.fillText(text, x, y + (1 - p.i) * 16);
  ctx.restore();
}

function endCard(ctx, t, W, H, P, c, size) {
  const a = ease.outCubic(range(t, C.free + 2.0, C.free + 2.8));
  const glow = Math.exp(-Math.max(0, t - (C.free + 2.2)) * 2.2);
  UI.logo(ctx, c[0], c[1], size, a * 0.96, glow);
  const ty = c[1] + size * 0.5 + (P ? 150 : 96);
  const p = UI.presence(t, C.url - 0.1, undefined, 0.8);
  if (p.v > 0) {
    ctx.save();
    ctx.globalAlpha = p.v;
    ctx.textAlign = 'center';
    ctx.font = `700 ${P ? 92 : 84}px ${UI.FONT.display}`;
    const g = ctx.createLinearGradient(c[0] - 200, 0, c[0] + 200, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, UI.INK.sky);
    g.addColorStop(1, UI.INK.aqua);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
    ctx.shadowBlur = 30;
    ctx.fillText('esotk.com', c[0], ty + (1 - p.i) * 20);
    ctx.restore();
  }
  UI.line(ctx, 'Paste any ESO Logs report. Free, with no ads.', {
    t,
    a: C.url + 1.1,
    x: c[0],
    y: ty + (P ? 84 : 62),
    size: P ? 34 : 28,
    align: 'center',
    color: UI.INK.text,
    weight: 500,
  });
  const legal = P
    ? [
        'ESO Toolkit is an independent fan project, not affiliated with',
        'or endorsed by ESO Logs, Archon, ZeniMax Online Studios or Bethesda.',
      ]
    : [
        'ESO Toolkit is an independent fan project, not affiliated with or endorsed by ESO Logs, Archon, ZeniMax Online Studios or Bethesda.',
      ];
  legal.forEach((text, i) =>
    UI.line(ctx, text, {
      t,
      a: C.url + 1.7,
      x: W / 2,
      y: (P ? H * 0.8 : H - 40) + i * 26,
      size: P ? 18 : 15,
      align: 'center',
      color: UI.INK.faint,
    }),
  );
}
