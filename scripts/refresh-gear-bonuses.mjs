#!/usr/bin/env node
/**
 * refresh-gear-bonuses.mjs
 *
 * Keyed update: refreshes the `bonuses` strings of standard gear sets in
 * src/data/Gear Sets/{heavy,light,medium,mythics}.ts from data/tooltip-dump.json.
 * These files use the GearSetData shape (bonuses: string[] each prefixed "(N items)").
 *
 * Matching:
 *   set     — by normalized name (app name -> dump set name)
 *   bonus   — by the leading "(N items)" piece count -> dump bonus.numRequired
 * Only the bonus STRING is replaced; set name/icon/setType/structure are untouched.
 * The dump's bonus.description already carries the "(N items)" prefix in the same
 * format the app uses, so a matched bonus is a whole-string swap.
 *
 * Non-perfected bonuses only (perfected tiers are a separate display concern handled
 * by the arena/monster pass). Unmatched sets and unmatched bonus tiers are LOGGED in
 * full — no silent caps.
 *
 * Arena weapons (arena-specials.ts, arena.ts) and monster sets (monster.ts) use the
 * SkillsetData shape and a different piece-count convention; they are NOT handled here
 * (separate gated pass).
 *
 * Usage:
 *   node scripts/refresh-gear-bonuses.mjs          # dry run (report only)
 *   node scripts/refresh-gear-bonuses.mjs --write  # apply changes
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pieceCount = (s) => {
  const m = /^\((\d+)\s+(?:perfected\s+)?items?\)/i.exec(s.trim());
  return m ? Number(m[1]) : null;
};

// --- dump: set name -> { byCount: Map<numRequired, description> } ---------
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const dumpByName = new Map();
for (const set of dump.sets) {
  const byCount = new Map();
  for (const b of set.bonuses) {
    if (b.perfected) continue; // standard tiers only
    if (b.numRequired != null && b.description) byCount.set(b.numRequired, b.description);
  }
  dumpByName.set(norm(set.name), { name: set.name, byCount });
}

// --- target files (GearSetData shape only) --------------------------------
const files = ['heavy', 'light', 'medium', 'mythics'].map((f) =>
  path.join(ROOT, 'src/data/Gear Sets', `${f}.ts`),
);

// One set object: `export const x: GearSetData = { name: '...', ... bonuses: [ ... ] }`.
// Capture the name and the bonuses array body so we can rewrite individual strings.
const SET_RE =
  /export const \w+:\s*GearSetData\s*=\s*\{[\s\S]*?\bname:\s*'((?:[^\\']|\\.)*)'[\s\S]*?\bbonuses:\s*\[([\s\S]*?)\]/g;
// One bonus string literal inside the bonuses array (single-quoted, may be multiline-escaped).
const BONUS_RE = /'((?:[^\\']|\\.)*)'/g;

const toSingleQuoted = (s) =>
  "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const unescape = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

let setsSeen = 0;
let setsMatched = 0;
let bonusesUpdated = 0;
let bonusesUnchanged = 0;
const unmatchedSets = [];
const unmatchedTiers = []; // { set, count }
const perFile = [];

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let fileUpdated = 0;

  const next = original.replace(SET_RE, (full, nameRaw, bonusesBody) => {
    setsSeen++;
    const dumpSet = dumpByName.get(norm(unescape(nameRaw)));
    if (!dumpSet) {
      unmatchedSets.push(unescape(nameRaw));
      return full;
    }
    setsMatched++;

    const newBody = bonusesBody.replace(BONUS_RE, (lit, body) => {
      const count = pieceCount(unescape(body));
      if (count == null) return lit;
      const dumpDesc = dumpSet.byCount.get(count);
      if (!dumpDesc) {
        unmatchedTiers.push({ set: dumpSet.name, count });
        return lit;
      }
      const newLit = toSingleQuoted(dumpDesc);
      if (newLit === lit) {
        bonusesUnchanged++;
        return lit;
      }
      bonusesUpdated++;
      fileUpdated++;
      return newLit;
    });

    return full.replace(bonusesBody, newBody);
  });

  if (fileUpdated > 0) {
    perFile.push({ file: path.relative(ROOT, file), updated: fileUpdated });
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`=== Gear bonus refresh ${WRITE ? '(WRITE)' : '(dry run)'} ===`);
console.log(`Sets seen:          ${setsSeen}`);
console.log(`Sets matched:       ${setsMatched} / ${setsSeen} (${((100 * setsMatched) / setsSeen).toFixed(1)}%)`);
console.log(`Bonus tiers updated:${bonusesUpdated}`);
console.log(`Bonus tiers current:${bonusesUnchanged}`);
console.log(`Files touched:      ${perFile.length}`);
for (const p of perFile.sort((a, b) => b.updated - a.updated)) {
  console.log(`  ${String(p.updated).padStart(4)}  ${p.file}`);
}

if (unmatchedSets.length) {
  console.log(`\n--- Unmatched sets (${unmatchedSets.length}, kept as-is) ---`);
  for (const n of unmatchedSets) console.log(`  ${n}`);
}
if (unmatchedTiers.length) {
  console.log(`\n--- Matched set but missing tier in dump (${unmatchedTiers.length}, kept) ---`);
  for (const t of unmatchedTiers.slice(0, 40)) console.log(`  (${t.count}) ${t.set}`);
  if (unmatchedTiers.length > 40) console.log(`  ... +${unmatchedTiers.length - 40} more`);
}
if (!WRITE) console.log('\n(dry run — re-run with --write to apply)');
