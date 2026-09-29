// The film: particle morphs, the camera path, the players and the overlay, all as functions of
// time in seconds.

import TIMELINE from '../timeline.json' with { type: 'json' };
import { DATA } from './data.js';
import { LAYOUT, face, panelCenter, slotRects } from './formations.js';
import { catmull, clamp, ease, mix, project, range, rng, smoothstep, tween } from './math.js';
import * as UI from './overlay.js';

export { TIMELINE };

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------------------------------
// Particle morphs. Before a segment starts, the previous one holds at its end state.

export const SEGMENTS = [
  { from: 'seed', to: 'seed', t0: -1, t1: 0 },
  { from: 'seed', to: 'river', t0: 0.5, t1: 3.1, spread: 0.55, swirl: 1.4, warpTo: 1 },
  { from: 'river', to: 'table', t0: 4.0, t1: 6.3, spread: 0.62, swirl: 2.4, warpFrom: 1 },
  {
    from: 'table',
    to: 'arena',
    t0: 8.35,
    t1: 10.5,
    spread: 0.6,
    swirl: 1.8,
    warpFrom: 3,
    warpTo: 2,
  },
  {
    from: 'arena',
    to: 'rings',
    t0: 14.3,
    t1: 16.4,
    spread: 0.85,
    swirl: 0.4,
    warpFrom: 2,
    warpTo: 2,
  },
  {
    from: 'rings',
    to: 'build',
    t0: 20.2,
    t1: 22.0,
    spread: 0.55,
    swirl: 1.4,
    warpFrom: 2,
    warpTo: 2,
  },
  {
    from: 'build',
    to: 'gauge',
    t0: 26.6,
    t1: 28.5,
    spread: 0.6,
    swirl: 2.2,
    warpFrom: 2,
    warpTo: 0,
  },
  {
    from: 'gauge',
    to: 'logo',
    t0: 32.0,
    t1: 34.0,
    spread: 0.72,
    swirl: 2.4,
    warpFrom: 0,
    warpTo: 0,
  },
];

// Base, accent and secondary accent per formation (sRGB hex).
export const PALETTE = {
  seed: ['#c9ecff', '#a78bfa', '#a78bfa'],
  river: ['#63cdfb', '#b197fc', '#b197fc'],
  table: ['#a4aebe', '#a4aebe', '#a4aebe'],
  arena: ['#35b7f4', '#35b7f4', '#9d7bff'],
  rings: ['#35b7f4', '#9ef4ff', '#9d7bff'],
  build: ['#35b7f4', '#f2c94c', '#9d7bff'],
  gauge: ['#8b8dff', '#8b8dff', '#8b8dff'],
  logo: ['#3ab4ee', '#ffffff', '#ffffff'],
};

// Per-formation brightness and particle size, eased across each morph.
const LOOK = {
  seed: { gain: 1.0, size: 0.05 },
  river: { gain: 0.55, size: 0.045 },
  table: { gain: 0.62, size: 0.026 },
  arena: { gain: 0.5, size: 0.042 },
  rings: { gain: 0.5, size: 0.042 },
  build: { gain: 0.46, size: 0.03 },
  gauge: { gain: 0.5, size: 0.04 },
  logo: { gain: 0.42, size: 0.03 },
};

export function particleState(t) {
  let seg = SEGMENTS[0];
  for (const s of SEGMENTS) if (t >= s.t0) seg = s;
  const morph = range(t, seg.t0, seg.t1);
  const lookA = LOOK[seg.from];
  const lookB = LOOK[seg.to];
  const k = ease.inOutCubic(morph);
  return {
    seg,
    morph,
    spread: seg.spread ?? 0.5,
    swirl: seg.swirl ?? 0,
    warpFrom: seg.warpFrom ?? 0,
    warpTo: seg.warpTo ?? 0,
    gain: mix(lookA.gain, lookB.gain, k),
    size: mix(lookA.size, lookB.size, k),
    // The table tips back to become the arena floor.
    tilt: -deg(82) * ease.inOutCubic(range(t, 8.0, 9.3)),
    spin: LAYOUT.arena.spin * t,
    flow: t * 1.0,
    drift: mix(0.012, 0.03, smoothstep(0, 3, t)),
  };
}

// ------------------------------------------------------------------------------------------
// Camera: an orbit around the arena, as azimuth / radius / height / target / fov / aperture.

