// The film, as a function of time. Every shot is full-bleed: a virtual camera moving over the
// real ESO Logs and ESO Toolkit pages. Every beat is cued from the narration's word timings.
//
// Each frame returns:
//   cards    - full-frame footage (background layer) and flying elements (foreground layer)
//   morphs   - pixel-particle transitions between cards
//   overlays - Canvas2D type; captions, tags and pills register Liquid Glass panels
//   fx       - camera blur (whip, zoom) and focus pulls for the compositor
// The world particle field for the open and the end card is driven by particleState/camera.

import TIMELINE from '../timeline.json' with { type: 'json' };
import WORDS from '../assets/narration/words.json' with { type: 'json' };
import { LAYOUT } from './formations.js';
import { catmull, ease, mat4, mix, project, range, smoothstep } from './math.js';
import * as UI from './overlay.js';

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
C.copying = cue('builds', 'copying');
C.send = cue('builds', 'send');
C.start = cue('builds', 'start');
C.board = cue('builds', 'leaderboard');
C.parses = cue('builds', 'parses');
C.builds = cue('builds', 'builds');
C.behind = cue('builds', 'behind');
C.byClass = cue('builds', 'class');
C.byBoss = cue('builds', 'boss');
C.plan = cue('calc', 'plan');
C.script1 = cue('calc', 'script', 1);
C.by = cue('calc', 'by');
C.script2 = cue('calc', 'script', 2);
C.pen = cue('calc', 'penetration');
C.plans = cue('roster', 'plans');
C.tanks = cue('roster', 'tanks');
C.healers = cue('roster', 'healers');
C.dealers = cue('roster', 'damage');
C.sets = cue('roster', 'sets');
C.ults = cue('roster', 'ultimates');
C.even = cue('roster', 'even');
C.each = cue('roster', 'each');
C.fight = cue('roster', 'fight');
C.share = cue('roster', 'share');
C.link = cue('roster', 'link');
C.publish = cue('roster', 'publish');
C.post = cue('roster', 'post');
C.discord = cue('roster', 'discord');
C.signups = cue('roster', 'sign-ups');
C.kalpa = cue('kalpa', 'kalpa');
C.kfree = cue('kalpa', 'free');
C.installs = cue('kalpa', 'installs');
C.pulls = cue('kalpa', 'pulls');
C.whole = cue('kalpa', 'whole');
C.community = cue('kalpa', 'community');
C.o1 = cue('outro', 'e-s-o', 1);
C.o2 = cue('outro', 'e-s-o', 2);
C.free = cue('outro', 'free');
C.ready = cue('outro', 'ready');
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

const CAPTIONED = [
  'logs',
  'toolkit',
  'gear',
  'scribe',
  'replay',
  'builds',
  'calc',
  'roster',
  'kalpa',
];
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
// Full-bleed shots
//
// Every shot is a virtual camera over a real page: `view` is the visible region in page CSS
// pixels (centre and width); the card fills its screen rectangle with exactly that region.

function pageSize(R, tex) {
  const [tw, th] = R.size[tex];
  const dpr = tw / (tex.includes('tall') ? 1080 : 1920);
  return { dpr, pw: tw / dpr, ph: th / dpr };
}

const clampN = (v, a, b) => (a > b ? (a + b) / 2 : Math.min(b, Math.max(a, v)));

function fitView(R, tex, v, aspect) {
  const { pw, ph } = pageSize(R, tex);
  const vw = Math.min(v.vw, pw, ph * aspect);
  const vh = vw / aspect;
  return { cx: clampN(v.cx, vw / 2, pw - vw / 2), cy: clampN(v.cy, vh / 2, ph - vh / 2), vw, vh };
}

function shotCard(R, tex, v, screen, extra = {}) {
  const [x, y, w, h] = screen;
  const fv = fitView(R, tex, v, w / h);
  const { dpr } = pageSize(R, tex);
  const [dx, dy] = extra.offset ?? [0, 0];
  return {
    tex,
    uv: [(fv.cx - fv.vw / 2) * dpr, (fv.cy - fv.vh / 2) * dpr, fv.vw * dpr, fv.vh * dpr],
    x: x + w / 2 + dx,
    y: y + h / 2 + dy,
    z: 0,
    w,
    h,
    radius: 0,
    shadow: false,
    alpha: 1,
    layer: 'bg',
    view: fv,
    screen: [x + dx, y + dy, w, h],
    ...extra,
  };
}

/** Screen rectangle (output pixels) of a page rectangle (CSS pixels) in an unrotated shot. */
function pageToScreen(card, r) {
  const v = card.view;
  const [sx, sy, sw] = card.screen;
  const k = sw / v.vw;
  return [
    sx + (r[0] - (v.cx - v.vw / 2)) * k,
    sy + (r[1] - (v.cy - v.vh / 2)) * k,
    r[2] * k,
    r[3] * k,
  ];
}

/** Clips a page rectangle to the part of the page a shot shows. */
function visiblePart(card, r) {
  const v = card.view;
  const x0 = Math.max(r[0], v.cx - v.vw / 2);
  const x1 = Math.min(r[0] + r[2], v.cx + v.vw / 2);
  return [x0, r[1], Math.max(1, x1 - x0), r[3]];
}

const lerpView = (a, b, k) => ({
  cx: mix(a.cx, b.cx, k),
  cy: mix(a.cy, b.cy, k),
  vw: Math.exp(mix(Math.log(a.vw), Math.log(b.vw), k)),
});

/** Camera path through view keyframes, eased per segment. */
function path(keys, t) {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const k = (b.ease ?? ease.inOutCubic)(range(t, a.t, b.t));
      const v = lerpView(a.v, b.v, k);
      // centreLag holds the framing on the start point while the zoom begins.
      if (b.centreLag) {
        const kc = ease.inOutCubic(range(k, b.centreLag, 1));
        v.cx = mix(a.v.cx, b.v.cx, kc);
        v.cy = mix(a.v.cy, b.v.cy, kc);
      }
      return v;
    }
  }
  return keys.at(-1).v;
}

const lerpRect = (a, b, k) => a.map((v, i) => mix(v, b[i], k));
const centreOf = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
const around = (r, vw) => ({ cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, vw });
const bell = (t, a, peak, b) => smoothstep(a, peak, t) * (1 - smoothstep(peak, b, t));

// Page rectangles (CSS pixels) that are not in the capture layout files.
const PAGE = {
  buildHeader: [226, 88, 494, 76],
};

// Transition times.
const T = {
  wipe0: C.reads,
  wipe1: C.reads + 1.5,
  zoomCut: N.gear - 0.15,
  dive: C.sTk + 0.45,
  whipReplay: N.replay - 0.5,
  ch2: N.builds - 1.4,
  intoCard: N.builds - 0.15,
  whipBuild: C.send - 0.25,
  whipBoard: C.start - 0.3,
  whipScribe: N.calc - 0.2,
  whipCalc: C.pen - 0.35,
  ch3: N.roster - 1.5,
  intoRoster: N.roster - 0.15,
  cutFight: C.even - 0.1,
  whipView: C.share - 0.25,
  whipDiscord: C.post - 0.25,
  ch4: N.kalpa - 1.5,
  intoKalpa: N.kalpa - 0.15,
  cutFeatures: C.pulls - 0.3,
  whipPacks: C.whole - 0.3,
};

// The four chapters, shown as a rail across the top. Chapters 2-4 open with a title card that
// flies up into its slot on the rail.
const CHAPTERS = [
  { title: 'Read the log', t0: M1.t1 - 0.3 },
  { title: 'Plan your build', t0: T.ch2 },
  { title: 'Run the trial', t0: T.ch3 },
  { title: 'Your addons', t0: T.ch4 },
];
const RAIL_END = C.o1 - 0.3;
const CARD_FLY = [0.95, 1.4];

