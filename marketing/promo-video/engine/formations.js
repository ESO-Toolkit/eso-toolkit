// Particle formations. Every particle is one "event" of the combat log; each formation is a
// target layout for all of them. Layouts are sampled once, deterministically, at start-up.
//
// Per particle a formation stores position + alpha (vec4) and extra (vec3): the order in which
// it arrives during a morph (0 = first), how much of the formation's accent colour it takes, and
// whether it turns with the arena.

import { DATA } from './data.js';
import { gaussian, rng } from './math.js';

export const COUNT = 72000;

const TAU = Math.PI * 2;

// Roles let later formations re-target a subset of particles while the rest hold still.
export const ROLE = {
  free: 0,
  floorLine: 1,
  floorDust: 2,
  sigil: 3,
  runes: 4,
  arc: 5,
  slot: 6,
  gauge: 7,
  logo: 8,
  halo: 9,
};
const SPINS = new Set([ROLE.floorLine, ROLE.floorDust, ROLE.sigil, ROLE.runes, ROLE.arc]);

function makeFormation() {
  return {
    pos: new Float32Array(COUNT * 4),
    extra: new Float32Array(COUNT * 3),
    role: new Uint8Array(COUNT),
  };
}

function clone(f) {
  return { pos: f.pos.slice(), extra: f.extra.slice(), role: f.role.slice() };
}

function write(f, i, p, alpha, order, accent, role) {
  f.pos[i * 4] = p[0];
  f.pos[i * 4 + 1] = p[1];
  f.pos[i * 4 + 2] = p[2];
  f.pos[i * 4 + 3] = alpha;
  f.extra[i * 3] = order;
  f.extra[i * 3 + 1] = accent;
  f.extra[i * 3 + 2] = SPINS.has(role) ? 1 : 0;
  f.role[i] = role;
}

function shuffled(indices, random) {
  const a = indices.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fills the given particle indices from weighted shapes. Each shape's `sample(random, u)`
 * returns [x, y, z, alpha, order, accent]; `u` runs 0..1 across the particles it receives.
 */
function fill(f, indices, shapes, random) {
  const total = shapes.reduce((s, sh) => s + sh.w, 0);
  const counts = shapes.map((sh) => Math.floor((indices.length * sh.w) / total));
  counts[0] += indices.length - counts.reduce((s, c) => s + c, 0);
  const order = shuffled(indices, random);
  let k = 0;
  shapes.forEach((sh, s) => {
    for (let n = 0; n < counts[s]; n++) {
      const [x, y, z, a, o, acc] = sh.sample(random, (n + random()) / counts[s]);
      write(f, order[k++], [x, y, z], a, o, acc, sh.role ?? ROLE.free);
    }
  });
}

const all = Array.from({ length: COUNT }, (_, i) => i);

// ------------------------------------------------------------------------------------------
// Shape samplers

const jitter = (random, s) => gaussian(random) * s;

/** Points on a horizontal circle (floor plane y = h). */
const ring = (r, thick, alpha, role, h = 0, accent = 0) => ({
  w: r,
  role,
  sample: (random, u) => {
    const a = random() * TAU;
    const rr = r + jitter(random, thick);
    return [
      Math.cos(a) * rr,
      h + jitter(random, thick * 0.5),
      Math.sin(a) * rr,
      alpha * (0.6 + 0.4 * random()),
      random(),
      accent,
    ];
  },
});

const segment = (p0, p1, thick, alpha, role, accent = 0) => ({
  w: Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]),
  role,
  sample: (random, u) => {
    const t = random();
    return [
      p0[0] + (p1[0] - p0[0]) * t + jitter(random, thick),
      p0[1] + (p1[1] - p0[1]) * t + jitter(random, thick),
      p0[2] + (p1[2] - p0[2]) * t + jitter(random, thick),
      alpha * (0.6 + 0.4 * random()),
      t,
      accent,
    ];
  },
});

const rect = (x0, y0, x1, y1, z, alpha, role, accent = 0, soft = 0.012) => ({
  w: Math.abs((x1 - x0) * (y1 - y0)),
  role,
  sample: (random) => {
    const u = random();
    return [
      x0 + (x1 - x0) * u + jitter(random, soft),
      y0 + (y1 - y0) * random() + jitter(random, soft),
      z + jitter(random, soft),
      alpha,
      u,
      accent,
    ];
  },
});