const P = panelCenter();
const CAMERA = [
  { t: 0, v: [90, 5.6, 0.0, 0, 0, 0, 40, 0.012] },
  { t: 2.3, v: [76, 11.5, 1.5, 0, 0, 0, 40, 0.008] },
  { t: 4.0, v: [88, 14, 0.7, 0, 0.2, 0, 40, 0.004] },
  { t: 6.0, v: [90, 14.2, 0.35, 0, 0.2, 0, 40, 0.0015] },
  { t: 8.0, v: [90, 13.4, 0.3, 0, 0.2, 0, 40, 0.0015] },
  { t: 9.3, v: [100, 15.5, 7.6, 0, 0, 0, 40, 0.003] },
  { t: 10.9, v: [128, 15.2, 5.4, 0, 0.6, 0, 40, 0.005] },
  { t: 12.5, v: [160, 12.4, 2.4, 0, 1.0, 0, 40, 0.007] },
  { t: 14.2, v: [186, 13.6, 5.6, 0, 0.6, 0, 40, 0.005] },
  { t: 16.0, v: [197, 14.4, 10.6, 0, 0.3, 0, 40, 0.003] },
  { t: 19.7, v: [212, 14.8, 9.6, 0, 0.3, 0, 40, 0.003] },
  { t: 21.7, v: [229, 11.4, 1.3, P[0], 2.45, P[2], 40, 0.004] },
  { t: 26.2, v: [234, 10.6, 1.2, P[0], 2.5, P[2], 40, 0.004] },
  { t: 28.3, v: [250, 18.2, 1.0, 0, 2.85, 0, 40, 0.002] },
  { t: 31.8, v: [255, 17.2, 0.9, 0, 2.85, 0, 40, 0.002] },
  { t: 33.9, v: [270, 12.8, 1.0, 0, 0.8, 0, 40, 0.0025] },
  { t: 40, v: [274, 12.0, 0.9, 0, 0.8, 0, 40, 0.0025] },
];

export function camera(t, width, height) {
  const [az, r, h, tx, ty, tz, fov, aperture] = catmull(CAMERA, t);
  const portrait = height > width;
  // 9:16 pulls back to keep the arena's width in frame, but less for the flat, narrow shots
  // (the table and the gauge) so they fill the phone screen.
  const table = smoothstep(3.6, 5.0, t) * (1 - smoothstep(7.9, 9.0, t));
  const gauge = smoothstep(26.6, 28.2, t) * (1 - smoothstep(31.8, 33.4, t));
  const flat = Math.max(table, gauge);
  const radius = portrait ? r * mix(mix(1.9, 1.62, table), 1.25, gauge) : r;
  const target = [tx, ty, tz];
  const eye = [
    tx + Math.cos(deg(az)) * radius,
    ty + h * (portrait ? 1.6 : 1),
    tz + Math.sin(deg(az)) * radius,
  ];
  const dist = Math.hypot(eye[0] - tx, eye[1] - ty, eye[2] - tz);
  return {
    eye,
    target,
    fov: deg(portrait ? mix(62, 68, flat) : fov),
    focus: dist,
    aperture,
    azimuth: deg(az),
  };
}

// ------------------------------------------------------------------------------------------
// Players: 2 tanks, 2 healers and 8 damage dealers around the boss.

const ROLE_COLOR = { tank: [0.38, 0.65, 0.98], healer: [0.2, 0.83, 0.6], dps: [0.98, 0.57, 0.24] };

const PLAYERS = (() => {
  const r = rng(99);
  const list = [
    { role: 'tank', a: -0.15, rad: 1.9 },
    { role: 'tank', a: 0.3, rad: 2.0 },
    { role: 'healer', a: Math.PI - 0.7, rad: 4.8 },
    { role: 'healer', a: Math.PI + 0.65, rad: 4.6 },
  ];
  for (let k = 0; k < 8; k++)
    list.push({ role: 'dps', a: Math.PI + (k - 3.5) * 0.17, rad: 3.0 + (k % 3) * 0.4 });
  return list.map((p, i) => ({ ...p, phase: r() * TAU, spreadA: Math.PI + (i - 5.5) * 0.42, i }));
})();

function playerLocal(p, t) {
  // One mechanic: everyone but the tanks spreads to the rim, then collapses back.
  const spread =
    p.role === 'tank' ? 0 : smoothstep(10.9, 11.7, t) * (1 - smoothstep(12.6, 13.5, t));
  const a = mix(p.a + 0.12 * Math.sin(t * 0.6 + p.phase), p.spreadA, spread);
  const rad = mix(p.rad + 0.18 * Math.sin(t * 0.9 + p.phase * 2), 6.8, spread);
  return [Math.cos(a) * rad, 0.18, Math.sin(a) * rad];
}

