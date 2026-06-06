#!/usr/bin/env node
/**
 * check-tooltip-provenance.mjs
 *
 * POSITIVE provenance gate. The companion banned-string guard (scripts/
 * check-no-esohub.cjs) only proves a forbidden third-party token is absent — it
 * cannot prove that rendered tooltip prose actually came from the game. This
 * guard does the opposite: it verifies that every rendered tooltip description
 * traces to an entry in the in-game dump (data/tooltip-dump.json).
 *
 * Why: prose transcribed from a third party but stripped of attribution passes
 * the string guard yet is NOT provenance-clean. And absent data (e.g. scribing
 * never captured) is invisible to a diff/string review. A positive match against
 * the rights-holder's own dump is the only honest check.
 *
 * Surfaces checked:
 *   - skill-lines/*.ts   `description:` fields
 *   - Gear Sets/*.ts     `bonuses:` strings (standard GearSetData shape)
 *
 * Matching is normalized (case/space/punct-insensitive). Gear bonuses carry a
 * "(N items)" prefix; the dump descriptions carry the same prefix, so exact
 * normalized match works, with a substring fallback for minor prefix variance.
 *
 * Unmatched entries are LISTED IN FULL (no silent caps) and counted against a
 * coverage threshold. Known-unsourceable entries (sets removed from the game,
 * runtime-composed scribing morphs) are declared in ALLOW below with a reason.
 *
 * Usage:
 *   node scripts/check-tooltip-provenance.mjs            # report + exit code
 *   node scripts/check-tooltip-provenance.mjs --list     # also print every miss
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIST = process.argv.includes('--list');

// Coverage floor. Below this the gate FAILS. Set from the measured baseline so
// any regression (new un-sourced prose) trips it. Raise as arena/monster land.
const THRESHOLD = 0.97;

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

// --- provenance source ----------------------------------------------------
// Prefer the committed fingerprint (data/tooltip-provenance.json) so this gate
// runs in CI without the gitignored full dump. Fall back to the full dump when
// present locally (e.g. right after a fresh parse). Both are produced by
// scripts/parse-tooltip-dump.mjs with the SAME normalization.
const FP_PATH = path.join(ROOT, 'data/tooltip-provenance.json');
const DUMP_PATH = path.join(ROOT, 'data/tooltip-dump.json');

const dumpNorm = new Set();
let dumpSetBonusesSrc; // norm(name) -> [normalized bonus, ...]

if (fs.existsSync(FP_PATH)) {
  const fp = JSON.parse(fs.readFileSync(FP_PATH, 'utf8'));
  for (const d of fp.descriptions || []) if (d) dumpNorm.add(d);
  for (const b of Object.values(fp.setBonuses || {})) for (const x of b) dumpNorm.add(x);
  dumpSetBonusesSrc = new Map(Object.entries(fp.setBonuses || {}));
} else if (fs.existsSync(DUMP_PATH)) {
  const dump = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  const addDump = (d) => {
    const n = norm(d);
    if (n) dumpNorm.add(n);
  };
  for (const line of dump.skillLines)
    for (const sk of line.skills) for (const ab of sk.morphs || []) addDump(ab.description);
  for (const ab of dump.abilitiesById || []) addDump(ab.description);
  for (const s of dump.sets) for (const b of s.bonuses) addDump(b.description);
  dumpSetBonusesSrc = new Map();
  for (const s of dump.sets) {
    const list = s.bonuses
      .filter((b) => !b.perfected && b.description)
      .map((b) => norm(b.description));
    if (list.length) dumpSetBonusesSrc.set(norm(s.name), list);
  }
} else {
  console.error(
    'No provenance source: need data/tooltip-provenance.json (committed) or data/tooltip-dump.json.',
  );
  process.exit(1);
}

// Substring index for prefix variance: a long-enough dump string contains the
// rendered text (or vice versa) even if a leading "(N items)" differs slightly.
const dumpArr = [...dumpNorm];

function tracesToDump(text) {
  const n = norm(text);
  if (!n) return true; // empty isn't a provenance claim
  if (dumpNorm.has(n)) return true;
  // strip a leading "(n items)" / "(n perfected items)" then retry exact
  const stripped = n.replace(/^\d+ (?:perfected )?items? /, '');
  if (dumpNorm.has(stripped)) return true;
  // substring fallback (only for non-trivial length to avoid false positives)
  if (n.length >= 30) {
    for (const d of dumpArr) {
      if (d.includes(stripped) || stripped.includes(d)) return true;
    }
  }
  return false;
}

// --- allowlist: entries with no possible dump source, with reasons --------
// Keyed by normalized text. Each MUST carry a reason. These are sets removed
// from the game (no dump entry can exist) — NOT un-sourced transcriptions.
const ALLOW_SETS = new Set(
  [
    'Giant Spider',
    'Armor of the Code',
    'Arms of Infernace',
    'Arms of the Ancestors',
    'Broken Soul',
    'Relics of the Physician, Ansur',
    'Relics of the Rebellion',
    'The Destruction Suite',
    'Treasures of the Earthforge',
    "Harvester's Hope-Ring", // app name variant; no matching dump set (dump has none)
    "Prophet's", // truncated/legacy app name; no matching dump set
  ].map(norm),
);

// --- walk target files ----------------------------------------------------
function walkTs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(full, out);
    else if (e.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const checked = []; // { kind, file, text, set? }

// skill-lines descriptions
const skillFiles = walkTs(path.join(ROOT, 'src/data/skill-lines')).filter(
  (f) =>
    !/ability-ids\.ts$|index\.ts$|calculator-data\.ts$|\/generated\//.test(f.replace(/\\/g, '/')),
);
const DESC_RE = /\bdescription:\s*(['"])((?:[^\\]|\\.)*?)\1/g;
for (const f of skillFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = DESC_RE.exec(txt)))
    checked.push({ kind: 'skill', file: path.relative(ROOT, f), text: m[2] });
}

// gear-set bonuses (standard GearSetData shape only; arena/monster are SkillsetData)
const GEAR_DIR = path.join(ROOT, 'src/data/Gear Sets');
const SET_RE =
  /export const \w+:\s*GearSetData\s*=\s*\{[\s\S]*?\bname:\s*(['"])((?:[^\\]|\\.)*?)\1[\s\S]*?\bbonuses:\s*\[([\s\S]*?)\]/g;
// Bonus string literals are single- OR double-quoted (entries with apostrophes,
// e.g. "Death's Favor", use double quotes).
const BONUS_RE = /(['"])((?:[^\\]|\\.)*?)\1/g;
for (const f of ['heavy.ts', 'light.ts', 'medium.ts', 'mythics.ts', 'arena.ts']) {
  const full = path.join(GEAR_DIR, f);
  if (!fs.existsSync(full)) continue;
  const txt = fs.readFileSync(full, 'utf8');
  let s;
  while ((s = SET_RE.exec(txt))) {
    const setName = s[2].replace(/\\(['"])/g, '$1');
    let b;
    while ((b = BONUS_RE.exec(s[3])))
      checked.push({ kind: 'gear', file: `Gear Sets/${f}`, text: b[2], set: setName });
  }
}

// --- evaluate -------------------------------------------------------------
let covered = 0;
let allowed = 0;
const misses = [];
for (const c of checked) {
  if (c.kind === 'gear' && c.set && ALLOW_SETS.has(norm(c.set))) {
    allowed++;
    continue;
  }
  if (tracesToDump(c.text)) covered++;
  else misses.push(c);
}

const denom = checked.length - allowed;
const rate = denom ? covered / denom : 1;

// --- COMPLETENESS (reverse direction) ------------------------------------
// The forward check (app -> dump) can't see a set that's MISSING a bonus the
// game has — a truncated string still traces. This asserts the other direction:
// for every gear set present in BOTH the app and the dump, every standard dump
// bonus appears in the app's bonus list. Catches dropped tiers (e.g. two bonuses
// at the same piece count collapsed to one).
const dumpSetBonuses = new Map(); // norm(name) -> { name, list }
for (const [k, list] of dumpSetBonusesSrc) {
  if (list.length) dumpSetBonuses.set(k, { name: k, list });
}
const appSetBonuses = new Map(); // norm(name) -> Set(normalized bonus)
for (const c of checked) {
  if (c.kind !== 'gear' || !c.set) continue;
  const k = norm(c.set);
  if (!appSetBonuses.has(k)) appSetBonuses.set(k, new Set());
  appSetBonuses.get(k).add(norm(c.text));
}
const incompleteSets = [];
for (const [k, dumpSet] of dumpSetBonuses) {
  const appBonuses = appSetBonuses.get(k);
  if (!appBonuses) continue; // set not in the app (fine — not every dump set is shipped)
  const missing = dumpSet.list.filter((b) => !appBonuses.has(b));
  if (missing.length) incompleteSets.push({ name: dumpSet.name, missing });
}

console.log('=== Tooltip provenance gate (rendered text -> game dump) ===');
console.log(`Dump descriptions (normalized): ${dumpNorm.size}`);
console.log(`Rendered entries checked:       ${checked.length}`);
console.log(`  allowed (removed-from-game):  ${allowed}`);
console.log(`  traced to dump:               ${covered} / ${denom} (${(100 * rate).toFixed(2)}%)`);
console.log(`  NOT traced:                   ${misses.length}`);

if (misses.length && (LIST || misses.length <= 60)) {
  console.log('\n--- Untraced entries (no matching game-dump text) ---');
  for (const c of misses) {
    const where = c.set ? `${c.file} :: ${c.set}` : c.file;
    console.log(`  [${c.kind}] ${where}\n      ${c.text.slice(0, 110)}`);
  }
} else if (misses.length) {
  console.log(`\n(${misses.length} untraced — re-run with --list to see all)`);
}

console.log(
  `Gear set completeness:          ${dumpSetBonuses.size - incompleteSets.length} complete, ${incompleteSets.length} missing dump tiers`,
);
if (incompleteSets.length && (LIST || incompleteSets.length <= 40)) {
  console.log('\n--- Sets missing a bonus the game dump has (dropped tier) ---');
  for (const s of incompleteSets) {
    console.log(`  ${s.name}`);
    for (const m of s.missing) console.log(`      MISSING: ${m.slice(0, 100)}`);
  }
} else if (incompleteSets.length) {
  console.log(`\n(${incompleteSets.length} incomplete sets — re-run with --list to see all)`);
}

let failed = false;
if (rate < THRESHOLD) {
  console.log(
    `\n!! FAIL: provenance coverage ${(100 * rate).toFixed(2)}% < ${(100 * THRESHOLD).toFixed(0)}% floor.`,
  );
  console.log(
    '   Every rendered tooltip must trace to the game dump (or be an allowlisted removed set).',
  );
  failed = true;
}
if (incompleteSets.length) {
  console.log(
    `\n!! FAIL: ${incompleteSets.length} gear set(s) are missing a bonus tier the game dump has (dropped data).`,
  );
  failed = true;
}
if (failed) process.exit(1);
console.log(
  `\nPASS: coverage ${(100 * rate).toFixed(2)}% >= ${(100 * THRESHOLD).toFixed(0)}% floor; all matched sets complete.`,
);
