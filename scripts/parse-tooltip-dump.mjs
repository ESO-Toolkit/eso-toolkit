#!/usr/bin/env node
/**
 * parse-tooltip-dump.mjs
 *
 * Reads the ESOTooltipDump addon's SavedVariables Lua file and emits a clean,
 * id-keyed JSON document (data/tooltip-dump.json) for downstream data regeneration.
 *
 * Responsibilities:
 *   - Parse the (regular, machine-generated) Lua table into a JS object.
 *   - Strip ESO inline markup (|cRRGGBB..|r color codes, gender/grammar carets).
 *   - Map numeric skillType enum -> category slug, group abilities by skill line.
 *   - Normalize set bonuses.
 *   - Print a health report so an empty/degraded dump is loud, not silent.
 *
 * Usage:
 *   node scripts/parse-tooltip-dump.mjs [path-to-ESOTooltipDump.lua] [--out <file>]
 *
 * If no input path is given, it looks in the default ESO SavedVariables location.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// skillType enum -> category slug (ESO SKILL_TYPE_* ordering)
// ---------------------------------------------------------------------------
const SKILL_TYPE_CATEGORY = {
  1: 'class',
  2: 'weapon',
  3: 'armor',
  4: 'world',
  5: 'guild',
  6: 'alliance-war',
  7: 'racial',
  8: 'craft',
};

// ---------------------------------------------------------------------------
// Markup stripping
// ---------------------------------------------------------------------------

/**
 * Removes ESO inline string markup, leaving clean plain text.
 *  - |cRRGGBB ... |r   color spans (keep inner text, drop the codes)
 *  - ^M/^F/^n/^p ...   gender/number grammar carets appended to words
 *  - trailing "Current bonus/amount/duration/penalty: ..." dynamic readouts
 *    (these reflect the dumping character's live state, not static skill data)
 *  - collapses doubled whitespace introduced by removals
 */
export function stripMarkup(raw) {
  if (raw == null) return raw;
  let s = String(raw);
  // Color codes: |cRRGGBB (open) and |r (reset). Hex is exactly 6 chars.
  s = s.replace(/\|c[0-9a-fA-F]{6}/g, '');
  s = s.replace(/\|r/g, '');
  // Grammar/gender carets: ^ followed by a single control letter (M/F/N/P/n/p/etc.)
  // ESO appends these to nouns; safe to drop for plain-text display.
  s = s.replace(/\^[a-zA-Z]/g, '');
  // Any stray leftover pipe-escapes.
  s = s.replace(/\|\|/g, '|');
  // Strip in-game dynamic "Current ..." readouts — the live state of the dumping char,
  // not static data. Both skills ("Current bonus: 0%") and sets ("Current value: 0%",
  // "Current 174 Weapon and Spell Damage", "Current Durations\n...") use free-form
  // phrasings, so match any "Current ..." segment that begins right after a line/para
  // break, running to the next blank-line paragraph break (or end). Case-sensitive on the
  // capital C so real prose ("based on your current Health") is untouched. Repeat for
  // multiple readouts; PRESERVE any static clause that follows one.
  {
    let prev;
    do {
      prev = s;
      s = s.replace(/\n+\s*Current [^\n]*(?:\n(?!\n)[^\n]*)*(\n\n|$)/, (_m, tail) =>
        tail === '\n\n' ? '\n\n' : '',
      );
    } while (s !== prev);
    s = s.replace(/\n{3,}/g, '\n\n');
  }
  // Tidy whitespace: collapse runs of spaces/tabs, drop spaces hugging a newline
  // (ESO tooltips often carry a trailing space before a paragraph break), then trim.
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
  s = s.trim();
  return s;
}

// ---------------------------------------------------------------------------
// Minimal Lua-table parser for the addon's machine-generated SavedVariables.
// The format is regular: keys are ["name"] or [n], values are strings, numbers,
// booleans, or nested { }. This is a focused tokenizer, not a general Lua parser.
// ---------------------------------------------------------------------------

