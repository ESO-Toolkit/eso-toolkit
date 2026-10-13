const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('sitemap lists public routes without fabricated content modification dates', (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eso-static-routes-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  for (const directory of ['scripts', 'src/constants', 'build']) {
    fs.mkdirSync(path.join(fixture, directory), { recursive: true });
  }
  const script = path.join(fixture, 'scripts/generate-static-routes.cjs');
  fs.copyFileSync(path.join(__dirname, 'generate-static-routes.cjs'), script);
  for (const file of ['route-meta.json', 'app-shell-skeleton.json', 'leaderboard-routes.json']) {
    fs.copyFileSync(
      path.join(__dirname, '../src/constants', file),
      path.join(fixture, 'src/constants', file),
    );
  }
  fs.writeFileSync(
    path.join(fixture, 'build/index.html'),
    '<html><head><title>Test</title><script>window.test = true;</script></head><body><div id="root"></div></body></html>',
  );
  execFileSync(process.execPath, [script]);
  const sitemap = fs.readFileSync(path.join(fixture, 'build/sitemap.xml'), 'utf8');
  const routeMeta = require('../src/constants/route-meta.json');
  const leaderboardRoutes = require('../src/constants/leaderboard-routes.json');
  const expectedPaths = [
    '/',
    ...Object.entries(routeMeta)
      .filter(([, meta]) => meta.prerender && !meta.noindex)
      .map(([route]) => `${route}/`),
    ...leaderboardRoutes.classes.map((entry) => `/build-leaderboard/class/${entry.slug}/`),
    ...leaderboardRoutes.bosses.map((entry) => `/build-leaderboard/boss/${entry.slug}/`),
  ];
  assert.deepEqual(
    Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), ([, loc]) => loc),
    expectedPaths.map((route) => `https://esotk.com${route}`).sort(),
  );
  assert.doesNotMatch(sitemap, /<lastmod\b/);
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
});