const rotY = (p, a) => [
  Math.cos(a) * p[0] - Math.sin(a) * p[2],
  p[1],
  Math.sin(a) * p[0] + Math.cos(a) * p[2],
];

export function playerPosition(i, t) {
  return rotY(playerLocal(PLAYERS[i], t), LAYOUT.arena.spin * t);
}

export const TRAIL = 110;
export const POINT_COUNT = PLAYERS.length * (TRAIL + 1) + 160;

/** Players (trails and heads) and the boss column as sprites: [x, y, z, r, g, b, a, size]. */
export function points(t, out) {
  const vis =
    smoothstep(9.8, 10.8, t) *
    (1 - 0.82 * smoothstep(20.2, 21.4, t)) *
    (1 - smoothstep(26.3, 27.2, t));
  let n = 0;
  const put = (p, c, a, size) => {
    out.set([p[0], p[1], p[2], c[0], c[1], c[2], a, size], n * 8);
    n++;
  };
  for (const p of PLAYERS) {
    const c = ROLE_COLOR[p.role];
    for (let k = 0; k < TRAIL; k++) {
      const u = k / (TRAIL - 1);
      const tt = t - (1 - u) * 1.8;
      put(playerPosition(p.i, tt), c, vis * u * u * 0.32, 0.085 + u * 0.06);
    }
    put(
      playerPosition(p.i, t),
      c.map((v) => v * 1.2 + 0.25),
      vis * 1.4,
      0.3,
    );
  }
  // Boss: a column of light over the sigil.
  const bossVis = smoothstep(9.6, 10.6, t) * (1 - smoothstep(20.0, 21.2, t));
  for (let k = 0; k < 160; k++) {
    const u = k / 159;
    const y = u * 6.5;
    const flicker = 0.75 + 0.25 * Math.sin(t * 3 + k * 0.7);
    const core = k < 8 ? 2.2 : 1;
    put(
      [0, y, 0],
      [0.62, 0.52, 1.0],
      bossVis * (1 - u) ** 2.2 * 0.5 * flicker * core,
      k < 8 ? 0.8 : 0.14 + (1 - u) * 0.2,
    );
  }
  return n;
}

// ------------------------------------------------------------------------------------------
// Frame-level look: exposure pulses on the musical hits, fades in and out.

export function look(t) {
  let pulse = 0;
  for (const h of TIMELINE.hits) if (t >= h.t) pulse += h.size * 0.45 * Math.exp(-(t - h.t) * 4.5);
  return {
    exposure: 1 + pulse,
    fade:
      ease.outCubic(range(t, 0, 0.6)) *
      (1 - ease.inCubic(range(t, TIMELINE.duration - 0.9, TIMELINE.duration))),
    bloom: 0.9 + pulse * 0.5,
    nebula: 0.55 + 0.45 * smoothstep(8.0, 10.0, t),
    aberration: 0.35 + pulse * 0.6,
  };
}

// ------------------------------------------------------------------------------------------
// Overlay