export function parseLuaTable(text) {
  // Strip the leading `VarName =` assignment, keep from the first `{`.
  const braceStart = text.indexOf('{');
  if (braceStart === -1) throw new Error('No table found in SavedVariables file');
  let i = braceStart;

  function skipWs() {
    while (i < text.length) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        i++;
      } else if (c === '-' && text[i + 1] === '-') {
        // Lua line comment
        while (i < text.length && text[i] !== '\n') i++;
      } else {
        break;
      }
    }
  }

  function parseString() {
    // assumes text[i] === '"'
    i++; // opening quote
    let out = '';
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') {
        const next = text[i + 1];
        if (next === 'n') out += '\n';
        else if (next === 't') out += '\t';
        else if (next === 'r') out += '\r';
        else if (next === '"') out += '"';
        else if (next === '\\') out += '\\';
        else out += next;
        i += 2;
      } else if (c === '"') {
        i++; // closing quote
        return out;
      } else {
        out += c;
        i++;
      }
    }
    throw new Error('Unterminated string at offset ' + i);
  }

  function parseValue() {
    skipWs();
    const c = text[i];
    if (c === '{') return parseTable();
    if (c === '"') return parseString();
    // literal: number, true, false, nil — read until delimiter
    let start = i;
    while (i < text.length && !',}\r\n'.includes(text[i])) i++;
    const lit = text.slice(start, i).trim();
    if (lit === 'true') return true;
    if (lit === 'false') return false;
    if (lit === 'nil') return null;
    const num = Number(lit);
    return Number.isNaN(num) ? lit : num;
  }

  function parseKey() {
    // expects ["..."] or [n]
    skipWs();
    if (text[i] !== '[') return null;
    i++; // [
    skipWs();
    let key;
    if (text[i] === '"') {
      key = parseString();
    } else {
      let start = i;
      while (i < text.length && text[i] !== ']') i++;
      key = Number(text.slice(start, i).trim());
    }
    skipWs();
    if (text[i] !== ']') throw new Error('Expected ] at offset ' + i);
    i++; // ]
    skipWs();
    if (text[i] !== '=') throw new Error('Expected = at offset ' + i);
    i++; // =
    return key;
  }

  function parseTable() {
    // assumes text[i] === '{'
    i++; // {
    const obj = {};
    let arrayMode = true;
    let arrayIndexSeen = 0;
    for (;;) {
      skipWs();
      if (text[i] === '}') {
        i++;
        break;
      }
      const key = parseKey();
      const val = parseValue();
      obj[key] = val;
      if (typeof key === 'number') arrayIndexSeen++;
      else arrayMode = false;
      skipWs();
      if (text[i] === ',') i++;
    }
    // Convert pure 1..n integer-keyed tables into arrays.
    if (arrayMode && arrayIndexSeen > 0) {
      const arr = [];
      for (let k = 1; obj[k] !== undefined; k++) arr.push(obj[k]);
      if (arr.length === arrayIndexSeen) return arr;
    }
    return obj;
  }

  return parseTable();
}

// ---------------------------------------------------------------------------
// Transform raw SV object -> clean structured output
// ---------------------------------------------------------------------------

// Empty Lua tables `{}` are ambiguous (could be empty array or empty object) and
// parse as {}. Coerce list-shaped fields back to arrays.
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}

function cleanAbility(ab) {
  const out = {
    id: ab.id,
    name: stripMarkup(ab.name),
    morphChoice: ab.morphChoice,
    rank: ab.rank,
  };
  if (ab.description) out.description = stripMarkup(ab.description);
  if (ab.descriptionHeader) out.descriptionHeader = stripMarkup(ab.descriptionHeader);
  if (ab.icon) out.icon = ab.icon;
  if (ab.skillRankNeeded != null) out.skillRankNeeded = ab.skillRankNeeded;
  if (ab.characterLevelNeeded != null) out.characterLevelNeeded = ab.characterLevelNeeded;
  if (ab.stats) {
    const s = ab.stats;
    out.stats = {};
    if (s.costs) out.stats.costs = s.costs;
    if (s.durationMs != null) out.stats.durationMs = s.durationMs;
    if (s.castDurationMs != null) out.stats.castDurationMs = s.castDurationMs;
    if (s.channeled != null) out.stats.channeled = s.channeled;
    if (s.target) out.stats.target = stripMarkup(s.target);
    if (s.minRangeCM != null) out.stats.minRangeCM = s.minRangeCM;
    if (s.maxRangeCM != null) out.stats.maxRangeCM = s.maxRangeCM;
    if (s.radiusCM != null) out.stats.radiusCM = s.radiusCM;
    if (s.roles) out.stats.roles = s.roles;
  }
  return out;
}