const shell = (r, spread, alpha, role) => ({
  w: 1,
  role,
  sample: (random) => {
    const z = random() * 2 - 1;
    const a = random() * TAU;
    const s = Math.sqrt(1 - z * z);
    const rr = r * (1 + jitter(random, spread));
    return [
      Math.cos(a) * s * rr,
      z * rr * 0.6,
      Math.sin(a) * s * rr,
      alpha * random(),
      random(),
      0,
    ];
  },
});

const disc = (r, alpha, role, h = 0) => ({
  w: 1,
  role,
  sample: (random) => {
    const a = random() * TAU;
    const rr = r * Math.sqrt(random());
    return [
      Math.cos(a) * rr,
      h + jitter(random, 0.03),
      Math.sin(a) * rr,
      alpha * random(),
      random(),
      0,
    ];
  },
});

/** Samples a point cloud (e.g. rasterised glyphs) with a little jitter. */
const cloud = (points, weight, alpha, role, accent = 0, soft = 0.012) => ({
  w: weight,
  role,
  sample: (random) => {
    const p = points[Math.floor(random() * points.length)];
    return [
      p[0] + jitter(random, soft),
      p[1] + jitter(random, soft),
      p[2] + jitter(random, soft),
      alpha,
      p[3] ?? random(),
      accent,
    ];
  },
});

// ------------------------------------------------------------------------------------------
// Rasterising text and the logo into point clouds

function rasterPoints(draw, width, height, step = 1) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const data = ctx.getImageData(0, 0, width, height).data;
  const pts = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 110) pts.push([x, y]);
    }
  }
  return pts;
}

/** Text as world-space points, anchored at (x, y) with the given cap height in world units. */
function textPoints(
  text,
  { x, y, z = 0, height, align = 'left', weight = 600, family = 'Space Grotesk' },
) {
  const px = 120;
  const w = Math.ceil(px * 0.72 * text.length) + 40;
  const pts = rasterPoints(
    (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.font = `${weight} ${px}px "${family}"`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 10, px);
    },
    w,
    Math.ceil(px * 1.3),
    2,
  );
  if (!pts.length) return [[x, y, z]];
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const s = height / (px * 0.72);
  const width = (maxX - minX) * s;
  const ox = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  return pts.map((p) => [
    ox + (p[0] - minX) * s,
    y + (px - p[1]) * s,
    z,
    (p[0] - minX) / (maxX - minX || 1),
  ]);
}

async function logoPoints(size) {
  const svg = await (await fetch('./assets/esotk-logo.svg')).text();
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const paths = [...doc.querySelectorAll('path')].map((p) => new Path2D(p.getAttribute('d')));
  const res = 900;
  const pts = rasterPoints(
    (ctx) => {
      ctx.scale(res / 473.72, res / 473.72);
      ctx.fillStyle = '#fff';
      paths.forEach((p) => ctx.fill(p));
    },
    res,
    res,
    2,
  );
  const s = size / res;
  return pts.map((p) => {
    const x = (p[0] - res / 2) * s;
    const y = (res / 2 - p[1]) * s;
    // Arrival order sweeps outward from the centre of the mark.
    return [x, y, 0, Math.min(1, Math.hypot(x, y) / (size * 0.55))];
  });
}

// ------------------------------------------------------------------------------------------
// Layout constants shared with the director (camera framing, overlay labels)

const deg = (d) => (d * Math.PI) / 180;

// The camera orbits the arena in one continuous move, so the skill bar, the gauge and the logo
// are placed facing the direction the camera arrives from (azimuth in the XZ plane).
export const LAYOUT = {
  table: {
    rows: 12,
    rowH: 0.58,
    top: 3.35,
    barX: -3.4,
    barW: 7.9,
    nameX0: -6.0,
    nameX1: -4.0,
    valueX: 6.9,
  },
  arena: { rings: [2.4, 4.0, 5.6, 7.2, 8.8, 10.4], runes: 11.4, spin: 0.035 },
  // Arcs start where the camera looks from mid-scene, so their labels line up in front.
  arcs: {
    radii: [3.3, 4.6, 5.9, 7.2],
    height: 0.25,
    start: deg(204 - 0.035 * 17.5 * (180 / Math.PI)),
  },
  panel: {
    theta: deg(231),
    distance: 3.0,
    height: 3.35,
    slot: 0.92,
    gap: 0.2,
    ultGap: 0.38,
    rowGap: 0.34,
  },
  gauge: { theta: deg(252), center: [0, 1.2, 0], radius: 4.6, max: 20000 },
  logo: { theta: deg(272), center: [0, 1.15, 0], size: 5.6 },
};

