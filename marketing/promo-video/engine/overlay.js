// Canvas2D layer for everything that must be crisp: headlines, labels, cards and the logo lockup.

import { clamp, ease, range } from './math.js';

export const FONT = { display: '"Space Grotesk"', body: '"Inter"' };
export const INK = {
  text: '#eef2f8',
  muted: '#9aa7ba',
  faint: '#667389',
  sky: '#38bdf8',
  aqua: '#00e1ff',
  violet: '#a78bfa',
  gold: '#f2c94c',
};

/** Reveal/hide progress for an element shown between `a` and `b` (seconds). */
export function presence(t, a, b, inDur = 0.7, outDur = 0.45) {
  const i = ease.outExpo(range(t, a, a + inDur));
  const o = b === undefined ? 0 : ease.inCubic(range(t, b, b + outDur));
  return { i, o, v: i * (1 - o), visible: t >= a && (b === undefined || t < b + outDur) };
}

/** A headline that rises word by word out of a mask, then lifts away. */
export function headline(
  ctx,
  text,
  {
    t,
    a,
    b,
    x,
    y,
    size,
    align = 'left',
    weight = 600,
    color = INK.text,
    maxWidth = 1e9,
    lineHeight = 1.06,
    stagger = 0.06,
  },
) {
  if (t < a || (b !== undefined && t > b + 0.8)) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT.display}`;
  ctx.textBaseline = 'alphabetic';
  const words = text.split(' ');
  const space = ctx.measureText(' ').width;
  const lines = [[]];
  let lineW = 0;
  for (const w of words) {
    const ww = ctx.measureText(w).width;
    if (lines.at(-1).length && lineW + space + ww > maxWidth) {
      lines.push([]);
      lineW = 0;
    }
    lines.at(-1).push({ w, ww });
    lineW += (lines.at(-1).length > 1 ? space : 0) + ww;
  }
  let index = 0;
  lines.forEach((line, li) => {
    const total = line.reduce((s, w) => s + w.ww, 0) + space * (line.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const ly = y + li * size * lineHeight;
    for (const { w, ww } of line) {
      const pi = ease.outExpo(range(t, a + index * stagger, a + index * stagger + 0.9));
      const po =
        b === undefined ? 0 : ease.inCubic(range(t, b + index * 0.025, b + index * 0.025 + 0.4));
      if (pi > 0 && po < 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - size * 0.1, ly - size * 1.02, ww + size * 0.2, size * 1.34);
        ctx.clip();
        const dy = (1 - pi) * size * 1.05 - po * size * 1.05;
        const blur = (1 - pi) * 10 + po * 8;
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
        ctx.globalAlpha = Math.min(1, pi * 1.4) * (1 - po);
        ctx.fillStyle = color;
        ctx.fillText(w, cx, ly + dy);
        ctx.restore();
      }
      cx += ww + space;
      index++;
    }
  });
  ctx.restore();
}

/** Single-line supporting copy: a soft rise with blur. */
export function line(
  ctx,
  text,
  {
    t,
    a,
    b,
    x,
    y,
    size,
    align = 'left',
    color = INK.muted,
    weight = 400,
    family = FONT.body,
    tracking = 0,
  },
) {
  const p = presence(t, a, b, 0.8, 0.4);
  if (!p.visible || p.v <= 0.001) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (tracking) ctx.letterSpacing = `${tracking}px`;
  ctx.globalAlpha = p.v;
  const blur = (1 - p.i) * 6 + p.o * 4;
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + (1 - p.i) * 14 - p.o * 8);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A label pinned to a projected world point, with a short leader line. */
export function pin(
  ctx,
  { t, a, b, px, py, dx, dy, title, value, color = INK.text, accent = INK.sky, size = 22 },
) {
  const p = presence(t, a, b, 0.6, 0.35);
  if (!p.visible || p.v <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = p.v;
  const ex = px + dx * p.i;
  const ey = py + dy * p.i;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.shadowBlur = 0;
  const alignRight = dx < 0;
  ctx.textAlign = alignRight ? 'right' : 'left';
  const tx = ex + (alignRight ? -10 : 10);
  ctx.font = `600 ${size * 1.25}px ${FONT.display}`;
  ctx.fillStyle = color;
  ctx.fillText(value, tx, ey + size * 0.2);
  ctx.font = `500 ${size * 0.72}px ${FONT.body}`;
  ctx.fillStyle = INK.muted;
  ctx.fillText(title, tx, ey + size * 1.15);
  ctx.restore();
}

/** Glassy rounded panel. */
export function panel(ctx, x, y, w, h, { alpha = 1, tint = INK.sky, radius = 16 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, x, y, w, h, radius);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(22, 30, 50, 0.78)');
  g.addColorStop(1, 'rgba(8, 12, 24, 0.82)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(160, 190, 230, 0.18)';
  ctx.stroke();
  // Lit top edge in the panel's tint.
  const e = ctx.createLinearGradient(x, 0, x + w, 0);
  e.addColorStop(0, 'rgba(0,0,0,0)');
  e.addColorStop(0.5, tint);
  e.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = e;
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillRect(x + radius, y, w - radius * 2, 1.5);
  ctx.restore();
}

/** A pill chip such as a gear set, sliding in from the left. */
export function chip(ctx, text, { t, a, b, x, y, size = 22, tint = INK.sky, count }) {
  const p = presence(t, a, b, 0.7, 0.35);
  if (!p.visible || p.v <= 0.001) return;
  ctx.save();
  ctx.font = `500 ${size}px ${FONT.body}`;
  const w = ctx.measureText(text).width + size * 1.6 + (count ? size * 1.5 : 0);
  const h = size * 1.9;
  const ox = x - (1 - p.i) * 40;
  ctx.globalAlpha = p.v;
  roundRect(ctx, ox, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(14, 22, 40, 0.8)';
  ctx.fill();
  ctx.strokeStyle = tint;
  ctx.globalAlpha = p.v * 0.55;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = p.v;
  let tx = ox + size * 0.8;
  if (count) {
    ctx.font = `700 ${size}px ${FONT.display}`;
    ctx.fillStyle = tint;
    ctx.fillText(count, tx, y + h * 0.66);
    tx += size * 1.5;
    ctx.font = `500 ${size}px ${FONT.body}`;
  }
  ctx.fillStyle = INK.text;
  ctx.fillText(text, tx, y + h * 0.66);
  ctx.restore();
  return w;
}

let logoPaths = null;
export async function loadLogo() {
  const svg = await (await fetch('./assets/esotk-logo.svg')).text();
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const styles = Object.fromEntries(
    [...svg.matchAll(/\.(cls-\d+)\{fill:(#[0-9a-f]+);\}/g)].map((m) => [m[1], m[2]]),
  );
  logoPaths = [...doc.querySelectorAll('path')].map((p) => ({
    path: new Path2D(p.getAttribute('d')),
    fill: styles[p.getAttribute('class')] ?? '#38bdf8',
  }));
}

/** The real ESO Toolkit mark, drawn from its SVG paths. */
export function logo(ctx, cx, cy, size, alpha = 1, glow = 0) {
  if (!logoPaths || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 473.72, size / 473.72);
  if (glow > 0) {
    ctx.shadowColor = INK.sky;
    ctx.shadowBlur = glow * 40;
  }
  for (const p of logoPaths) {
    ctx.fillStyle = p.fill;
    ctx.fill(p.path);
  }
  ctx.restore();
}

export const clampAlpha = (v) => clamp(v, 0, 1);
