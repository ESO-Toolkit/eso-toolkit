// Renders the promo frame by frame in headless Chrome (GPU WebGL) and encodes with ffmpeg.
//
//   node scripts/render.mjs                       # 1920x1080 video -> out/esotk-vs-esologs-16x9.mp4
//   node scripts/render.mjs --portrait            # 1080x1920 video -> out/esotk-vs-esologs-9x16.mp4
//   node scripts/render.mjs --stills 0,300,900    # JPEG stills -> out/stills/
//   node scripts/render.mjs --range 480,720       # part of the timeline, for quick review
//   node scripts/render.mjs --scale 2             # 3840x2160 -> out/esotk-vs-esologs-16x9-4k.mp4
//   node scripts/render.mjs --preview             # 960x540 quick check -> ...-16x9-preview.mp4
//                                                   (lighter motion blur, fast encode; combine
//                                                   with --range for one section)
//
// The page renders a frame, reads the pixels back and POSTs the raw RGBA to this script's
// server, which streams it into ffmpeg. Nothing is sampled from wall-clock time, so every run
// produces identical frames.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const timeline = JSON.parse(await readFile(path.join(ROOT, 'timeline.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const portrait = flag('portrait');
// The layout is always 1920x1080 (or 1080x1920); --scale renders it at a multiple of that.
const preview = flag('preview');
const scale = preview ? 0.5 : Number(value('scale') ?? 1);
const [LW, LH] = portrait ? [1080, 1920] : [1920, 1080];
const [W, H] = [LW * scale, LH * scale];
const stills = value('stills')?.split(',').map(Number);
const [start, end] = (value('range') ?? `0,${Math.round(timeline.duration * timeline.fps)}`)
  .split(',')
  .map(Number);
const size = preview ? '-preview' : scale === 2 ? '-4k' : scale !== 1 ? `-x${scale}` : '';
const label = `${portrait ? '9x16' : '16x9'}${size}`;
const outDir = path.join(ROOT, 'out');
const output =
  value('out') ??
  path.join(outDir, value('range') ? `range-${label}.mp4` : `esotk-vs-esologs-${label}.mp4`);
const audio = path.join(outDir, 'soundtrack.wav');
const partial = output.replace(/\.mp4$/, '.partial.mp4');

await mkdir(path.join(outDir, 'stills'), { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let onFrame = async () => {};
// Signals from the page: 'done' when its range is finished, 'lost' if it crashes or drops a frame.
let settle = () => {};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/frame') {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      await onFrame(Number(url.searchParams.get('i')), Buffer.concat(chunks));
      res.end('ok');
    } catch {
      // The page went away mid-upload; the frame is dropped and re-rendered on resume.
      settle('lost');
    }
    return;
  }
  if (req.method === 'POST' && (url.pathname === '/done' || url.pathname === '/lost')) {
    res.end('ok');
    settle(url.pathname.slice(1));
    return;
  }
  const file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const rawInput = [
  '-f',
  'rawvideo',
  '-pix_fmt',
  'rgba',
  '-s',
  `${W}x${H}`,
  '-r',
  String(timeline.fps),
  '-i',
  '-',
];