function transform(sv) {
  // Group skill slots by category + line.
  const linesMap = new Map(); // key: `${category}::${lineName}` -> line object
  let skippedEmpty = 0;
  for (const slot of asArray(sv.skills)) {
    const morphs = asArray(slot.morphs);
    // Skip empty slots the game returned (no abilities, no name).
    if (morphs.length === 0 && !slot.name) {
      skippedEmpty++;
      continue;
    }
    const category = SKILL_TYPE_CATEGORY[slot.skillType] ?? `type-${slot.skillType}`;
    const lineName = slot.lineName ?? `line-${slot.lineId ?? slot.skillType}`;
    const key = `${category}::${lineName}`;
    if (!linesMap.has(key)) {
      linesMap.set(key, {
        category,
        lineName,
        lineId: slot.lineId,
        skillType: slot.skillType,
        skills: [],
      });
    }
    linesMap.get(key).skills.push({
      name: stripMarkup(slot.name),
      passive: !!slot.passive,
      ultimate: !!slot.ultimate,
      progressionIndex: slot.progressionIndex,
      abilityIndex: slot.abilityIndex,
      morphs: morphs.map(cleanAbility),
    });
  }
  if (skippedEmpty) console.log(`(skipped ${skippedEmpty} empty skill slots)`);

  const sets = asArray(sv.sets).map((set) => ({
    id: set.id,
    name: stripMarkup(set.name),
    maxEquipped: set.maxEquipped,
    bonuses: asArray(set.bonuses).map((b) => ({
      numRequired: b.numRequired,
      description: stripMarkup(b.description),
      perfected: !!b.perfected,
    })),
  }));

  // ID-driven pass: abilities captured directly by id (scribing grimoires/morphs
  // and the AbilityId enum) that the skill-tree walk cannot enumerate. Same shape
  // as a morph entry; consumed by the refresh by id.
  const abilitiesById = asArray(sv.abilitiesById).map(cleanAbility);

  return {
    meta: {
      formatVersion: sv.formatVersion,
      apiVersion: sv.apiVersion,
      statSnapshot: sv.statSnapshot,
      setIdSource: sv.setIdSource,
    },
    skillLines: [...linesMap.values()],
    sets,
    abilitiesById,
  };
}

// ---------------------------------------------------------------------------
// Health report — surfaces a degraded dump loudly
// ---------------------------------------------------------------------------

