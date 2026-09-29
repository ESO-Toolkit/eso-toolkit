// Shared helpers for the capture scripts: stills and constant-rate screencast clips.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const OUT = path.resolve(import.meta.dirname, '..', 'out', 'captures');

/** Device scale for stills: 3x keeps full-screen close-ups sharp at 1080p. */
export const DPR = 3;

export async function still(page, name, clip) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip, animations: 'disabled' });
  console.log(`  saved ${name}.png`);
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
  await writeFile(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  saved ${name}.json`);
}