/** Maps a point from a plane facing +z to one facing azimuth `theta`, centred on `center`. */
export function face(p, center, theta) {
  const sx = Math.sin(theta);
  const cx = Math.cos(theta);
  return [center[0] + p[0] * sx + p[2] * cx, center[1] + p[1], center[2] - p[0] * cx + p[2] * sx];
}

/** Wraps a shape so its samples are placed with `face`. */
const placed = (shape, center, theta) => ({
  ...shape,
  sample: (random, u) => {
    const [x, y, z, ...rest] = shape.sample(random, u);
    return [...face([x, y, z], center, theta), ...rest];
  },
});

export const panelCenter = () => {
  const P = LAYOUT.panel;
  return [Math.cos(P.theta) * P.distance, P.height, Math.sin(P.theta) * P.distance];
};

/** Top-left corners of the 12 skill slots in panel-local space (front bar row 0, back bar row 1). */
export function slotRects() {
  const { slot, gap, ultGap, rowGap } = LAYOUT.panel;
  const width = 6 * slot + 4 * gap + ultGap;
  const rects = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const x = -width / 2 + i * (slot + gap) + (i === 5 ? ultGap - gap : 0);
      const y = row === 0 ? rowGap / 2 + slot : -rowGap / 2;
      rects.push({ x, y, size: slot, row, i });
    }
  }
  return rects;
}

// ------------------------------------------------------------------------------------------
// Formations