// Sound design reads these.
C.whooshes = [
  N.logs - 0.1,
  T.wipe0 + 0.5,
  T.zoomCut,
  C.groups + 0.2,
  C.lays + 0.3,
  T.dive,
  T.whipReplay,
  M3.t0 + 0.5,
  T.intoCard,
  T.whipBuild,
  T.whipBoard,
  T.whipScribe,
  T.whipCalc,
  T.intoRoster,
  T.cutFight,
  T.whipView,
  C.publish,
  T.whipDiscord,
  T.intoKalpa,
  T.cutFeatures,
  T.whipPacks,
  C.o1 - 0.1,
  C.o2 - 0.1,
  M4.t0 + 0.6,
];
C.hits = [
  { t: M1.t1 - 0.3, size: 0.7 },
  { t: T.wipe1 - 0.2, size: 0.8 },
  { t: C.assemble + 0.3, size: 0.9 },
  { t: T.dive + 0.6, size: 0.7 },
  { t: M3.t1 - 0.2, size: 1.1 },
  { t: C.free + 2.2, size: 1.3 },
];
// When the full groove comes in (the 3D replay reveal), the chapter title cards, and UI clicks.
C.full = M3.t1 - 0.2;
C.chapters = [T.ch2, T.ch3, T.ch4];
C.clicks = [
  C.copying,
  C.script1,
  C.by,
  C.script2,
  C.tanks,
  C.healers,
  C.dealers,
  C.each,
  C.link,
  C.signups - 0.3,
  C.kfree,
];

function views(P) {
  return P
    ? {
        elDmg: { cx: 520, cy: 560, vw: 600 },
        elTabs: { cx: 470, cy: 470, vw: 470 },
        elTabsEnd: { cx: 470, cy: 480, vw: 450 },
        tkIns: { cx: 752, cy: 650, vw: 600 },
        tkInsEnd: { cx: 752, cy: 640, vw: 560 },
        elPlayer: { cx: 560, cy: 520, vw: 600 },
        elRows: { cx: 600, cy: 515, vw: 560 },
        tkCard: { cx: 751, cy: 330, vw: 440 },
        scribe: { cx: 730, cy: 540, vw: 420 },
        elReplay: { cx: 623, cy: 1056, vw: 886 },
        tkReplay: { cx: 506, cy: 900, vw: 1012 },
        build: { cx: 520, cy: 500, vw: 600 },
        buildEnd: { cx: 470, cy: 360, vw: 520 },
        board: { cx: 560, cy: 540, vw: 600 },
        board2: { cx: 1170, cy: 540, vw: 600 },
        board3: { cx: 980, cy: 540, vw: 600 },
        planner: { cx: 1100, cy: 540, vw: 600 },
        plannerEnd: { cx: 1110, cy: 540, vw: 580 },
        calc: { cx: 880, cy: 700, vw: 600 },
        calcEnd: { cx: 820, cy: 760, vw: 560 },
        rbTop: { cx: 960, cy: 750, vw: 840 },
        rbTank2: { cx: 960, cy: 750, vw: 800 },
        perfight: { cx: 1070, cy: 540, vw: 600 },
        perfight2: { cx: 1070, cy: 560, vw: 580 },
        rview: { cx: 800, cy: 540, vw: 600 },
        hub: { cx: 1100, cy: 540, vw: 600 },
        discord: { cx: 960, cy: 540, vw: 600 },
        kalpa: { cx: 713, cy: 540, vw: 600 },
        kalpaApp: { cx: 1260, cy: 540, vw: 600 },
        features: { cx: 1180, cy: 540, vw: 600 },
        pack: { cx: 690, cy: 540, vw: 600 },
        packEnd: { cx: 680, cy: 560, vw: 580 },
        outroElFull: { cx: 520, cy: 560, vw: 600 },
        outroEl: { cx: 720, cy: 600, vw: 1000 },
        outroDeaths: { cx: 960, cy: 400, vw: 880 },
        outroDeathsEnd: { cx: 960, cy: 470, vw: 860 },
        outroSynergies: { cx: 960, cy: 420, vw: 880 },
        outroSynergiesEnd: { cx: 960, cy: 480, vw: 860 },
      }
    : {
        elDmg: { cx: 905, cy: 630, vw: 1500 },
        elTabs: { cx: 700, cy: 470, vw: 1100 },
        elTabsEnd: { cx: 690, cy: 470, vw: 1040 },
        tkIns: { cx: 960, cy: 725, vw: 1180 },
        tkInsEnd: { cx: 960, cy: 730, vw: 1120 },
        elPlayer: { cx: 867, cy: 440, vw: 1480 },
        elRows: { cx: 867, cy: 515, vw: 1360 },
        tkCard: { cx: 751, cy: 330, vw: 1150 },
        scribe: { cx: 730, cy: 537, vw: 840 },
        elReplay: { cx: 1060, cy: 636, vw: 1300 },
        tkReplay: { cx: 960, cy: 482, vw: 1700 },
        build: { cx: 980, cy: 520, vw: 1560 },
        buildEnd: { cx: 720, cy: 360, vw: 1150 },
        board: { cx: 960, cy: 500, vw: 1500 },
        board2: { cx: 1100, cy: 480, vw: 1150 },
        board3: { cx: 960, cy: 680, vw: 1400 },
        planner: { cx: 1000, cy: 700, vw: 1150 },
        plannerEnd: { cx: 1040, cy: 720, vw: 1000 },
        calc: { cx: 960, cy: 700, vw: 1300 },
        calcEnd: { cx: 960, cy: 771, vw: 1100 },
        rbTop: { cx: 960, cy: 380, vw: 1250 },
        rbTank2: { cx: 960, cy: 930, vw: 1250 },
        perfight: { cx: 1000, cy: 530, vw: 1250 },
        perfight2: { cx: 1070, cy: 560, vw: 1000 },
        rview: { cx: 960, cy: 480, vw: 1300 },
        hub: { cx: 960, cy: 540, vw: 1700 },
        discord: { cx: 960, cy: 470, vw: 1250 },
        kalpa: { cx: 965, cy: 462, vw: 1400 },
        kalpaApp: { cx: 1260, cy: 432, vw: 850 },
        features: { cx: 960, cy: 330, vw: 1100 },
        pack: { cx: 830, cy: 560, vw: 1100 },
        packEnd: { cx: 820, cy: 580, vw: 1000 },
        outroElFull: { cx: 905, cy: 630, vw: 1500 },
        outroEl: { cx: 700, cy: 640, vw: 780 },
        outroDeaths: { cx: 960, cy: 500, vw: 880 },
        outroDeathsEnd: { cx: 960, cy: 600, vw: 860 },
        outroSynergies: { cx: 960, cy: 520, vw: 880 },
        outroSynergiesEnd: { cx: 960, cy: 600, vw: 860 },
      };
}

// ------------------------------------------------------------------------------------------

