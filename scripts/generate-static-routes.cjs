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
const staticRoutes = [
  {
    path: 'about',
    title: 'About | ESO Toolkit',
    description: 'Learn about ESO Toolkit, an independent suite of combat-log and raid tools.',
  },
  {
    path: 'build-editor',
    title: 'Build Editor | ESO Toolkit',
    description: 'Create and share Elder Scrolls Online character builds.',
  },
  {
    path: 'build-hub',
    title: 'Build Hub | ESO Toolkit',
    description: 'Browse community-created Elder Scrolls Online character builds.',
  },
  {
    path: 'build-leaderboard',
    title: 'Build Leaderboard | ESO Toolkit',
    description: 'Explore top-performing Elder Scrolls Online builds and parses.',
  },
  {
    path: 'calculator',
    title: 'ESO Calculators | ESO Toolkit',
    description: 'Plan combat stats, ultimate generation, and scribed skills for ESO.',
  },
  {
    path: 'docs/calculations',
    title: 'Calculation Guide | ESO Toolkit',
    description: 'Review the formulas and assumptions used by ESO Toolkit calculators.',
  },
  {
    path: 'docs/discord-roster-bot',
    title: 'Discord Roster Bot Guide | ESO Toolkit',
    description: 'Set up and use the ESO Toolkit Discord roster bot.',
  },
  {
    path: 'docs/loadout/food-selector',
    title: 'Food Selector Guide | ESO Toolkit',
    description: 'Learn how ESO Toolkit selects food and drink for character loadouts.',
  },
  {
    path: 'gear-sets',
    title: 'ESO Gear Sets | ESO Toolkit',
    description: 'Search Elder Scrolls Online gear sets and bonuses.',
  },
  {
    path: 'kalpa',
    title: 'Kalpa — Open-Source ESO Addon Manager | ESO Toolkit',
    description:
      'Kalpa is a fast, free, open-source addon manager for The Elder Scrolls Online. One-click installs, automatic dependencies, addon profiles, and one-click Minion import — just 15 MB, no Java.',
  },
  {
    path: 'latest-reports',
    title: 'Latest Reports | ESO Toolkit',
    description: 'Browse recently analyzed Elder Scrolls Online combat-log reports.',
  },
  {
    path: 'leaderboards',
    title: 'ESO Leaderboards | ESO Toolkit',
    description: 'Explore Elder Scrolls Online combat-log leaderboards and recent parses.',
  },
  {
    path: 'loadout-manager',
    title: 'Loadout Manager | ESO Toolkit',
    description: 'Plan Elder Scrolls Online gear, skills, champion points, and consumables.',
  },
  {
    path: 'pack-hub',
    title: 'ESO Addon Packs | Pack Hub | ESO Toolkit',
    description:
      'Browse and share curated Elder Scrolls Online addon packs for Kalpa, the open-source ESO addon manager.',
  },
  {
    path: 'parse-analysis',
    title: 'Parse Analysis | ESO Toolkit',
    description: 'Analyze an Elder Scrolls Online combat-log parse in detail.',
  },
  {
    path: 'privacy',
    title: 'Privacy Policy | ESO Toolkit',
    description: 'Read how ESO Toolkit handles authentication, analytics, and shared content.',
  },
  {
    path: 'privacy-settings',
    title: 'Privacy Settings | ESO Toolkit',
    description: 'Review and update optional analytics preferences for ESO Toolkit.',
  },
  {
    path: 'sample-report',
    title: 'Sample Combat Report | ESO Toolkit',
    description: 'Explore an Elder Scrolls Online combat report with ESO Toolkit.',
  },
  {
    path: 'roster-builder',
    title: 'Roster Builder | ESO Toolkit',
    description: 'Plan and share Elder Scrolls Online trial rosters.',
  },
  {
    path: 'roster-hub',
    title: 'Roster Hub | ESO Toolkit',
    description: 'Browse community Elder Scrolls Online trial rosters.',
  },
  {
    path: 'text-editor',
    title: 'ESO Text Editor | ESO Toolkit',
    description: 'Format styled text for Elder Scrolls Online guild and community posts.',
  },
  {
    path: 'terms',
    title: 'Terms of Use | ESO Toolkit',
    description: 'Read the terms that govern use of the hosted ESO Toolkit service.',
  },
  {
    path: 'ultimate-simulator',
    title: 'Ultimate Simulator | ESO Toolkit',
    description: 'Model Elder Scrolls Online ultimate generation for players and groups.',
  },
  {
    path: 'whats-new',
    title: "What's New | ESO Toolkit",
    description: 'Review recent ESO Toolkit features, fixes, and game-data updates.',
  },
];

if (!fs.existsSync(appShell)) {
  console.error(`Build app shell not found: ${appShell}`);
  process.exit(1);
}

const contents = fs.readFileSync(appShell, 'utf8');

// `_headers` is inert on GitHub Pages, but keeping its CSP hash synchronized
// makes the same build artifact safe to move to a header-capable static host.
const inlineScriptHashes = Array.from(
  contents.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi),
  ([, script]) =>
    `'sha256-${crypto.createHash('sha256').update(script, 'utf8').digest('base64')}'`,
).join(' ');

if (!inlineScriptHashes) {
  console.error('CSP hash generation expected at least one inline script in build/index.html');
  process.exit(1);
}

const headersPath = path.join(buildDirectory, '_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8').replaceAll(cspHashMarker, inlineScriptHashes);
  if (headers.includes(cspHashMarker)) {
    console.error(`Unresolved CSP hash marker remains in ${headersPath}`);
    process.exit(1);
  }
  fs.writeFileSync(headersPath, headers);
}

for (const route of staticRoutes) {
  const routeUrl = `${SITE_ORIGIN}/${route.path}/`;
  const routeShell = contents
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${routeUrl}" />`,
    )
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${route.description}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${route.title}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${route.description}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${routeUrl}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${route.title}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${route.description}" />`,
    );

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
  ...staticRoutes.map((route) => `${SITE_ORIGIN}/${route.path}/`),
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
