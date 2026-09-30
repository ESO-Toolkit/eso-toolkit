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
import { bezier, catmull, ease, mat4, mix, project, range, smoothstep, spring } from './math.js';
import * as UI from './overlay.js';

export { TIMELINE };

const N = TIMELINE.narration;
const deg = (d) => (d * Math.PI) / 180;
const up = (t, a, d = 0.35) => smoothstep(a, a + d, t);
// Motion curves: entrances, camera and layout moves, exits, page transitions, highlight wipes,
// shared-element flights, and a settle with at most ~2% overshoot.
const EASE = {
  enter: bezier(0.22, 1, 0.36, 1),
  camera: bezier(0.4, 0, 0.1, 1),
  exit: bezier(0.4, 0, 1, 1),
  page: bezier(0.2, 0, 0, 1),
  wipe: bezier(0.4, 0, 0.2, 1),
  move: bezier(0.4, 0, 0.2, 1),
  flight: bezier(0.3, 0, 0.1, 1),
  spring: spring(0.12),
};
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
C.formPage = cue('intro', 'e-s-o') + 0.1;
C.tideborn = cue('intro', 'tideborn');
C.uploaded = cue('intro', 'uploaded');
C.introLogs = cue('intro', 'logs');
C.toolkitSaid = cue('paste', 'toolkit');
C.buffs = cue('insights', 'key');
C.pill = N.paste;
C.paste = cue('paste', 'same');
C.reads = cue('paste', 'e-s-o');
C.insPage = cue('insights', 'insights');
C.who = cue('insights', 'who');
C.colossus = cue('insights', 'colossus');
C.barrier = cue('insights', 'barrier');
C.horn = cue('insights', 'horn');
C.champion = cue('insights', 'champion');
C.how = cue('insights', 'how');
C.where = cue('insights', 'where');
C.healing = cue('tables', 'healing');
C.died = cue('tables', 'died');
C.rezzed = cue('tables', 'rezzed');
C.casts = cue('tables', 'casts');
C.thirteen = cue('gear', 'one');
C.one = C.thirteen;
C.groups = cue('gear', 'groups');
C.lays = cue('gear', 'shows');
C.assemble = C.lays + 11 * 0.05 + 0.85 + 0.1;
C.checks = cue('gear', 'flags');
C.that = N.scribe;
C.sTk = cue('scribe', 'works');
C.focus = cue('scribe', 'scribed');
C.signature = cue('scribe', 'running');
C.affix = cue('scribe', 'combat');
C.tilt = cue('replay', 'e-s-o', 2) - 0.25;
C.rebuild = cue('replay', 'rebuilds') - 0.05;
C.copying = cue('builds', 'copy');
C.send = cue('builds', 'send');
C.start = cue('builds', 'start');
C.board = cue('builds', 'leaderboard');
C.parses = cue('builds', 'parses');
C.builds = cue('builds', 'build', 4);
C.behind = cue('builds', 'behind');
C.byClass = cue('builds', 'class');
C.byBoss = cue('builds', 'boss');
C.plan = cue('calc', 'planner');
C.script1 = cue('calc', 'one');
C.by = cue('calc', 'script');
C.script2 = cue('calc', 'time');
C.pen = cue('calc', 'penetration');
C.plans = cue('roster', 'plans');
C.tanks = cue('roster', 'tanks');
C.healers = cue('roster', 'healers');
C.dealers = cue('roster', 'damage');
C.sets = cue('roster', 'sets');
C.ults = cue('roster', 'ultimates');
C.even = cue('roster', 'separate');
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
C.ready = cue('outro', 'fix');
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

/**
 * Splits narration into clause captions: breaks after , . : ; ? ! or at 10 words, and folds
 * fragments under three words into their neighbour so no caption is just "per minute."
 */
function chunks(words) {
  const groups = [];
  let cur = [];
  for (const w of words) {
    if (!w.text) {
      if (cur.length) cur[cur.length - 1] = { ...cur.at(-1), end: w.end };
      else if (groups.length) groups.at(-1).push({ ...groups.at(-1).pop(), end: w.end });
      continue;
    }
    cur.push(w);
    if (/[,.:;?!]$/.test(w.text) || cur.length >= 10) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  const merged = [];
  for (const g of groups) {
    const prev = merged.at(-1);
    if (prev && (g.length < 3 || prev.length < 3) && prev.length + g.length <= 12) prev.push(...g);
    else merged.push([...g]);
  }
  return merged.map((ws) => ({
    text: ws.map((w) => w.text).join(' '),
    start: ws[0].start,
    end: ws.at(-1).end,
  }));
}

const CAPTIONED = [
  'paste',
  'insights',
  'tables',
  'gear',
  'scribe',
  'replay',
  'builds',
  'calc',
  'roster',
  'kalpa',
];
const CAPTIONS = CAPTIONED.flatMap((id) => chunks(LINES[id]));

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

const worldAlpha = (t) => up(t, C.free + 0.45, 0.45);

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
    exposure: 1,
    fade:
      ease.outCubic(range(t, 0, 0.6)) *
      (1 - ease.inCubic(range(t, TIMELINE.duration - 0.9, TIMELINE.duration))),
    bloom: 0.24 + pulse * 0.1,
    // The backdrop stays black for the open.
    nebula: 0.6 * up(t, T.pageIn + 1.2, 1),
    // Chromatic aberration only on the 2D -> 3D replay crossfade.
    aberration: 0.15 * bell(t, T.xfade, T.xfade + 0.21, T.xfade + 0.42),
  };
}

// ------------------------------------------------------------------------------------------
// Full-bleed shots
//
// Every shot is a virtual camera over a real page: `view` is the visible region in page CSS
// pixels (centre and width); the card fills its screen rectangle with exactly that region.

function pageSize(R, tex) {
  const [tw, th] = R.size[tex];
  // Portrait replay clips are 1080 wide; every other capture is a 1920-wide layout.
  const dpr = tw / (/-replay-tall$/.test(tex) ? 1080 : 1920);
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
const union = (a, b) => {
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y];
};
const centreOf = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
const around = (r, vw) => ({ cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, vw });
const bell = (t, a, peak, b) => smoothstep(a, peak, t) * (1 - smoothstep(peak, b, t));

