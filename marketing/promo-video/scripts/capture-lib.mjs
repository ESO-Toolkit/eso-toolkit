// Shared helpers for the capture scripts: stills and constant-rate screencast clips.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const OUT = path.resolve(import.meta.dirname, '..', 'out', 'captures');

/** Device scale for stills: 3x keeps full-screen close-ups sharp at 1080p. */
export const DPR = 3;

/** Saves a viewport screenshot, or a page region (CSS pixels, may extend below the fold). */
let lastPage = null;

export async function still(page, name, clip) {
  lastPage = page;
  await mkdir(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    clip,
    fullPage: Boolean(clip),
    animations: 'disabled',
  });
  console.log(`  saved ${name}.png`);
}

/**
 * Measures page blocks for the camera. Each spec entry is
 * [text pattern, min width, min height, max width = Infinity, min x = 0]: the first visible
 * element whose own text matches (and that starts at or right of min x) is widened to its
 * nearest ancestor of at least that size. Rectangles are CSS pixels relative to `top`.
 */
export function measure(page, spec, top = 0) {
  const plain = Object.fromEntries(
    Object.entries(spec).map(([key, [re, w, h, maxW = 1e9, minX = 0]]) => [
      key,
      [re.source, re.flags, w, h, maxW, minX],
    ]),
  );
  return page.evaluate(
    ({ plain, top }) => {
      const own = (e) =>
        [...e.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join('')
          .trim();
      const out = {};
      for (const [key, [src, flags, minW, minH, maxW, minX]] of Object.entries(plain)) {
        const re = new RegExp(src, flags);
        const fits = (el) => {
          const r = el.getBoundingClientRect();
          return r.width >= minW && r.height >= minH;
        };
        let el = [...document.querySelectorAll('body *')].find((e) => {
          const text = e.childElementCount === 0 ? e.textContent.trim() : own(e);
          if (!text || !re.test(text)) return false;
          const r = e.getBoundingClientRect();
          return (
            r.width > 0 && r.x >= minX && r.x < innerWidth && r.bottom > 0 && r.y < innerHeight
          );
        });
        while (el && !fits(el)) el = el.parentElement;
        const r = el?.getBoundingClientRect();
        out[key] = r && r.width <= maxW ? [r.x, r.y + scrollY - top, r.width, r.height] : null;
      }
      return out;
    },
    { plain, top },
  );
}

/**
 * Records the page with the DevTools screencast for `durationMs`, then resamples the
 * variable-rate frames to a constant 60 fps JPEG sequence in out/captures/<name>/.
 */
export async function clip(page, name, durationMs, onTick) {
  const dir = path.join(OUT, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const size =
    page.viewportSize() ??
    (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: size.width,
    maxHeight: size.height,
  });
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await onTick?.(Date.now() - start);
    await page.waitForTimeout(16);
  }
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  await cdp.detach().catch(() => {});

  const fps = 60;
  const t0 = frames[0].t;
  const total = Math.floor((frames.at(-1).t - t0) * fps);
  let j = 0;
  for (let i = 0; i < total; i++) {
    const t = t0 + i / fps;
    while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    await writeFile(
      path.join(dir, `f${String(i).padStart(4, '0')}.jpg`),
      Buffer.from(frames[j].data, 'base64'),
    );
  }
  const measured = frames.length / (frames.at(-1).t - t0);
  await writeFile(
    path.join(dir, 'meta.json'),
    JSON.stringify({ frames: total, fps, sourceFps: measured }),
  );
  console.log(
    `  ${name}: ${frames.length} source frames (${measured.toFixed(1)} fps) -> ${total} frames`,
  );
}

/** Saves layout rectangles (in CSS pixels) next to a still, for shared-element moves. */
export async function rects(name, data) {
  await mkdir(OUT, { recursive: true });
  if (lastPage && !lastPage.isClosed()) data = await withRadii(lastPage, data);
  await writeFile(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  saved ${name}.json`);
}

/**
 * Adds each measured rect's real corner radius (CSS px), so highlights can match the element's
 * own corners: `key: rect` gains `keyR`, and `key: [rects]` gains `keyR: [radii]`. The radius is
 * the largest top-left radius among elements whose box matches the rect within 2 px (the box, its
 * wrappers and its background layer often differ in which one carries the radius); null when no
 * element matches (a rect assembled from several elements).
 */
async function withRadii(page, data) {
  return page.evaluate((data) => {
    const boxes = [...document.querySelectorAll('body *')].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const raw = cs.borderTopLeftRadius;
      const px = raw.endsWith('%')
        ? (parseFloat(raw) / 100) * Math.min(r.width, r.height)
        : parseFloat(raw) || 0;
      return [r.x, r.y, r.width, r.height, Math.min(px, r.height / 2, r.width / 2)];
    });
    const isRect = (v) =>
      Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number');
    const radius = (rect) => {
      let best = null;
      for (const b of boxes) {
        if (
          Math.abs(b[0] - rect[0]) <= 2 &&
          Math.abs(b[1] - rect[1]) <= 2 &&
          Math.abs(b[2] - rect[2]) <= 2 &&
          Math.abs(b[3] - rect[3]) <= 2
        )
          best = Math.max(best ?? 0, b[4]);
      }
      return best;
    };
    const walk = (o) => {
      if (Array.isArray(o)) return o.map(walk);
      if (!o || typeof o !== 'object') return o;
      const out = {};
      for (const [k, v] of Object.entries(o)) {
        out[k] = walk(v);
        if (isRect(v)) out[`${k}R`] = radius(v);
        else if (Array.isArray(v) && v.length && v.every(isRect)) out[`${k}R`] = v.map(radius);
      }
      return out;
    };
    return walk(data);
  }, data);
}
