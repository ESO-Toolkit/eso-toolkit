// World particle formations for the open and the end card. Every particle stands in for one
// combat event. Each formation is a target layout for all of them, sampled deterministically.
//
// Per particle a formation stores position + alpha (vec4) and extra (vec3): arrival order
// during a morph, accent amount, and a spin flag (unused here, kept for the shader layout).

import { gaussian, rng } from './math.js';

export const COUNT = 72000;

const TAU = Math.PI * 2;

export const LAYOUT = {
  // The mark faces the camera, which sits on the +z axis for the end card.
  logo: { center: [0, 1.15, 0], size: 5.6 },
};

function makeFormation() {
  return { pos: new Float32Array(COUNT * 4), extra: new Float32Array(COUNT * 3) };
}

function write(f, i, x, y, z, alpha, order, accent) {
  f.pos.set([x, y, z, alpha], i * 4);
  f.extra.set([order, accent, 0], i * 3);
}

async function logoPoints(size) {
  const svg = await (await fetch('./assets/esotk-logo.svg')).text();
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const paths = [...doc.querySelectorAll('path')].map((p) => new Path2D(p.getAttribute('d')));
  const res = 900;
  const canvas = new OffscreenCanvas(res, res);
  const ctx = canvas.getContext('2d');
  ctx.scale(res / 473.72, res / 473.72);
  ctx.fillStyle = '#fff';
  paths.forEach((p) => ctx.fill(p));
  const data = ctx.getImageData(0, 0, res, res).data;
  const pts = [];
  for (let y = 0; y < res; y += 2) {
    for (let x = 0; x < res; x += 2) {
      if (data[(y * res + x) * 4 + 3] > 110) {
        const px = ((x - res / 2) * size) / res;
        const py = ((res / 2 - y) * size) / res;
        pts.push([px, py, Math.min(1, Math.hypot(px, py) / (size * 0.55))]);
      }
    }
  }
  return pts;
}

export async function buildFormations() {
  const F = {};

  // The spark before the first event, and the point the end card collapses into.
  let r = rng(7);
  F.seed = makeFormation();
  for (let i = 0; i < COUNT; i++) {
    write(F.seed, i, gaussian(r) * 0.03, gaussian(r) * 0.03, gaussian(r) * 0.03, 0.02, r(), 0);
  }

  // A stream of events. The shader bends it and keeps it flowing.
  r = rng(13);
  F.river = makeFormation();
  for (let i = 0; i < COUNT; i++) {
    const a = r() * TAU;
    if (r() < 0.9) {
      const rr = Math.abs(gaussian(r)) * 0.55;
      write(
        F.river,
        i,
        r() * 36 - 18,
        Math.cos(a) * rr * 0.8,
        Math.sin(a) * rr,
        0.55 + 0.45 * r(),
        r(),
        r() < 0.08 ? 1 : 0,
      );
    } else {
      const rr = 0.6 + r() * 2.6;
      write(F.river, i, r() * 36 - 18, Math.cos(a) * rr, Math.sin(a) * rr, 0.25 * r(), r(), 0);
    }
  }

  // The ESO Toolkit mark, with a soft halo and a sparse field of distant events.
  r = rng(29);
  F.logo = makeFormation();
  const L = LAYOUT.logo;
  const pts = await logoPoints(L.size);
  for (let i = 0; i < COUNT; i++) {
    const pick = r();
    if (pick < 0.78) {
      const p = pts[Math.floor(r() * pts.length)];
      const j = () => gaussian(r) * 0.008;
      write(
        F.logo,
        i,
        L.center[0] + p[0] + j(),
        L.center[1] + p[1] + j(),
        L.center[2] + j(),
        0.7,
        p[2],
        0,
      );
    } else if (pick < 0.93) {
      const a = r() * TAU;
      const rr = L.size * 0.62 + Math.abs(gaussian(r)) * 0.5;
      write(
        F.logo,
        i,
        L.center[0] + Math.cos(a) * rr,
        L.center[1] + Math.sin(a) * rr,
        gaussian(r) * 0.2,
        0.16,
        1,
        0,
      );
    } else {
      const z = r() * 2 - 1;
      const a = r() * TAU;
      const s = Math.sqrt(1 - z * z);
      const rr = 30 * (1 + gaussian(r) * 0.35);
      write(
        F.logo,
        i,
        Math.cos(a) * s * rr,
        z * rr * 0.6,
        Math.sin(a) * s * rr,
        0.12 * r(),
        r(),
        0,
      );
    }
  }

  return F;
}