// Page rectangles (CSS pixels) that are not in the capture layout files.
const PAGE = {
  buildHeader: [226, 88, 494, 76],
};

const FOCUS_BLUR = 0.15;

// Transition times.
const T = {
  pageIn: C.uploaded - 0.8,
  headOut: C.introLogs + 0.3,
  select: C.paste,
  typeStart: C.paste + 0.4,
  enter: Math.max(C.paste + 0.4 + 16 * 0.055 + 0.3, C.toolkitSaid - 0.1),
  get insIn() {
    return this.enter + 0.1;
  },
  abilities: C.who - 0.25,
  uptimes: C.how - 0.2,
  damage: C.where - 0.3,
  pullOut: N.tables - 0.95,
  tables: N.tables - 0.4,
  zoomCut: N.gear - 0.15,
  settle: C.that - 1.1,
  dive: C.sTk + 0.45,
  whipReplay: N.replay - 0.5,
  xfade: C.tilt + 0.54,
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
  { title: 'Read the log', t0: T.pageIn + 2.4 },
  { title: 'Plan your build', t0: T.ch2 },
  { title: 'Run the trial', t0: T.ch3 },
  { title: 'Your addons', t0: T.ch4 },
];
const RAIL_END = C.o1 - 0.3;
const CARD_FLY = [0.95, 1.4];

