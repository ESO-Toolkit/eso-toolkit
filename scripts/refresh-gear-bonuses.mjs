#!/usr/bin/env node
/**
 * refresh-gear-bonuses.mjs
 *
 * Keyed update: refreshes the `bonuses` strings of standard gear sets in
 * src/data/Gear Sets/{heavy,light,medium,mythics}.ts from data/tooltip-dump.json.
 * These files use the GearSetData shape (bonuses: string[] each prefixed "(N items)").
 *
 * Matching:
 *   set      — by normalized name (app name -> dump set name; both quote styles, so
 *              apostrophe sets like "Healer's Habit" are not skipped)
 *   bonuses  — the set's ENTIRE bonuses array is replaced with the dump's full ordered
 *              bonus list. (Per-count swapping silently dropped a tier when a set had
 *              two bonuses at the same piece count, e.g. "(5 items) Adds X" PLUS
 *              "(5 items) <effect>"; whole-array replace preserves every tier.)
 * set name/icon/setType/structure are untouched. The dump's bonus.description already
 * carries the "(N items)" prefix in the app's format.
 *
 * Non-perfected bonuses only (perfected tiers are a separate display concern handled
 * by the arena/monster pass). Unmatched sets are LOGGED in full — no silent caps.
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

// --- dump: set name -> ordered full bonus list ----------------------------
// Whole-array replace: a set's app `bonuses` are replaced with the dump's FULL
// ordered bonus list. Per-count swapping silently dropped bonuses when a set has
// two tiers at the same piece count (e.g. "(5 items) Adds X" + "(5 items) <effect>");
// replacing the whole list preserves every tier the game shows.
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const dumpByName = new Map();
for (const set of dump.sets) {
  const list = [];
  for (const b of set.bonuses) {
    if (b.perfected) continue; // standard tiers only (arena/monster perfected = separate pass)
    if (b.description) list.push(b.description);
  }
  dumpByName.set(norm(set.name), { name: set.name, list });
}

// --- target files (GearSetData shape only) --------------------------------
// arena.ts is GearSetData (enchant-named arena sets: Crushing Wall, etc.).
// arena-specials.ts/monster.ts are SkillsetData (separate conversion).
const files = ['heavy', 'light', 'medium', 'mythics', 'arena'].map((f) =>
  path.join(ROOT, 'src/data/Gear Sets', `${f}.ts`),
);

// One set object: `export const x: GearSetData = { name: '...', ... bonuses: [ ... ] }`.
// Name + bonuses array body. Name may be single- OR double-quoted (apostrophe sets
// like "Healer's Habit" / "Death's Wind" use double quotes) — both must match or
// those sets are silently skipped.
const SET_RE =
  /export const \w+:\s*GearSetData\s*=\s*\{[\s\S]*?\bname:\s*(['"])((?:[^\\]|\\.)*?)\1([\s\S]*?\bbonuses:\s*\[)([\s\S]*?)(\])/g;

const toSingleQuoted = (s) =>
  "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const unescape = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

// Detect the indentation used for bonus entries so the rewritten array matches.
function bonusIndent(body) {
  const m = body.match(/\n([ \t]+)\S/);
  return m ? m[1] : '    ';
}

let setsSeen = 0;
let setsMatched = 0;
let setsRewritten = 0;
const unmatchedSets = [];
const perFile = [];

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let fileRewritten = 0;

  const next = original.replace(SET_RE, (full, _q, nameRaw, head, bonusesBody, close) => {
    setsSeen++;
    // App names sometimes carry a leading "The " the game omits (e.g. app
    // "The Prowler's Talisman" vs in-game "Prowler's Talisman") — try both ways.
    const appName = norm(unescape(nameRaw));
    const dumpSet =
      dumpByName.get(appName) ??
      dumpByName.get(appName.replace(/^the/, '')) ??
      dumpByName.get('the' + appName);
    if (!dumpSet || dumpSet.list.length === 0) {
      unmatchedSets.push(unescape(nameRaw));
      return full;
    }
    setsMatched++;

    const indent = bonusIndent(bonusesBody);
    const newBody =
      '\n' +
      dumpSet.list.map((d) => indent + toSingleQuoted(d) + ',').join('\n') +
      '\n' +
      indent.replace(/[ \t]{2}$/, ''); // closing-bracket indent (one level out)

    const rebuilt = head + newBody + close;
    // Skip no-op rewrites by comparing bonus string VALUES, not literal text:
    // prettier may re-quote ('It\'s' -> "It's") or re-wrap the array, neither of
    // which is a content change worth rewriting (kept layout-stable for prettier).
    const existingValues = [];
    const STR_RE = /(['"])((?:[^\\]|\\.)*?)\1/g;
    let sm;
    while ((sm = STR_RE.exec(bonusesBody))) existingValues.push(unescape(sm[2]));
    if (
      existingValues.length === dumpSet.list.length &&
      existingValues.every((v, k) => v === dumpSet.list[k])
    ) {
      return full;
    }
    setsRewritten++;
    fileRewritten++;
    return full.replace(head + bonusesBody + close, rebuilt);
  });

  if (fileRewritten > 0) {
    perFile.push({ file: path.relative(ROOT, file), updated: fileRewritten });
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`=== Gear bonus refresh ${WRITE ? '(WRITE)' : '(dry run)'} ===`);
console.log(`Sets seen:          ${setsSeen}`);
console.log(
  `Sets matched:       ${setsMatched} / ${setsSeen} (${((100 * setsMatched) / setsSeen).toFixed(1)}%)`,
);
console.log(`Sets rewritten:     ${setsRewritten} (whole bonus list replaced)`);
console.log(`Files touched:      ${perFile.length}`);
for (const p of perFile.sort((a, b) => b.updated - a.updated)) {
  console.log(`  ${String(p.updated).padStart(4)}  ${p.file}`);
}

if (unmatchedSets.length) {
  console.log(`\n--- Unmatched sets (${unmatchedSets.length}, kept as-is) ---`);
  for (const n of unmatchedSets) console.log(`  ${n}`);
}
if (!WRITE) console.log('\n(dry run — re-run with --write to apply)');
