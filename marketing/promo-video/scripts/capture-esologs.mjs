// Captures the ESO Logs side of the comparison: the same fights the video shows in ESO Toolkit.
//
// esologs.com puts a human check in front of every page, and this script does not try to get
// past it. Start a browser yourself with remote debugging on, pass the check by hand, then run:
//
//   brave.exe --user-data-dir=out/brave-profile --remote-debugging-port=9334 https://www.esologs.com
//   node scripts/capture-esologs.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DPR, OUT, clip, rects, still } from './capture-lib.mjs';

const REPORT = 'https://www.esologs.com/reports/F4f2bMwWtgVKxjB9?fight=39';
// Saint Olms the Just, the same fight as the ESO Toolkit replay clip.
const REPLAY = 'https://www.esologs.com/reports/WQ8L41tVhbFHCca2?fight=6&view=replay';
const FIGHT_SECONDS = 297;
const SEEK_SECONDS = 50;

const only = process.argv[2];
const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().includes('esologs.com')) ?? (await ctx.newPage());

await page.bringToFront();
const cdp = await ctx.newCDPSession(page);
const scale = (deviceScaleFactor, width = 1920, height = 1080) =>
  cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor,
    mobile: false,
  });

// Playwright's screenshot resets the device scale, so take hi-dpi stills through DevTools.
async function stillHiDpi(name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log(`  saved ${name}.png`);
}

async function open(url, wait = 9000) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
  if (/human/i.test(await page.title()))
    throw new Error('ESO Logs is asking for the human check again');
  await page.mouse.move(1915, 540);
}

async function replay(name, width, height) {
  await scale(1, width, height);
  await open(REPLAY, 12000);
  const bar = await page
    .locator('svg')
    .filter({ has: page.locator('*') })
    .last()
    .boundingBox();
  const timeline =
    bar && bar.width > width * 0.8 ? bar : { x: 1, y: height - 74, width: width - 16, height: 40 };
  await page.getByText('2x', { exact: true }).click();
  await page.mouse.click(
    timeline.x + (timeline.width * SEEK_SECONDS) / FIGHT_SECONDS,
    timeline.y + timeline.height / 2,
  );
  await page.waitForTimeout(800);
  // Play button, bottom-left of the transport bar.
  await page.mouse.click(24, timeline.y + timeline.height + 16);
  await page.waitForTimeout(1200);
  await page.mouse.move(width - 5, 150);
  await clip(page, name, 9000);
}

const shots = {
  damage: async () => {
    await scale(DPR);
    await open(`${REPORT}&type=damage-done`);
    await stillHiDpi('el-damage');
    await rects(
      'el-damage',
      await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        const tab = (label) =>
          [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === label);
        return {
          tabs: Object.fromEntries(
            ['Damage Done', 'Healing', 'Buffs'].map((l) => [l, box(tab(l))]),
          ),
        };
      }),
    );
  },
  player: async () => {
    // One player's summary: both action bars and the gear list.
    await scale(DPR);
    await open(`${REPORT}&source=1`);
    await page.mouse.wheel(0, 560);
    await page.waitForTimeout(1500);
    await page.mouse.move(1915, 540);
    await stillHiDpi('el-player');
    await rects(
      'el-player',
      await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        const tables = [...document.querySelectorAll('table')];
        const gearTable = tables.find(
          (t) => /Trait/.test(t.innerText) && /Enchant/.test(t.innerText),
        );
        const gear = [...gearTable.querySelectorAll('tbody tr')].map((tr) => {
          const cells = [...tr.querySelectorAll('td')].map((td) => td.innerText.trim());
          return { item: cells[3], set: cells[4], rect: box(tr) };
        });
        const barTable = tables.find((t) => /Main Action Bar/.test(t.innerText));
        const bars = [...barTable.querySelectorAll('tbody tr')].flatMap((tr, row) =>
          [...tr.querySelectorAll('td')].map((td, col) => ({
            skill: td.innerText.trim(),
            bar: col,
            slot: row,
            rect: box(td),
          })),
        );
        return { gear, bars, gearTable: box(gearTable), barTable: box(barTable) };
      }),
    );
  },
  replay: () => replay('el-replay', 1920, 1080),
  // Portrait viewport, for the 9:16 cut.
  replayTall: () => replay('el-replay-tall', 1080, 1920),
};

for (const [name, run] of Object.entries(shots)) {
  if (only && !name.includes(only)) continue;
  console.log('capturing', name);
  await run();
}
await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
await browser.close().catch(() => {});