// Sound design reads these.
C.whooshes = [
  T.pageIn + 1.0,
  T.insIn + 0.1,
  T.abilities,
  T.uptimes,
  T.tables,
  C.healing,
  T.zoomCut,
  C.groups + 0.2,
  C.lays + 0.2,
  T.dive,
  T.whipReplay,
  T.xfade + 0.2,
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
// When items land in the player card, for the sound design.
C.landings = [
  ...Array.from({ length: 13 }, (_, j) => C.groups + j * 0.045 + 0.52),
  ...Array.from({ length: 12 }, (_, j) => C.lays + j * 0.045 + 0.48),
];
C.hits = [
  { t: T.pageIn + 2.4, size: 0.7 },
  { t: T.insIn + 0.4, size: 0.8 },
  { t: Math.max(...C.landings) + 0.1, size: 0.9 },
  { t: T.dive + 0.6, size: 0.7 },
  { t: T.xfade + 0.42, size: 1.1 },
  { t: C.free + 2.2, size: 1.3 },
];
// When the full groove comes in (the 3D replay reveal), the chapter title cards, and UI clicks.
C.full = T.xfade + 0.4;
C.chapters = [T.ch2, T.ch3, T.ch4];
// Light drums and the arpeggio come in with the Insights page.
C.lift = N.insights - 0.2;
// Keystrokes in the address bar, then Enter.
C.keys = [...Array.from({ length: 16 }, (_, i) => T.typeStart + i * 0.055), T.enter];
C.clicks = [
  C.colossus,
  C.barrier,
  C.horn,
  C.champion,
  C.how,
  C.where,
  C.died,
  C.rezzed,
  C.casts,
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
        elDmgEnd: { cx: 520, cy: 560, vw: 580 },
        insOverview: { cx: 960, cy: 477, vw: 1400 },
        insAbilities: { cx: 751.5, cy: 721, vw: 720 },
        insChampion: { cx: 751.5, cy: 967, vw: 720 },
        insUptimes: { cx: 960, cy: 1406, vw: 1450 },
        insDamage: { cx: 960, cy: 1989, vw: 1450 },
        insWide: { cx: 960, cy: 1500, vw: 1920 },
        elGear: { cx: 867.5, cy: 540, vw: 1673 },
        tkBg: { cx: 960, cy: 540, vw: 1920 },
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
        elDmgEnd: { cx: 905, cy: 610, vw: 1380 },
        insOverview: { cx: 960, cy: 477, vw: 1400 },
        insAbilities: { cx: 751.5, cy: 721, vw: 720 },
        insChampion: { cx: 751.5, cy: 967, vw: 720 },
        insUptimes: { cx: 960, cy: 1406, vw: 1450 },
        insDamage: { cx: 960, cy: 1989, vw: 1450 },
        insWide: { cx: 960, cy: 1500, vw: 1920 },
        elGear: { cx: 867.5, cy: 540, vw: 1673 },
        tkBg: { cx: 960, cy: 540, vw: 1920 },

        // Insights and the tables are framed on the measured centres of the panels they show.
        elPlayer: { cx: 867, cy: 440, vw: 1480 },
        elRows: { cx: 867, cy: 515, vw: 1360 },
        tkCard: { cx: 751, cy: 330, vw: 1150 },
        scribe: { cx: 730, cy: 562, vw: 967 },
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
  // Focus pulls mostly dim what is outside the focus and only half-blur it, so the rest of the
  // page stays readable.
  const focus = (amount, rects, opts = {}) => {
    if (amount > 0.001)
      out.fx.focus = {
        amount,
        rects,
        blur: (opts.blur ?? 0.85) * FOCUS_BLUR,
        // Outside the focus drops to 45% brightness (or stays lit when dim is 0).
        dim: opts.dim === 0 ? 0 : 0.55,
      };
  };
  const tagAt = P ? [80, 300] : [80, 86];
  // Source tags give way to the chapter label while it shows.
  // A soft darkening along the top edge whenever a tag or chapter label is up, for legibility.
  let topScrim = 0;
  const tag = (text, product, alpha) => {
    topScrim = Math.max(topScrim, alpha);
    out.overlays.push((ctx) =>
      UI.sourceLabel(ctx, {
        x: tagAt[0],
        y: tagAt[1],
        text,
        alpha: alpha * (1 - chapterLabel(t)),
        size: P ? 28 : 22,
      }),
    );
  };
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
  /** A foreground copy of a page region, lifted toward the camera (amount 0..1). */
  const lift = (card, rect, amount, radius = 14) => {
    if (amount <= 0.002) return;
    const sr = pageToScreen(card, rect);
    const k = 1 + 0.035 * amount;
    const { dpr } = pageSize(R, card.tex);
    add({
      tex: card.tex,
      uv: rect.map((v) => v * dpr),
      x: sr[0] + sr[2] / 2,
      y: sr[1] + sr[3] / 2,
      z: 50 * amount,
      w: sr[2] * k,
      h: sr[3] * k,
      radius: radius * (sr[2] / rect[2]),
      shadow: true,
      alpha: Math.min(1, amount * 3),
      bright: 1.0,
      layer: 'fg',
    });
  };
  /** Blurs the current shot behind a chapter title card. Call last in the section. */
  const chapterBlur = () => {};

  // ============================== Chapter 1: Read the log ==============================
  const I = R['tk-insights-page'];
  const Dt = R['tk-damage-table'];
  const Ht = R['tk-healing-table'];
  const L = R['el-player'];
  const K = R['tk-players'];
  const S = R['tk-scribing'];
  const icon = K.icons.find((i) => i.skill === 'Leashing Soul');
  const inPanel = (rows, p) =>
    rows.filter((r) => r[1] >= p[1] - 1 && r[1] + r[3] <= p[1] + p[3] + 1);
  /** A page rect in a shot's local uv (x0, y0, x1, y1), for holes. */
  const holeUv = (card, r) => {
    const v = card.view;
    const x0 = v.cx - v.vw / 2;
    const y0 = v.cy - v.vh / 2;
    return [
      (r[0] - x0) / v.vw,
      (r[1] - y0) / v.vh,
      (r[0] + r[2] - x0) / v.vw,
      (r[1] + r[3] - y0) / v.vh,
    ];
  };
  /** A page region of a shot redrawn brighter, revealed by a left-to-right wipe (0..1). */
  const brighten = (card, rect, k, radius = 8) => {
    if (k <= 0.001) return;
    const sr = pageToScreen(card, rect);
    const { dpr } = pageSize(R, card.tex);
    add({
      tex: card.tex,
      uv: rect.map((v) => v * dpr),
      x: sr[0] + sr[2] / 2,
      y: sr[1] + sr[3] / 2,
      w: sr[2],
      h: sr[3],
      radius: radius * (sr[2] / rect[2]),
      shadow: false,
      alpha: card.alpha ?? 1,
      bright: 1.05,
      clip: [-1, -1, k, 2],
      layer: 'fg',
    });
  };
  /** A detail cut: the new shot dissolves in over 200 ms and settles from 1.03x. */
  const cutIn = (at) => ({
    alpha: ease.outCubic(range(t, at, at + 0.2)),
    zoom: 1 / mix(1.03, 1, EASE.camera(range(t, at, at + 0.7))),
  });

  // --- Open: an editorial headline, then the ESO Logs page arrives in depth ---------------------
  if (t < T.headOut + 0.4) {
    out.overlays.push((ctx) => {
      const lines = [
        ['This is a vet hard mode', N.intro - 0.05],
        ['Tideborn Taleria kill,', C.tideborn - 0.05],
        ['uploaded to ESO Logs.', C.uploaded - 0.05],
      ];
      const exit = EASE.exit(range(t, T.headOut, T.headOut + 0.2));
      ctx.save();
      ctx.font = `600 64px ${UI.FONT.display}`;
      ctx.letterSpacing = '-1.28px';
      ctx.fillStyle = '#ffffff';
      lines.forEach(([text, at], i) => {
        const k = EASE.enter(range(t, at, at + 0.32));
        ctx.globalAlpha = 0.92 * k * (1 - exit);
        ctx.fillText(text, 160 - exit * 24, 400 + i * 70 + (1 - k) * 16);
      });
      ctx.restore();
    });
  }
  if (t >= T.pageIn && t < T.insIn + 0.6) {
    const arrive = EASE.camera(range(t, T.pageIn, T.pageIn + 2.4));
    const recede = EASE.camera(range(t, N.paste - 0.1, N.paste + 0.3));
    const leave = EASE.exit(range(t, T.insIn, T.insIn + 0.48));
    const el = shot('el-damage', V.elDmg);
    const s = mix(0.5, 1, arrive) * (1 - 0.06 * recede);
    Object.assign(el, {
      x: mix(W - W * 0.25 - 80, W / 2, arrive) - leave * W * 0.08,
      y: H / 2,
      w: W * s,
      h: H * s,
      z: mix(-600, 0, arrive),
      rotY: deg(-14) * (1 - arrive),
      radius: 20 * (1 - arrive),
      shadow: arrive < 0.99,
      alpha: ease.outCubic(range(t, T.pageIn, T.pageIn + 0.6)) * (1 - leave),
      bright: 0.93 * (1 - 0.3 * recede),
    });
    add(el);
    tag('ESO Logs', 'esologs', up(t, T.pageIn + 2.2, 0.4) * down(t, N.paste - 0.2, 0.3));
  }

  // --- Paste: an address bar; the domain is selected and retyped, then Enter --------------------
  if (t >= N.paste - 0.2 && t < T.enter + 0.7) {
    const from = 'esologs.com/reports';
    const to = 'esotk.com/report';
    const code = '/F4f2bMwWtgVKxjB9';
    const typed = Math.max(0, Math.min(to.length, Math.floor((t - T.typeStart) / 0.055)));
    const typing = t >= T.typeStart;
    const text = typing ? to.slice(0, typed) + code : from + code;
    const appear = EASE.enter(range(t, N.paste - 0.1, N.paste + 0.22));
    const lift = EASE.camera(range(t, T.enter + 0.15, T.enter + 0.67));
    const box = lerpRect([600, 508, 720, 64], [80, 44, 360, 32], lift);
    const idle = typed >= to.length;
    out.overlays.push((ctx) =>
      UI.omnibox(ctx, {
        x: box[0],
        y: box[1] + (1 - appear) * 12,
        w: box[2],
        h: box[3],
        alpha: appear * (1 - lift),
        text,
        sel: [0, from.length],
        selAmt: typing ? 0 : ease.outCubic(range(t, T.select, T.select + 0.16)),
        caret: typing ? typed : -1,
        caretOn: typing && (!idle || Math.floor((t - T.typeStart) / 0.53) % 2 === 0),
        flash: bell(t, T.enter, T.enter + 0.04, T.enter + 0.16),
      }),
    );
  }

  // --- Insights: the page arrives, then detail cuts on each named item ------------------------
  if (t >= T.insIn && t < T.tables + 0.4) {
    const arrive = EASE.page(range(t, T.insIn, T.insIn + 0.56));
    // Overview: the whole page, framed on its container, with a slow 3% push.
    if (t < T.abilities + 0.25) {
      const push = range(t, T.insIn, T.abilities);
      const v = { ...V.insOverview, vw: V.insOverview.vw * mix(1, 0.97, push) };
      add(
        shot(
          'tk-insights-page',
          { ...v, vw: v.vw / mix(1.04, 1, arrive) },
          {
            offset: [(1 - arrive) * W * 0.06, 0],
            alpha: ease.outCubic(range(t, T.insIn, T.insIn + 0.3)),
          },
        ),
      );
    }
    // Group abilities, then a pan down to the champion points.
    if (t >= T.abilities && t < T.uptimes + 0.25) {
      const cut = cutIn(T.abilities);
      const v = path(
        [
          { t: T.abilities, v: V.insAbilities },
          { t: C.champion - 0.35, v: V.insAbilities },
          { t: C.champion + 0.25, v: V.insChampion, ease: EASE.camera },
        ],
        t,
      );
      const ins = add(
        shot('tk-insights-page', { ...v, vw: v.vw * cut.zoom }, { alpha: cut.alpha }),
      );
      const wipe = (at) => EASE.wipe(range(t, at - 0.05, at + 0.21));
      brighten(ins, I.colossus, wipe(C.colossus));
      brighten(ins, I.barrier, wipe(C.barrier));
      brighten(ins, I.horn, wipe(C.horn));
      I.cpRows.forEach((r, i) => brighten(ins, r, wipe(C.champion + 0.1 + i * 0.2)));
    }
    // Buff and debuff uptimes, bars growing in; then a pan down to where the damage came from.
    if (t >= T.uptimes && t < T.tables + 0.4) {
      const cut = cutIn(T.uptimes);
      const v = path(
        [
          { t: T.uptimes, v: V.insUptimes },
          { t: T.damage, v: V.insUptimes },
          { t: T.damage + 0.6, v: V.insDamage, ease: EASE.camera },
          { t: T.pullOut, v: V.insDamage },
          { t: T.pullOut + 0.5, v: V.insWide, ease: EASE.camera },
        ],
        t,
      );
      const out1 = EASE.exit(range(t, T.tables, T.tables + 0.36));
      const ins = shot(
        'tk-insights-page',
        { ...v, vw: (v.vw * cut.zoom) / mix(1, 0.92, out1) },
        { alpha: cut.alpha * (1 - out1) },
      );
      const bars = [
        ...inPanel(I.buffRows, I.buffs).map((r, i) => [r, C.buffs + i * 0.12]),
        ...inPanel(I.debuffRows, I.debuffs).map((r, i) => [r, C.buffs + 0.06 + i * 0.12]),
        ...inPanel(I.typeRows, I.byType).map((r, i) => [r, C.where + 0.15 + i * 0.06]),
      ];
      // Each bar's place is emptied until its bar grows in over it.
      ins.holes = bars.filter(([, at]) => t < at + 0.7).map(([r]) => holeUv(ins, r));
      ins.holeFill = [31, 41, 55];
      ins.holeRadius = 10 * (W / v.vw);
      add(ins);
      for (const [r, at] of bars) {
        const k = EASE.enter(range(t, at, at + 0.7));
        if (k <= 0) continue;
        const sr = pageToScreen(ins, r);
        const { dpr } = pageSize(R, 'tk-insights-page');
        add({
          tex: 'tk-insights-page',
          uv: r.map((x) => x * dpr),
          x: sr[0] + sr[2] / 2,
          y: sr[1] + sr[3] / 2,
          w: sr[2],
          h: sr[3],
          radius: 10 * (sr[2] / r[2]),
          shadow: false,
          alpha: ins.alpha,
          bright: 0.93,
          clip: [-1, -1, k, 2],
          layer: 'fg',
        });
      }
    }
    tag(
      'ESO Toolkit · Insights',
      'esotk',
      up(t, T.insIn + 0.4, 0.4) * down(t, T.tables - 0.4, 0.3),
    );
    out.fx.zoom = [0.5, 0.5, 0.12 * bell(t, T.tables - 0.1, T.tables + 0.12, T.tables + 0.36)];
  }

  // --- Tables: two equal cards and one moving highlight band ---------------------------------
  if (t >= T.tables && t < T.zoomCut + 0.3) {
    const CARD_H = 707;
    const slotL = [120, 130, 816, CARD_H];
    const slotR = [984, 130, 816, CARD_H];
    const big = [W / 2 - (816 * 1.18) / 2, 483.5 - (CARD_H * 1.18) / 2, 816 * 1.18, CARD_H * 1.18];
    const arrive = EASE.page(range(t, T.tables, T.tables + 0.36));
    const toSplit = EASE.page(range(t, C.healing - 0.1, C.healing + 0.46));
    const toBig = EASE.camera(range(t, C.casts - 0.1, C.casts + 0.46));
    const healIn = EASE.page(range(t, C.healing + 0.02, C.healing + 0.58));
    const healOut = EASE.exit(range(t, C.casts - 0.1, C.casts + 0.26));
    const exitK = EASE.exit(range(t, T.zoomCut - 0.24, T.zoomCut));
    const grow = (r, s) => {
      const cx = r[0] + r[2] / 2;
      const cy = r[1] + r[3] / 2;
      return [cx - (r[2] * s) / 2, cy - (r[3] * s) / 2, r[2] * s, r[3] * s];
    };
    let dRect = lerpRect(lerpRect(big, slotL, toSplit), big, toBig);
    dRect = grow(dRect, mix(1.06, 1, arrive) * mix(1, 1.1, exitK));
    const hRect = [slotR[0] + (1 - healIn) * 120 + healOut * 160, slotR[1], slotR[2], slotR[3]];
    const tableCard = (tex, table, rect, alpha) => {
      const { dpr } = pageSize(R, tex);
      const card = {
        tex,
        uv: [table.table[0], table.table[1], 816, CARD_H].map((v) => v * dpr),
        x: rect[0] + rect[2] / 2,
        y: rect[1] + rect[3] / 2,
        w: rect[2],
        h: rect[3],
        radius: 16 * (rect[2] / 816),
        shadow: true,
        fadeBottom: 60 * (rect[2] / 816),
        alpha,
        layer: 'fg',
      };
      add(card);
      return card;
    };
    const dAlpha = ease.outCubic(range(t, T.tables, T.tables + 0.3)) * (1 - exitK);
    const hAlpha = healIn * (1 - healOut);
    tableCard('tk-damage-table', Dt, dRect, dAlpha);
    if (hAlpha > 0.002) tableCard('tk-healing-table', Ht, hRect, hAlpha);
    // Page px -> screen for a card showing `table` in `rect`.
    const toCard = (table, rect, r) => {
      const s = rect[2] / 816;
      return [
        rect[0] + (r[0] - table.table[0]) * s,
        rect[1] + (r[1] - table.table[1]) * s,
        r[2] * s,
        r[3] * s,
      ];
    };
    // The band: fades in on "died", slides to the resurrects column, then to casts per minute.
    const bandA = up(t, C.died - 0.1, 0.2) * (1 - exitK);
    const toRez = EASE.move(range(t, C.rezzed - 0.1, C.rezzed + 0.14));
    const toCpm = EASE.move(range(t, C.casts + 0.1, C.casts + 0.34));
    const band = (table, rect, alpha, cols) => {
      if (alpha <= 0.002) return;
      const c = cols.reduce((acc, [col, k]) => lerpRect(acc, col, k));
      const r = toCard(table, rect, [c[0] - 6, table.table[1], c[2] + 12, CARD_H]);
      out.overlays.push((ctx) => {
        ctx.save();
        const g = ctx.createLinearGradient(0, r[1], 0, r[1] + r[3]);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.07 * alpha})`);
        g.addColorStop(0.9, `rgba(255, 255, 255, ${0.07 * alpha})`);
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        UI.roundRect(ctx, r[0], r[1], r[2], r[3], 6);
        ctx.fill();
        ctx.restore();
      });
    };
    band(Dt, dRect, bandA * dAlpha, [
      [Dt.columns.deaths, 1],
      [Dt.columns.resurrects, toRez],
      [Dt.columns.cpm, toCpm],
    ]);
    band(Ht, hRect, bandA * hAlpha, [
      [Ht.columns.deaths, 1],
      [Ht.columns.resurrects, toRez],
    ]);
    // Cells with a value pop once (1 -> 1.08 -> 1), top to bottom.
    const pop = (tex, table, rect, alpha, field, at) => {
      const { dpr } = pageSize(R, tex);
      table.rows
        .filter(
          (row) =>
            row[field] && row[field].rect[1] + row[field].rect[3] < table.table[1] + CARD_H - 30,
        )
        .forEach((row, i) => {
          const k = range(t, at + i * 0.035, at + i * 0.035 + 0.32);
          if (k <= 0 || k >= 1 || alpha <= 0.002) return;
          const cr = row[field].rect;
          const sr = toCard(table, rect, cr);
          const s = 1 + 0.08 * Math.sin(Math.PI * k);
          add({
            tex,
            uv: cr.map((v) => v * dpr),
            x: sr[0] + sr[2] / 2,
            y: sr[1] + sr[3] / 2,
            w: sr[2] * s,
            h: sr[3] * s,
            radius: 4,
            shadow: false,
            alpha,
            bright: 1.05,
            z: 1,
            layer: 'fg',
          });
        });
    };
    pop('tk-damage-table', Dt, dRect, dAlpha, 'deaths', C.died);
    pop('tk-healing-table', Ht, hRect, hAlpha, 'deaths', C.died + 0.02);
    pop('tk-damage-table', Dt, dRect, dAlpha, 'resurrects', C.rezzed);
    pop('tk-healing-table', Ht, hRect, hAlpha, 'resurrects', C.rezzed + 0.02);
    // Card labels.
    out.overlays.push((ctx) => {
      UI.sourceLabel(ctx, { x: dRect[0], y: dRect[1] - 18, text: 'Damage Done', alpha: dAlpha });
      UI.sourceLabel(ctx, { x: hRect[0], y: hRect[1] - 18, text: 'Healing Done', alpha: hAlpha });
    });
    out.fx.zoom = [0.5, 0.5, 0.12 * bell(t, T.zoomCut - 0.24, T.zoomCut, T.zoomCut + 0.3)];
  }

  // --- Gear: ESO Logs' rows, counted; then names and skill entries fly into the player card ------
  const OUTER = [551, 20, 401, 592]; // The player card's own frame (with its padding and corners).
  const heroK = 806 / OUTER[3];
  const heroCentre = [W / 2, 492];
  const groupCentre = [768, 492];
  const toGroup = EASE.camera(range(t, C.checks - 0.3, C.checks + 0.3));
  const settleBack = EASE.spring(range(t, T.settle, T.settle + 0.6));
  const heroCx = mix(heroCentre[0], groupCentre[0], toGroup);
  const heroRect = [
    heroCx - (OUTER[2] * heroK) / 2,
    heroCentre[1] - (OUTER[3] * heroK) / 2,
    OUTER[2] * heroK,
    OUTER[3] * heroK,
  ];
  const toHero = (r, rect = heroRect) => {
    const k = rect[2] / OUTER[2];
    return [rect[0] + (r[0] - OUTER[0]) * k, rect[1] + (r[1] - OUTER[1]) * k, r[2] * k, r[3] * k];
  };
  const elGear = shot('el-player', V.elGear);
  const gearRows = L.gear.map((g, i) => ({ ...g, i }));
  const SET_ORDER = ['Archdruid Devyric', 'Perfected Pearlescent Ward', 'Turning Tide'];
  const nameOrder = [...gearRows].sort(
    (a, b) => SET_ORDER.indexOf(a.set) - SET_ORDER.indexOf(b.set) || a.i - b.i,
  );
  const chipFor = (set) => K.chips.find((c) => c.label.endsWith(set));
  const skillIcons = K.icons
    .filter((i) => !i.skill.startsWith('@'))
    .sort(
      (a, b) => Math.round(a.rect[1] / 25) - Math.round(b.rect[1] / 25) || a.rect[0] - b.rect[0],
    );
  const bars = [...L.bars].sort((a, b) => a.bar - b.bar || a.slot - b.slot);
  const nameFlight = (j) => [C.groups + j * 0.045, 0.52];
  const barFlight = (j) => [C.lays + j * 0.045, 0.48];
  const chipDone = (set) =>
    Math.max(...nameOrder.map((g, j) => (g.set === set ? nameFlight(j)[0] + 0.52 : 0)));

  if (t >= T.zoomCut && t < C.groups + 0.45) {
    const arrive = EASE.page(range(t, T.zoomCut, T.zoomCut + 0.36));
    const recede = EASE.exit(range(t, C.groups - 0.05, C.groups + 0.35));
    const el = shot('el-player', {
      ...V.elGear,
      vw: V.elGear.vw / mix(1.06, 1, arrive) / mix(1, 0.9, recede),
    });
    el.alpha = ease.outCubic(range(t, T.zoomCut, T.zoomCut + 0.24)) * (1 - recede);
    add(el);
    // The count: a ruler grows down the table's left edge, 13 at its foot.
    const grow = EASE.enter(range(t, C.one - 0.05, C.one + 1.05));
    if (grow > 0) {
      const top = pageToScreen(el, gearRows[0].rect);
      const last = pageToScreen(el, gearRows[12].rect);
      const x = top[0] - 22;
      const y0 = top[1];
      const y1 = mix(y0, last[1] + last[3], grow);
      const a = el.alpha;
      out.overlays.push((ctx) => {
        ctx.save();
        ctx.globalAlpha = 0.7 * a;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y0, 2, y1 - y0);
        const n = up(grow, 0.85, 0.15);
        ctx.globalAlpha = 0.92 * a * n;
        ctx.font = `600 28px ${UI.FONT.display}`;
        ctx.textAlign = 'center';
        ctx.fillText('13', x, last[1] + last[3] + 40 + (1 - n) * 8);
        ctx.restore();
      });
    }
    tag('ESO Logs · Gear', 'esologs', up(t, T.zoomCut + 0.3, 0.4) * down(t, C.groups - 0.1, 0.25));
    out.fx.zoom = [
      0.5,
      0.5,
      Math.max(out.fx.zoom[2], 0.12 * (1 - smoothstep(T.zoomCut, T.zoomCut + 0.36, t))),
    ];
  }

  if (t >= C.groups - 0.1 && t < T.dive) {
    // Backdrop: ESO Toolkit's players page, dimmed, with a recess where the card came from.
    const bgV = path(
      [
        { t: T.settle + 0.6, v: V.tkBg },
        { t: C.sTk, v: around(icon.rect, 620) },
        { t: T.dive, v: around(icon.rect, 90), ease: ease.inCubic },
      ],
      t,
    );
    const lit = EASE.camera(range(t, T.settle, T.settle + 0.6));
    const bg = shot('tk-players', bgV, {
      alpha: ease.outCubic(range(t, C.groups - 0.1, C.groups + 0.3)),
    });
    bg.bright = mix(0.4, 0.93, lit);
    bg.holes = [holeUv(bg, OUTER)];
    bg.holeAmt = 1 - lit;
    bg.holeRadius = 14 * (W / bgV.vw);
    add(bg);
    if (lit < 1) focus(1 - lit, [], { blur: 0.8, dim: 0 });

    // The card, lifted: its own frame, 806 px tall, centred; later it makes room for the checks,
    // then settles back into its place on the page.
    const heroIn = EASE.enter(range(t, C.groups - 0.1, C.groups + 0.3));
    const back = lerpRect(heroRect, pageToScreen(bg, OUTER), settleBack);
    const { dpr: tkDpr } = pageSize(R, 'tk-players');
    const s = mix(0.96, 1, heroIn);
    // Chips and icons are empty until their rows and skills arrive.
    const holes = [];
    for (const set of SET_ORDER) {
      if (t < chipDone(set) + 0.3) holes.push(chipFor(set).rect);
    }
    bars.forEach((b, j) => {
      if (t < barFlight(j)[0] + barFlight(j)[1]) holes.push(skillIcons[b.bar * 6 + b.slot].rect);
    });
    const heroUv = (r) => [
      (r[0] - OUTER[0]) / OUTER[2],
      (r[1] - OUTER[1]) / OUTER[3],
      (r[0] + r[2] - OUTER[0]) / OUTER[2],
      (r[1] + r[3] - OUTER[1]) / OUTER[3],
    ];
    add({
      tex: 'tk-players',
      uv: OUTER.map((v) => v * tkDpr),
      x: back[0] + back[2] / 2,
      y: back[1] + back[3] / 2,
      w: back[2] * s,
      h: back[3] * s,
      z: 2,
      radius: 14 * (back[2] / OUTER[2]),
      shadow: settleBack < 0.98,
      alpha: heroIn * (settleBack < 1 ? 1 : 0),
      bright: 0.93,
      holes: holes.map(heroUv),
      holeFill: [34, 36, 69],
      holeRadius: 8 * heroK,
      layer: 'fg',
    });

    // Flights: each item's name cell into its set chip, then each skill-bar entry onto its icon.
    const flight = (srcTex, src, dst, [at, dur], layerZ) => {
      const k = range(t, at, at + dur);
      if (k <= 0 || k >= 1) return;
      const e = EASE.flight(k);
      const { dpr } = pageSize(R, srcTex);
      const a = pageToScreen(elGear, src);
      const b = toHero(dst);
      const r = lerpRect(a, b, e);
      add({
        tex: srcTex,
        uv: src.map((v) => v * dpr),
        texB: 'tk-players',
        uvB: dst.map((v) => v * tkDpr),
        mixB: smoothstep(0.35, 0.85, e),
        fit: 'height',
        x: r[0] + r[2] / 2,
        y: r[1] + r[3] / 2,
        z: layerZ + Math.sin(Math.PI * e) * 80,
        w: r[2],
        h: r[3],
        radius: mix(3, Math.min(10, b[3] / 2), e),
        alpha: ease.outCubic(range(k, 0, 0.15)),
        shadow: true,
        bright: 0.98,
        layer: 'fg',
      });
    };
    nameOrder.forEach((g, j) =>
      flight('el-player', [440, g.rect[1], 235, g.rect[3]], chipFor(g.set).rect, nameFlight(j), 10),
    );
    bars.forEach((b, j) =>
      flight(
        'el-player',
        [b.rect[0], b.rect[1], 180, b.rect[3]],
        skillIcons[b.bar * 6 + b.slot].rect,
        barFlight(j),
        10,
      ),
    );
    // Each chip pops once as its last row lands (0.96 -> 1, with a little spring).
    for (const set of SET_ORDER) {
      const done = chipDone(set);
      const k = range(t, done, done + 0.3);
      if (k <= 0 || k >= 1 || settleBack > 0) continue;
      const cr = toHero(chipFor(set).rect);
      const sc = mix(0.96, 1, EASE.spring(k));
      add({
        tex: 'tk-players',
        uv: chipFor(set).rect.map((v) => v * tkDpr),
        x: cr[0] + cr[2] / 2,
        y: cr[1] + cr[3] / 2,
        w: cr[2] * sc,
        h: cr[3] * sc,
        z: 4,
        radius: cr[3] / 2,
        shadow: false,
        bright: 0.93,
        layer: 'fg',
      });
    }
    // "...and flags low-quality gear and enchants."
    const checks = up(t, C.checks - 0.1, 0.3) * down(t, T.settle - 0.3, 0.25);
    if (checks > 0) {
      const wipeK = EASE.wipe(range(t, C.checks, C.checks + 0.26));
      const cr = toHero(K.check);
      if (wipeK > 0)
        add({
          tex: 'tk-players',
          uv: K.check.map((v) => v * tkDpr),
          x: cr[0] + cr[2] / 2,
          y: cr[1] + cr[3] / 2,
          w: cr[2],
          h: cr[3],
          z: 4,
          radius: 10 * heroK,
          shadow: false,
          bright: 1.05,
          clip: [-1, -1, wipeK, 2],
          alpha: checks,
          layer: 'fg',
        });
      const x = heroRect[0] + heroRect[2] + 64;
      out.overlays.push((ctx) => checklist(ctx, x, heroCentre[1] - 78, t, C.checks + 0.1, checks));
    }
    tag('ESO Toolkit · Players', 'esotk', up(t, C.groups + 0.2, 0.4) * down(t, C.sTk, 0.3));
    out.fx.zoom = [0.5, 0.5, Math.max(out.fx.zoom[2], 0.2 * smoothstep(T.dive - 0.4, T.dive, t))];
  }

  // --- Scribing: dive into the icon, surface in its tooltip; rows brighten as they're named --------
  if (t >= T.dive && t < T.whipReplay + 0.3) {
    const v = path(
      [
        { t: T.dive, v: around(S.icon, 90) },
        { t: T.dive + 1.0, v: V.scribe, ease: EASE.camera, centreLag: 0.3 },
        { t: T.whipReplay, v: { ...V.scribe, vw: V.scribe.vw * 0.97 } },
      ],
      t,
    );
    const out1 = EASE.exit(range(t, T.whipReplay, T.whipReplay + 0.24));
    const tip = add(
      shot('tk-scribing', { ...v, vw: v.vw / mix(1, 1.15, out1) }, { alpha: 1 - out1 }),
    );
    out.fx.zoom = [
      0.5,
      0.5,
      Math.max(
        0.2 * (1 - smoothstep(T.dive, T.dive + 0.5, t)),
        0.12 * bell(t, T.whipReplay, T.whipReplay + 0.12, T.whipReplay + 0.3),
      ),
    ];
    const tt = S.tooltip;
    const rows = [
      [[tt[0] + 5, S.focus[1] - 7, tt[2] - 10, S.signature[1] - S.focus[1] - 2], C.focus],
      [[tt[0] + 5, S.signature[1] - 7, tt[2] - 10, S.affix[1] - S.signature[1] - 2], C.signature],
      [[tt[0] + 5, S.affix[1] - 7, tt[2] - 10, tt[1] + tt[3] - S.affix[1] - 2], C.affix],
    ];
    for (const [r, at] of rows) brighten(tip, r, EASE.wipe(range(t, at - 0.05, at + 0.21)), 8);
    focus(
      up(t, T.dive + 0.6, 0.4) * down(t, T.whipReplay - 0.2, 0.2),
      [{ rect: grow(pageToScreen(tip, tt), 10), radius: 16, feather: 60 }],
      { blur: 0.5 },
    );
    tag(
      'ESO Toolkit · Scribing',
      'esotk',
      up(t, T.dive + 0.7, 0.4) * down(t, T.whipReplay - 0.2, 0.2),
    );
  }

  // --- Replay: the flat map tilts back and crossfades into the 3D rebuild ------------------------
  if (t >= T.whipReplay && t < T.intoCard + 0.05) {
    const arrive = EASE.page(range(t, T.whipReplay, T.whipReplay + 0.36));
    const tilt = EASE.camera(range(t, C.tilt, C.tilt + 0.9));
    const xf = range(t, T.xfade, T.xfade + 0.42);
    const push = range(t, T.whipReplay, C.tilt);
    const el = shot(replayTex.el, {
      ...V.elReplay,
      vw: (V.elReplay.vw * mix(1, 0.96, push)) / mix(1.06, 1, arrive),
    });
    el.frame = Math.min(538, Math.max(0, Math.floor((t - (T.whipReplay - 0.2)) * 60)));
    Object.assign(el, {
      rotX: tilt * deg(52),
      z: -tilt * 200,
      alpha: ease.outCubic(range(t, T.whipReplay, T.whipReplay + 0.24)) * (1 - ease.inOutCubic(xf)),
      shadow: tilt > 0.01,
    });
    add(el);
    const pushK = range(t, T.xfade, T.intoCard);
    const tk = shot(
      replayTex.tk,
      { ...V.tkReplay, vw: V.tkReplay.vw * mix(1, 0.93, pushK) },
      whipOut(T.intoCard),
    );
    tk.frame = Math.min(598, Math.max(0, Math.floor((t - T.xfade) * 60)));
    tk.alpha = ease.inOutCubic(xf);
    tk.bright = 0.76;
    if (xf > 0) add(tk);
    out.fx.zoom = [
      0.5,
      0.5,
      0.04 * bell(t, T.xfade, T.xfade + 0.21, T.xfade + 0.42) +
        0.06 * bell(t, T.whipReplay - 0.1, T.whipReplay + 0.1, T.whipReplay + 0.36),
    ];
    out.fx.whip = [-whipBlur(T.intoCard), 0];
    tag('ESO Logs · Replay', 'esologs', up(t, T.whipReplay + 0.3, 0.4) * down(t, C.tilt, 0.3));
    tag('ESO Toolkit · 3D replay', 'esotk', up(t, T.xfade + 0.5, 0.4) * down(t, T.ch2, 0.3));
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
    const synergies = shot('tk-synergies', lerpView(V.outroSynergies, V.outroSynergiesEnd, drift), {
      screen: tkScreen,
    });
    const deaths = shot('tk-deaths-messy', lerpView(V.outroDeaths, V.outroDeathsEnd, drift), {
      screen: tkScreen,
      alpha: toSynergies,
    });
    const tk = toSynergies > 0.5 ? deaths : synergies;
    if (t <= M4.t1) add(el);
    if (split > 0 && t <= M5.t1) {
      if (toSynergies < 1) add(synergies);
      add(deaths);
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
      UI.glassText(ctx, 'Shows what happened.', {
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

  // --- Top scrim under tags and chapter labels -----------------------------------------------------
  {
    const rail = up(t, CHAPTERS[0].t0, 0.5) * down(t, RAIL_END, 0.4);
    const a = Math.max(topScrim, chapterLabel(t) * rail);
    if (a > 0.002)
      out.overlays.unshift((ctx) => {
        ctx.save();
        const g = ctx.createLinearGradient(0, 0, 0, 220);
        g.addColorStop(0, `rgba(0, 0, 0, ${0.65 * a})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, 220);
        ctx.restore();
      });
  }

  // --- Captions -----------------------------------------------------------------------------------
  out.overlays.push((ctx) =>
    UI.captions(ctx, CAPTIONS, t, {
      x: W / 2,
      y: P ? H * 0.8 : 980,
      size: P ? 40 : 34,
      maxWidth: P ? W - 160 : 1200,
      W,
      H,
    }),
  );

  out.cards.sort((a, b) => (a.layer === b.layer ? (a.z ?? 0) - (b.z ?? 0) : 0));
  return out;
}

