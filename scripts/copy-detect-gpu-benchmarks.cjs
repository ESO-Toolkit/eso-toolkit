#!/usr/bin/env node

/**
 * Copy the @pmndrs/detect-gpu benchmark database into public/ so it is served
 * from our own origin.
 *
 * WHY: `getGPUTier()` defaults `benchmarksURL` to
 * `https://unpkg.com/@pmndrs/detect-gpu@<version>/dist/benchmarks`. Our app-shell
 * CSP (index.html meta + public/_headers) has `connect-src 'self' …` WITHOUT
 * unpkg.com, so every benchmark fetch was blocked in production. detect-gpu does
 * not throw on that failure — it resolves `{ tier: 1, type: 'BENCHMARK_FETCH_FAILED' }`,
 * which src/utils/detectPerfTier.ts treats as "not a real benchmark" and falls
 * back to the CPU/RAM heuristic that can never return 'high'. Net effect: the
 * fight replay's "auto" quality preset could never pick the high tier on ANY
 * machine.
 *
 * Rather than widening the CSP to a third-party CDN, we host the JSON ourselves
 * and point `benchmarksURL` at `${BASE_URL}detect-gpu-benchmarks`, which satisfies
 * `connect-src 'self'`.
 *
 * The copy is generated (not committed) so it can never drift from the installed
 * package version — detect-gpu validates a schema version embedded in each file.
 * Same pattern as public/version.json / public/manifest.json; the output dir is
 * gitignored.
 *
 * Size: ~717 KB across 16 files, but a browser only ever fetches the ONE file
 * matching its GPU vendor (e.g. d-nvidia.json, ~148 KB), so all 16 are kept —
 * dropping any of them would silently break detection for that vendor.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const srcDir = path.join(repoRoot, 'node_modules', '@pmndrs', 'detect-gpu', 'dist', 'benchmarks');
const destDir = path.join(repoRoot, 'public', 'detect-gpu-benchmarks');

if (!fs.existsSync(srcDir)) {
  console.error(
    `❌ detect-gpu benchmarks not found at ${srcDir}.\n` +
      '   Run `npm ci` first. If the package layout changed, update this script — ' +
      'without these files GPU tier detection silently degrades to the CPU heuristic.',
  );
  process.exit(1);
}

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error(`❌ No benchmark JSON files in ${srcDir}.`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

// Drop stale files from a previous package version so an old vendor file can't
// linger and be served with an out-of-date schema.
for (const existing of fs.readdirSync(destDir)) {
  if (!files.includes(existing)) {
    fs.rmSync(path.join(destDir, existing), { recursive: true, force: true });
  }
}

let bytes = 0;
for (const file of files) {
  const from = path.join(srcDir, file);
  fs.copyFileSync(from, path.join(destDir, file));
  bytes += fs.statSync(from).size;
}

console.log(
  `✅ detect-gpu benchmarks: copied ${files.length} files (${Math.round(bytes / 1024)} KB) → public/detect-gpu-benchmarks/`,
);
