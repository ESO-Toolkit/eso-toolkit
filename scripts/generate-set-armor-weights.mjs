/**
 * generate-set-armor-weights.mjs
 *
 * Generates `src/features/build-editor/data/setArmorWeights.generated.ts` — a
 * map of set name → locked armor weight for sets that only come in ONE weight.
 *
 * AUTHORITATIVE SOURCE: LibSets `LIBSETS_TABLEKEY_SETS_ARMOR_TYPES` table
 * (LibSets/Data/LibSets_Data_SetOtherData.lua on the LibSets-reworked branch),
 * keyed [1]=light [2]=medium [3]=heavy → { setId = 1, ... }.
 *
 * Why not the local collection JSON? Its `weight` field is a player-collection
 * dump and is INCOMPLETE (e.g. shows Mother's Sorrow as light+medium only).
 * The LibSets debug-scan table is complete for 1-weight and 3-weight sets.
 *
 * Classification rule (verified by a 23-set adversarial web check, 19/23 exact):
 *   - set in all 3 weights  → ALL-WEIGHT (free choice): crafted + monster sets.
 *   - set in exactly 1 weight → LOCKED to that weight: overland/dungeon/trial
 *     drops + mythics.
 *   - set in exactly 2 weights → ARTIFACT (legacy item / single mis-flagged slot
 *     / scraper glitch). All 4 known two-weight sets are actually single-weight;
 *     they're resolved via TWO_WEIGHT_OVERRIDES below. Any *other* two-weight set
 *     is left FREE to avoid a false lock.
 *
 * Refresh:
 *   1. gh api repos/Baertram/LibSets/contents/LibSets/Data/LibSets_Data_SetOtherData.lua?ref=LibSets-reworked --jq '.content' | base64 -d > .scratch/libsets_otherdata.lua
 *   2. node scripts/generate-set-armor-weights.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LUA_PATH = path.join(ROOT, '.scratch', 'libsets_otherdata.lua');
const SET_NAMES_PATH = path.join(ROOT, 'data', 'libsets-set-names.json');
const OUT_PATH = path.join(
  ROOT,
  'src',
  'features',
  'build-editor',
  'data',
  'setArmorWeights.generated.ts',
);

// ── Verified overrides for the 4 LibSets two-weight artifacts ────────────────
// Each was confirmed single-weight by authoritative web sources (eso-hub,
// hacktheminotaur, arzyelarmory). See project memory for the verification run.
const TWO_WEIGHT_OVERRIDES = {
  643: 'light', // Blessing of High Isle — overland, light only (LibSets said L+H)
  34: 'medium', // Night Mother's Embrace — medium now; heavy is a legacy TG-era vestige
  135: 'heavy', // Draugr's Heritage — heavy only; "medium feet" is a mis-flag
  644: 'medium', // Steadfast's Mettle — medium only (LibSets said M+H)
};

// ── Parse the LibSets armor-types table ──────────────────────────────────────

function parseArmorTypes(lua) {
  const startTok = 'LIBSETS_TABLEKEY_SETS_ARMOR_TYPES] = {';
  const start = lua.indexOf(startTok);
  if (start === -1) throw new Error('SETS_ARMOR_TYPES table not found in lua');

  // Brace-match to find the full {...} for the 3 keys.
  let i = start + startTok.length - 1;
  let depth = 0;
  let end = -1;
  for (; i < lua.length; i++) {
    if (lua[i] === '{') depth++;
    else if (lua[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error('Unbalanced braces in SETS_ARMOR_TYPES table');
  const block = lua.slice(start + startTok.length - 1, end + 1);

  const parseList = (k) => {
    const tok = `[${k}]={`;
    const s = block.indexOf(tok);
    if (s === -1) return new Set();
    let j = s + tok.length - 1;
    let d = 0;
    let e = -1;
    for (; j < block.length; j++) {
      if (block[j] === '{') d++;
      else if (block[j] === '}') {
        d--;
        if (d === 0) {
          e = j;
          break;
        }
      }
    }
    const inner = block.slice(s + tok.length, e);
    return new Set([...inner.matchAll(/\[(\d+)\]=1/g)].map((m) => Number(m[1])));
  };

  return { light: parseList(1), medium: parseList(2), heavy: parseList(3) };
}

// ── Same normalization the runtime registry uses (gearSetRegistry.ts) ────────
const normalize = (name) =>
  name
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/[‘’]/g, "'") // curly single quotes → straight apostrophe
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ── Main ─────────────────────────────────────────────────────────────────────

const lua = fs.readFileSync(LUA_PATH, 'utf8');
const { light, medium, heavy } = parseArmorTypes(lua);
const setNames = JSON.parse(fs.readFileSync(SET_NAMES_PATH, 'utf8')).sets;

const allSetIds = new Set([...light, ...medium, ...heavy]);

/** setId → 'light'|'medium'|'heavy'|null(free) */
function lockedWeightForSet(id) {
  const weights = [];
  if (light.has(id)) weights.push('light');
  if (medium.has(id)) weights.push('medium');
  if (heavy.has(id)) weights.push('heavy');
  if (weights.length === 1) return weights[0];
  if (weights.length === 2) return TWO_WEIGHT_OVERRIDES[id] ?? null; // artifact → override or free
  return null; // all 3 (or 0) → free
}

// Build normalizedSetName → weight. Skip free sets entirely (absence = free).
const byName = {};
let locked = 0;
let free = 0;
let unnamed = 0;
for (const id of allSetIds) {
  const w = lockedWeightForSet(id);
  if (!w) {
    free++;
    continue;
  }
  const names = setNames[id];
  const en = names && names.en;
  if (!en) {
    unnamed++;
    continue;
  }
  byName[normalize(en)] = w;
  locked++;
}

// Deterministic key order for a stable diff.
const sortedEntries = Object.entries(byName).sort(([a], [b]) => a.localeCompare(b));

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: LibSets LIBSETS_TABLEKEY_SETS_ARMOR_TYPES (LibSets-reworked branch).
 * Generator: scripts/generate-set-armor-weights.mjs
 *
 * Maps a NORMALIZED set name (see normalizeSetName in setArmorWeights.ts) to the
 * single armor weight that set is locked to in-game. Sets that come in all three
 * weights (crafted + monster sets) are intentionally ABSENT — absence means
 * "free choice". See the generator header for the full classification rule.
 *
 * Locked sets: ${locked} · Free (all-weight) sets: ${free}
 */

import type { ArmorWeight } from '../../loadout-manager/types/loadout.types';

export const LOCKED_SET_ARMOR_WEIGHTS: Readonly<Record<string, ArmorWeight>> = {
`;

// Quote keys the way Prettier (quoteProps: 'as-needed', singleQuote: true)
// would, so the generated file passes `format:check` without a manual pass:
//  - valid JS identifier → no quotes (e.g. affliction)
//  - otherwise → single quotes, or double quotes if the key contains a "'".
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const quoteKey = (name) => {
  if (IDENTIFIER_RE.test(name)) return name;
  return name.includes("'") ? JSON.stringify(name) : `'${name}'`;
};

const body = sortedEntries.map(([name, w]) => `  ${quoteKey(name)}: '${w}',`).join('\n');

const footer = `
};
`;

fs.writeFileSync(OUT_PATH, header + body + footer);

console.log(`Parsed armor types — L:${light.size} M:${medium.size} H:${heavy.size}`);
console.log(
  `Locked sets: ${locked} · Free sets: ${free} · Locked-but-unnamed (skipped): ${unnamed}`,
);
console.log(`Wrote ${OUT_PATH}`);
