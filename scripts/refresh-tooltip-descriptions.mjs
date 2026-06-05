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
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

// --- dump indexes ---------------------------------------------------------
const dump = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tooltip-dump.json'), 'utf8'));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const dumpById = new Map();
const dumpByName = new Map();
for (const line of dump.skillLines) {
  for (const sk of line.skills) {
    for (const ab of sk.morphs || []) {
      if (ab.id != null && ab.description && !dumpById.has(ab.id)) dumpById.set(ab.id, ab);
      const k = norm(ab.name);
      if (k && ab.description && !dumpByName.has(k)) dumpByName.set(k, ab);
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
const files = execSync('find src/data/skill-lines -name "*.ts"', { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter((f) => !/ability-ids\.ts$|index\.ts$|calculator-data\.ts$/.test(f));

let totalSkills = 0;
let updated = 0;
let unchanged = 0;
let unmatched = 0;
const perFile = [];

// Matches one skill object's id + name, then captures the description value
// (single- or multi-line, single-quoted with escaped quotes inside).
const SKILL_RE =
  /(\bid:\s*([\w.]+)\s*,[\s\S]{0,120}?\bname:\s*'((?:[^'\\]|\\.)*)'[\s\S]{0,160}?\bdescription:\s*)('(?:[^'\\]|\\.)*')/g;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let fileUpdated = 0;
  let fileUnmatched = 0;

  const next = original.replace(SKILL_RE, (full, head, idTok, nameRaw, oldDesc) => {
    totalSkills++;
    const id = resolveId(idTok);
    let hit = id != null ? dumpById.get(id) : undefined;
    if (!hit) hit = dumpByName.get(norm(nameRaw.replace(/\\'/g, "'")));
    if (!hit || !hit.description) {
      unmatched++;
      fileUnmatched++;
      return full; // keep current
    }
    const newDesc = toSingleQuoted(hit.description);
    if (newDesc === oldDesc) {
      unchanged++;
      return full;
    }
    updated++;
    fileUpdated++;
    return head + newDesc;
  });

  if (fileUpdated > 0) {
    perFile.push({ file: path.relative(ROOT, file), updated: fileUpdated, unmatched: fileUnmatched });
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
