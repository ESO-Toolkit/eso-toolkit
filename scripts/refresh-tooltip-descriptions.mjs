#!/usr/bin/env node
/**
 * refresh-tooltip-descriptions.mjs
 *
 * Keyed update: refreshes ONLY the `description` field of each skill in
 * src/data/skill-lines/*.ts from data/tooltip-dump.json. Everything else
 * (id, name, type, icon, baseSkillId, enum constants, comments, ordering,
 * file structure) is left byte-identical.
 *
 * Matching: by resolved ability ID first, then by normalized name as a
 * fallback (handles cross-patch ID drift). Unmatched skills keep their
 * current description.
 *
 * Usage:
 *   node scripts/refresh-tooltip-descriptions.mjs            # dry run (report only)
 *   node scripts/refresh-tooltip-descriptions.mjs --write    # apply changes
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

// --- dump indexes ---------------------------------------------------------
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const dumpById = new Map(); // id -> highest-rank dump entry SHARING that exact id
const dumpByName = new Map(); // normalized name -> highest-rank dump entry of that name
// Keep the HIGHEST rank: tooltip values scale by rank, and shipped data should reflect
// the max-rank (level-50) numbers players actually see. The dump lists ranks 1..4 in
// order. NOTE: some abilities split each rank into a DISTINCT id; for those, a single id
// only sees its own rank, so the matcher below also resolves across `alternateIds`.
const keepHigherRank = (map, key, ab) => {
  const cur = map.get(key);
  if (!cur || (ab.rank ?? 0) > (cur.rank ?? 0)) map.set(key, ab);
};
for (const line of dump.skillLines) {
  for (const sk of line.skills) {
    for (const ab of sk.morphs || []) {
      if (ab.id != null && ab.description) keepHigherRank(dumpById, ab.id, ab);
      const k = norm(ab.name);
      if (k && ab.description) keepHigherRank(dumpByName, k, ab);
    }
  }
}

// --- enum resolution ------------------------------------------------------
function loadEnum(file) {
  const f = path.join(ROOT, file);
  if (!fs.existsSync(f)) return new Map();
  const t = fs.readFileSync(f, 'utf8');
  const m = new Map();
  let x;
  const re = /^\s*([A-Z0-9_]+)\s*=\s*(\d+)/gm;
  while ((x = re.exec(t))) m.set(x[1], Number(x[2]));
  return m;
}
const ENUMS = {
  ClassSkillId: loadEnum('src/features/loadout-manager/data/classSkillIds.ts'),
  AbilityId: loadEnum('src/data/skill-lines/ability-ids.ts'),
};
function resolveId(tok) {
  tok = tok.trim().replace(/,$/, '');
  if (/^\d+$/.test(tok)) return Number(tok);
  const m = tok.match(/^([A-Za-z0-9_]+)\.([A-Z0-9_]+)$/);
  if (m && ENUMS[m[1]]) return ENUMS[m[1]].get(m[2]) ?? null;
  return null;
}

// Single-quote a JS string literal exactly as the existing files do.
function toSingleQuoted(s) {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

// --- per-file rewrite -----------------------------------------------------
// Portable recursive .ts walk (POSIX `find` is unavailable on Windows/PowerShell).
function walkTs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}
const files = walkTs(path.join(ROOT, 'src/data/skill-lines')).filter(
  (f) => !/ability-ids\.ts$|index\.ts$|calculator-data\.ts$/.test(f),
);

let totalSkills = 0;
let updated = 0;
let unchanged = 0;
let unmatched = 0;
const perFile = [];

// Pick the highest-rank dump entry across a set of candidate ids (the skill's `id`
// plus any `alternateIds` — abilities that split each rank into a distinct id).
function bestByIds(ids) {
  let best;
  for (const id of ids) {
    const ab = dumpById.get(id);
    if (ab && ab.description && (!best || (ab.rank ?? 0) > (best.rank ?? 0))) best = ab;
  }
  return best;
}

// Matches one skill object: id + name + (optional alternateIds) + description.
// Both name and description may be single- OR double-quoted (names with apostrophes
// use double quotes); descriptions can be multi-line. Capture groups:
//   1 head (everything up to and including `description:`)
//   2 idTok   3 quote-char-of-name  4 nameBody
//   5 alternateIds raw (optional)   6 full description literal (with its quotes)
const SKILL_RE =
  /(\bid:\s*([\w.]+)\s*,[\s\S]{0,200}?\bname:\s*(['"])((?:[^\\]|\\.)*?)\3[\s\S]{0,240}?\bdescription:\s*)((['"])(?:[^\\]|\\.)*?\6)/g;

// Pull alternateIds out of the matched skill chunk (between name and description).
const ALT_RE = /\balternateIds:\s*\[([0-9,\s]*)\]/;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let fileUpdated = 0;
  let fileUnmatched = 0;

  const next = original.replace(SKILL_RE, (full, head, idTok, _nq, nameRaw, oldDesc) => {
    totalSkills++;
    const id = resolveId(idTok);
    // Candidate ids = primary id ∪ alternateIds (rank-split siblings).
    const ids = new Set();
    if (id != null) ids.add(id);
    const altM = head.match(ALT_RE);
    if (altM)
      for (const n of altM[1].split(',')) {
        const v = Number(n.trim());
        if (v) ids.add(v);
      }

    let hit = bestByIds(ids);
    if (!hit) hit = dumpByName.get(norm(nameRaw.replace(/\\(['"])/g, '$1')));
    if (!hit || !hit.description) {
      unmatched++;
      fileUnmatched++;
      return full; // keep current
    }
    // Preserve the original quote style of the description literal.
    const quote = oldDesc[0];
    const newDesc =
      quote === '"'
        ? '"' +
          hit.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') +
          '"'
        : toSingleQuoted(hit.description);
    if (newDesc === oldDesc) {
      unchanged++;
      return full;
    }
    updated++;
    fileUpdated++;
    return head + newDesc;
  });

  if (fileUpdated > 0) {
    perFile.push({
      file: path.relative(ROOT, file),
      updated: fileUpdated,
      unmatched: fileUnmatched,
    });
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`=== Description refresh ${WRITE ? '(WRITE)' : '(dry run)'} ===`);
console.log(`Skills scanned:   ${totalSkills}`);
console.log(`Updated:          ${updated}`);
console.log(`Already current:  ${unchanged}`);
console.log(`Unmatched (kept): ${unmatched}`);
console.log(`Files touched:    ${perFile.length}`);
console.log('\nTop files by updates:');
for (const p of perFile.sort((a, b) => b.updated - a.updated).slice(0, 15)) {
  console.log(`  ${String(p.updated).padStart(3)}  ${p.file}`);
}
if (!WRITE) console.log('\n(dry run — re-run with --write to apply)');
