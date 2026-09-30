// Captures the ESO Toolkit side of the comparison from the live site.
//
//   node scripts/capture-esotk.mjs            # every shot
//   node scripts/capture-esotk.mjs replay     # shots whose name contains "replay"
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { DPR, OUT, clip, measure, rects, still } from './capture-lib.mjs';

const SITE = 'https://esotk.com';
// Tideborn Taleria veteran hard mode kill: the same fight as the ESO Logs captures.
const FIGHT = `${SITE}/report/F4f2bMwWtgVKxjB9/fight/39`;
// Saint Olms the Just: the same fight as the ESO Logs replay clip. Its boss model is a
// screenshot-based reconstruction (see replayActorModelRegistry.ts provenance notes).
const REPLAY = `${SITE}/report/WQ8L41tVhbFHCca2/fight/6/replay`;
// A community roster from Roster Hub whose tanks and healers are fully specified.
const ROSTER = `${SITE}/rv?id=3x2g1m5l284l`;
// A veteran Tideborn Taleria kill from Latest Reports where several players died and were rezzed,
// for the damage and healing tables' deaths and resurrects columns.
const MESSY = `${SITE}/report/RGdrpvbgmXcVaCkJ/fight/25`;
const ROSTER_TITLE = 'Aedra — Cloudrest #1';

const only = process.argv[2];
// Shots taller than the viewport are captured at 2x to keep their textures a manageable size.
const TALL = ['rosterBuilder', 'outroPanels', 'chapter1'];

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

/** Page blocks relative to the viewport, for viewport stills. */
const measureView = async (page, spec) => measure(page, spec, await page.evaluate(() => scrollY));

/** Scrolls so an element sits `offset` CSS pixels below the top of the viewport. */
async function scrollToText(page, re, offset) {
  await page.evaluate(
    ({ src, offset }) => {
      const re = new RegExp(src);
      const el = [...document.querySelectorAll('body *')].find(
        (e) => e.childElementCount === 0 && re.test(e.textContent.trim()),
      );
      if (el) scrollTo(0, el.getBoundingClientRect().y + scrollY - offset);
    },
    { src: re.source, offset },
  );
  await page.waitForTimeout(1800);
}