export async function buildFormations() {
  const F = {};
  let r = rng(7);

  // The spark before the first event.
  F.seed = makeFormation();
  fill(
    F.seed,
    all,
    [
      {
        w: 1,
        sample: (random) => [
          jitter(random, 0.03),
          jitter(random, 0.03),
          jitter(random, 0.03),
          0.02,
          random(),
          0,
        ],
      },
    ],
    r,
  );

  // A stream of events. The shader bends it and keeps it flowing.
  F.river = makeFormation();
  fill(
    F.river,
    all,
    [
      {
        w: 0.9,
        sample: (random) => {
          const a = random() * TAU;
          const rr = Math.abs(gaussian(random)) * 0.55;
          return [
            random() * 36 - 18,
            Math.cos(a) * rr * 0.8,
            Math.sin(a) * rr,
            0.55 + 0.45 * random(),
            random(),
            random() < 0.08 ? 1 : 0,
          ];
        },
      },
      {
        w: 0.1,
        sample: (random) => {
          const a = random() * TAU;
          const rr = 0.6 + random() * 2.6;
          return [
            random() * 36 - 18,
            Math.cos(a) * rr,
            Math.sin(a) * rr,
            0.25 * random(),
            random(),
            0,
          ];
        },
      },
    ],
    r,
  );

  // The numbers: a damage table, rows of bars with their values.
  F.table = makeFormation();
  {
    const T = LAYOUT.table;
    const max = DATA.dps[0];
    const shapes = [];
    DATA.dps.forEach((v, i) => {
      const y = T.top - i * T.rowH;
      shapes.push(
        rect(T.barX, y - 0.12, T.barX + (T.barW * v) / max, y + 0.12, 0, 0.9, ROLE.free, 0, 0.01),
      );
      shapes.push(rect(T.nameX0, y - 0.05, T.nameX1 - (i % 3) * 0.35, y + 0.05, 0, 0.4, ROLE.free));
      const rank = textPoints(String(i + 1), {
        x: T.nameX0 - 0.3,
        y: y - 0.16,
        height: 0.32,
        align: 'right',
      });
      shapes.push(cloud(rank, 0.12, 0.8, ROLE.free, 0, 0.004));
      const val = textPoints(`${v.toFixed(1)}k`, {
        x: T.valueX,
        y: y - 0.17,
        height: 0.34,
        align: 'right',
      });
      shapes.push(cloud(val, 0.62, 0.9, ROLE.free, 0, 0.004));
    });
    shapes.push({
      ...segment([-7.2, T.top + 0.45, 0], [7.2, T.top + 0.45, 0], 0.006, 0.25, ROLE.free),
      w: 1.2,
    });
    // A sparse field of distant events around the table.
    const shellShape = shell(26, 0.25, 0.12, ROLE.free);
    shellShape.w = shapes.reduce((s, sh) => s + sh.w, 0) * 0.1;
    shapes.push(shellShape);
    fill(F.table, all, shapes, r);
  }

  // The fight: an arena floor with a boss sigil at its centre.
  F.arena = makeFormation();
  {
    const A = LAYOUT.arena;
    const shapes = [];
    A.rings.forEach((rr, i) => shapes.push(ring(rr, 0.018, i === 0 ? 1 : 0.75, ROLE.floorLine)));
    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * TAU;
      shapes.push(
        segment(
          [Math.cos(a) * A.rings[0], 0, Math.sin(a) * A.rings[0]],
          [Math.cos(a) * A.rings.at(-1), 0, Math.sin(a) * A.rings.at(-1)],
          0.012,
          0.35,
          ROLE.floorLine,
        ),
      );
    }
    // Sigil: a ring, a hexagram and a core.
    shapes.push({ ...ring(1.55, 0.03, 1, ROLE.sigil, 0.01, 2), w: 4 });
    shapes.push({ ...ring(0.55, 0.02, 1, ROLE.sigil, 0.01, 2), w: 1.5 });
    for (let t = 0; t < 2; t++) {
      for (let e = 0; e < 3; e++) {
        const a0 = (e / 3) * TAU + t * (TAU / 6) + Math.PI / 2;
        const a1 = ((e + 1) / 3) * TAU + t * (TAU / 6) + Math.PI / 2;
        shapes.push({
          ...segment(
            [Math.cos(a0) * 1.4, 0.01, Math.sin(a0) * 1.4],
            [Math.cos(a1) * 1.4, 0.01, Math.sin(a1) * 1.4],
            0.012,
            0.9,
            ROLE.sigil,
            2,
          ),
          w: 1.6,
        });
      }
    }
    // Rune ring: short dashes around the rim.
    for (let d = 0; d < 60; d++) {
      const a0 = (d / 60) * TAU;
      const a1 = a0 + (TAU / 60) * (d % 5 === 0 ? 0.8 : 0.4);
      shapes.push({
        w: 0.55,
        role: ROLE.runes,
        sample: (random) => {
          const a = a0 + (a1 - a0) * random();
          const rr = A.runes + jitter(random, 0.03);
          return [Math.cos(a) * rr, jitter(random, 0.02), Math.sin(a) * rr, 0.9, random(), 2];
        },
      });
    }
    const lineWeight = shapes.reduce((s, sh) => s + sh.w, 0);
    shapes.push({ ...disc(11.8, 0.22, ROLE.floorDust), w: lineWeight * 0.45 });
    shapes.push({ ...shell(34, 0.3, 0.1, ROLE.floorDust), w: lineWeight * 0.12 });
    fill(F.arena, all, shapes, r);
  }

  // Insights: buff and status uptimes orbit the boss as arcs. Floor lines and sigil stay put.
  r = rng(11);
  F.rings = clone(F.arena);
  {
    const movable = all.filter((i) => F.rings.role[i] === ROLE.floorDust);
    const { radii, height, start } = LAYOUT.arcs;
    const shapes = DATA.uptimes.flatMap((u, k) => {
      const sweep = (u.value / 100) * TAU * 0.995;
      const arc = {
        w: radii[k] * sweep,
        role: ROLE.arc,
        sample: (random) => {
          const t = random();
          const a = start - t * sweep;
          const rr = radii[k] + jitter(random, 0.035);
          return [
            Math.cos(a) * rr,
            height + jitter(random, 0.02),
            Math.sin(a) * rr,
            1,
            0.08 * k + t * 0.7,
            1,
          ];
        },
      };
      const track = { ...ring(radii[k], 0.01, 0.16, ROLE.arc, height), w: radii[k] * 0.9 };
      return [arc, track];
    });
    shapes.push({ ...disc(11.8, 0.16, ROLE.floorDust), w: 40 });
    fill(F.rings, movable, shapes, r);
  }

  // Builds: the skill bar assembles in front of the arena.
  r = rng(19);
  F.build = clone(F.rings);
  {
    const movable = all.filter(
      (i) => F.build.role[i] === ROLE.arc || F.build.role[i] === ROLE.floorDust,
    );
    // The arena stays, dimmed, so the skill bar reads first.
    for (let i = 0; i < COUNT; i++) F.build.pos[i * 4 + 3] *= 0.45;
    const z = 0;
    const center = panelCenter();
    const theta = LAYOUT.panel.theta;
    const shapes = slotRects().flatMap((s) => {
      const scribed = s.row === DATA.scribed.row && s.i === DATA.scribed.slot;
      const accent = scribed ? 1 : 0;
      const e = 0.011;
      const x0 = s.x;
      const x1 = s.x + s.size;
      const y1 = s.y;
      const y0 = s.y - s.size;
      const edge = (a, b) => segment(a, b, e, 1, ROLE.slot, accent);
      const w = scribed ? 2.2 : 1;
      return [
        { ...edge([x0, y0, z], [x1, y0, z]), w: 1 * w },
        { ...edge([x0, y1, z], [x1, y1, z]), w: 1 * w },
        { ...edge([x0, y0, z], [x0, y1, z]), w: 1 * w },
        { ...edge([x1, y0, z], [x1, y1, z]), w: 1 * w },
        {
          ...rect(x0 + 0.06, y0 + 0.06, x1 - 0.06, y1 - 0.06, z, 0.16, ROLE.slot, accent),
          w: 0.8 * w,
        },
      ].map((sh) => placed(sh, center, theta));
    });
    shapes.push({ ...disc(11.8, 0.1, ROLE.floorDust), w: 8 });
    shapes.push({ ...shell(30, 0.3, 0.12, ROLE.floorDust), w: 3 });
    fill(F.build, movable, shapes, r);
  }

  // The math: a gauge halo. Everything else becomes a sparse field of distant events.
  r = rng(23);
  F.gauge = makeFormation();
  {
    const G = LAYOUT.gauge;
    const c = [0, 0, 0];
    const band = {
      w: 6,
      role: ROLE.gauge,
      sample: (random) => {
        const t = random();
        const a = Math.PI * (1 - t);
        const rr = G.radius + jitter(random, 0.16);
        return [
          c[0] + Math.cos(a) * rr,
          c[1] + Math.sin(a) * rr,
          c[2] + jitter(random, 0.05),
          0.6,
          t,
          0,
        ];
      },
    };
    const ticks = [];
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI * (1 - k / 20);
      const major = k % 5 === 0;
      const r0 = G.radius + 0.55;
      const r1 = r0 + (major ? 0.45 : 0.22);
      ticks.push({
        ...segment(
          [c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0, 0],
          [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1, 0],
          0.012,
          0.9,
          ROLE.gauge,
        ),
        w: major ? 0.12 : 0.06,
      });
    }
    const gaugeShapes = [band, ...ticks].map((sh) => placed(sh, G.center, G.theta));
    fill(
      F.gauge,
      all,
      [
        ...gaugeShapes,
        { ...shell(30, 0.35, 0.14, ROLE.free), w: 2.2 },
        { ...disc(14, 0.1, ROLE.free, -2.5), w: 1.4 },
      ],
      r,
    );
  }

  // The mark: the ESO Toolkit logo, drawn by the particles.
  r = rng(29);
  F.logo = makeFormation();
  {
    const L = LAYOUT.logo;
    const pts = (await logoPoints(L.size)).map((p) => [
      ...face([p[0], p[1], 0], L.center, L.theta),
      p[3],
    ]);
    const halo = placed(
      {
        w: 0.9,
        role: ROLE.halo,
        sample: (random) => {
          const a = random() * TAU;
          const rr = L.size * 0.62 + Math.abs(gaussian(random)) * 0.5;
          return [Math.cos(a) * rr, Math.sin(a) * rr, jitter(random, 0.2), 0.16, 1, 0];
        },
      },
      L.center,
      L.theta,
    );
    fill(
      F.logo,
      all,
      [
        { ...cloud(pts, 4.2, 0.7, ROLE.logo, 0, 0.008) },
        halo,
        { ...shell(30, 0.35, 0.12, ROLE.free), w: 0.9 },
      ],
      r,
    );
  }

  return F;
}
