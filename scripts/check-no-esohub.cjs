#!/usr/bin/env node
/**
 * ESO-Hub reference guard (offline, deterministic).
 *
 * Asserts that no ESO-Hub attribution, links, source headers, or runtime CDN
 * references reappear in the shipped source. Skill/gear tooltip data is sourced
 * from the game client (see tools/eso-tooltip-dump); icons are served from the
 * rpglogs CDN. ESO-Hub must not be a source or dependency.
 *
 * What this fails on (attribution / dependency forms):
 *   - eso-hub.com URLs (links, icon CDN hosts, source headers)
 *   - "Tooltips by ESO-Hub", "View on ESO-Hub", "on ESO-Hub" attribution text
 *   - sourceUrl:/@source:/Data source: headers pointing at eso-hub
 *
 * Intentional allowlist (functional, nominative use — NOT attribution):
 *   - src/features/build-editor/utils/cspsImport.ts
 *   - src/features/build-editor/utils/cspsExportCodeParser.ts
 *     (+ its test) — these parse the "ESO-Hub export code" build-share FORMAT;
 *     the string names a data format, ships no UI, and creates no dependency.
 *
 * Scope: src/ and public/. CDN/network is never queried — pure text scan.
 *
 * Usage: node scripts/check-no-esohub.cjs   (exit 0 = clean, 1 = violations)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Scan shipped source, the build/codegen surface (generators can silently regenerate a
// removed reference), and committed data/ (runtime-imported JSON like scribing data).
const SCAN_DIRS = ['src', 'public', 'scripts', 'tools', 'data'];

// Files allowed to mention ESO-Hub.
const ALLOWLIST = new Set(
  [
    // Functional build-share format parser — "ESO-Hub export code" names a format.
    'src/features/build-editor/utils/cspsImport.ts',
    'src/features/build-editor/utils/cspsExportCodeParser.ts',
    'src/features/build-editor/utils/__tests__/cspsExportCodeParser.test.ts',
    // This guard itself contains the token in its patterns/allowlist/comments.
    'scripts/check-no-esohub.cjs',
  ].map((p) => p.replace(/\//g, path.sep)),
);

// Any occurrence of the eso-hub token is a violation outside the allowlist.
// (Attribution, links, CDN hosts, and source headers all contain it.)
const VIOLATION = /eso-?hub/i;

const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'dist', 'coverage']);
const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.md',
]);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (TEXT_EXT.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
}

const files = [];
for (const d of SCAN_DIRS) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, files);
}

const violations = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (VIOLATION.test(line)) {
      violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
    }
  });
}

if (violations.length) {
  console.error(`✗ ESO-Hub guard: ${violations.length} reference(s) found:\n`);
  for (const v of violations) console.error('  ' + v);
  console.error(
    '\nESO-Hub must not be a data source or dependency. Use game-client data ' +
      '(tools/eso-tooltip-dump) and the rpglogs icon CDN. If this is a genuine ' +
      'functional format reference, add the file to the ALLOWLIST in this script.',
  );
  process.exit(1);
}

console.log(`✓ ESO-Hub guard: clean (${files.length} files scanned).`);
