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
  red: '#f87171',
  green: '#4ade80',
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

/**
 * Registers a Liquid Glass panel (drawn by the compositor, under this layer's type).
 * Coordinates are output pixels.
 */
export function glass(ctx, x, y, w, h, r, alpha = 1) {
  if (alpha > 0.002) ctx.glass?.push({ x, y, w, h, r, alpha });
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

// ------------------------------------------------------------------------------------------
// Explainer furniture: captions, source labels, callouts and the link pill.

/**
 * Word-synced captions. `chunks` are arrays of { text, start, end } in seconds; the spoken word
 * is lit, words already said stay white and words still to come are dim.
 */
export function captions(ctx, chunks, t, { x, y, size, maxWidth }) {
  const i = chunks.findIndex(
    (c, k) =>
      t >= c.start - 0.12 && t < (chunks[k + 1]?.start ?? c.end + 0.5) - 0.02 && t < c.end + 0.5,
  );
  if (i < 0) return;
  const c = chunks[i];
  const fadeIn = ease.outCubic(range(t, c.start - 0.12, c.start + 0.08));
  const fadeOut = 1 - range(t, c.end + 0.3, c.end + 0.5);
  const a = fadeIn * fadeOut;
  if (a <= 0) return;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT.body}`;
  ctx.textBaseline = 'alphabetic';
  const words = c.words.filter((w) => w.text);
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w.text).width);
  const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const scale = Math.min(1, maxWidth / total);
  const padX = size * 0.9;
  const padY = size * 0.55;
  const pw = total * scale + padX * 2;
  const ph = size * scale * 1.2 + padY * 2;
  glass(ctx, x - pw / 2, y - ph / 2, pw, ph, ph / 2, a);
  ctx.translate(x, y + size * scale * 0.36 + (1 - fadeIn) * 8);
  ctx.scale(scale, scale);
  let cx = -total / 2;
  words.forEach((w, k) => {
    const said = t >= w.start;
    const live = t >= w.start && t < w.end + 0.06;
    ctx.globalAlpha = a * (said ? 1 : 0.5);
    ctx.fillStyle = live ? '#7dd3fc' : INK.text;
    ctx.fillText(w.text, cx, 0);
    cx += widths[k] + space;
  });
  ctx.restore();
}

/** A headline whose words rise as they are spoken. */
export function spokenHeadline(ctx, words, t, { x, y, size, end, maxWidth = 1e9 }) {
  if (t < words[0].start - 0.2 || t > end + 0.6) return;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT.display}`;
  const space = ctx.measureText(' ').width;
  const items = words
    .filter((w) => w.text)
    .map((w) => ({ ...w, width: ctx.measureText(w.text).width }));
  const lines = [[]];
  let lw = 0;
  for (const it of items) {
    if (lines.at(-1).length && lw + space + it.width > maxWidth) {
      lines.push([]);
      lw = 0;
    }
    lines.at(-1).push(it);
    lw += (lines.at(-1).length > 1 ? space : 0) + it.width;
  }
  lines.forEach((ln, li) => {
    const total = ln.reduce((s, w) => s + w.width, 0) + space * (ln.length - 1);
    let cx = x - total / 2;
    const ly = y + li * size * 1.1 - ((lines.length - 1) * size * 1.1) / 2;
    for (const w of ln) {
      const pi = ease.outExpo(range(t, w.start - 0.08, w.start + 0.55));
      const po = ease.inCubic(range(t, end, end + 0.45));
      if (pi > 0 && po < 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - size * 0.1, ly - size * 1.02, w.width + size * 0.2, size * 1.34);
        ctx.clip();
        const blur = (1 - pi) * 10 + po * 8;
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
        ctx.globalAlpha = Math.min(1, pi * 1.4) * (1 - po);
        ctx.fillStyle = INK.text;
        ctx.fillText(w.text, cx, ly + (1 - pi) * size * 1.05 - po * size * 1.05);
        ctx.restore();
      }
      cx += w.width + space;
    }
  });
  ctx.restore();
}