export function frame(t, W, H, cam, R) {
  const P = H > W;
  const V = views(P);
  const FULL = [0, 0, W, H];
  const replayTex = P
    ? { el: 'el-replay-tall', tk: 'tk-replay-tall' }
    : { el: 'el-replay', tk: 'tk-replay' };
  const out = {
    cards: [],
    morphs: [],
    overlays: [],
    fx: { whip: [0, 0], zoom: [0.5, 0.5, 0], focus: null },
  };
  const shot = (tex, v, extra = {}) => shotCard(R, tex, v, extra.screen ?? FULL, extra);
  const add = (c) => {
    if (c.alpha > 0.002) out.cards.push(c);
    return c;
  };
  const addMorph = (m, from, to) => {
    if (t < m.t0 || t > m.t1 + 0.1) return;
    const spec = { ...m, progress: range(t, m.t0, m.t1), from, to };
    out.morphs.push(spec);
    if (from.card) from.card.dissolve = { morph: spec, role: 'from' };
    if (to.card) to.card.dissolve = { morph: spec, role: 'to' };
  };
  const focus = (amount, rects, opts = {}) => {
    if (amount > 0.001)
      out.fx.focus = { amount, rects, blur: opts.blur ?? 0.85, dim: opts.dim ?? 0.45 };
  };
  const tagAt = P ? [56, 300] : [56, 104];
  const tag = (text, product, alpha) =>
    out.overlays.push((ctx) =>
      UI.sourceLabel(ctx, { x: tagAt[0], y: tagAt[1], text, product, alpha, size: P ? 28 : 22 }),
    );
  const whipOut = (cut, dir = -1) => ({
    offset: [dir * ease.inCubic(range(t, cut - 0.3, cut)) * W * 0.7, 0],
  });
  const whipIn = (cut, dir = -1) => ({
    offset: [-dir * (1 - ease.outCubic(range(t, cut, cut + 0.45))) * W * 0.7, 0],
  });
  const whipBlur = (cut) => bell(t, cut - 0.3, cut, cut + 0.45) * W * 0.28;
  const grow = (r, p) => [r[0] - p, r[1] - p, r[2] + p * 2, r[3] + p * 2];
  /** Focus rectangle stepping through [time, page rect] keys (the first key is the start). */
  const steps = (keys, map, dur = 0.3) => {
    let r = map(keys[0][1]);
    for (const [at, rr] of keys.slice(1)) {
      r = lerpRect(r, map(rr), ease.inOutCubic(range(t, at, at + dur)));
    }
    return r;
  };
  /** Blurs the current shot behind a chapter title card. Call last in the section. */
  const chapterBlur = (at) => {
    if (t >= at) focus(up(t, at, 0.35), [], { blur: 1, dim: 0.62 });
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

  // --- ESO Logs forms from the stream; a divider sweeps it into ESO Toolkit ------------------------
  if (t >= M1.t0 && t < T.zoomCut + 0.05) {
    const el = shot(
      'el-damage',
      path(
        [
          { t: M1.t0, v: V.elDmg },
          { t: C.hit - 0.8, v: V.elDmg },
          { t: C.hit + 0.15, v: V.elTabs },
          { t: T.wipe1, v: V.elTabsEnd },
        ],
        t,
      ),
    );
    const wipe = ease.inOutCubic(range(t, T.wipe0, T.wipe1));
    const divider = 1 - wipe;
    const zoomIn = ease.inCubic(range(t, T.zoomCut - 0.45, T.zoomCut));
    const tkV = path(
      [
        { t: T.wipe0, v: V.tkIns },
        { t: C.just, v: V.tkInsEnd },
      ],
      t,
    );
    const tk = shot(
      'tk-insights',
      { ...tkV, vw: tkV.vw * mix(1, 0.5, zoomIn) },
      { clip: [divider, -1, 2, 2] },
    );
    if (t <= T.wipe1) add(el);
    if (t >= T.wipe0) add(tk);
    addMorph(M1, { type: 'band' }, { type: 'card', card: el });

    // Tabs light up with the narration: "every hit, every heal, every buff".
    const tabs = R['el-damage'].tabs;
    const tabRect = (name) => pageToScreen(el, tabs[name]);
    let r = tabRect('Damage Done');
    r = lerpRect(r, tabRect('Healing'), ease.inOutCubic(range(t, C.heal - 0.08, C.heal + 0.2)));
    r = lerpRect(r, tabRect('Buffs'), ease.inOutCubic(range(t, C.buff - 0.08, C.buff + 0.2)));
    const pad = 8;
    focus(
      up(t, C.hit - 0.1, 0.3) * down(t, T.wipe0 - 0.2, 0.4),
      [{ rect: [r[0] - pad, r[1] - pad, r[2] + pad * 2, r[3] + pad * 2], radius: 12, feather: 70 }],
      { blur: 0.75, dim: 0.5 },
    );

    // The divider.
    if (wipe > 0 && wipe < 1) {
      const x = divider * W;
      const a = Math.sin(Math.PI * wipe);
      out.overlays.push((ctx) => dividerLine(ctx, x, H, a, true));
      out.overlays.push((ctx) => {
        UI.sourceLabel(ctx, {
          x: x - 250,
          y: H / 2 + 22,
          text: 'ESO Logs',
          product: 'esologs',
          alpha: a,
        });
        UI.sourceLabel(ctx, {
          x: x + 24,
          y: H / 2 + 22,
          text: 'ESO Toolkit',
          product: 'esotk',
          alpha: a,
        });
      });
    }
    tag('ESO Logs', 'esologs', up(t, M1.t1 - 0.3, 0.4) * down(t, T.wipe0, 0.3));
    tag('ESO Toolkit', 'esotk', up(t, T.wipe1 - 0.1, 0.3) * down(t, C.just - 0.2, 0.3));

    // "Just paste the link."
    const link = up(t, C.just - 0.15, 0.4) * down(t, T.zoomCut - 0.45, 0.35);
    if (link > 0) {
      focus(link, [], { blur: 1, dim: 0.55 });
      out.overlays.push((ctx) =>
        UI.linkPill(ctx, {
          x: W / 2,
          y: H / 2,
          alpha: link,
          morph: range(t, C.paste + 0.1, C.paste + 0.9),
          from: 'esologs.com/reports/',
          to: 'esotk.com/report/',
          code: 'F4f2bMwWtgVKxjB9',
          size: P ? 34 : 52,
        }),
      );
    }
    out.fx.zoom = [0.5, 0.5, 0.2 * bell(t, T.zoomCut - 0.45, T.zoomCut, T.zoomCut + 0.5)];
  }

  // --- One tank's gear: rows lift out of ESO Logs and land as ESO Toolkit's set chips -----------------
  const L = R['el-player'];
  const K = R['tk-players'];
  const S = R['tk-scribing'];
  const icon = K.icons.find((i) => i.skill === 'Leashing Soul');
  const tkCardShot = shot('tk-players', V.tkCard);
  const cardRectOnScreen = pageToScreen(tkCardShot, K.card);
  if (t >= T.zoomCut && t < C.groups + 0.7) {
    const zoomOut = ease.outCubic(range(t, T.zoomCut, T.zoomCut + 0.55));
    const v = path(
      [
        { t: T.zoomCut, v: V.elPlayer },
        { t: C.thirteen - 0.4, v: V.elPlayer },
        { t: C.thirteen + 0.5, v: V.elRows },
      ],
      t,
    );
    const el = add(
      shot(
        'el-player',
        { ...v, vw: v.vw * mix(0.78, 1, zoomOut) },
        { alpha: 1 - smoothstep(C.groups, C.groups + 0.55, t) },
      ),
    );
    out.fx.zoom = [
      0.5,
      0.5,
      Math.max(out.fx.zoom[2], 0.2 * (1 - smoothstep(T.zoomCut, T.zoomCut + 0.5, t))),
    ];
    tag('ESO Logs', 'esologs', up(t, T.zoomCut + 0.2, 0.4) * down(t, C.groups, 0.3));

    // "Thirteen items, one per row."
    if (t >= C.thirteen - 0.1) {
      const rows = L.gear.map((g) => pageToScreen(el, visiblePart(el, g.rect)));
      const i = Math.min(12, Math.max(0, Math.floor((t - C.thirteen) / 0.09)));
      const table = [rows[0][0], rows[0][1], rows[0][2], rows[12][1] + rows[12][3] - rows[0][1]];
      const r = lerpRect(
        rows[i],
        table,
        ease.inOutCubic(range(t, C.thirteen + 1.2, C.thirteen + 1.6)),
      );
      focus(
        up(t, C.thirteen - 0.1, 0.25) * down(t, C.groups - 0.1, 0.3),
        [{ rect: r, radius: 6, feather: 60 }],
        {
          blur: 0.6,
          dim: 0.5,
        },
      );
      const lit = Math.min(13, i + 1);
      const a = up(t, C.thirteen, 0.25) * down(t, C.groups - 0.2, 0.3);
      out.overlays.push((ctx) =>
        UI.glassText(ctx, `${lit} ${lit === 1 ? 'item' : 'items'}`, {
          x: W - (P ? 170 : 150),
          y: tagAt[1] - 22,
          size: P ? 30 : 24,
          alpha: a,
        }),
      );
    }
  }

  if (t >= C.groups - 0.1 && t < T.dive) {
    // ESO Toolkit's player card, soft until the build has landed, then an iris opens on it.
    const tkV = path(
      [
        { t: C.that - 0.1, v: V.tkCard },
        { t: C.sTk, v: around(icon.rect, P ? 300 : 620) },
        { t: T.dive, v: around(icon.rect, 90), ease: ease.inCubic },
      ],
      t,
    );
    const tk = add(shot('tk-players', tkV, { alpha: up(t, C.groups - 0.1, 0.6) }));
    const iris = ease.outCubic(range(t, C.assemble, C.assemble + 0.6));
    const [cx, cy] = centreOf(cardRectOnScreen);
    const irisRect = lerpRect([cx, cy, 1, 1], cardRectOnScreen, iris);
    const checkRect = pageToScreen(tk, K.check);
    const focusRect = lerpRect(
      irisRect,
      checkRect,
      ease.inOutCubic(range(t, C.checks - 0.1, C.checks + 0.3)),
    );
    const iconRect = pageToScreen(tk, icon.rect);
    const toIcon = ease.inOutCubic(range(t, C.that - 0.1, C.that + 0.3));
    const rect = lerpRect(
      focusRect,
      [iconRect[0] - 6, iconRect[1] - 6, iconRect[2] + 12, iconRect[3] + 12],
      toIcon,
    );
    focus(t < C.assemble ? 1 : 1, iris > 0.01 ? [{ rect, radius: 16, feather: 90 }] : [], {
      blur: 1,
      dim: iris > 0.01 ? 0.5 : 0.55,
    });
    out.fx.zoom = [0.5, 0.5, Math.max(out.fx.zoom[2], 0.24 * smoothstep(T.dive - 0.4, T.dive, t))];
    tag('ESO Toolkit', 'esotk', up(t, C.assemble + 0.2, 0.4) * down(t, C.sTk, 0.3));

    // Flights. The EL page is framed on the rows by now, so their screen positions are fixed.
    const elRowsShot = shot('el-player', V.elRows);
    const chipFor = (set) => K.chips.find((c) => c.label.endsWith(set));
    const icons = K.icons
      .filter((i) => !i.skill.startsWith('@'))
      .sort(
        (a, b) => Math.round(a.rect[1] / 25) - Math.round(b.rect[1] / 25) || a.rect[0] - b.rect[0],
      );
    const bars = [...L.bars].sort((a, b) => a.bar - b.bar || a.slot - b.slot);
    const settle = down(t, C.assemble + 0.55, 0.25);
    const dpr = pageSize(R, 'el-player').dpr;
    const tkDpr = pageSize(R, 'tk-players').dpr;
    const flight = (src, dst, at, dur, mixFrom, hover) => {
      if (t < C.groups - 0.05 || t > C.assemble + 0.85) return;
      const s = visiblePart(elRowsShot, src);
      const a = pageToScreen(elRowsShot, s);
      const b = pageToScreen(tkCardShot, dst);
      const liftK = hover ? ease.outCubic(range(t, C.groups + hover, C.groups + hover + 0.5)) : 0;
      const hoverRect = hover
        ? lerpRect(a, [a[0] + a[2] * 0.04, a[1] - 20, a[2] * 0.92, a[3] * 0.92], liftK)
        : a;
      const k = range(t, at, at + dur);
      const e = ease.inOutCubic(k);
      const r = lerpRect(hoverRect, b, e);
      add({
        tex: 'el-player',
        uv: s.map((v) => v * dpr),
        texB: 'tk-players',
        uvB: dst.map((v) => v * tkDpr),
        mixB: smoothstep(mixFrom, 0.85, e),
        fit: 'height',
        x: r[0] + r[2] / 2,
        y: r[1] + r[3] / 2,
        z: Math.sin(Math.PI * e) * 170 + liftK * (1 - e) * 90,
        w: r[2],
        h: r[3],
        rotX: -Math.sin(Math.PI * e) * 0.3,
        radius: mix(3, Math.min(18, b[3] / 2), e),
        alpha: settle,
        shadow: e > 0.02 && e < 0.98,
        bright: 1.0,
        layer: 'fg',
      });
      if (k >= 1) {
        const glow = Math.exp(-(t - at - dur) * 5) * settle;
        out.overlays.push((ctx) =>
          UI.callout(ctx, b, { alpha: glow, pad: 3, radius: 12, width: 2 }),
        );
      }
    };
    L.gear.forEach((row, i) =>
      flight(row.rect, chipFor(row.set).rect, C.groups + i * 0.055, 0.95, 0.35, 0),
    );
    bars.forEach((b, j) =>
      flight(b.rect, icons[b.bar * 6 + b.slot].rect, C.lays + j * 0.05, 0.85, 0.2, j * 0.03),
    );

    // "...and checks the build for common mistakes."
    if (!P && t > C.checks - 0.2 && t < C.that + 0.3) {
      const a = up(t, C.checks - 0.1, 0.3) * down(t, C.that - 0.2, 0.4);
      const x = cardRectOnScreen[0] + cardRectOnScreen[2] + 48;
      out.overlays.push((ctx) => checklist(ctx, x, H * 0.42, t, C.checks + 0.15, a));
    }
  }

  // --- The scribed skill: dive into the icon, surface in its tooltip ---------------------------------
  if (t >= T.dive && t < T.whipReplay + 0.05) {
    const tipIcon = S.icon;
    const v = path(
      [
        { t: T.dive, v: around(tipIcon, 90) },
        { t: T.dive + 1.0, v: V.scribe, ease: ease.outCubic, centreLag: 0.3 },
        { t: T.whipReplay, v: { ...V.scribe, vw: V.scribe.vw * 0.95 } },
      ],
      t,
    );
    const tip = add(shot('tk-scribing', v, whipOut(T.whipReplay)));
    out.fx.zoom = [0.5, 0.5, 0.24 * (1 - smoothstep(T.dive, T.dive + 0.5, t))];
    const tooltip = S.tooltip;
    const rows = {
      focus: [tooltip[0] + 5, S.focus[1] - 7, tooltip[2] - 10, S.signature[1] - S.focus[1] - 2],
      signature: [
        tooltip[0] + 5,
        S.signature[1] - 7,
        tooltip[2] - 10,
        S.affix[1] - S.signature[1] - 2,
      ],
      affix: [
        tooltip[0] + 5,
        S.affix[1] - 7,
        tooltip[2] - 10,
        tooltip[1] + tooltip[3] - S.affix[1] - 2,
      ],
    };
    const tipRect = pageToScreen(tip, tooltip);
    let r = pageToScreen(tip, rows.focus);
    r = lerpRect(
      r,
      pageToScreen(tip, rows.signature),
      ease.inOutCubic(range(t, C.signature - 0.08, C.signature + 0.2)),
    );
    r = lerpRect(
      r,
      pageToScreen(tip, rows.affix),
      ease.inOutCubic(range(t, C.affix - 0.08, C.affix + 0.2)),
    );
    const onRows = up(t, C.focus - 0.12, 0.3);
    const rect = lerpRect(tipRect, r, onRows);
    focus(
      up(t, T.dive + 0.5, 0.4) * down(t, T.whipReplay - 0.35, 0.2),
      [{ rect, radius: 12, feather: 70 }],
      {
        blur: 0.8,
        dim: 0.55,
      },
    );
    if (onRows > 0) {
      out.overlays.push((ctx) =>
        UI.callout(ctx, r, {
          alpha: onRows * down(t, T.whipReplay - 0.35, 0.2),
          color: UI.INK.gold,
          pad: 2,
          radius: 10,
          width: 2,
        }),
      );
    }
    tag('Scribing, decoded', 'esotk', up(t, T.dive + 0.7, 0.4) * down(t, T.whipReplay - 0.35, 0.2));
    out.fx.whip = [-whipBlur(T.whipReplay), 0];
  }

  // --- Replay: from above, then rebuilt in 3D ------------------------------------------------------
  if (t >= T.whipReplay && t < T.intoCard + 0.05) {
    const kt = ease.inOutCubic(range(t, C.tilt, C.tilt + 1.0));
    const el = shot(replayTex.el, V.elReplay, whipIn(T.whipReplay));
    el.frame = Math.min(538, Math.max(0, Math.floor((t - (T.whipReplay - 0.2)) * 60)));
    Object.assign(el, { rotX: kt * deg(58), y: el.y + kt * H * 0.08, z: -kt * 120 });
    const pushK = range(t, M3.t1, T.intoCard);
    const tk = shot(
      replayTex.tk,
      { ...V.tkReplay, vw: V.tkReplay.vw * mix(1, 0.93, pushK) },
      whipOut(T.intoCard),
    );
    tk.frame = Math.min(598, Math.max(0, Math.floor((t - M3.t0) * 60)));
    if (t <= M3.t1) add(el);
    if (t >= M3.t0) add(tk);
    addMorph(M3, { type: 'card', card: el }, { type: 'card', card: tk });
    out.fx.whip = [-whipBlur(T.whipReplay) - whipBlur(T.intoCard), 0];
    tag('ESO Logs replay', 'esologs', up(t, T.whipReplay + 0.3, 0.4) * down(t, C.tilt, 0.3));
    tag('ESO Toolkit 3D replay', 'esotk', up(t, M3.t1 - 0.2, 0.4) * down(t, T.ch2, 0.3));
    chapterBlur(T.ch2);
  }

  // --- Chapter 2, "Plan your build": the player card, the Build Editor, the Build Leaderboard -----
  if (t >= T.intoCard && t < T.whipBuild + 0.05) {
    const v = path(
      [
        { t: T.intoCard, v: V.tkCard },
        { t: T.whipBuild, v: { ...V.tkCard, vw: V.tkCard.vw * 0.94 } },
      ],
      t,
    );
    const card = add(
      shot('tk-players', v, {
        ...whipIn(T.intoCard),
        ...(t > T.whipBuild - 0.3 ? whipOut(T.whipBuild) : {}),
      }),
    );
    const exRect = grow(pageToScreen(card, K.extract), 8);
    const toEx = ease.inOutCubic(range(t, C.copying - 0.1, C.copying + 0.25));
    const leave = down(t, T.whipBuild - 0.3, 0.2);
    focus(
      up(t, T.intoCard + 0.2, 0.3) * leave,
      [{ rect: lerpRect(pageToScreen(card, K.card), exRect, toEx), radius: 14, feather: 80 }],
      { blur: 0.8, dim: 0.5 },
    );
    if (toEx > 0)
      out.overlays.push((ctx) =>
        UI.callout(ctx, exRect, { alpha: toEx * leave, pad: 0, radius: 10, width: 2 }),
      );
    out.fx.whip = [-whipBlur(T.intoCard) - whipBlur(T.whipBuild), 0];
    tag('Extract build to editor', 'esotk', up(t, T.intoCard + 0.3, 0.4) * leave);
  }

  if (t >= T.whipBuild && t < T.whipBoard + 0.05) {
    const v = path(
      [
        { t: T.whipBuild, v: V.build },
        { t: T.whipBoard, v: V.buildEnd },
      ],
      t,
    );
    const build = add(
      shot('tk-build', v, {
        ...whipIn(T.whipBuild),
        ...(t > T.whipBoard - 0.3 ? whipOut(T.whipBoard) : {}),
      }),
    );
    const leave = down(t, T.whipBoard - 0.3, 0.2);
    focus(
      up(t, C.send + 0.4, 0.4) * leave,
      [{ rect: pageToScreen(build, PAGE.buildHeader), radius: 14, feather: 90 }],
      { blur: 0.7, dim: 0.5 },
    );
    out.fx.whip = [-whipBlur(T.whipBuild) - whipBlur(T.whipBoard), 0];
    tag('Build Editor', 'esotk', up(t, T.whipBuild + 0.3, 0.4) * leave);
  }

  if (t >= T.whipBoard && t < T.whipScribe + 0.05) {
    const B = R['tk-build-leaderboard'];
    const v = path(
      [
        { t: T.whipBoard, v: V.board },
        { t: C.parses - 0.2, v: V.board },
        { t: C.builds + 0.3, v: V.board2 },
        { t: C.byClass - 0.4, v: V.board2 },
        { t: C.byClass + 0.3, v: V.board3 },
        { t: T.whipScribe, v: { ...V.board3, vw: V.board3.vw * 0.96 } },
      ],
      t,
    );
    const board = add(
      shot('tk-build-leaderboard', v, {
        ...whipIn(T.whipBoard),
        ...(t > T.whipScribe - 0.3 ? whipOut(T.whipScribe) : {}),
      }),
    );
    const at = (r) => grow(pageToScreen(board, r), 6);
    const rect = steps(
      [
        [C.board - 0.1, B.patterns],
        [C.parses - 0.1, B.top],
        [C.builds - 0.1, B.card],
        [C.behind + 0.1, B.setup],
        [C.byClass - 0.1, B.byClass],
        [C.byBoss - 0.1, B.byBoss],
      ],
      at,
    );
    const leave = down(t, T.whipScribe - 0.3, 0.2);
    focus(up(t, C.board - 0.2, 0.3) * leave, [{ rect, radius: 14, feather: 80 }], {
      blur: 0.7,
      dim: 0.5,
    });
    out.fx.whip = [-whipBlur(T.whipBoard) - whipBlur(T.whipScribe), 0];
    tag('Build Leaderboard', 'esotk', up(t, T.whipBoard + 0.3, 0.4) * leave);
  }

  // "Plan a scribed skill script by script": the planner rebuilds the log chapter's Leashing Soul.
  if (t >= T.whipScribe && t < T.whipCalc + 0.05) {
    const Sc = R['tk-scribe'];
    const v = path(
      [
        { t: T.whipScribe, v: V.planner },
        { t: T.whipCalc, v: V.plannerEnd },
      ],
      t,
    );
    const move = { ...whipIn(T.whipScribe), ...(t > T.whipCalc - 0.3 ? whipOut(T.whipCalc) : {}) };
    const base = add(shot('tk-scribe-0', v, move));
    const picks = [
      [C.script1, Sc.focus],
      [C.by, Sc.signature],
      [C.script2, Sc.affix],
    ];
    picks.forEach(([a], i) =>
      add(shot(`tk-scribe-${i + 1}`, v, { ...move, alpha: up(t, a - 0.05, 0.22) })),
    );
    const at = (r) => grow(pageToScreen(base, r), 4);
    const rect = steps(
      [
        [C.plan - 0.1, Sc.tooltip],
        [C.script1 - 0.08, Sc.focus],
        [C.by - 0.08, Sc.signature],
        [C.script2 - 0.08, Sc.affix],
        [C.script2 + 0.7, Sc.tooltip],
      ],
      at,
      0.25,
    );
    const leave = down(t, T.whipCalc - 0.3, 0.2);
    focus(up(t, C.plan - 0.2, 0.3) * leave, [{ rect, radius: 14, feather: 80 }], {
      blur: 0.75,
      dim: 0.5,
    });
    for (const [a, r] of picks) {
      const glow = t >= a ? Math.exp(-(t - a) * 2.2) * leave : 0;
      if (glow > 0.01)
        out.overlays.push((ctx) =>
          UI.callout(ctx, at(r), { alpha: glow, color: UI.INK.gold, pad: 0, radius: 10, width: 2 }),
        );
    }
    out.fx.whip = [-whipBlur(T.whipScribe) - whipBlur(T.whipCalc), 0];
    tag('Scribing planner', 'esotk', up(t, T.whipScribe + 0.3, 0.4) * leave);
  }

  if (t >= T.whipCalc && t < T.intoRoster + 0.05) {
    const v = path(
      [
        { t: T.whipCalc, v: V.calc },
        { t: T.intoRoster, v: V.calcEnd },
      ],
      t,
    );
    const calc = add(shot('tk-calculator', v, whipIn(T.whipCalc)));
    focus(
      up(t, C.pen + 0.1, 0.4),
      [{ rect: pageToScreen(calc, R['tk-calculator'].total), radius: 16, feather: 90 }],
      { blur: 0.7, dim: 0.5 },
    );
    out.fx.whip = [-whipBlur(T.whipCalc), 0];
    tag('Calculators', 'esotk', up(t, T.whipCalc + 0.3, 0.4) * down(t, T.ch3, 0.3));
    chapterBlur(T.ch3);
  }

  // --- Chapter 3, "Run the trial": Roster Builder, per-fight builds, sharing, Discord --------------
  if (t >= T.intoRoster && t < T.cutFight + 0.05) {
    const Rb = R['tk-roster-builder'];
    const v = path(
      [
        { t: T.intoRoster, v: V.rbTop },
        { t: C.sets - 0.5, v: V.rbTop },
        { t: C.sets + 0.3, v: V.rbTank2 },
        { t: T.cutFight, v: { ...V.rbTank2, vw: V.rbTank2.vw * 0.95 } },
      ],
      t,
    );
    const arrive = ease.outCubic(range(t, T.intoRoster, T.intoRoster + 0.55));
    const exit = ease.inCubic(range(t, T.cutFight - 0.4, T.cutFight));
    const rb = add(
      shot('tk-roster-builder', { ...v, vw: v.vw * mix(0.8, 1, arrive) * mix(1, 0.55, exit) }),
    );
    const at = (r) => grow(pageToScreen(rb, r), 6);
    const rect = steps(
      [
        [C.plans - 0.1, Rb.setup],
        [C.tanks - 0.08, Rb.tanks],
        [C.healers - 0.08, Rb.healers],
        [C.dealers - 0.08, Rb.dps],
        [C.sets - 0.45, Rb.tank2],
      ],
      at,
    );
    focus(up(t, C.plans - 0.2, 0.3) * (1 - exit), [{ rect, radius: 14, feather: 80 }], {
      blur: 0.7,
      dim: 0.5,
    });
    // The builder flags a monster set that does not suit the chosen ultimate.
    const warn = up(t, C.ults - 0.15, 0.3) * (1 - exit);
    if (warn > 0)
      out.overlays.push((ctx) =>
        UI.callout(ctx, at(Rb.warning), {
          alpha: warn,
          color: UI.INK.gold,
          pad: 0,
          radius: 10,
          width: 2,
        }),
      );
    out.fx.zoom = [
      0.5,
      0.5,
      0.2 *
        Math.max(
          1 - smoothstep(T.intoRoster, T.intoRoster + 0.5, t),
          smoothstep(T.cutFight - 0.4, T.cutFight, t),
        ),
    ];
    tag('Roster Builder', 'esotk', up(t, T.intoRoster + 0.3, 0.4) * (1 - exit));
  }

  if (t >= T.cutFight && t < T.whipView + 0.05) {
    const Pf = R['tk-roster-perfight'];
    const v = path(
      [
        { t: T.cutFight, v: V.perfight },
        { t: C.fight - 0.2, v: V.perfight },
        { t: C.fight + 0.5, v: V.perfight2 },
        { t: T.whipView, v: { ...V.perfight2, vw: V.perfight2.vw * 0.97 } },
      ],
      t,
    );
    const arrive = ease.outCubic(range(t, T.cutFight, T.cutFight + 0.5));
    const pf = add(
      shot(
        'tk-roster-perfight',
        { ...v, vw: v.vw * mix(1.3, 1, arrive) },
        t > T.whipView - 0.3 ? whipOut(T.whipView) : {},
      ),
    );
    const at = (r) => grow(pageToScreen(pf, r), 6);
    const rect = steps(
      [
        [T.cutFight + 0.2, Pf.timeline],
        [C.each - 0.1, Pf.encounter],
        [C.fight + 0.15, Pf.fight],
      ],
      at,
    );
    const leave = down(t, T.whipView - 0.3, 0.2);
    focus(up(t, T.cutFight + 0.15, 0.3) * leave, [{ rect, radius: 14, feather: 80 }], {
      blur: 0.7,
      dim: 0.5,
    });
    out.fx.zoom = [0.5, 0.5, 0.2 * (1 - smoothstep(T.cutFight, T.cutFight + 0.45, t))];
    out.fx.whip = [-whipBlur(T.whipView), 0];
    tag('Per-fight builds', 'esotk', up(t, T.cutFight + 0.3, 0.4) * leave);
  }

  // "Share it as a link, publish it to Roster Hub": the shared roster flies into its Hub card.
  if (t >= T.whipView && t < T.whipDiscord + 0.05) {
    const Rv = R['tk-roster-view'];
    const Hb = R['tk-roster-hub'];
    const hub = shot('tk-roster-hub', V.hub, t > T.whipDiscord - 0.3 ? whipOut(T.whipDiscord) : {});
    const cardScreen = pageToScreen(hub, Hb.card);
    const send = ease.inOutCubic(range(t, C.publish - 0.1, C.publish + 0.7));
    const view = shot('tk-roster-view', V.rview, whipIn(T.whipView));
    if (send <= 0) {
      add(view);
      const r = grow(pageToScreen(view, Rv.copyLink), 6);
      const onLink = up(t, C.link - 0.35, 0.3);
      focus(
        up(t, T.whipView + 0.3, 0.3),
        [
          {
            rect: lerpRect(grow(pageToScreen(view, Rv.tanks), 6), r, onLink),
            radius: 12,
            feather: 80,
          },
        ],
        { blur: 0.6, dim: 0.45 },
      );
      if (onLink > 0)
        out.overlays.push((ctx) =>
          UI.callout(ctx, r, { alpha: onLink, pad: 0, radius: 10, width: 2 }),
        );
      tag('Shared roster', 'esotk', up(t, T.whipView + 0.3, 0.4));
    } else {
      add(hub);
      const [cx, cy] = centreOf(cardScreen);
      const tw = cardScreen[2] * 1.15;
      const target = [cx - tw / 2, cy - (tw * H) / W / 2, tw, (tw * H) / W];
      add({
        ...shotCard(R, 'tk-roster-view', V.rview, lerpRect(FULL, target, send)),
        radius: mix(0, 14, send),
        shadow: send > 0.02 && send < 0.97,
        alpha: 1 - smoothstep(0.8, 1, send),
        layer: 'fg',
      });
      const land = up(t, C.publish + 0.55, 0.3) * down(t, T.whipDiscord - 0.3, 0.2);
      focus(land, [{ rect: grow(cardScreen, 6), radius: 18, feather: 90 }], {
        blur: 0.6,
        dim: 0.45,
      });
      const glow = t > C.publish + 0.6 ? Math.exp(-(t - C.publish - 0.6) * 2.5) : 0;
      if (glow > 0.01)
        out.overlays.push((ctx) =>
          UI.callout(ctx, cardScreen, { alpha: glow, pad: 3, radius: 16, width: 2 }),
        );
      tag('Roster Hub', 'esotk', land);
    }
    out.fx.whip = [-whipBlur(T.whipView) - whipBlur(T.whipDiscord), 0];
  }

  if (t >= T.whipDiscord && t < T.intoKalpa + 0.05) {
    const Db = R['tk-discord-bot'];
    const v = path(
      [
        { t: T.whipDiscord, v: V.discord },
        { t: T.intoKalpa, v: { ...V.discord, vw: V.discord.vw * 0.94 } },
      ],
      t,
    );
    const bot = add(shot('tk-discord-bot', v, whipIn(T.whipDiscord)));
    const at = (r) => grow(pageToScreen(bot, r), 6);
    const rect = steps(
      [
        [C.discord - 0.1, Db.hero],
        [C.signups - 0.35, Db.signups],
      ],
      at,
    );
    focus(up(t, C.discord - 0.2, 0.3), [{ rect, radius: 14, feather: 80 }], {
      blur: 0.7,
      dim: 0.5,
    });
    out.fx.whip = [-whipBlur(T.whipDiscord), 0];
    tag('Discord roster bot', 'esotk', up(t, T.whipDiscord + 0.3, 0.4) * down(t, T.ch4, 0.3));
    chapterBlur(T.ch4);
  }

  // --- Chapter 4, "Your addons": Kalpa and Pack Hub ------------------------------------------------
  if (t >= T.intoKalpa && t < T.cutFeatures + 0.05) {
    const Ka = R['tk-kalpa'];
    const v = path(
      [
        { t: T.intoKalpa, v: V.kalpa },
        { t: C.installs - 0.35, v: V.kalpa },
        { t: C.installs + 0.45, v: V.kalpaApp },
        { t: T.cutFeatures, v: { ...V.kalpaApp, vw: V.kalpaApp.vw * 0.96 } },
      ],
      t,
    );
    const arrive = ease.outCubic(range(t, T.intoKalpa, T.intoKalpa + 0.55));
    const exit = ease.inCubic(range(t, T.cutFeatures - 0.4, T.cutFeatures));
    const k = add(shot('tk-kalpa', { ...v, vw: v.vw * mix(0.8, 1, arrive) * mix(1, 0.6, exit) }));
    const at = (r) => grow(pageToScreen(k, r), 8);
    const rect = steps(
      [
        [C.kalpa - 0.1, Ka.title],
        [C.installs - 0.1, Ka.app],
      ],
      at,
    );
    focus(up(t, C.kalpa - 0.2, 0.3) * (1 - exit), [{ rect, radius: 14, feather: 80 }], {
      blur: 0.7,
      dim: 0.5,
    });
    // "A free addon manager": the page's "Free forever" badge.
    const free = up(t, C.kfree - 0.1, 0.25) * down(t, C.installs - 0.2, 0.3);
    if (free > 0)
      out.overlays.push((ctx) =>
        UI.callout(ctx, grow(pageToScreen(k, Ka.free), 4), {
          alpha: free,
          pad: 0,
          radius: 12,
          width: 2,
        }),
      );
    out.fx.zoom = [
      0.5,
      0.5,
      0.2 *
        Math.max(
          1 - smoothstep(T.intoKalpa, T.intoKalpa + 0.5, t),
          smoothstep(T.cutFeatures - 0.4, T.cutFeatures, t),
        ),
    ];
    tag('Kalpa', 'esotk', up(t, T.intoKalpa + 0.3, 0.4) * (1 - exit));
  }

  if (t >= T.cutFeatures && t < T.whipPacks + 0.05) {
    const Kf = R['tk-kalpa-features'];
    const arrive = ease.outCubic(range(t, T.cutFeatures, T.cutFeatures + 0.5));
    const f = add(
      shot(
        'tk-kalpa-features',
        { ...V.features, vw: V.features.vw * mix(1.3, 1, arrive) },
        t > T.whipPacks - 0.3 ? whipOut(T.whipPacks) : {},
      ),
    );
    const leave = down(t, T.whipPacks - 0.3, 0.2);
    focus(
      up(t, T.cutFeatures + 0.15, 0.3) * leave,
      [{ rect: grow(pageToScreen(f, Kf.deps), 6), radius: 14, feather: 80 }],
      { blur: 0.7, dim: 0.5 },
    );
    out.fx.zoom = [0.5, 0.5, 0.2 * (1 - smoothstep(T.cutFeatures, T.cutFeatures + 0.45, t))];
    out.fx.whip = [-whipBlur(T.whipPacks), 0];
    tag('Kalpa', 'esotk', up(t, T.cutFeatures + 0.2, 0.3) * leave);
  }

  if (t >= T.whipPacks && t < C.o1 + 0.35) {
    const Ph = R['tk-pack-hub'];
    const v = path(
      [
        { t: T.whipPacks, v: V.pack },
        { t: N.outro, v: V.packEnd },
      ],
      t,
    );
    const leave = ease.inOutCubic(range(t, C.o1 - 0.35, C.o1 + 0.3));
    const packs = add(
      shot(
        'tk-pack-hub',
        { ...v, vw: v.vw * mix(1, 1.15, leave) },
        { ...whipIn(T.whipPacks), alpha: 1 - leave * 0.9 },
      ),
    );
    focus(
      up(t, C.community - 0.2, 0.3) * (1 - leave),
      [{ rect: grow(pageToScreen(packs, Ph.utilities), 6), radius: 18, feather: 90 }],
      { blur: 0.7, dim: 0.5 },
    );
    out.fx.whip = [-whipBlur(T.whipPacks), 0];
    tag('Pack Hub', 'esotk', up(t, T.whipPacks + 0.3, 0.4) * down(t, C.o1 - 0.4, 0.3));
  }

  // --- Chapter rail and chapter titles ---------------------------------------------------------------
  if (t > CHAPTERS[0].t0 && t < RAIL_END + 0.5)
    out.overlays.push((ctx) => chapterRail(ctx, t, W, H, P));

  // --- Outro: side by side, then everything collapses into the mark -------------------------------
  if (t >= C.o1 - 0.35 && t <= M5.t1) {
    const left = P ? [0, 0, W, H / 2] : [0, 0, W / 2, H];
    const right = P ? [0, H / 2, W, H / 2] : [W / 2, 0, W / 2, H];
    // ESO Logs takes the full frame first, then squeezes into its half as ESO Toolkit slides in.
    const inL = ease.outCubic(range(t, C.o1 - 0.35, C.o1 + 0.3));
    const split = ease.inOutCubic(range(t, C.o2 - 0.35, C.o2 + 0.45));
    const inR = split;
    const elScreen = lerpRect(FULL, left, split);
    const elView = lerpView(V.outroElFull, V.outroEl, split);
    const el = shot(
      'el-damage',
      { ...elView, vw: elView.vw * mix(1.08, 1, inL) },
      { screen: elScreen, alpha: inL },
    );
    // ESO Toolkit's half: the death recap from an earlier wipe on this boss ("helps you understand
    // it"), then the kill's synergy breakdown ("and get ready for the next one").
    const rightFrom = P ? [0, H, W, H / 2] : [W, 0, W / 2, H];
    const tkScreen = lerpRect(rightFrom, right, split);
    const drift = range(t, C.o2, M5.t0);
    const toSynergies = ease.inOutCubic(range(t, C.ready - 0.45, C.ready + 0.05));
    const deaths = shot('tk-deaths', lerpView(V.outroDeaths, V.outroDeathsEnd, drift), {
      screen: tkScreen,
    });
    const synergies = shot('tk-synergies', lerpView(V.outroSynergies, V.outroSynergiesEnd, drift), {
      screen: tkScreen,
      alpha: toSynergies,
    });
    const tk = toSynergies > 0.5 ? synergies : deaths;
    if (t <= M4.t1) add(el);
    if (split > 0 && t <= M5.t1) {
      if (toSynergies < 1) add(deaths);
      add(synergies);
    }
    const point = worldToScreen(C.free + 1, W, H, [0, 0, 0]) ?? [W / 2, H / 2];
    addMorph(M4, { type: 'card', card: el }, { type: 'point', at: [point[0], point[1], 0] });
    addMorph(M5, { type: 'card', card: tk }, { type: 'point', at: [point[0], point[1], 0] });
    const fade = down(t, M4.t0 - 0.1, 0.35);
    const both = inR * fade;
    if (both > 0)
      out.overlays.push((ctx) =>
        P ? dividerLineH(ctx, H / 2, W, both) : dividerLine(ctx, W / 2, H, both, false),
      );
    const lt = UI.presence(t, C.o1 + 0.2, undefined, 0.8);
    const rt = UI.presence(t, C.o2 + 0.2, undefined, 0.8);
    out.overlays.push((ctx) => {
      UI.sourceLabel(ctx, {
        x: elScreen[0] + 48,
        y: elScreen[1] + (P ? 200 : 104),
        text: 'ESO Logs',
        product: 'esologs',
        alpha: inL * fade,
      });
      UI.sourceLabel(ctx, {
        x: right[0] + 48,
        y: right[1] + 104,
        text: 'ESO Toolkit',
        product: 'esotk',
        alpha: inR * fade,
      });
      UI.glassText(ctx, 'Records the fight.', {
        x: elScreen[0] + elScreen[2] / 2,
        y: elScreen[1] + elScreen[3] - (P ? 110 : 150),
        size: P ? 44 : 46,
        alpha: lt.v * fade,
        rise: (1 - lt.i) * 18,
      });
      UI.glassText(ctx, 'Helps you understand it.', {
        x: right[0] + right[2] / 2,
        y: right[1] + right[3] - (P ? 330 : 150),
        size: P ? 44 : 46,
        alpha: rt.v * fade,
        rise: (1 - rt.i) * 18,
      });
    });
  }

  // End card.
  {
    const Lg = LAYOUT.logo;
    const c = worldToScreen(t, W, H, Lg.center);
    const e = worldToScreen(t, W, H, [Lg.center[0] + Lg.size / 2, Lg.center[1], Lg.center[2]]);
    if (c && e && t > C.free + 1.8) {
      out.overlays.push((ctx) => endCard(ctx, t, W, H, P, c, Math.abs(e[0] - c[0]) * 2));
    }
  }

  // --- Captions -----------------------------------------------------------------------------------
  out.overlays.push((ctx) =>
    UI.captions(ctx, P ? CAPTIONS.tall : CAPTIONS.wide, t, {
      x: W / 2,
      y: P ? H * 0.8 : H - 78,
      size: P ? 42 : 32,
      maxWidth: W - 160,
    }),
  );

  out.cards.sort((a, b) => (a.layer === b.layer ? (a.z ?? 0) - (b.z ?? 0) : 0));
  return out;
}

// ------------------------------------------------------------------------------------------
// Small overlay pieces

function dividerLine(ctx, x, H, alpha, sparks) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(125, 211, 252, 0)');
  g.addColorStop(0.5, 'rgba(186, 230, 253, 1)');
  g.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.fillStyle = g;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 28;
  ctx.fillRect(x - 1.5, 0, 3, H);
  if (sparks) {
    for (let i = 0; i < 26; i++) {
      const y = ((i * 97.13) % 1) * H + ((i * 41) % H);
      const off = Math.sin(i * 12.9898) * 26;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * ((i * 0.618) % 1));
      ctx.beginPath();
      ctx.arc(x + off, y % H, 1.6 + (i % 3), 0, Math.PI * 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fill();
    }
  }
  ctx.restore();
}

