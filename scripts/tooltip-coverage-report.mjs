#!/usr/bin/env node
/**
 * tooltip-coverage-report.mjs
 *
 * Decides go/no-go for a description refresh from the tooltip dump.
 * Matches committed skill entries to dump abilities BY RESOLVED ABILITY ID
 * (not by name — names drift across patches, e.g. staff element variants).
 *
 * Reports: how many committed skills resolve to a numeric id, how many of those
 * are present in the dump by id, and lists the unmatched (which would keep their
 * current text under a keyed update).
 *
 * Usage: node scripts/tooltip-coverage-report.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// --- Load enum maps (NAME -> number) -------------------------------------
function loadEnumMap(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const map = new Map();
  const re = /^\s*([A-Z0-9_]+)\s*=\s*(\d+)/gm;
  let m;
  while ((m = re.exec(txt))) map.set(m[1], Number(m[2]));
  return map;
}

const enums = {};
const enumFiles = {
  ClassSkillId: 'src/features/loadout-manager/data/classSkillIds.ts',
  AbilityId: 'src/data/skill-lines/ability-ids.ts',
};
for (const [name, rel] of Object.entries(enumFiles)) {
  const f = path.join(ROOT, rel);
  if (fs.existsSync(f)) enums[name] = loadEnumMap(f);
}

// Resolve an `id:` RHS token to a number: either a literal, or EnumName.CONST.
function resolveId(token) {
  token = token.trim().replace(/,$/, '');
  if (/^\d+$/.test(token)) return Number(token);
  const m = token.match(/^([A-Za-z0-9_]+)\.([A-Z0-9_]+)$/);
  if (m && enums[m[1]]) return enums[m[1]].get(m[2]) ?? null;
  return null;
}

// --- Collect committed skill entries (id + name) -------------------------
// Portable recursive .ts walk (POSIX `find` is unavailable on Windows/PowerShell).
function walkTs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}
const skillFiles = walkTs(path.join(ROOT, 'src/data/skill-lines')).filter(
  (f) => !/ability-ids\.ts$|index\.ts$|calculator-data\.ts$/.test(f),
);

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const committed = []; // { id, altIds, name, file }
for (const f of skillFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  // Match `id: <token>,` ... `name: '...'`, capturing the chunk between (for alternateIds).
  // Cap is generous to span long multiline `alternateIds` arrays (e.g. Devour ~130 ids).
  const re = /\bid:\s*([A-Za-z0-9_.]+)\s*,([\s\S]{0,2000}?)\bname:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(txt))) {
    const id = resolveId(m[1]);
    const altIds = [];
    const alt = m[2].match(/alternateIds:\s*\[([0-9,\s]*)\]/);
    if (alt)
      for (const n of alt[1].split(',')) {
        const v = Number(n.trim());
        if (v) altIds.push(v);
      }
    committed.push({ id, altIds, name: m[3], file: path.relative(ROOT, f), rawId: m[1] });
  }
}

// --- Collect dump ability ids --------------------------------------------
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const dumpIds = new Set();
const dumpNames = new Set();
for (const line of dump.skillLines) {
  for (const sk of line.skills) {
    for (const ab of sk.morphs) {
      if (ab.id != null) dumpIds.add(ab.id);
      if (ab.name) dumpNames.add(norm(ab.name));
    }
  }
}

// --- Report ---------------------------------------------------------------
// A skill is "matched" if its primary id, ANY alternateId, or its name is in the dump
// (the refresh resolves across the same id-group + name fallback).
const isMatched = (c) =>
  (c.id != null && dumpIds.has(c.id)) ||
  c.altIds.some((a) => dumpIds.has(a)) ||
  dumpNames.has(norm(c.name));
const resolved = committed.filter((c) => c.id != null);
const unresolved = committed.filter((c) => c.id == null);
const matched = resolved.filter(isMatched);
const unmatched = resolved.filter((c) => !isMatched(c));

console.log('=== Tooltip refresh coverage (match by resolved ability ID) ===');
console.log(
  `Enum maps loaded:        ${Object.entries(enums)
    .map(([k, v]) => `${k}=${v.size}`)
    .join(', ')}`,
);
console.log(`Dump abilities (by id):  ${dumpIds.size}`);
console.log(`Committed skill entries: ${committed.length}`);
console.log(`  id resolved:           ${resolved.length}`);
console.log(`  id UNresolved:         ${unresolved.length} (enum const not found / non-id token)`);
console.log(
  `Matched in dump by id:   ${matched.length} / ${resolved.length} (${((100 * matched.length) / resolved.length).toFixed(1)}%)`,
);
console.log(`Unmatched (keep current):${unmatched.length}`);

if (unmatched.length) {
  console.log('\n--- Unmatched sample (first 25, would retain existing text) ---');
  for (const c of unmatched.slice(0, 25)) {
    console.log(`  ${String(c.id).padEnd(8)} ${c.name}   [${c.file}]`);
  }
}
if (unresolved.length) {
  console.log('\n--- Unresolved id tokens sample (first 15) ---');
  for (const c of unresolved.slice(0, 15)) {
    console.log(`  ${c.rawId.padEnd(40)} ${c.name}   [${c.file}]`);
  }
}

const rate = matched.length / resolved.length;
console.log(
  `\nVERDICT: ${rate >= 0.9 ? 'HIGH coverage — safe to refresh descriptions (unmatched keep current).' : rate >= 0.7 ? 'MODERATE — investigate unmatched before refresh (possible ID drift).' : 'LOW — likely ID drift; do NOT bulk-refresh.'}`,
);
