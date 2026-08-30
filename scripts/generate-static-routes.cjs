#!/usr/bin/env node

/**
 * GitHub Pages serves a real 404 for BrowserRouter paths. Copying the app shell
 * into public, non-parameterized legal routes lets crawlers and link previews
 * receive HTTP 200 while React still owns the rendered route.
 */

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const buildDirectory = path.join(__dirname, '..', 'build');
const appShell = path.join(buildDirectory, 'index.html');
const cspHashMarker = '__CSP_INLINE_SCRIPT_HASHES__';
const SITE_ORIGIN = 'https://esotk.com';
// DEFECT 3: the prerendered titles here and the `document.title` assignments in
// the React pages used to be two independent hardcoded lists, and they had
// drifted (/calculator, /gear-sets, /leaderboards, /pack-hub, /sample-report,
// /text-editor, /ultimate-simulator, /docs/calculations). Google renders JS, so
// the weaker hydrated title won. Both sides now read the same JSON: this script
// requires it directly (plain node, no bundler), while the app imports it
// through src/constants/routeMeta.ts.
const routeMeta = require('../src/constants/route-meta.json');
const PRIVATE_FRAGMENT_ROUTES = ['/kalpa/support'];

// The /build-leaderboard sub-routes (7 pooled class boards + 14 per-encounter
// boards) come from their own JSON because each entry also carries the encounter
// id / class filter the page needs at runtime. Requiring it here keeps the
// prerendered shells, the sitemap and the app reading the same titles.
//
// The 98 class-narrowed-to-one-boss permutations are deliberately NOT here: they
// are near-duplicates of the pooled class board and canonicalize to it, so
// prerendering them would only spend crawl budget on thin pages.
const leaderboardRoutes = require('../src/constants/leaderboard-routes.json');

const leaderboardRouteMeta = Object.fromEntries([
  ...leaderboardRoutes.classes.map((entry) => [
    `/build-leaderboard/class/${entry.slug}`,
    { title: entry.title, description: entry.description, prerender: true },
  ]),
  ...leaderboardRoutes.bosses.map((entry) => [
    `/build-leaderboard/boss/${entry.slug}`,
    { title: entry.title, description: entry.description, prerender: true },
  ]),
]);

const staticRoutes = Object.entries({ ...routeMeta, ...leaderboardRouteMeta })
  .filter(([, meta]) => meta.prerender)
  .map(([routePath, meta]) => {
    if (!routePath.startsWith('/') || routePath.length < 2) {
      throw new Error(`Prerendered route must be a non-root absolute path: ${routePath}`);
    }
    if (routePath.includes(':') || routePath.includes('*')) {
      throw new Error(`Parameterized routes cannot be prerendered: ${routePath}`);
    }
    if (!meta.description) {
      throw new Error(`Prerendered route is missing a description: ${routePath}`);
    }
    return {
      path: routePath.slice(1),
      title: meta.title,
      description: meta.description,
      noindex: meta.noindex === true,
    };
  });

if (staticRoutes.length === 0) {
  console.error('No prerenderable routes found in route-meta.json or leaderboard-routes.json');
  process.exit(1);
}

for (const requiredRoute of PRIVATE_FRAGMENT_ROUTES) {
  const route = routeMeta[requiredRoute];
  if (!route?.prerender) {
    console.error(
      `Private fragment route must be prerendered so its payload never reaches the 404 redirect: ${requiredRoute}`,
    );
    process.exit(1);
  }
}

if (!fs.existsSync(appShell)) {
  console.error(`Build app shell not found: ${appShell}`);
  process.exit(1);
}

const contents = fs.readFileSync(appShell, 'utf8');

// `_headers` is inert on GitHub Pages, but keeping its CSP hash synchronized
// makes the same build artifact safe to move to a header-capable static host.
const inlineScriptHashes = Array.from(
  contents.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi),
  ([, script]) => `'sha256-${crypto.createHash('sha256').update(script, 'utf8').digest('base64')}'`,
).join(' ');

if (!inlineScriptHashes) {
  console.error('CSP hash generation expected at least one inline script in build/index.html');
  process.exit(1);
}

const headersPath = path.join(buildDirectory, '_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs
    .readFileSync(headersPath, 'utf8')
    .replaceAll(cspHashMarker, inlineScriptHashes);
  if (headers.includes(cspHashMarker)) {
    console.error(`Unresolved CSP hash marker remains in ${headersPath}`);
    process.exit(1);
  }
  fs.writeFileSync(headersPath, headers);
}

/**
 * Titles and descriptions are interpolated into element text AND into quoted
 * attribute values, so they have to be escaped. An unescaped `"` would
 * terminate a `content="..."` attribute, and an unescaped `&` or `<` in a
 * <title> would parse back to something other than the raw JSON string — which
 * is exactly the prerender/hydration title mismatch this pipeline exists to
 * prevent, since the app sets document.title from the unescaped JSON.
 *
 * Every current entry contains only apostrophes (Sanity's Edge, Kyne's Aegis,
 * Z'Maja), which are safe either way, so this is a guard against future copy
 * rather than a fix for a live break.
 */
const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

for (const route of staticRoutes) {
  const routeUrl = `${SITE_ORIGIN}/${route.path}/`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  let routeShell = contents
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${routeUrl}" />`,
    )
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${description}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${description}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${routeUrl}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${title}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${description}" />`,
    );

  if (route.noindex) {
    routeShell = routeShell.replace(
      '</head>',
      '  <meta name="robots" content="noindex,nofollow" />\n</head>',
    );
  }

  const routeDirectory = path.join(buildDirectory, route.path);
  fs.mkdirSync(routeDirectory, { recursive: true });
  fs.writeFileSync(path.join(routeDirectory, 'index.html'), routeShell);
}

// DEFECT 2: the sitemap used to be hand-maintained and had already drifted from
// this route list. Generate it from the same array so the two can never diverge.
// URLs use the trailing-slash form because the slash-less form 301-redirects.
const lastmod = new Date().toISOString().slice(0, 10);
const sitemapUrls = [
  `${SITE_ORIGIN}/`,
  ...staticRoutes.filter((route) => !route.noindex).map((route) => `${SITE_ORIGIN}/${route.path}/`),
].sort();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map((loc) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(buildDirectory, 'sitemap.xml'), sitemap);

console.log(
  `Generated static route shells: ${staticRoutes.map((route) => `/${route.path}`).join(', ')}`,
);
console.log(`Generated sitemap.xml with ${sitemapUrls.length} URLs (lastmod ${lastmod})`);