function dividerLineH(ctx, y, W, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(125, 211, 252, 0)');
  g.addColorStop(0.5, 'rgba(186, 230, 253, 1)');
  g.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.fillStyle = g;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 28;
  ctx.fillRect(0, y - 1.5, W, 3);
  ctx.restore();
}

/**
 * The chapter rail: a glass strip across the top naming the four chapters. The current chapter is
 * bright with a progress line under it. A new chapter opens with a large title card in the middle
 * of the frame that flies up into its slot.
 */
function chapterRail(ctx, t, W, H, P) {
  const alpha = up(t, CHAPTERS[0].t0, 0.5) * down(t, RAIL_END, 0.4);
  if (alpha <= 0.002) return;
  const size = P ? 24 : 16;
  const gap = P ? 36 : 28;
  const padX = P ? 30 : 22;
  const h = P ? 60 : 40;
  const top = P ? 140 : 26;
  const active = CHAPTERS.findLastIndex((c) => t >= c.t0);
  const card = CHAPTERS[active];
  const sinceCard = t - card.t0;
  const flying = active > 0 && sinceCard < CARD_FLY[1];

  ctx.save();
  ctx.font = `600 ${size}px ${UI.FONT.display}`;
  const widths = CHAPTERS.map((c) => ctx.measureText(c.title).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (CHAPTERS.length - 1) + padX * 2;
  const x0 = W / 2 - total / 2;
  UI.glass(ctx, x0, top, total, h, h / 2, alpha);
  const slots = [];
  let x = x0 + padX;
  CHAPTERS.forEach((c, i) => {
    slots.push({ x, w: widths[i] });
    x += widths[i] + gap;
  });
  const baseline = top + h / 2 + size * 0.36;
  CHAPTERS.forEach((c, i) => {
    const { x: lx, w } = slots[i];
    let a = i < active ? 0.62 : i === active ? 1 : 0.36;
    if (i === active && flying) a *= smoothstep(CARD_FLY[1] - 0.12, CARD_FLY[1], sinceCard);
    ctx.globalAlpha = alpha * a;
    ctx.fillStyle = i === active ? '#ffffff' : UI.INK.text;
    ctx.fillText(c.title, lx, baseline);
    if (i < CHAPTERS.length - 1) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(lx + w + gap / 2, top + h / 2, P ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (i === active) {
      const next = CHAPTERS[i + 1]?.t0 ?? RAIL_END;
      const progress = range(t, c.t0, next);
      ctx.globalAlpha = alpha * a;
      const g = ctx.createLinearGradient(lx, 0, lx + w, 0);
      g.addColorStop(0, UI.INK.sky);
      g.addColorStop(1, UI.INK.aqua);
      ctx.fillStyle = g;
      ctx.fillRect(lx, top + h - (P ? 12 : 8), w * progress, P ? 3 : 2);
    }
  });
  ctx.restore();

  // Title card for the chapter that just started.
  if (!flying) return;
  const appear = ease.outCubic(range(sinceCard, 0, 0.35));
  const fly = ease.inOutCubic(range(sinceCard, CARD_FLY[0], CARD_FLY[1]));
  const big = P ? 70 : 76;
  const s = mix(big, size, fly);
  const slot = slots[active];
  const cx = mix(W / 2, slot.x + slot.w / 2, fly);
  const cy = mix(H * 0.46, top + h / 2, fly);
  ctx.save();
  ctx.font = `600 ${s}px ${UI.FONT.display}`;
  const tw = ctx.measureText(card.title).width;
  const pw = tw + s * 1.5;
  const ph = s * 2.3;
  UI.glass(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2, appear * (1 - fly));
  ctx.globalAlpha = appear;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(card.title, cx, cy + s * 0.36 + (1 - appear) * 16);
  // Chapter number above the title while it is large.
  const eyebrow = appear * (1 - smoothstep(0, 0.4, fly));
  if (eyebrow > 0.01) {
    ctx.globalAlpha = eyebrow;
    ctx.font = `600 ${P ? 26 : 24}px ${UI.FONT.body}`;
    ctx.fillStyle = UI.INK.sky;
    ctx.fillText(`Chapter ${active + 1}`, cx, cy - ph / 2 - (P ? 26 : 22));
  }
  ctx.restore();
}

function checklist(ctx, x, y, t, at, alpha) {
  if (alpha <= 0.002) return;
  const items = ['Enchant quality', 'Gear quality', 'CP 160 gear', 'Key buffs'];
  items.forEach((item, i) => {
    const p = UI.presence(t, at + i * 0.16, undefined, 0.5);
    const a = p.v * alpha;
    if (a <= 0.002) return;
    ctx.save();
    ctx.font = `500 22px ${UI.FONT.body}`;
    const w = ctx.measureText(item).width + 82;
    const h = 52;
    const iy = y + i * 68 + (1 - p.i) * 12;
    UI.glass(ctx, x, iy, w, h, h / 2, a);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x + 28, iy + h / 2, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + 22, iy + h / 2);
    ctx.lineTo(x + 27, iy + h / 2 + 5);
    ctx.lineTo(x + 35, iy + h / 2 - 5);
    ctx.stroke();
    ctx.fillStyle = UI.INK.text;
    ctx.fillText(item, x + 52, iy + h / 2 + 8);
    ctx.restore();
  });
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
  const q = UI.presence(t, C.url + 1.1, undefined, 0.8);
  UI.glassText(ctx, 'Paste any ESO Logs report. Free, with no ads.', {
    x: c[0],
    y: ty + (P ? 100 : 78),
    size: P ? 30 : 24,
    alpha: q.v,
    weight: 500,
    rise: (1 - q.i) * 12,
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