let encoder;
let next = start;
let previous;
// The fade to black at the end legitimately repeats frames; sample the buffer to spot it.
const black = (buf) => {
  for (let k = 0; k < buf.length; k += 4 * 4099) {
    if (buf[k] > 6 || buf[k + 1] > 6 || buf[k + 2] > 6) return false;
  }
  return true;
};
if (stills) {
  onFrame = (i, buf) =>
    new Promise((resolve, reject) => {
      const file = path.join(outDir, 'stills', `${label}-f${String(i).padStart(4, '0')}.jpg`);
      const p = spawn(ffmpegPath, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        ...rawInput,
        '-vf',
        'vflip',
        '-q:v',
        '2',
        file,
      ]);
      p.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
      );
      p.stdin.end(buf);
      console.log(`still ${i} -> ${path.relative(ROOT, file)}`);
    });
} else {
  // A range gets the matching slice of the soundtrack.
  const withAudio = existsSync(audio);
  encoder = spawn(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...rawInput,
      ...(withAudio ? ['-ss', String(start / timeline.fps), '-i', audio] : []),
      '-vf',
      'vflip',
      '-c:v',
      'libx264',
      '-preset',
      preview ? 'veryfast' : 'slow',
      '-crf',
      preview ? '23' : '18',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      // Fragmented while rendering, so a crash leaves a playable partial file; moved to a
      // normal fast-start MP4 once the render finishes.
      '-movflags',
      '+frag_keyframe+empty_moov+default_base_moof',
      // The 18 kHz cutoff stops the AAC encoder overshooting the mastered true peak.
      ...(withAudio ? ['-c:a', 'aac', '-b:a', '320k', '-cutoff', '18000', '-shortest'] : []),
      partial,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const began = Date.now();
  onFrame = (i, buf) =>
    new Promise((resolve) => {
      if (i !== next || buf.length !== W * H * 4) return resolve();
      // Film grain changes every frame, so a frame identical to the previous one means the page
      // stopped drawing (a lost WebGL context); drop it and reload from here.
      if (previous?.equals(buf) && !black(buf)) {
        console.log(`frame ${i} repeats frame ${i - 1}; reloading the page`);
        settle('lost');
        return resolve();
      }
      previous = buf;
      next++;
      if ((i - start) % 120 === 0) {
        const fps = (i - start) / ((Date.now() - began) / 1000 || 1);
        console.log(`frame ${i}/${end} (${fps.toFixed(1)} fps)`);
      }
      if (encoder.stdin.write(buf)) resolve();
      else encoder.stdin.once('drain', resolve);
    });
  if (!withAudio) console.log('no soundtrack found (run npm run soundtrack) - rendering silent');
}

const launch = () =>
  chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-angle=d3d11',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
      // The page forces garbage collection to free each uploaded frame (see engine/main.js).
      '--js-flags=--expose-gc',
    ],
  });
let browser = await launch();
// Renders run for over an hour; if the page crashes or drops a frame, reopen it and carry on
// from the next frame the encoder is waiting for.
// Give up only after five reloads in a row without progress (long 4K renders can lose the GPU
// a few times, for example when a game is sharing it).
for (let attempt = 0, lastNext = next; ; attempt++) {
  if (next > lastNext) {
    attempt = 0;
    lastNext = next;
  }
  // A GPU crash can take the whole browser down, not just the page: relaunch it.
  if (!browser.isConnected()) browser = await launch();
  const page = await browser
    .newPage({ viewport: { width: Math.min(LW, 1920), height: Math.min(LH, 1080) } })
    .catch(async () => {
      browser = await launch();
      return browser.newPage({
        viewport: { width: Math.min(LW, 1920), height: Math.min(LH, 1080) },
      });
    });
  page.on('console', (m) => console.log(`[page] ${m.text()}`));
  page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
  let lastProgress = Date.now();
  let watchdog;
  const outcome = new Promise((resolve) => {
    settle = resolve;
    page.on('crash', () => resolve('lost'));
    page.on('close', () => resolve('lost'));
    // A lost WebGL context stalls the page without crashing it.
    let seen = next;
    watchdog = setInterval(() => {
      if (stills) return;
      if (next !== seen) {
        seen = next;
        lastProgress = Date.now();
      } else if (Date.now() - lastProgress > 90000) {
        resolve('lost');
      }
    }, 5000);
  });
  const query = new URLSearchParams({
    w: LW,
    h: LH,
    scale,
    ...(preview ? { subframes: 1 } : {}),
    ...(stills
      ? { mode: 'stills', frames: stills.join(',') }
      : { mode: 'video', start: next, end }),
  });
  await page.goto(`http://localhost:${port}/engine/index.html?${query}`);
  const result = await outcome;
  clearInterval(watchdog);
  await page.close().catch(() => {});
  if (result === 'done' || stills) break;
  if (attempt >= 5) throw new Error(`Render failed repeatedly near frame ${next}`);
  console.log(`page lost at frame ${next}; resuming`);
}
await browser.close().catch(() => {});
server.close();

if (encoder) {
  encoder.stdin.end();
  await new Promise((resolve) => encoder.on('close', resolve));
  execFileSync(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    partial,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    output,
  ]);
  await rm(partial);
  console.log(`wrote ${path.relative(ROOT, output)}`);
}
