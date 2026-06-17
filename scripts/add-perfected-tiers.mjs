#!/usr/bin/env node
/**
 * add-perfected-tiers.mjs
 *
 * Targeted, one-purpose update: insert the PERFECTED-only stat tier into each
 * Perfected gear set in src/data/Gear Sets/{heavy,light,medium,mythics,arena}.ts.
 *
 * Why a separate script (not refresh-gear-bonuses): set-bonus numbers that scale
 * off the player's stats are only canonical when the dump is taken fully naked
 * (see RUN-CHECKLIST §2). The perfected stat tiers, however, are FLAT and
 * build-independent ("Adds 526 Critical Chance", "Adds 1190 Offensive Penetration",
 * "Adds 3% Healing Taken", …), so they are safe to apply from any dump. This
 * script touches ONLY the perfected stat line and leaves every other bonus —
 * including any stat-scaling effect text — exactly as-is.
 *
 * It PREPENDS the perfected tier (game order: the perfected line shows first),
 * but only if that set's bonuses don't already start with it (idempotent).
 *
 * Usage:
 *   node scripts/add-perfected-tiers.mjs          # dry run (report only)
 *   node scripts/add-perfected-tiers.mjs --write  # apply
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// dump: set name -> the perfected stat line(s) only (flat, build-independent)
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const perfectedByName = new Map();
for (const set of dump.sets) {
  const perf = (set.bonuses || [])
    .filter((b) => b.perfected && b.description)
    .map((b) => b.description);
  if (perf.length) perfectedByName.set(norm(set.name), perf);
}

const files = ['heavy', 'light', 'medium', 'mythics', 'arena'].map((f) =>
  path.join(ROOT, 'src/data/Gear Sets', `${f}.ts`),
);

const SET_RE =
  /export const \w+:\s*GearSetData\s*=\s*\{[\s\S]*?\bname:\s*(['"])((?:[^\\]|\\.)*?)\1([\s\S]*?\bbonuses:\s*\[)([\s\S]*?)(\])/g;

const toSingleQuoted = (s) =>
  "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const unescapeStr = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

function bonusIndent(body) {
  const m = body.match(/\n([ \t]+)\S/);
  return m ? m[1] : '    ';
}

let seen = 0;
let updated = 0;
const updatedNames = [];
const noDumpPerfected = [];

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let fileUpdated = 0;

  const next = original.replace(SET_RE, (full, _q, nameRaw, head, bonusesBody, close) => {
    const appName = unescapeStr(nameRaw);
    if (!/perfected/i.test(appName)) return full; // only perfected sets
    seen++;
    const perf = perfectedByName.get(norm(appName));
    if (!perf || perf.length === 0) {
      noDumpPerfected.push(appName);
      return full;
    }

    // Existing bonus string values, in order.
    const existing = [];
    const STR_RE = /(['"])((?:[^\\]|\\.)*?)\1/g;
    let sm;
    while ((sm = STR_RE.exec(bonusesBody))) existing.push(unescapeStr(sm[2]));

    // Idempotent: if the perfected line(s) are already present at the front, skip.
    const alreadyHas = perf.every((p) => existing.includes(p));
    if (alreadyHas) return full;

    // Prepend the perfected tier(s) (game order), keep all existing bonuses as-is.
    const merged = [...perf, ...existing];
    const indent = bonusIndent(bonusesBody);
    const newBody =
      '\n' +
      merged.map((d) => indent + toSingleQuoted(d) + ',').join('\n') +
      '\n' +
      indent.replace(/[ \t]{2}$/, '');

    fileUpdated++;
    updatedNames.push(appName);
    return full.replace(head + bonusesBody + close, head + newBody + close);
  });

  if (fileUpdated > 0) {
    updated += fileUpdated;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`=== Add perfected tiers ${WRITE ? '(WRITE)' : '(dry run)'} ===`);
console.log(`Perfected sets seen in app:     ${seen}`);
console.log(`Updated (perfected tier added): ${updated}`);
if (updatedNames.length) {
  console.log('\n--- Updated ---');
  for (const n of updatedNames.sort())
    console.log(`  ${n}: ${perfectedByName.get(norm(n)).join(' | ')}`);
}
if (noDumpPerfected.length) {
  console.log(
    `\n--- Perfected app sets with NO perfected tier in dump (${noDumpPerfected.length}) ---`,
  );
  for (const n of noDumpPerfected.sort()) console.log(`  ${n}`);
}
if (!WRITE) console.log('\n(dry run — re-run with --write to apply)');