/** Opens the community roster in the Roster Builder (Full mode). */
async function openRosterBuilder(page) {
  await open(page, ROSTER, 7000);
  const [editor] = await Promise.all([
    page
      .context()
      .waitForEvent('page', { timeout: 10000 })
      .catch(() => null),
    page.getByText('Edit Roster').first().click(),
  ]);
  const b = editor ?? page;
  await b.waitForLoadState('domcontentloaded');
  await b.addStyleTag({ content: hideChrome }).catch(() => {});
  await b.waitForTimeout(8000);
  await b.getByText('Full', { exact: true }).first().click();
  await b.waitForTimeout(2500);
  await b.mouse.move(5, 5);
  return b;
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
    await page.mouse.wheel(0, 470);
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
        const extract = card.querySelector('[aria-label="Extract build to editor"]');
        return {
          card: box(card),
          chips,
          icons,
          check: box(checkBox),
          cpLabel: cp ? box(cp) : null,
          extract: extract ? box(extract) : null,
          info: (() => {
            const e = inCard('*').find(
              (x) => x.childElementCount === 0 && x.textContent.trim() === 'INFO',
            );
            let b = e;
            while (b && b.tagName !== 'BUTTON' && b.getBoundingClientRect().width < 40)
              b = b.parentElement;
            return b ? box(b) : null;
          })(),
        };
      }),
    );
    // The same page with the card's Info panel open: its gear as a list, one item per row.
    await page.getByText('INFO', { exact: true }).first().click();
    await page.waitForTimeout(2500);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(600);
    await still(page, 'tk-gear-info');
    await rects(
      'tk-gear-info',
      await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        };
        // The panel: the smallest block holding the item table and its title bar.
        const blocks = [...document.querySelectorAll('body div')].filter((e) => {
          const r = e.getBoundingClientRect();
          return /CP\s*Type\s*Slot\s*Item/i.test(e.textContent) && r.height > 450 && r.width < 1200;
        });
        const panel = blocks.find((e) => !blocks.some((o) => o !== e && e.contains(o)));
        const table = [...panel.querySelectorAll('div')].filter((e) => {
          const r = e.getBoundingClientRect();
          return /^CP\s*Type/i.test(e.textContent.trim()) && r.height > 400;
        });
        const tbl = table.at(-1) ?? panel;
        const head = { getBoundingClientRect: () => tbl.getBoundingClientRect() };
        // Item rows: the innermost full-width blocks 30-50 px tall containing a CP value.
        const pw = panel.getBoundingClientRect().width;
        const all = [...panel.querySelectorAll('*')].filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.width > pw * 0.9 && r.height >= 30 && r.height <= 50 && /160/.test(e.textContent)
          );
        });
        const rows = all.filter((e) => !all.some((o) => o !== e && e.contains(o))).map(box);
        return { panel: box(panel), table: box(head), rows };
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
  buildLeaderboard: async (page) => {
    // The same boss as the report in the log chapter.
    await open(page, `${SITE}/build-leaderboard/boss/tideborn-taleria`, 14000);
    await still(page, 'tk-build-leaderboard');
    await rects(
      'tk-build-leaderboard',
      await measureView(page, {
        patterns: [/^Build patterns$/, 380, 300],
        top: [/^Recommended$/, 330, 60],
        card: [/^Recommended starting point$/, 700, 300],
        typical: [/^Typical damage$/, 300, 90],
        observed: [/^Observed in sample$/, 300, 90],
        setup: [/^Defining setup$/, 700, 100],
        byClass: [/^Builds by class$/, 300, 60],
        byBoss: [/^Parses by trial boss$/, 800, 60],
      }),
    );
  },
  scribePlanner: async (page) => {
    // Rebuilds the log chapter's Leashing Soul: Wield Soul with Pull, Druid's Resurgence and Maim.
    await open(page, `${SITE}/calculator#scribing`, 9000);
    await page.getByText('Wield Soul', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    const home = async () => {
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(5, 5);
      await page.waitForTimeout(1200);
    };
    await home();
    await still(page, 'tk-scribe-0');
    const picks = ['Pull', "Druid's Resurgence", 'Maim'];
    for (const [i, pick] of picks.entries()) {
      await page.getByText(pick, { exact: true }).first().click();
      await home();
      await still(page, `tk-scribe-${i + 1}`);
    }
    await rects(
      'tk-scribe',
      await measureView(page, {
        grimoire: [/^Wield Soul$/, 180, 50],
        grimoires: [/^Choose a grimoire$/, 400, 400],
        tooltip: [/^Your scribed skill$/, 360, 520],
        focus: [/^Focus$/i, 300, 50, 400, 990],
        signature: [/^Signature$/i, 300, 50, 400, 990],
        affix: [/^Affix$/i, 300, 50, 400, 990],
      }),
    );
  },
  rosterBuilder: async (page) => {
    const b = await openRosterBuilder(page);
    // One tall still from Roster Setup down through both tank cards.
    const top = await b.evaluate(() => {
      const el = [...document.querySelectorAll('body *')].find(
        (e) => e.childElementCount === 0 && e.textContent.trim() === 'Roster Setup',
      );
      return Math.round(el.getBoundingClientRect().y + scrollY - 60);
    });
    // A taller viewport (not a full-page capture, which drags in the off-screen mobile menu).
    await b.setViewportSize({ width: 1920, height: 1500 });
    await b.evaluate((y) => scrollTo(0, y), top);
    await b.waitForTimeout(1500);
    await b.mouse.move(5, 5);
    await still(b, 'tk-roster-builder');
    await rects(
      'tk-roster-builder',
      await measureView(b, {
        setup: [/^Roster Setup$/, 700, 150, 900],
        tanks: [/^Tanks$/, 60, 20, 300],
        healers: [/^Healers$/, 60, 20, 300],
        dps: [/^DPS$/, 40, 20, 300],
        tank1: [/^Tank 1$/i, 700, 250, 900],
        tank2: [/^Tank 2$/i, 700, 250, 900],
        warning: [/should only be paired/, 700, 30, 900],
      }),
    );
    await b.setViewportSize({ width: 1920, height: 1080 });
    // Per-Fight Builds is a collapsed section: open it, pick Cloudrest, then its final boss.
    const clickText = (text, re = false) =>
      b.evaluate(
        ({ text, re }) => {
          const match = (s) => (re ? new RegExp(text).test(s) : s === text);
          const el = [...document.querySelectorAll('body *')].find(
            (e) => e.childElementCount === 0 && match(e.textContent.trim()),
          );
          el.scrollIntoView({ block: 'center' });
          el.click();
        },
        { text, re },
      );
    await clickText('Per-Fight Builds', true);
    await b.waitForTimeout(1500);
    await clickText('Cloudrest');
    await b.waitForTimeout(1500);
    await clickText("Z'Maja");
    await b.waitForTimeout(1500);
    await scrollToText(b, /Per-Fight Builds/, 140);
    await b.mouse.move(5, 5);
    await still(b, 'tk-roster-perfight');
    await rects(
      'tk-roster-perfight',
      await measureView(b, {
        trials: [/^Sanctum Ophidia$/, 200, 300, 260],
        timeline: [/Select an encounter/i, 500, 90, 600],
        encounter: [/^Z'Maja$/, 50, 50, 100, 1200],
        fight: [/^Final boss/, 500, 200, 560],
        tanks: [/^Siltha Sil$/, 500, 50, 520, 800],
      }),
    );
  },
  rosterView: async (page) => {
    await open(page, ROSTER, 7000);
    await still(page, 'tk-roster-view');
    await rects(
      'tk-roster-view',
      await measureView(page, {
        title: [/Cloudrest #1$/, 600, 30],
        copyLink: [/^Copy Link$/, 80, 25, 200],
        edit: [/^Edit Roster$/, 80, 25, 200],
        tanks: [/^Tanks$/, 800, 150, 900],
        healers: [/^Healers$/, 800, 150, 900],
        tank1: [/^T1$/, 380, 150],
      }),
    );
  },
  rosterHub: async (page) => {
    await open(page, `${SITE}/roster-hub`, 9000);
    await page.evaluate((title) => {
      document.querySelector(`[aria-label="View ${title}"]`)?.scrollIntoView({ block: 'center' });
    }, ROSTER_TITLE);
    await page.waitForTimeout(2000);
    await page.mouse.move(5, 5);
    await still(page, 'tk-roster-hub');
    await rects(
      'tk-roster-hub',
      await page.evaluate((title) => {
        let el = document.querySelector(`[aria-label="View ${title}"]`);
        while (el && el.getBoundingClientRect().height < 150) el = el.parentElement;
        const r = el.getBoundingClientRect();
        return { card: [r.x, r.y, r.width, r.height] };
      }, ROSTER_TITLE),
    );
  },
  discordBot: async (page) => {
    await open(page, `${SITE}/docs/discord-roster-bot`, 7000);
    await still(page, 'tk-discord-bot');
    await rects(
      'tk-discord-bot',
      await measureView(page, {
        hero: [/^Discord Roster Bot$/, 700, 120],
        publish: [/^Publish rosters$/, 200, 140],
        signups: [/^Take sign-ups$/, 200, 140],
        sync: [/^Stay in sync$/, 200, 140],
      }),
    );
  },
  kalpa: async (page) => {
    await open(page, `${SITE}/kalpa`, 7000);
    await still(page, 'tk-kalpa');
    await rects(
      'tk-kalpa',
      await measureView(page, {
        title: [/^The modern addon manager/, 500, 150],
        free: [/Free Forever/i, 100, 20],
        app: [/^Kalpa Addon Manager$/, 400, 400],
        download: [/^Download for Windows$/, 150, 40],
      }),
    );
    await scrollToText(page, /^Everything your addons need$/, 120);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
    await still(page, 'tk-kalpa-features');
    await rects(
      'tk-kalpa-features',
      await measureView(page, {
        heading: [/^Everything your addons need$/, 400, 30],
        installs: [/^One-click installs$/, 250, 100],
        deps: [/^Dependency resolution$/, 250, 100],
        profiles: [/^Addon profiles$/, 250, 100],
        packs: [/^Pack Hub$/, 250, 100, 500, 500],
      }),
    );
  },
  packHub: async (page) => {
    await open(page, `${SITE}/pack-hub`, 9000);
    await still(page, 'tk-pack-hub');
    await rects(
      'tk-pack-hub',
      await measureView(page, {
        utilities: [/^Spike.s Ut/, 250, 400, 400],
        trial: [/^Spike.s Trial Necessities$/, 250, 400, 400],
      }),
    );
  },
  // Chapter 1: the Insights page as one tall still for the scroll, and the damage and healing
  // tables (plus the death recap) from a messier kill of the same boss.
  chapter1: async (page) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await open(page, `${FIGHT}/insights`, 16000);
    await page.setViewportSize({ width: 1920, height: 2700 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(2500);
    await page.mouse.move(5, 5);
    await still(page, 'tk-insights-page');
    await rects(
      'tk-insights-page',
      await measureView(page, {
        header: [/^Tideborn Taleria$/, 800, 150, 900],
        fight: [/^Fight Insights$/, 380, 300, 420],
        abilities: [/^Key Group Abilities:?$/, 360, 200, 420],
        colossus: [/^Colossus$/, 300, 40, 380],
        barrier: [/^Barrier$/, 300, 40, 380],
        horn: [/^Horn$/, 300, 40, 380],
        champion: [/^Key Champion Points:?$/, 360, 100, 420],
        status: [/^Status Effect Uptimes$/, 380, 300, 420],
        buffs: [/^Buff Uptimes$/, 380, 300, 420],
        debuffs: [/^Debuff Uptimes$/, 380, 300, 420],
        breakdown: [/^Damage Breakdown$/, 380, 200, 420],
        byType: [/^Damage by Type$/, 380, 200, 420],
      }),
    );
    // Row rects inside the panels, for per-row wipes and bars growing in.
    const panelRows = await page.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return [r.x, r.y + scrollY, r.width, r.height];
      };
      const panel = (title) => {
        let e = [...document.querySelectorAll('body *')].find(
          (x) => x.childElementCount === 0 && x.textContent.trim() === title,
        );
        while (
          e &&
          (e.getBoundingClientRect().width < 380 || e.getBoundingClientRect().height < 200)
        )
          e = e.parentElement;
        return e;
      };
      // Innermost blocks at least 70% of the panel's width and 28-80 px tall whose text matches.
      const rows = (title, re) => {
        const p = panel(title);
        const pw = p.getBoundingClientRect().width;
        const all = [...p.querySelectorAll('*')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width >= pw * 0.7 && r.height >= 28 && r.height <= 80 && re.test(e.textContent);
        });
        return all.filter((e) => !all.some((o) => o !== e && e.contains(o))).map(box);
      };
      return {
        statusRows: rows('Status Effect Uptimes', /%/),
        buffRows: rows('Buff Uptimes', /%/),
        debuffRows: rows('Debuff Uptimes', /%/),
        typeRows: rows('Damage by Type', /%/),
        breakdownRows: rows('Damage Breakdown', /damage/),
        cpRows: rows('Fight Insights', /^(Enlivening Overflow|From the Brink)/),
      };
    });
    const insightsFile = path.join(OUT, 'tk-insights-page.json');
    const insights = JSON.parse(await readFile(insightsFile, 'utf8'));
    await rects('tk-insights-page', { ...insights, ...panelRows });

    // The table columns and each player's deaths, resurrects and casts-per-minute cells.
    const table = async (name, url) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await open(page, url, 18000);
      await page.setViewportSize({ width: 1920, height: 1600 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(2500);
      await page.mouse.move(5, 5);
      await still(page, name);
      await rects(
        name,
        await page.evaluate(() => {
          const vis = (e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.x < innerWidth && r.bottom > 0;
          };
          const box = (e) => {
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height];
          };
          const nameHead = [...document.querySelectorAll('[aria-label="Sort by Name"]')].find(vis);
          const headY = nameHead.getBoundingClientRect().y;
          const columns = {};
          for (const [key, label] of [
            ['name', 'Sort by Name'],
            ['dps', 'Sort by DPS'],
            ['active', 'Sort by Active DPS'],
            ['crit', 'Sort by Critical damage share'],
            ['amount', 'Sort by Amount'],
            ['hps', 'Sort by HPS'],
            ['overheal', 'Sort by Overheal'],
            ['rawHps', 'Sort by Raw HPS'],
            ['deaths', 'Deaths'],
            ['resurrects', 'Resurrects'],
            ['cpm', 'Casts per minute'],
          ]) {
            // Header cells on the header row; the healing table marks deaths and resurrects with
            // small icons, widened here to their column's width.
            const e = [...document.querySelectorAll(`[aria-label="${label}"]`)]
              .filter(vis)
              .find((c) => Math.abs(c.getBoundingClientRect().y - headY) < 20);
            if (!e) continue;
            const r = box(e);
            columns[key] = r[2] < 40 ? [r[0] + r[2] / 2 - 35, r[1], 70, r[3]] : r;
          }
          // Rows: the innermost full-width blocks below the header.
          const blocks = [...document.querySelectorAll('div')].filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              vis(e) &&
              r.width > 790 &&
              r.width < 840 &&
              r.height > 40 &&
              r.height < 100 &&
              r.y > headY + 10
            );
          });
          const rows = blocks
            .filter((b) => !blocks.some((o) => o !== b && b.contains(o)))
            .map((row) => {
              const cell = (re) => {
                const e = [...row.querySelectorAll('*')].find(
                  (c) => c.childElementCount <= 2 && re.test(c.textContent.trim()) && vis(c),
                );
                return e ? { text: e.textContent.trim(), rect: box(e) } : null;
              };
              const name = [...row.querySelectorAll('*')].find(
                (c) =>
                  c.childElementCount === 0 && /^(@\S+|Anonymous \d+)$/.test(c.textContent.trim()),
              );
              return {
                name: name ? name.textContent.trim() : null,
                rect: box(row),
                deaths: cell(/^💀\s*\d+$/),
                resurrects: cell(/^❤️\s*\d+$/),
              };
            })
            .filter((r) => r.name);
          const heads = Object.values(columns);
          const top = Math.min(...heads.map((r) => r[1])) - 12;
          const bottom = Math.max(...rows.map((r) => r.rect[1] + r.rect[3]));
          const left = Math.min(...rows.map((r) => r.rect[0]));
          const right = Math.max(...rows.map((r) => r.rect[0] + r.rect[2]));
          const title = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div')]
            .filter(vis)
            .find((e) => e.childElementCount <= 2 && /Done By Player$/.test(e.textContent.trim()));
          return {
            table: [left, top, right - left, bottom - top],
            title: title ? box(title) : null,
            columns,
            rows,
          };
        }),
      );
    };
    await table('tk-damage-table', `${MESSY}/damage-done`);
    await table('tk-healing-table', `${MESSY}/healing-done`);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await open(page, `${MESSY}/deaths`, 16000);
    await page.setViewportSize({ width: 1920, height: 1400 });
    await page.evaluate(() => scrollTo(0, 220));
    await page.waitForTimeout(2000);
    await page.mouse.move(5, 5);
    await still(page, 'tk-deaths-messy');
  },
  // The outro's ESO Toolkit half: the death recap from an earlier wipe on the same boss, then the
  // synergy breakdown of the kill. Tall stills from the fight header down into each panel.
  outroPanels: async (page) => {
    for (const [name, url] of [
      ['tk-deaths', `${SITE}/report/F4f2bMwWtgVKxjB9/fight/11/deaths`],
      ['tk-synergies', `${FIGHT}/synergies`],
    ]) {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await open(page, url, 16000);
      await page.setViewportSize({ width: 1920, height: 1400 });
      await page.evaluate(() => scrollTo(0, 220));
      await page.waitForTimeout(2000);
      await page.mouse.move(5, 5);
      await still(page, name);
      await rects(
        name,
        await measureView(page, {
          header: [/^Tideborn Taleria$/, 800, 60, 900],
          panel: [/^(Deaths|Synergies)$/, 800, 300, 900],
        }),
      );
    }
  },
  replay: (page) => replay(page, 'tk-replay', 1920, 1080),
  // Portrait viewport, for the 9:16 cut.
  replayTall: (page) => replay(page, 'tk-replay-tall', 1080, 1920),
  // The 3D replay starting straight down, turned to match ESO Logs' map (same map image), holding
  // until the game time the ESO Logs clip reaches at the cut (1:01), then tilting down into 3D and
  // orbiting.
  replayTopDown: async (page) => {
    await open(page, REPLAY, 16000);
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
    await page.waitForTimeout(2000);
    await page.evaluate(() =>
      document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
    );
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(1500);
    const drag = async (dx, dy) => {
      await page.mouse.move(960, 400);
      await page.mouse.down();
      for (let i = 1; i <= 30; i++) await page.mouse.move(960 + (dx * i) / 30, 400 + (dy * i) / 30);
      await page.mouse.up();
      await page.waitForTimeout(600);
    };
    // Straight down (OrbitControls clamps at its minimum polar angle), then a 135 degree turn.
    await drag(0, 900);
    await drag(405, 0);
    await page.mouse.move(1919, 1079);
    await page.waitForTimeout(3500);
    const x0 = 960;
    const y0 = 400;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    let playing = false;
    const smooth = (u) => u * u * (3 - 2 * u);
    await clip(page, 'tk-replay-td', 14500, async (ms) => {
      if (!playing) {
        await page.keyboard.press('Space');
        playing = true;
      }
      // Hold top-down for 5.6 s (game time 0:50 -> 1:01 at 2x), tilt over 3 s, then orbit.
      const tilt = smooth(Math.min(1, Math.max(0, (ms - 5600) / 3000)));
      const orbit = Math.max(0, (ms - 5600) / 8900);
      await page.mouse.move(x0 + tilt * 50 + orbit * 170, y0 - tilt * 150 - orbit * 10);
    });
    await page.mouse.up();
  },
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
    deviceScaleFactor: name.startsWith('replay') ? 1 : TALL.includes(name) ? 2 : DPR,
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