function report(result) {
  const lines = result.skillLines;
  let abilities = 0;
  let withDesc = 0;
  let tokenLeak = 0;
  for (const line of lines) {
    for (const skill of line.skills) {
      for (const ab of skill.morphs) {
        abilities++;
        if (ab.description) withDesc++;
        if (ab.description && /<<\d|\|c[0-9a-f]{6}/i.test(ab.description)) tokenLeak++;
      }
    }
  }
  let setBonuses = 0;
  let setTokenLeak = 0;
  for (const set of result.sets) {
    for (const b of set.bonuses) {
      setBonuses++;
      if (b.description && /<<\d|\|c[0-9a-f]{6}/i.test(b.description)) setTokenLeak++;
    }
  }

  const byId = result.abilitiesById ?? [];
  let byIdWithDesc = 0;
  let byIdTokenLeak = 0;
  for (const ab of byId) {
    if (ab.description) byIdWithDesc++;
    if (ab.description && /<<\d|\|c[0-9a-f]{6}/i.test(ab.description)) byIdTokenLeak++;
  }

  const byCategory = {};
  for (const line of lines) byCategory[line.category] = (byCategory[line.category] ?? 0) + 1;

  console.log('\n=== Tooltip dump parse report ===');
  console.log(`API version:        ${result.meta.apiVersion}`);
  console.log(`Skill lines:        ${lines.length}`);
  console.log(`  by category:      ${JSON.stringify(byCategory)}`);
  console.log(`Abilities:          ${abilities}`);
  console.log(`  with description: ${withDesc}`);
  console.log(`  markup leak:      ${tokenLeak} ${tokenLeak ? '  <-- WARNING' : 'OK'}`);
  console.log(`Sets:               ${result.sets.length}`);
  console.log(`  set bonuses:      ${setBonuses}`);
  console.log(`  markup leak:      ${setTokenLeak} ${setTokenLeak ? '  <-- WARNING' : 'OK'}`);
  console.log(`Abilities by id:    ${byId.length}`);
  console.log(`  with description: ${byIdWithDesc}`);
  console.log(`  markup leak:      ${byIdTokenLeak} ${byIdTokenLeak ? '  <-- WARNING' : 'OK'}`);

  const problems = [];
  if (abilities === 0) problems.push('no abilities parsed');
  if (withDesc < abilities * 0.95) problems.push('many abilities missing descriptions');
  if (tokenLeak > 0 || setTokenLeak > 0 || byIdTokenLeak > 0)
    problems.push('markup leaked into output');
  if (result.sets.length === 0) problems.push('no sets parsed');
  if (problems.length) {
    console.log(`\n!! ISSUES: ${problems.join('; ')}`);
  } else {
    console.log('\nAll health checks passed.');
  }
  return problems.length === 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function defaultInputPath() {
  return path.join(
    os.homedir(),
    'Documents',
    'Elder Scrolls Online',
    'live',
    'SavedVariables',
    'ESOTooltipDump.lua',
  );
}

function main() {
  const argv = process.argv.slice(2);
  let inputPath = null;
  let outPath = path.join(process.cwd(), 'data', 'tooltip-dump.json');
  for (let k = 0; k < argv.length; k++) {
    if (argv[k] === '--out') outPath = argv[++k];
    else inputPath = argv[k];
  }
  if (!inputPath) inputPath = defaultInputPath();

  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    console.error(
      'Run the ESOTooltipDump addon in-game (see tools/eso-tooltip-dump/RUN-CHECKLIST.md).',
    );
    process.exit(1);
  }

  console.log(`Reading: ${inputPath}`);
  const text = fs.readFileSync(inputPath, 'utf8');
  const sv = parseLuaTable(text);
  const result = transform(sv);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote: ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)} MB)`);

  // Emit a compact provenance fingerprint (normalized descriptions + per-set bonus
  // lists) that the CI provenance gate reads. The full dump is a gitignored build
  // intermediate; this fingerprint is committed so the gate runs without it.
  const fpPath = path.join(path.dirname(outPath), 'tooltip-provenance.json');
  writeProvenanceFingerprint(result, fpPath);
  console.log(`Wrote: ${fpPath} (${(fs.statSync(fpPath).size / 1e6).toFixed(2)} MB)`);

  const ok = report(result);
  process.exit(ok ? 0 : 2);
}

// Normalization shared with the provenance gate (must stay in sync with
// scripts/check-tooltip-provenance.mjs `norm`).
export function normForProvenance(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function writeProvenanceFingerprint(result, outPath) {
  const descriptions = new Set();
  for (const line of result.skillLines)
    for (const sk of line.skills)
      for (const ab of sk.morphs || []) {
        const n = normForProvenance(ab.description);
        if (n) descriptions.add(n);
      }
  for (const ab of result.abilitiesById || []) {
    const n = normForProvenance(ab.description);
    if (n) descriptions.add(n);
  }
  const setBonuses = {};
  for (const s of result.sets) {
    const list = s.bonuses
      .filter((b) => !b.perfected && b.description)
      .map((b) => normForProvenance(b.description));
    if (list.length) setBonuses[normForProvenance(s.name)] = list;
  }
  fs.writeFileSync(
    outPath,
    JSON.stringify({ descriptions: [...descriptions], setBonuses }),
  );
}

// Run only when invoked directly (allows importing stripMarkup/parseLuaTable in tests).
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) main();