export function overlay(ctx, t, W, H, viewProj, spin) {
  const portrait = H > W;
  const x0 = portrait ? 72 : 120;
  const top = portrait ? 300 : 150;
  const proj = (p) => project(p, viewProj, W, H);

  // Hook.
  UI.headline(ctx, 'Every pull logs thousands of events.', {
    t,
    a: 0.9,
    b: 3.5,
    x: W / 2,
    y: portrait ? H * 0.7 : H * 0.8,
    size: portrait ? 64 : 62,
    align: 'center',
    maxWidth: portrait ? W - 140 : 1500,
  });

  // The numbers.
  UI.headline(ctx, 'ESO Logs gives you the numbers.', {
    t,
    a: 4.7,
    b: 7.6,
    x: W / 2,
    y: portrait ? top : H - 64,
    size: portrait ? 60 : 50,
    align: 'center',
    maxWidth: portrait ? W - 140 : 1600,
  });

  // The fight.
  UI.headline(ctx, 'ESO Toolkit shows you the fight.', {
    t,
    a: 8.7,
    b: 11.2,
    x: W / 2,
    y: portrait ? top + 20 : 168,
    size: portrait ? 70 : 84,
    align: 'center',
    maxWidth: portrait ? W - 120 : 1700,
  });
  UI.headline(ctx, 'Rewatch any pull in 3D.', {
    t,
    a: 11.5,
    b: 13.6,
    x: x0,
    y: portrait ? H * 0.74 : H - 150,
    size: portrait ? 58 : 60,
  });
  UI.line(
    ctx,
    portrait
      ? 'Orbit, follow any player, draw the plan.'
      : 'Orbit the arena, follow any player and draw the plan on the map.',
    {
      t,
      a: 11.8,
      b: 13.6,
      x: x0,
      y: portrait ? H * 0.74 + 60 : H - 96,
      size: portrait ? 26 : 26,
    },
  );

  // Insights: uptime arcs with labels pinned to where each arc begins.
  UI.headline(ctx, 'See what your group actually ran.', {
    t,
    a: 14.7,
    b: 19.5,
    x: x0,
    y: top,
    size: portrait ? 58 : 60,
    maxWidth: portrait ? W - 140 : 1400,
  });
  UI.line(
    ctx,
    portrait
      ? 'Buff and status uptimes for every pull.'
      : 'Buff, debuff and status uptimes for every pull. Real numbers from a vet HM kill.',
    {
      t,
      a: 15.0,
      b: 19.5,
      x: x0,
      y: top + (portrait ? 128 : 56),
      size: portrait ? 26 : 25,
    },
  );
  DATA.uptimes.forEach((u, k) => {
    const { radii, height, start } = LAYOUT.arcs;
    const a = start + spin + 0.03;
    const anchor = proj([Math.cos(a) * radii[k], height, Math.sin(a) * radii[k]]);
    if (!anchor) return;
    const side = anchor[0] > W / 2 ? 1 : -1;
    // 9:16: labels stack in a column under the arena, one row per ring.
    const target = portrait ? [W * 0.64, H * 0.71 + k * 86] : null;
    UI.pin(ctx, {
      t,
      a: 15.4 + k * 0.28,
      b: 19.4,
      px: anchor[0],
      py: anchor[1],
      dx: portrait ? target[0] - anchor[0] : side * 200 + side * k * 26,
      dy: portrait ? target[1] - anchor[1] : -40 - k * 8,
      value: `${u.value}%`,
      title: u.name,
      accent: k === 3 ? UI.INK.violet : UI.INK.aqua,
      size: portrait ? 24 : 22,
    });
  });

  // Builds: the skill bar in 3D, gear and the scribing read-out in 2D.
  UI.headline(ctx, 'Every build, decoded.', {
    t,
    a: 20.7,
    b: 26.0,
    x: x0,
    y: top,
    size: portrait ? 62 : 64,
  });
  UI.line(
    ctx,
    portrait
      ? 'Gear, skills, CP and scribed scripts, from the log.'
      : 'Gear, skills, champion points and scribed scripts, read straight from the log.',
    {
      t,
      a: 21.0,
      b: 26.0,
      x: x0,
      y: top + (portrait ? 60 : 56),
      size: portrait ? 24 : 25,
    },
  );
  {
    const gy = portrait ? H * 0.6 : H * 0.62;
    UI.line(ctx, `${DATA.build.role} build, extracted from the log`, {
      t,
      a: 21.5,
      b: 26.0,
      x: x0,
      y: gy - 22,
      size: 18,
      color: UI.INK.faint,
      weight: 500,
    });
    DATA.build.gear.forEach((g, k) => {
      const [count, ...name] = g.split(' ');
      UI.chip(ctx, name.join(' '), {
        t,
        a: 21.7 + k * 0.18,
        b: 26.0,
        x: x0,
        y: gy + k * 56,
        size: 21,
        count,
        tint: k === 1 ? UI.INK.violet : UI.INK.sky,
      });
    });
    UI.line(ctx, DATA.build.lines.join(', '), {
      t,
      a: 22.4,
      b: 26.0,
      x: x0,
      y: gy + 3 * 56 + 30,
      size: 19,
      color: UI.INK.muted,
    });
  }
  {
    const rects = slotRects();
    const s = rects.find((r) => r.row === DATA.scribed.row && r.i === DATA.scribed.slot);
    const c = face([s.x + s.size / 2, s.y - s.size / 2, 0], panelCenter(), LAYOUT.panel.theta);
    const anchor = proj(c);
    const p = UI.presence(t, 22.9, 26.0, 0.8, 0.4);
    if (anchor && p.visible) {
      const cw = portrait ? W - 144 : 470;
      const ch = 268;
      const cx = portrait ? x0 : W - 120 - cw;
      const cy = portrait ? H * 0.8 - ch / 2 + 40 : H * 0.6 - 10;
      ctx.save();
      ctx.globalAlpha = p.v;
      ctx.strokeStyle = UI.INK.gold;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = UI.INK.gold;
      ctx.shadowBlur = 12;
      const endX = portrait ? cx + cw * 0.5 : cx;
      const endY = portrait ? cy : cy + 40;
      ctx.beginPath();
      ctx.moveTo(anchor[0], anchor[1]);
      ctx.lineTo(mix(anchor[0], endX, p.i), mix(anchor[1], endY, p.i));
      ctx.stroke();
      ctx.restore();
      UI.panel(ctx, cx, cy + (1 - p.i) * 20, cw, ch, { alpha: p.v, tint: UI.INK.gold });
      const S = DATA.scribing;
      const tx = cx + 26;
      let ty = cy + (1 - p.i) * 20 + 50;
      ctx.save();
      ctx.globalAlpha = p.v;
      ctx.fillStyle = UI.INK.text;
      ctx.font = `600 30px ${UI.FONT.display}`;
      ctx.fillText(S.skill, tx, ty);
      ctx.font = `500 16px ${UI.FONT.body}`;
      ctx.fillStyle = UI.INK.gold;
      ctx.fillText(`Scribed skill, grimoire ${S.grimoire}`, tx, ty + 28);
      ty += 74;
      const rows = [
        ['Focus script', S.focus],
        ['Signature script', S.signature],
        ['Affix script', S.affix],
      ];
      rows.forEach(([k, v], idx) => {
        const rp = UI.presence(t, 23.4 + idx * 0.22, 26.0, 0.5, 0.3);
        const ry = ty + idx * 42 + (idx === 2 ? 22 : 0);
        ctx.globalAlpha = p.v * rp.i;
        ctx.font = `500 17px ${UI.FONT.body}`;
        ctx.fillStyle = UI.INK.muted;
        ctx.fillText(k, tx, ry);
        ctx.font = `600 19px ${UI.FONT.body}`;
        ctx.fillStyle = UI.INK.text;
        ctx.fillText(v, tx + 170, ry);
        if (idx === 1) {
          // Detection confidence, under the signature script.
          const bw = 120;
          const bx = tx + 170;
          const by = ry + 14;
          ctx.fillStyle = 'rgba(242, 201, 76, 0.18)';
          UI.roundRect(ctx, bx, by, bw, 5, 2.5);
          ctx.fill();
          ctx.fillStyle = UI.INK.gold;
          UI.roundRect(
            ctx,
            bx,
            by,
            bw * (S.confidence / 100) * ease.outCubic(range(t, 23.9, 24.8)),
            5,
            2.5,
          );
          ctx.fill();
          ctx.font = `600 14px ${UI.FONT.body}`;
          ctx.fillText(`${S.confidence}% confidence`, bx + bw + 12, by + 6);
        }
      });
      ctx.restore();
    }
  }

  // The math: a crisp gauge drawn over the particle halo.
  UI.headline(ctx, 'Then do the math.', {
    t,
    a: 27.2,
    b: 31.6,
    x: x0,
    y: top,
    size: portrait ? 62 : 64,
  });
  UI.line(
    ctx,
    portrait
      ? 'Penetration, crit, armor and ultimate calculators.'
      : 'Penetration, crit, armor and ultimate calculators, built in.',
    {
      t,
      a: 27.5,
      b: 31.6,
      x: x0,
      y: top + (portrait ? 60 : 56),
      size: portrait ? 24 : 25,
    },
  );
  {
    const G = LAYOUT.gauge;
    const p = UI.presence(t, 27.6, 31.7, 0.9, 0.5);
    const c = proj(G.center);
    const edge = proj(face([G.radius, 0, 0], G.center, G.theta));
    if (p.visible && c && edge) {
      const rpx = Math.hypot(edge[0] - c[0], edge[1] - c[1]);
      const fill = (DATA.penetration.total / G.max) * ease.outCubic(range(t, 27.9, 29.6));
      ctx.save();
      ctx.globalAlpha = p.v;
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(160, 180, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(c[0], c[1], rpx, Math.PI, TAU);
      ctx.stroke();
      const grad = ctx.createLinearGradient(c[0] - rpx, 0, c[0] + rpx, 0);
      grad.addColorStop(0, UI.INK.sky);
      grad.addColorStop(1, UI.INK.violet);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 10;
      ctx.shadowColor = UI.INK.sky;
      ctx.shadowBlur = 24;
      if (fill > 0.001) {
        ctx.beginPath();
        ctx.arc(c[0], c[1], rpx, Math.PI, Math.PI + Math.PI * fill);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Cap marker.
      const capA = Math.PI + Math.PI * (DATA.penetration.cap / G.max);
      ctx.strokeStyle = UI.INK.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c[0] + Math.cos(capA) * (rpx - 26), c[1] + Math.sin(capA) * (rpx - 26));
      ctx.lineTo(c[0] + Math.cos(capA) * (rpx + 30), c[1] + Math.sin(capA) * (rpx + 30));
      ctx.stroke();
      ctx.fillStyle = UI.INK.gold;
      ctx.font = `600 18px ${UI.FONT.body}`;
      ctx.textAlign = 'left';
      ctx.fillText(
        `PvE cap ${DATA.penetration.cap.toLocaleString('en-US')}`,
        c[0] + Math.cos(capA) * (rpx + 40),
        c[1] + Math.sin(capA) * (rpx + 40),
      );
      // Read-out.
      const shown = Math.round(DATA.penetration.total * ease.outCubic(range(t, 27.9, 29.6)));
      ctx.textAlign = 'center';
      ctx.fillStyle = UI.INK.text;
      ctx.font = `600 ${portrait ? 96 : 104}px ${UI.FONT.display}`;
      ctx.fillText(shown.toLocaleString('en-US'), c[0], c[1] - rpx * 0.18);
      ctx.font = `500 22px ${UI.FONT.body}`;
      ctx.fillStyle = UI.INK.muted;
      ctx.fillText('Total penetration', c[0], c[1] - rpx * 0.18 + 42);
      const ok = UI.presence(t, 29.7, 31.7, 0.5, 0.4);
      if (ok.v > 0) {
        ctx.globalAlpha = p.v * ok.v;
        ctx.font = `600 20px ${UI.FONT.body}`;
        const label = 'Optimal';
        const w = ctx.measureText(label).width + 36;
        UI.roundRect(ctx, c[0] - w / 2, c[1] - rpx * 0.18 + 66, w, 38, 19);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.fillText(label, c[0], c[1] - rpx * 0.18 + 92);
      }
      ctx.restore();
    }
  }

  // End card: the crisp mark lands on the particle logo, then the address.
  {
    const L = LAYOUT.logo;
    const c = proj(L.center);
    const e = proj(face([L.size / 2, 0, 0], L.center, L.theta));
    if (c && e && t > 33.3) {
      const size = Math.hypot(e[0] - c[0], e[1] - c[1]) * 2;
      const a = ease.outCubic(range(t, 33.7, 34.6));
      const glow = Math.exp(-Math.max(0, t - 34.0) * 2.2);
      UI.logo(ctx, c[0], c[1], size, a * 0.96, glow);
      const ty = c[1] + size * 0.5 + (portrait ? 150 : 88);
      const p = UI.presence(t, 34.4, undefined, 0.8);
      if (p.v > 0) {
        ctx.save();
        ctx.globalAlpha = p.v;
        ctx.textAlign = 'center';
        ctx.font = `700 ${portrait ? 92 : 84}px ${UI.FONT.display}`;
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
      UI.line(ctx, 'Paste any ESO Logs report.', {
        t,
        a: 34.9,
        x: c[0],
        y: ty + (portrait ? 84 : 62),
        size: portrait ? 36 : 30,
        align: 'center',
        color: UI.INK.text,
        weight: 500,
      });
      UI.line(ctx, 'Free. No ads. Nothing to install.', {
        t,
        a: 35.3,
        x: c[0],
        y: ty + (portrait ? 140 : 106),
        size: portrait ? 30 : 24,
        align: 'center',
      });
      const legal = portrait
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
          a: 35.9,
          x: W / 2,
          y: (portrait ? H * 0.8 : H - 44) + i * 26,
          size: portrait ? 18 : 15,
          align: 'center',
          color: UI.INK.faint,
        }),
      );
    }
  }
}

export const clamp01 = (v) => clamp(v);
export const tweenIn = tween;
