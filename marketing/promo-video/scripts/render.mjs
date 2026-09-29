// Renders the promo frame by frame in headless Chrome (GPU WebGL) and encodes with ffmpeg.
//
//   node scripts/render.mjs                       # 1920x1080 video -> out/esotk-vs-esologs-16x9.mp4
//   node scripts/render.mjs --portrait            # 1080x1920 video -> out/esotk-vs-esologs-9x16.mp4
//   node scripts/render.mjs --stills 0,300,900    # JPEG stills -> out/stills/
//   node scripts/render.mjs --range 480,720       # part of the timeline, for quick review
//
// The page renders a frame, reads the pixels back and POSTs the raw RGBA to this script's
// server, which streams it into ffmpeg. Nothing is sampled from wall-clock time, so every run
// produces identical frames.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
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
const [W, H] = portrait ? [1080, 1920] : [1920, 1080];
const stills = value('stills')?.split(',').map(Number);
const [start, end] = (value('range') ?? `0,${Math.round(timeline.duration * timeline.fps)}`)
  .split(',')
  .map(Number);
const label = portrait ? '9x16' : '16x9';
const outDir = path.join(ROOT, 'out');
const output =
  value('out') ??
  path.join(outDir, value('range') ? `range-${label}.mp4` : `esotk-vs-esologs-${label}.mp4`);
const audio = path.join(outDir, 'soundtrack.wav');

await mkdir(path.join(outDir, 'stills'), { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let onFrame = async () => {};
let finish;
const finished = new Promise((resolve) => (finish = resolve));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/frame') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await onFrame(Number(url.searchParams.get('i')), Buffer.concat(chunks));
    res.end('ok');
    return;
  }
  if (req.method === 'POST' && url.pathname === '/done') {
    res.end('ok');
    finish();
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
  const withAudio = existsSync(audio) && !value('range');
  encoder = spawn(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...rawInput,
      ...(withAudio ? ['-i', audio] : []),
      '-vf',
      'vflip',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-movflags',
      '+faststart',
      ...(withAudio ? ['-c:a', 'aac', '-b:a', '320k', '-shortest'] : []),
      output,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const began = Date.now();
  onFrame = (i, buf) =>
    new Promise((resolve) => {
      if ((i - start) % 120 === 0) {
        const fps = (i - start) / ((Date.now() - began) / 1000 || 1);
        console.log(`frame ${i}/${end} (${fps.toFixed(1)} fps)`);
      }
      if (encoder.stdin.write(buf)) resolve();
      else encoder.stdin.once('drain', resolve);
    });
  if (!withAudio) console.log('no soundtrack found (run npm run soundtrack) - rendering silent');
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--use-angle=d3d11',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
  ],
});
const page = await browser.newPage({
  viewport: { width: Math.min(W, 1920), height: Math.min(H, 1080) },
});
page.on('console', (m) => console.log(`[page] ${m.text()}`));
page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));

const query = new URLSearchParams({
  w: W,
  h: H,
  ...(stills ? { mode: 'stills', frames: stills.join(',') } : { mode: 'video', start, end }),
});
await page.goto(`http://localhost:${port}/engine/index.html?${query}`);
await finished;
await browser.close();
server.close();

if (encoder) {
  encoder.stdin.end();
  await new Promise((resolve) => encoder.on('close', resolve));
  console.log(`wrote ${path.relative(ROOT, output)}`);
}