/** A glass tag naming what is on screen (which product, which view). */
export function sourceLabel(ctx, { x, y, text, product, alpha, size = 22 }) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT.body}`;
  const h = size * 2;
  const w = ctx.measureText(text).width + h + size * 0.9;
  glass(ctx, x, y - h, w, h, h / 2, alpha);
  ctx.globalAlpha = alpha;
  if (product === 'esotk') {
    logo(ctx, x + h / 2 + 2, y - h / 2, size * 1.25, alpha);
  } else {
    ctx.beginPath();
    ctx.arc(x + h / 2 + 2, y - h / 2, size * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#d7dce5';
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText(text, x + h, y - h / 2 + size * 0.36);
  ctx.restore();
}

/** A centred glass pill with a line of text. */
export function glassText(
  ctx,
  text,
  { x, y, size, alpha, weight = 600, color = INK.text, rise = 0 },
) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT.display}`;
  const w = ctx.measureText(text).width + size * 1.6;
  const h = size * 2.1;
  glass(ctx, x - w / 2, y - h / 2 + rise, w, h, h / 2, alpha);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + size * 0.36 + rise);
  ctx.restore();
}

/** Glowing outline around a screen rectangle. */
export function callout(
  ctx,
  r,
  { alpha, color = INK.sky, pad = 6, radius = 10, width = 2.5, fill = 0 },
) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, r[0] - pad, r[1] - pad, r[2] + pad * 2, r[3] + pad * 2, radius);
  if (fill) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * fill;
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.restore();
}

/** Darkens a screen rectangle (a row lifted out of its table). */
export function dim(ctx, r, alpha) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgb(4, 6, 12)';
  ctx.fillRect(r[0], r[1], r[2], r[3]);
  ctx.restore();
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789./';

/**
 * A link pill whose domain scrambles from one site to the other while the report code stays put.
 * `morph` runs 0..1.
 */
export function linkPill(ctx, { x, y, alpha, morph, from, to, code, size = 34, seed = 1 }) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${size}px ${FONT.body}`;
  const n = Math.max(from.length, to.length);
  let domain = '';
  for (let i = 0; i < n; i++) {
    const local = range(morph, i / n / 1.6, i / n / 1.6 + 0.38);
    if (local <= 0) domain += from[i] ?? '';
    else if (local >= 1) domain += to[i] ?? '';
    else
      domain +=
        GLYPHS[
          Math.floor(
            (Math.sin((i + 1) * 91.7 + seed + Math.floor(local * 9) * 13.1) * 0.5 + 0.5) *
              GLYPHS.length,
          )
        ];
  }
  const dw = ctx.measureText(domain).width;
  const cw = ctx.measureText(code).width;
  const w = dw + cw + size * 2.6;
  const h = size * 2.1;
  const left = x - w / 2;
  glass(ctx, left, y - h / 2, w, h, h / 2, alpha);
  const done = ease.outCubic(range(morph, 0.85, 1));
  if (done > 0) {
    roundRect(ctx, left, y - h / 2, w, h, h / 2);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 * done})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = INK.sky;
    ctx.shadowBlur = 30 * done;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // Link glyph.
  ctx.strokeStyle = INK.muted;
  ctx.lineWidth = 2.4;
  const gx = left + size * 0.95;
  ctx.beginPath();
  ctx.roundRect(gx - size * 0.32, y - size * 0.1, size * 0.4, size * 0.2, size * 0.1);
  ctx.roundRect(gx - size * 0.08, y - size * 0.1, size * 0.4, size * 0.2, size * 0.1);
  ctx.stroke();
  ctx.fillStyle = INK.text;
  ctx.fillText(domain, left + size * 1.6, y + size * 0.36);
  ctx.fillStyle = INK.sky;
  ctx.fillText(code, left + size * 1.6 + dw, y + size * 0.36);
  ctx.restore();
}
