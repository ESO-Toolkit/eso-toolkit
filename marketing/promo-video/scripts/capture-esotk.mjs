// Captures the ESO Toolkit side of the comparison from the live site.
//
//   node scripts/capture-esotk.mjs            # every shot
//   node scripts/capture-esotk.mjs replay     # shots whose name contains "replay"
import { chromium } from 'playwright';
import { DPR, clip, rects, still } from './capture-lib.mjs';

const SITE = 'https://esotk.com';
// Tideborn Taleria veteran hard mode kill: the same fight as the ESO Logs captures.
const FIGHT = `${SITE}/report/F4f2bMwWtgVKxjB9/fight/39`;
// Saint Olms the Just: the same fight as the ESO Logs replay clip. Its boss model is a
// screenshot-based reconstruction (see replayActorModelRegistry.ts provenance notes).
const REPLAY = `${SITE}/report/WQ8L41tVhbFHCca2/fight/6/replay`;

const only = process.argv[2];

const setup = () => {
  try {
    localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({
        preferences: { essential: true, analytics: false, errorTracking: false },
        version: '2',
        timestamp: new Date().toISOString(),
      }),
    );
    // Pin replay quality, show trails and start in cinema mode (transport bar hidden).
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
    // Storage is unavailable on about:blank.
  }
};

const hideChrome = `
  ::-webkit-scrollbar { display: none !important; }
  html { scrollbar-width: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
`;

async function open(page, url, wait) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.addStyleTag({ content: hideChrome }).catch(() => {});
  await page.waitForTimeout(wait);
  const kalpa = page.getByRole('button', { name: 'Dismiss banner' });
  if (await kalpa.isVisible().catch(() => false)) await kalpa.click();
  await page.mouse.move(5, 5);
}

async function replay(page, name, width, height) {
  await open(page, REPLAY, 16000);
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
  );
  // Jump to 0:50, the moment the ESO Logs clip starts from, and play at 2x.
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
  // A tall viewport frames the default camera too tight; "frame all" fits the arena instead.
  if (height > width) await page.keyboard.press('g');
  await page.keyboard.press('Space');
  await page.mouse.move(width - 1, height - 1);
  await page.waitForTimeout(1500);
  // Slow orbit: drag across the canvas while recording.
  const x0 = width * 0.4;
  const y0 = height * 0.57;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await clip(page, name, 10000, async (elapsed) => {
    await page.mouse.move(x0 + elapsed * 0.008, y0 - elapsed * 0.001);
  });
  await page.mouse.up();
}