// ------------------------------------------------------------------------------------------
// Small overlay pieces

function dividerLine(ctx, x, H, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(x), 0, 1, H);
  ctx.restore();
}

function dividerLineH(ctx, y, W, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, Math.round(y), W, 1);
  ctx.restore();
}

/** How much of the chapter label is showing (0..1): 2 s at the start of each chapter. */
function chapterLabel(t) {
  let a = 0;
  for (const c of CHAPTERS) a = Math.max(a, up(t, c.t0, 0.32) * down(t, c.t0 + 2, 0.24));
  return a;
}

/**
 * Chapter progress: a 2 px strip across the top in four segments (the current one fills as it
 * plays; the rest sit at 22%), and the chapter's name for 2 s as it starts.
 */
function chapterRail(ctx, t, W, H, P) {
  const alpha = up(t, CHAPTERS[0].t0, 0.5) * down(t, RAIL_END, 0.4);
  if (alpha <= 0.002) return;
  const active = CHAPTERS.findLastIndex((c) => t >= c.t0);
  const gap = 6;
  const seg = (W - gap * (CHAPTERS.length - 1)) / CHAPTERS.length;
  ctx.save();
  CHAPTERS.forEach((c, i) => {
    const x = i * (seg + gap);
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 0, seg, 2);
    const fill =
      i < active ? 1 : i === active ? range(t, c.t0, CHAPTERS[i + 1]?.t0 ?? RAIL_END) : 0;
    if (fill > 0) {
      ctx.globalAlpha = alpha * (i === active ? 1 : 0.55);
      ctx.fillRect(x, 0, seg * fill, 2);
    }
  });
  const label = chapterLabel(t);
  if (label > 0.002 && active >= 0) {
    const c = CHAPTERS[active];
    const k = EASE.enter(range(t, c.t0, c.t0 + 0.32));
    ctx.globalAlpha = alpha * label;
    ctx.font = `600 28px ${UI.FONT.display}`;
    ctx.letterSpacing = '-0.4px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    const y = (P ? 300 : 92) + (1 - k) * 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    const num = String(active + 1).padStart(2, '0');
    ctx.fillText(num, 80, y);
    const nw = ctx.measureText(`${num}  `).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(c.title, 80 + nw, y);
  }
  ctx.restore();
}

/** What the build check looks at, typeset as a short list that rises in line by line. */
function checklist(ctx, x, y, t, at, alpha) {
  if (alpha <= 0.002) return;
  const items = ['Enchant quality', 'Gear quality', 'CP 160 gear', 'Key buffs'];
  ctx.save();
  ctx.font = `500 26px ${UI.FONT.body}`;
  items.forEach((item, i) => {
    const k = EASE.enter(range(t, at + i * 0.12, at + i * 0.12 + 0.4));
    if (k <= 0) return;
    const iy = y + i * 52 + (1 - k) * 24;
    ctx.globalAlpha = alpha * k;
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, iy - 8);
    ctx.lineTo(x + 6, iy - 2);
    ctx.lineTo(x + 17, iy - 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(item, x + 34, iy);
  });
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
