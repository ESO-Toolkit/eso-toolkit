// Composition audit: evaluates the director at a steady rate and reports, for each moment, the
// subject's screen bounds (lit focus rects plus foreground cards) and how far its centre sits from
// the frame's centre, flagging anything off by more than a tolerance or crowding the safe margins.
//
//   node scripts/audit.mjs [from,to] [--all]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CAP = path.join(ROOT, 'out', 'captures');
globalThis.OffscreenCanvas ??= undefined;
const { frame, TIMELINE } = await import('../engine/director.js');

// Layout rects and texture sizes, as main.js assembles them.
const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const jpgSize = (file) => {
  const b = readFileSync(file);
  for (let i = 2; i < b.length;) {
    const len = b.readUInt16BE(i + 2);
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return [1920, 1080];
};
const R = { size: {} };
for (const f of readdirSync(CAP)) {
  if (f.endsWith('.json')) R[f.slice(0, -5)] = JSON.parse(readFileSync(path.join(CAP, f), 'utf8'));
  if (f.endsWith('.png')) R.size[f.slice(0, -4)] = pngSize(path.join(CAP, f));
}
for (const d of readdirSync(CAP, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const first = path.join(CAP, d.name, 'f0000.jpg');
  if (existsSync(first)) R.size[d.name] = jpgSize(first);
}

const W = 1920;
const H = 1080;
const args = process.argv.slice(2);
const [from, to] = (args.find((a) => a.includes(',')) ?? `0,${TIMELINE.duration}`)
  .split(',')
  .map(Number);
const all = args.includes('--all');
const TOL = 12;
const SAFE = 64;

const union = (rs) => {
  const x0 = Math.min(...rs.map((r) => r[0]));
  const y0 = Math.min(...rs.map((r) => r[1]));
  const x1 = Math.max(...rs.map((r) => r[0] + r[2]));
  const y1 = Math.max(...rs.map((r) => r[1] + r[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};
let last = '';
for (let t = from; t <= to; t += 0.25) {
  const out = frame(t, W, H, null, R);
  const lit = out.fx.emph && out.fx.emph.amount > 0.5 ? out.fx.emph.lit.map((f) => f.rect) : [];
  const fg = out.cards
    .filter((c) => c.layer === 'fg' && (c.alpha ?? 1) > 0.5 && c.w > 250 && c.h > 150)
    .map((c) => [c.x - c.w / 2, c.y - c.h / 2, c.w, c.h]);
  const subject = [...lit, ...fg];
  if (!subject.length) continue;
  const u = union(subject);
  const dx = Math.round(u[0] + u[2] / 2 - W / 2);
  const dy = Math.round(u[1] + u[3] / 2 - 460);
  const crowd = [];
  if (u[0] < SAFE) crowd.push('L');
  if (u[0] + u[2] > W - SAFE) crowd.push('R');
  if (u[1] < SAFE) crowd.push('T');
  if (u[1] + u[3] > H - SAFE) crowd.push('B');
  const bad = Math.abs(dx) > TOL || crowd.length;
  const line = `${t.toFixed(2).padStart(6)}s  subject ${u.map(Math.round).join(',').padEnd(22)} dx ${String(dx).padStart(4)} dy ${String(dy).padStart(4)} ${lit.length ? `lit ${lit.length}` : ''}${fg.length ? ` cards ${fg.length}` : ''} ${crowd.length ? `crowds ${crowd.join('')}` : ''}`;
  const key = `${dx}|${dy}|${crowd.join('')}|${lit.length}|${fg.length}`;
  if ((all || bad) && key !== last) console.log(`${bad ? '!' : ' '} ${line}`);
  last = key;
}