const shots = {
  home: async (page) => {
    await open(page, `${SITE}/`, 6000);
    await page.waitForTimeout(1000);
    await still(page, 'tk-home');
  },
  insights: async (page) => {
    await open(page, FIGHT, 15000);
    await still(page, 'tk-insights');
  },
  players: async (page) => {
    await open(page, `${FIGHT}/players`, 15000);
    await page.mouse.wheel(0, 520);
    await page.waitForTimeout(2500);
    await still(page, 'tk-players');
    // The tank's card, its set chips, skill icons and build check, in 2x screenshot pixels.
    await rects(
      'tk-players',
      await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        const name = [...document.querySelectorAll('*')].find(
          (e) => e.childElementCount === 0 && e.textContent.trim() === '@Onyx643',
        );
        let card = name;
        while (
          card &&
          !(card.getBoundingClientRect().width > 360 && card.getBoundingClientRect().height > 500)
        )
          card = card.parentElement;
        const inCard = (sel) => [...card.querySelectorAll(sel)];
        const chips = inCard('*')
          .filter(
            (e) =>
              /^\d+ (Turning Tide|Perfected Pearlescent Ward|Archdruid Devyric)$/.test(
                e.textContent.trim(),
              ) && e.childElementCount <= 1,
          )
          .filter((e, i, all) => !all.some((o) => o !== e && e.contains(o)))
          .map((e) => ({ label: e.textContent.trim(), rect: box(e) }));
        const icons = inCard('img[alt]')
          .map((img) => ({ skill: img.getAttribute('alt'), rect: box(img) }))
          .filter((i) => i.rect[2] > 20 && i.rect[2] < 70);
        const check = inCard('*').find(
          (e) => e.childElementCount === 0 && /Build checks out/.test(e.textContent),
        );
        let checkBox = check;
        while (checkBox && checkBox.getBoundingClientRect().width < 300)
          checkBox = checkBox.parentElement;
        const cp = inCard('*').find(
          (e) => e.childElementCount === 0 && e.textContent.trim() === 'Champion Points',
        );
        return {
          card: box(card),
          chips,
          icons,
          check: box(checkBox),
          cpLabel: cp ? box(cp) : null,
        };
      }),
    );
  },
  scribing: async (page) => {
    await open(page, `${FIGHT}/players`, 15000);
    // Scroll so the tooltip opens fully inside the viewport, below the icon.
    await page.mouse.wheel(0, 380);
    await page.waitForTimeout(1500);
    const icon = page.locator('img[alt="Leashing Soul"]').first();
    await icon.hover();
    await page.waitForTimeout(1200);
    await still(page, 'tk-scribing');
    await rects(
      'tk-scribing',
      await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        const tip = document.querySelector('[role=tooltip]');
        const leaf = (re) =>
          [...tip.querySelectorAll('*')].find(
            (e) => e.childElementCount === 0 && re.test(e.textContent.trim()),
          );
        const row = (re) => {
          let el = leaf(re);
          while (
            el &&
            el.parentElement !== tip &&
            el.getBoundingClientRect().width < tip.getBoundingClientRect().width * 0.7
          )
            el = el.parentElement;
          return el ? box(el) : null;
        };
        const icon = document.querySelector('img[alt="Leashing Soul"]');
        return {
          tooltip: box(tip),
          icon: box(icon),
          grimoire: row(/^Grimoire/),
          focus: row(/^FOCUS SCRIPT$/i),
          signature: row(/^SIGNATURE SCRIPT$/i),
          affix: row(/^AFFIX SCRIPTS?$/i),
        };
      }),
    );
  },
  build: async (page) => {
    await open(page, `${FIGHT}/players`, 15000);
    // "Extract build to editor" opens the Build Editor, pre-filled, in a new tab.
    const [editor] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', { name: 'Extract build to editor' }).first().click(),
    ]);
    for (let i = 0; i < 60 && !editor.isClosed() && !editor.url().includes('build-editor'); i++) {
      await page.waitForTimeout(1000);
    }
    await editor.waitForLoadState('domcontentloaded');
    await editor.addStyleTag({ content: hideChrome }).catch(() => {});
    await editor.waitForTimeout(9000);
    await editor.mouse.move(5, 5);
    await still(editor, 'tk-build');
    await rects(
      'tk-build',
      await editor.evaluate(() => {
        // The build name is an editable input ("@Onyx643's Build").
        const title = [...document.querySelectorAll('input, textarea')].find((e) =>
          (e.value || '').startsWith('@Onyx643'),
        );
        let header = title;
        while (header && header.getBoundingClientRect().width < 400) header = header.parentElement;
        const r = header.getBoundingClientRect();
        return { header: [r.x, r.y, r.width, r.height] };
      }),
    );
  },
  calculator: async (page) => {
    await open(page, `${SITE}/calculator`, 7000);
    await still(page, 'tk-calculator');
    await rects(
      'tk-calculator',
      await page.evaluate(() => {
        const label = [...document.querySelectorAll('*')].find(
          (e) => e.childElementCount === 0 && /^total penetration$/i.test(e.textContent.trim()),
        );
        let panel = label;
        while (panel && panel.getBoundingClientRect().width < 600) panel = panel.parentElement;
        const r = panel.getBoundingClientRect();
        return { total: [r.x, r.y, r.width, r.height] };
      }),
    );
  },
  replay: (page) => replay(page, 'tk-replay', 1920, 1080),
  // Portrait viewport, for the 9:16 cut.
  replayTall: (page) => replay(page, 'tk-replay-tall', 1080, 1920),
};

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
for (const [name, run] of Object.entries(shots)) {
  if (only && !name.includes(only)) continue;
  console.log('capturing', name);
  const ctx = await browser.newContext({
    viewport: name === 'replayTall' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
    deviceScaleFactor: name.startsWith('replay') ? 1 : DPR,
    colorScheme: 'dark',
  });
  await ctx.addInitScript(setup);
  const page = await ctx.newPage();
  try {
    await run(page);
  } catch (err) {
    console.error(`  ${name} failed: ${err.message}`);
  }
  await ctx.close();
}
await browser.close();
