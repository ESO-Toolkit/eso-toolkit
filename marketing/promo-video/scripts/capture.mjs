// Captures real esotk.com footage for the promo video.
//
//   node scripts/capture.mjs            # every shot
//   node scripts/capture.mjs replay     # only shots whose id contains "replay"
//
// Stills are saved at 2x device scale so the video can zoom in without
// softening. The 3D replay is recorded through the Chrome DevTools screencast,
// resampled to a constant 60 fps and encoded to public/captures/replay.mp4 with
// the ffmpeg that ships with Remotion.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://esotk.com';
const REPORT = 'F4f2bMwWtgVKxjB9';
const FIGHT = 39;
// Asylum Sanctorium, Saint Olms the Just: a public leaderboard run whose boss uses a
// screenshot-reconstructed model (see replayActorModelRegistry.ts provenance notes).
const REPLAY_REPORT = 'WQ8L41tVhbFHCca2';
const REPLAY_FIGHT = 6;
const OUT = path.resolve('public/captures');

const filter = process.argv[2];

const consentScript = () => {
  try {
    localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({
        preferences: { essential: true, analytics: false, errorTracking: false },
        version: '2',
        timestamp: new Date().toISOString(),
      }),
    );
    // Pin replay quality (the auto governor downshifts under screencast load), show trails and
    // start in cinema mode so the transport bar stays out of frame.
    localStorage.setItem(
      'replay.prefs.v1',
      JSON.stringify({
        playbackSpeed: 2,
        showNames: true,
        showPlayerPaths: false,
        showTrails: true,
        performanceMode: false,
        qualityPreset: 'high',
        barCollapsed: true,
        statsPanelEnabled: true,
        continuousPlay: false,
        continuousIncludeTrash: true,
      }),
    );
  } catch {
    // Storage can be unavailable on about:blank.
  }
};

const hideChrome = `
  ::-webkit-scrollbar { display: none !important; }
  html { scrollbar-width: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`;

async function settle(page, ms) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
}

async function dismissKalpa(page) {
  const btn = page.getByRole('button', { name: 'Dismiss banner' });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

async function still(page, file, clip) {
  await page.screenshot({ path: path.join(OUT, file), clip, animations: 'disabled' });
  console.log('  saved', file);
}

const shots = [
  {
    id: 'home',
    url: `${SITE}/`,
    run: async (page) => {
      await settle(page, 5000);
      await dismissKalpa(page);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(1500);
      const input = page.getByLabel('ESOLogs.com Log URL');
      await input.click();
      await input.fill(`https://www.esologs.com/reports/${REPORT}`);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(800);
      // The video types this address back in over the input (see TEXT in src/shots.tsx).
      await still(page, 'home-filled.png');
    },
  },
  {
    id: 'report-fights',
    url: `${SITE}/report/${REPORT}`,
    run: async (page) => {
      await settle(page, 9000);
      await still(page, 'report-fights.png');
    },
  },
  {
    id: 'fight-insights',
    url: `${SITE}/report/${REPORT}/fight/${FIGHT}`,
    run: async (page) => {
      await settle(page, 14000);
      await still(page, 'fight-insights.png');
      await page.mouse.wheel(0, 760);
      await page.waitForTimeout(2500);
      await still(page, 'fight-insights-2.png');
    },
  },
  {
    id: 'fight-players',
    url: `${SITE}/report/${REPORT}/fight/${FIGHT}/players`,
    run: async (page) => {
      await settle(page, 14000);
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(2500);
      await still(page, 'fight-players-2.png');
    },
  },
  {
    id: 'fight-scribing',
    url: `${SITE}/report/${REPORT}/fight/${FIGHT}/players`,
    run: async (page) => {
      await settle(page, 14000);
      // A scribed skill whose tooltip shows grimoire, focus, signature and affix detection.
      await page.locator('img[alt="Leashing Soul"]').first().hover();
      await page.waitForTimeout(1200);
      await still(page, 'fight-scribing.png');
    },
  },
  {
    id: 'build-extracted',
    url: `${SITE}/report/${REPORT}/fight/${FIGHT}/players`,
    run: async (page) => {
      await settle(page, 14000);
      // "Extract build to editor" opens the Build Editor, pre-filled, in a new tab.
      const [editor] = await Promise.all([
        page.context().waitForEvent('page'),
        page.getByRole('button', { name: 'Extract build to editor' }).first().click(),
      ]);
      for (let i = 0; i < 60 && !editor.isClosed() && !editor.url().includes('build-editor'); i++) {
        await page.waitForTimeout(1000);
      }
      console.log('  editor', editor.isClosed() ? 'closed' : editor.url().slice(0, 60));
      await editor.waitForLoadState('domcontentloaded');
      await editor.addStyleTag({ content: hideChrome }).catch(() => {});
      await editor.waitForTimeout(9000);
      await editor.mouse.move(5, 5);
      await still(editor, 'build-extracted.png');
      await editor.mouse.wheel(0, 1000);
      await editor.waitForTimeout(2500);
      await still(editor, 'build-extracted-2.png');
    },
  },
  {
    id: 'calculator',
    url: `${SITE}/calculator`,
    run: async (page) => {
      await settle(page, 7000);
      await still(page, 'calculator.png');
    },
  },
  {
    id: 'replay',
    url: `${SITE}/report/${REPLAY_REPORT}/fight/${REPLAY_FIGHT}/replay`,
    scale: 1,
    run: async (page) => {
      await settle(page, 16000);
      await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
      await page.waitForTimeout(2000);
      // The transport bar starts collapsed, so drive playback with the replay's shortcuts.
      await page.evaluate(() =>
        document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
      );
      for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Space');
      await page.mouse.move(1919, 1079);
      await page.waitForTimeout(6000);
      // Slow orbit: left-drag across the canvas while recording.
      await page.mouse.move(760, 620);
      await page.mouse.down();
      await recordScreencast(page, 'replay', 15000, async (elapsed) => {
        await page.mouse.move(760 + elapsed * 0.008, 620 - elapsed * 0.001);
      });
      await page.mouse.up();
    },
  },
];

async function recordScreencast(page, name, durationMs, onTick) {
  const dir = path.join(OUT, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await onTick?.(Date.now() - start);
    await page.waitForTimeout(16);
  }
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);

  // Resample the variable-rate screencast to a constant 60 fps sequence.
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
  console.log(
    `  ${name}: ${frames.length} source frames (${measured.toFixed(1)} fps) -> ${total} frames @60`,
  );

  const mp4 = path.join(OUT, `${name}.mp4`);
  execFileSync(
    'npx',
    [
      'remotion',
      'ffmpeg',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(dir, 'f%04d.jpg'),
      '-c:v',
      'libx264',
      '-crf',
      '14',
      '-preset',
      'slow',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      mp4,
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  await rm(dir, { recursive: true, force: true });
  console.log('  saved', path.basename(mp4));
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
await mkdir(OUT, { recursive: true });

for (const shot of shots) {
  if (filter && !shot.id.includes(filter)) continue;
  console.log('capturing', shot.id);
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: shot.scale ?? 2,
    colorScheme: 'dark',
  });
  await ctx.addInitScript(consentScript);
  const page = await ctx.newPage();
  await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.addStyleTag({ content: hideChrome }).catch(() => {});
  try {
    await shot.run(page);
  } catch (err) {
    console.error(`  ${shot.id} failed:`, err.message);
  }
  await ctx.close();
}
await browser.close();
