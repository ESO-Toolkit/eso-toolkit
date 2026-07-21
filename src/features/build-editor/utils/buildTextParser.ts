/**
 * buildTextParser — heuristic importer for pasted ESO build write-ups.
 *
 * Build guides (e.g. hyperioxes.com) publish the actual build as semi-structured
 * text: a tab-separated gear table, "Slot N: <skill>" bar lists, labeled
 * RACE / MUNDUS / ATTRIBUTES / FOOD / CHAMPION POINTS sections, etc. This parser
 * extracts what it reliably can and resolves names to the editor's ids. It is
 * deliberately fail-soft: every section is independent, and anything it can't
 * resolve is surfaced (not silently dropped) so the review UI can flag it.
 *
 * It cannot recover data that a guide renders only as images — that text simply
 * isn't present in a paste.
 */

import { ESO_CONSUMABLES } from '@/data/esoConsumables';
import { CHAMPION_POINT_ABILITIES, ChampionPointTree } from '@/types/champion-points';

import {
  getAllSetNames,
  getSetItemsBySlot,
  isItemDataReady,
} from '../../loadout-manager/data/itemIdMap';
import { getSkillByName, preloadSkillData } from '../../loadout-manager/data/skillLineSkills';
import type {
  ArmorWeight,
  GearConfig,
  SkillsConfig,
} from '../../loadout-manager/types/loadout.types';
import { getWeaponTypeLabel } from '../../loadout-manager/utils/itemIconResolver';
import {
  CLASS_SKILL_LINES,
  EQUIP_SLOTS,
  ESO_MUNDUS_STONES,
  ESO_RACES,
  type EquipSlotDef,
} from '../data/esoStaticData';
import {
  getEnchantShortName,
  getEnchantsForSlot,
  getTraitsForSlot,
} from '../data/gear-traits-enchants';
import type {
  BuildAttributes,
  BuildChampionPoints,
  ClassSkillLineId,
  ESOClass,
} from '../types/build.types';

// ─── Result shapes ─────────────────────────────────────────────────────────

export type ImportConfidence = 'ok' | 'partial' | 'unresolved';

export interface ParsedGearRow {
  slot: number;
  slotLabel: string;
  setName: string;
  itemId: number | null;
  weight?: ArmorWeight;
  trait?: string;
  traitLabel?: string;
  enchant?: string;
  enchantLabel?: string;
  status: ImportConfidence;
}

export interface ParsedSkillRow {
  bar: 0 | 1;
  slotIndex: number;
  slotLabel: string;
  name: string;
  abilityId: number | null;
}

export interface ParsedCP {
  tree: keyof BuildChampionPoints;
  id: number;
  name: string;
}

export interface ParsedBuildResult {
  esoClass?: ESOClass;
  classSkillLines?: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
  classLabel?: string;
  raceId?: string;
  raceLabel?: string;
  mundusId?: string;
  mundusLabel?: string;
  attributes?: BuildAttributes;
  foodName?: string;
  /** Resolved consumable id for foodName, when it matches the ESO food list. */
  foodId?: number;
  gear: ParsedGearRow[];
  skills: ParsedSkillRow[];
  cp: ParsedCP[];
  warnings: string[];
}

// ─── Small helpers ─────────────────────────────────────────────────────────

/** Lowercase + strip all non-alphanumerics — robust fuzzy key for name matching. */
const normKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Escape a literal string for safe use inside a RegExp. */
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Levenshtein edit distance between two short strings. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** Edit-distance budget scaled to token length (OCR garbles longer words more). */
const fuzzyBudget = (token: string): number => (token.length <= 4 ? 1 : token.length <= 8 ? 2 : 3);

/**
 * Closest entry to `token` within an edit-distance budget — recovers OCR
 * misreads (e.g. "dvines" → "divines") against a SMALL closed vocabulary.
 * Returns null when nothing is within budget or the best is a tie (ambiguous).
 */
function closestByDistance<T>(token: string, entries: [string, T][], maxDist: number): T | null {
  let best: T | null = null;
  let bestD = maxDist + 1;
  let tie = false;
  for (const [key, value] of entries) {
    const d = editDistance(token, key);
    if (d < bestD) {
      bestD = d;
      best = value;
      tie = false;
    } else if (d === bestD) {
      tie = true;
    }
  }
  return tie ? null : best;
}

const SLOT_TYPE_PARAM = (
  slotType: EquipSlotDef['slotType'],
): Parameters<typeof getSetItemsBySlot>[1] => slotType as Parameters<typeof getSetItemsBySlot>[1];

// Category labels guides put before a set name with a colon (e.g.
// "MYTHIC: Huntsman's Warmask", "MONSTER: 1pc Crit"). Stripped before matching.
const SET_CATEGORY_PREFIX_RE =
  /^\s*(?:mythic|monster|trial|arena|dungeon|overland|crafted|craft|class|set|pvp|battlegrounds?|imperial\s+city|cyrodiil)\s*:\s*/i;

/**
 * Split a guide's ITEM SET cell into ordered candidate set-name strings.
 * Handles a "MYTHIC:" / "MONSTER:" category prefix and "A / B / C" or "A OR B"
 * choice lists (common in image-guide panels), so the resolver can try each.
 */
export function parseSetCellCandidates(cell: string): string[] {
  return cell
    .replace(SET_CATEGORY_PREFIX_RE, '')
    .split(/\s*\/\s*|\s+or\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

// Lazy index of canonical set names (full + normalized key) for exact and
// abbreviation matching.
let canonicalSetNames: { name: string; key: string }[] | null = null;
function allCanonicalSetNames(): { name: string; key: string }[] {
  if (!canonicalSetNames) {
    const names = getAllSetNames().map((name) => ({ name, key: normKey(name) }));
    // Only latch the index once the fetched item data is in — memoizing a
    // pre-init (near-empty) list would break set matching for the whole
    // session, even after the data lands and the user re-parses.
    if (!isItemDataReady()) return names;
    canonicalSetNames = names;
  }
  return canonicalSetNames;
}

/**
 * Resolve a (possibly abbreviated/punctuation-variant) set name to a canonical
 * full set name, or null. Tries exact normalized match, then a UNIQUE prefix
 * match, then a UNIQUE substring match — so abbreviations like "Aegis" →
 * "Aegis Caller" or "Null Arca" → "Slivers of the Null Arca" resolve, while
 * ambiguous tokens (matching 0 or >1 sets) stay unresolved for the review step.
 */
export function resolveCanonicalSetName(raw: string): string | null {
  const key = normKey(raw);
  if (key.length < 3) return null; // too short to disambiguate
  const all = allCanonicalSetNames();
  const exact = all.find((s) => s.key === key);
  if (exact) return exact.name;
  const starts = all.filter((s) => s.key.startsWith(key));
  if (starts.length === 1) return starts[0].name;
  const includes = all.filter((s) => s.key.includes(key));
  if (includes.length === 1) return includes[0].name;
  if (includes.length > 1) {
    // Trial sets carry a "Perfected X" twin — if the only ambiguity is that
    // pair, resolve to the non-perfected base (the more common choice).
    const base = includes.filter((s) => !s.key.startsWith('perfected'));
    if (base.length === 1) return base[0].name;
  }
  return null;
}

/**
 * Resolve a gear-set cell. Returns the item ids of the FIRST set that resolves
 * plus the canonical names of EVERY option in the cell that resolves — a cell
 * like "Null Arca / Coral / Ansuul" is the guide offering a choice, so the
 * caller can flag it instead of silently committing to the first.
 */
function setItemCandidates(
  setName: string,
  slotType: EquipSlotDef['slotType'],
): { ids: number[]; options: string[]; rawCandidates: string[] } {
  const options: string[] = [];
  let ids: number[] = [];
  const rawCandidates = setName ? parseSetCellCandidates(setName) : [];
  const param = SLOT_TYPE_PARAM(slotType);
  for (const candidate of rawCandidates) {
    let cand = getSetItemsBySlot(candidate, param);
    let name = candidate;
    if (cand.length === 0) {
      const canon = resolveCanonicalSetName(candidate);
      if (canon) {
        cand = getSetItemsBySlot(canon, param);
        name = canon;
      }
    }
    if (cand.length > 0) {
      if (ids.length === 0) ids = cand;
      options.push(name);
    }
  }
  return { ids, options, rawCandidates };
}

/** First item id of a set for a slot, plus the choice options (raw + resolved). */
function resolveSetItem(
  setName: string,
  slotType: EquipSlotDef['slotType'],
): { itemId: number | null; options: string[]; rawCandidates: string[] } {
  const { ids, options, rawCandidates } = setItemCandidates(setName, slotType);
  return { itemId: ids.length > 0 ? ids[0] : null, options, rawCandidates };
}

/**
 * Pure variant picker: choose the candidate whose weapon-type label matches the
 * pasted "WEIGHT/TYPE" cell. Pulled out of resolveWeaponItem so it can be tested
 * without item/icon data — `labelOf(id)` injects the type label per candidate
 * ("Dagger", "Lightning Staff", generic "Staff", or null when unresolved).
 *
 * Rules:
 *  - exact label match (incl. resolved staff element) → confirmed.
 *  - a GENERIC "staff" request matches any staff candidate → confirmed.
 *  - a SPECIFIC staff element ("Lightning Staff") with only generic "Staff"
 *    candidates → first staff candidate, NOT confirmed (caller warns), since the
 *    element can't be verified.
 *  - otherwise the first candidate, NOT confirmed.
 */
export function pickWeaponVariant(
  candidates: number[],
  typeCell: string,
  labelOf: (id: number) => string | null,
): { itemId: number | null; confirmed: boolean } {
  if (candidates.length === 0) return { itemId: null, confirmed: false };
  if (candidates.length === 1 || !typeCell.trim()) {
    return { itemId: candidates[0], confirmed: true };
  }

  const want = normKey(typeCell);
  const wantsStaff = want.includes('staff');
  const wantsGenericStaff = want === 'staff';
  let firstStaff: number | null = null;

  for (const id of candidates) {
    const label = labelOf(id);
    if (!label) continue;
    const lk = normKey(label);
    if (lk === want) return { itemId: id, confirmed: true }; // exact (incl. element)
    if (wantsStaff && lk === 'staff' && firstStaff === null) firstStaff = id;
  }

  if (firstStaff !== null) {
    // Generic "Staff" request is satisfied by any staff; a specific element
    // can't be confirmed against a generic-icon staff, so warn.
    return { itemId: firstStaff, confirmed: wantsGenericStaff };
  }
  return { itemId: candidates[0], confirmed: false };
}

/**
 * Resolve a weapon item, preferring the candidate whose type matches the pasted
 * "WEIGHT/TYPE" cell. A set usually has multiple weapon variants sharing one
 * bonus; picking the first would silently import the wrong weapon type.
 */
function resolveWeaponItem(
  setName: string,
  slotType: EquipSlotDef['slotType'],
  typeCell: string,
): { itemId: number | null; confirmed: boolean; options: string[]; rawCandidates: string[] } {
  const { ids, options, rawCandidates } = setItemCandidates(setName, slotType);
  return {
    ...pickWeaponVariant(ids, typeCell, (id) => getWeaponTypeLabel(id)),
    options,
    rawCandidates,
  };
}

// ─── Gear ──────────────────────────────────────────────────────────────────

const SLOT_BY_NAME = new Map(EQUIP_SLOTS.map((s) => [s.slot, s]));

/** Map a guide's gear-slot label to an EQUIP_SLOTS index. */
function resolveSlotIndex(rawLabel: string, ringSlots: { used: Set<number> }): number | null {
  const k = normKey(rawLabel);
  const map: Record<string, number> = {
    head: 0,
    shoulder: 3,
    shoulders: 3,
    chest: 2,
    body: 2,
    hand: 16,
    hands: 16,
    gloves: 16,
    belt: 6,
    waist: 6,
    cinch: 6,
    legs: 8,
    pants: 8,
    boots: 9,
    feet: 9,
    shoes: 9,
    necklace: 1,
    neck: 1,
    amulet: 1,
  };
  if (k in map) return map[k];
  // Rings: track which slots (11 = Ring 1, 12 = Ring 2) are taken so numbered
  // and bare labels in any order never collide. Numbered labels claim their
  // slot; a bare "Ring" takes the first still-free slot.
  if (k === 'ring1' || k === 'ringone') {
    ringSlots.used.add(11);
    return 11;
  }
  if (k === 'ring2' || k === 'ringtwo') {
    ringSlots.used.add(12);
    return 12;
  }
  if (k === 'ring') {
    const slot = !ringSlots.used.has(11) ? 11 : 12;
    ringSlots.used.add(slot);
    return slot;
  }
  // Weapons — front bar unless "back" is present; off-hand if "off" is present.
  // Accepts bare labels ("Main", "Off-Hand", "Back Bar") and qualified ones
  // ("Frontbar Main Hand", "Backbar Off Hand").
  const looksWeapon =
    k.includes('main') || k.includes('off') || k.includes('weapon') || k.includes('bar');
  if (looksWeapon) {
    const isBack = k.includes('back');
    const isOff = k.includes('off');
    if (isBack) return isOff ? 21 : 20;
    return isOff ? 5 : 4;
  }
  // Fuzzy fallback for OCR-garbled apparel/jewelry labels ("Shouider" → 3).
  const fuzzy = closestByDistance<number>(k, Object.entries(map), fuzzyBudget(k));
  return fuzzy ?? null;
}

/** Distinct armor-weight words in a cell, in light → medium → heavy order. */
function weightOptions(cell: string): ArmorWeight[] {
  const k = cell.toLowerCase();
  const out: ArmorWeight[] = [];
  if (/\blight\b/.test(k)) out.push('light');
  if (/\bmedium\b/.test(k)) out.push('medium');
  if (/\bheavy\b/.test(k)) out.push('heavy');
  return out;
}

function resolveTrait(
  value: string,
  category: EquipSlotDef['category'],
): { id: string; label: string } | null {
  const k = normKey(value);
  if (!k) return null;
  const traits = getTraitsForSlot(category);
  for (const t of traits) {
    if (normKey(t.name) === k) return { id: t.id, label: t.name };
  }
  // Fuzzy fallback for OCR misreads against the small trait vocabulary.
  const fuzzy = closestByDistance(
    k,
    traits.map((t) => [normKey(t.name), t] as [string, (typeof traits)[number]]),
    fuzzyBudget(k),
  );
  return fuzzy ? { id: fuzzy.id, label: fuzzy.name } : null;
}

function resolveEnchant(
  value: string,
  category: EquipSlotDef['category'],
): { id: string; label: string } | null {
  const k = normKey(value);
  if (!k) return null;
  const enchants = getEnchantsForSlot(category);
  const entries: [string, { id: string; label: string }][] = [];
  for (const e of enchants) {
    const short = getEnchantShortName(e.id, category) ?? e.name;
    if (normKey(short) === k || normKey(e.name) === k) return { id: e.id, label: short };
    entries.push([normKey(short), { id: e.id, label: short }]);
    entries.push([normKey(e.name), { id: e.id, label: short }]);
  }
  // Fuzzy fallback against both the short and full enchant names.
  return closestByDistance(k, entries, fuzzyBudget(k));
}

const GEAR_HEADER_RE = /gear\s*slot/i;

// Cell separator for gear tables: a tab, a pipe (OCR/markdown tables), or a run
// of 2+ spaces. Single spaces are preserved so multi-word set names survive.
const GEAR_CELL_SEP = /\t|\s*\|\s*|\s{2,}/;
const splitGearRow = (line: string): string[] =>
  line
    .split(GEAR_CELL_SEP)
    .map((c) => c.trim())
    .filter((c, i, arr) => c !== '' || (i > 0 && i < arr.length - 1));

/**
 * Read the gear table's column order from its header row. Guides differ: some
 * use Slot · Set · Weight · Trait · Enchant, others Slot · Weight · Set · …
 * Falls back to the common Hyperioxes order when a column header is missing.
 */
function gearColumnMap(headerLine: string): {
  slot: number;
  set: number;
  weight: number;
  trait: number;
  enchant: number;
} {
  const cols = splitGearRow(headerLine).map((h) => normKey(h));
  const find = (pred: (h: string) => boolean, fallback: number): number => {
    const i = cols.findIndex(pred);
    return i === -1 ? fallback : i;
  };
  return {
    slot: find((h) => h.includes('slot'), 0),
    set: find((h) => h.includes('set'), 1),
    weight: find((h) => h.includes('weight') || h.includes('type'), 2),
    trait: find((h) => h.includes('trait'), 3),
    enchant: find((h) => h.includes('enchant'), 4),
  };
}

/** Parse the first tab-separated gear table found in the text. */
function parseGear(lines: string[], warnings: string[]): ParsedGearRow[] {
  const headerIdx = lines.findIndex((l) => GEAR_HEADER_RE.test(l) && /\bset\b/i.test(l));
  if (headerIdx === -1) return [];

  const col = gearColumnMap(lines[headerIdx]);
  const rows: ParsedGearRow[] = [];
  const ringSlots = { used: new Set<number>() };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitGearRow(lines[i]);
    // End of table: a blank line or a row without a recognisable slot label.
    if (cells.length < 2 || (cells[col.slot] ?? '') === '') break;

    const slot = resolveSlotIndex(cells[col.slot] ?? '', ringSlots);
    if (slot == null) break;

    const def = SLOT_BY_NAME.get(slot);
    if (!def) continue;

    const setName = cells[col.set] ?? '';
    const weightOrType = cells[col.weight] ?? '';
    const traitRaw = cells[col.trait] ?? '';
    const enchantRaw = cells[col.enchant] ?? '';

    // Weapons: pick the variant matching the pasted type cell (Dagger / Staff /
    // …); other slots resolve by set + slot type.
    let itemId: number | null;
    let weaponUnconfirmed = false;
    let setOptions: string[] = [];
    let rawCandidates: string[] = [];
    if (def.category === 'weapons') {
      const w = resolveWeaponItem(setName, def.slotType, weightOrType);
      itemId = w.itemId;
      weaponUnconfirmed = w.itemId != null && !w.confirmed;
      setOptions = w.options;
      rawCandidates = w.rawCandidates;
    } else {
      const s = resolveSetItem(setName, def.slotType);
      itemId = s.itemId;
      setOptions = s.options;
      rawCandidates = s.rawCandidates;
    }
    // A cell like "Null Arca / Coral / Ansuul" (or "AY / Aegis") is the guide
    // offering a choice — we import the first resolvable one but flag it. Base
    // this on the RAW cell, not just what resolved: an option that fails to
    // resolve (e.g. a too-short abbreviation) must still mark the row ambiguous.
    const setAmbiguous = itemId != null && rawCandidates.length > 1;

    // A cell like "Light or Medium" offers the player a choice — don't silently
    // pick one. Only import a weight when exactly one is named.
    const weights = def.category === 'apparel' ? weightOptions(weightOrType) : [];
    const weight = weights.length === 1 ? weights[0] : undefined;
    const trait = traitRaw ? resolveTrait(traitRaw, def.category) : null;
    const enchant = enchantRaw ? resolveEnchant(enchantRaw, def.category) : null;

    let status: ImportConfidence = 'ok';
    if (itemId == null) status = 'unresolved';
    else if ((traitRaw && !trait) || (enchantRaw && !enchant) || weaponUnconfirmed || setAmbiguous)
      status = 'partial';

    if (itemId == null) warnings.push(`Couldn't match set “${setName}” for ${def.name}`);
    else if (weaponUnconfirmed)
      warnings.push(`Verify weapon type “${weightOrType}” for ${def.name}`);
    if (setAmbiguous)
      warnings.push(
        `${def.name}: guide lists set options (${rawCandidates.join(' / ')}) — imported “${setOptions[0] ?? setName}”, verify`,
      );
    if (weights.length > 1)
      warnings.push(`${def.name} lists multiple weights (${weights.join('/')}) — choose one`);

    rows.push({
      slot,
      slotLabel: def.name,
      setName,
      itemId,
      weight,
      trait: trait?.id,
      traitLabel: trait?.label,
      enchant: enchant?.id,
      enchantLabel: enchant?.label,
      status,
    });
  }

  return rows;
}

// ─── Class skill lines ───────────────────────────────────────────────────────

function parseClassLines(
  text: string,
): Pick<ParsedBuildResult, 'esoClass' | 'classSkillLines' | 'classLabel'> {
  const found: ClassSkillLineId[] = [];
  const labels: string[] = [];
  // Longest labels first so "Dark Magic" isn't shadowed by a shorter match.
  const byLen = [...CLASS_SKILL_LINES].sort((a, b) => b.label.length - a.label.length);
  // Word-boundary match (not substring) so a label like "Shadow" doesn't match
  // inside an unrelated word.
  for (const line of byLen) {
    if (found.includes(line.id)) continue;
    if (new RegExp(`\\b${escapeRegExp(line.label)}\\b`, 'i').test(text)) {
      found.push(line.id);
      labels.push(line.label);
    }
  }
  if (found.length === 0) return {};

  // Determine the dominant class from matched lines.
  const counts = new Map<ESOClass, number>();
  for (const id of found) {
    const def = CLASS_SKILL_LINES.find((l) => l.id === id);
    if (def) counts.set(def.ownerClass, (counts.get(def.ownerClass) ?? 0) + 1);
  }
  let esoClass: ESOClass | undefined;
  let best = 0;
  for (const [cls, n] of counts) {
    if (n > best) {
      best = n;
      esoClass = cls;
    }
  }
  if (!esoClass) return {};

  // Prefer the dominant class's own three lines, in canonical order.
  const own = CLASS_SKILL_LINES.filter((l) => l.ownerClass === esoClass).filter((l) =>
    found.includes(l.id),
  );
  const ids = own.slice(0, 3).map((l) => l.id);
  while (ids.length < 3) ids.push(null as unknown as ClassSkillLineId);
  return {
    esoClass,
    classSkillLines: [ids[0] ?? null, ids[1] ?? null, ids[2] ?? null],
    classLabel: CLASS_SKILL_LINES.find((l) => l.ownerClass === esoClass)?.ownerClass,
  };
}

// ─── Race / Mundus / Attributes / Food ───────────────────────────────────────

function parseRace(text: string): { raceId?: string; raceLabel?: string } {
  // Prefer the author's explicit pick ("I use Nord").
  const explicit = /\bI\s+use\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+Elf)?)/.exec(text);
  if (explicit) {
    const race = ESO_RACES.find((r) => normKey(r.label) === normKey(explicit[1]));
    if (race) return { raceId: race.id, raceLabel: race.label };
  }
  // Fallback: the first race named on a WORD BOUNDARY (longest label first).
  // Substring matching is unsafe — e.g. "Sorcerer" contains "Orc" — so a guide
  // that never names a race must not fabricate one.
  const byLen = [...ESO_RACES].sort((a, b) => b.label.length - a.label.length);
  for (const r of byLen) {
    if (new RegExp(`\\b${escapeRegExp(r.label)}\\b`, 'i').test(text)) {
      return { raceId: r.id, raceLabel: r.label };
    }
  }
  return {};
}

function parseMundus(text: string): { mundusId?: string; mundusLabel?: string } {
  // Anchor on a MUNDUS heading if present so we grab the recommended stone.
  const idx = text.toUpperCase().indexOf('MUNDUS');
  const scope = idx === -1 ? text : text.slice(idx);
  const byLen = [...ESO_MUNDUS_STONES].sort((a, b) => b.label.length - a.label.length);
  // Word-boundary match so "The Mage" doesn't match "The Mages Guild".
  for (const m of byLen) {
    if (new RegExp(`\\b${escapeRegExp(m.label)}\\b`, 'i').test(scope)) {
      return { mundusId: m.id, mundusLabel: m.label };
    }
  }
  return {};
}

function parseAttributes(text: string): BuildAttributes | undefined {
  const re =
    /health\s*[\n\r:]+\s*(\d+)\s*[\n\r]+\s*magicka\s*[\n\r:]+\s*(\d+)\s*[\n\r]+\s*stamina\s*[\n\r:]+\s*(\d+)/i;
  const m = re.exec(text);
  if (!m) return undefined;
  const health = Number(m[1]);
  const magicka = Number(m[2]);
  const stamina = Number(m[3]);
  if (health + magicka + stamina === 0) return undefined;
  return { health, magicka, stamina };
}

// Lazy name → consumable id index (food + drink, since "food" guides list both).
let foodIndex: Map<string, number> | null = null;
function resolveFoodId(name: string): number | undefined {
  if (!foodIndex) {
    foodIndex = new Map();
    for (const c of ESO_CONSUMABLES) foodIndex.set(normKey(c.name), c.id);
  }
  return foodIndex.get(normKey(name));
}

function parseFood(lines: string[]): { foodName?: string; foodId?: number } {
  const idx = lines.findIndex((l) => l.trim().toUpperCase() === 'FOOD');
  if (idx === -1) return {};
  // The default food name is the first non-label line after FOOD / DEFAULT.
  for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
    const t = lines[i].trim();
    if (!t || t.toUpperCase() === 'DEFAULT') continue;
    if (t.length > 2) return { foodName: t, foodId: resolveFoodId(t) };
  }
  return {};
}

// ─── Skills ───────────────────────────────────────────────────────────────

const SKILL_SLOT_INDEX: Record<string, number> = { '1': 3, '2': 4, '3': 5, '4': 6, '5': 7, U: 8 };
const SKILL_ENTRY_RE = /^\s*(?:Slot\s*([1-5])|Ultimate)\s*:\s*(.+?)\s*$/i;

function parseSkills(lines: string[]): ParsedSkillRow[] {
  preloadSkillData();

  // Scope to the base/primary setup if one is labeled; else scan the whole text.
  const startIdx = lines.findIndex((l) => /base\s*setup/i.test(l));
  const start = startIdx === -1 ? 0 : startIdx;
  const endRel = lines
    .slice(start + 1)
    .findIndex((l) => /^\s*(INFO|ROTATION|SITUATIONAL|PASSIVES|GEAR)\s*$/i.test(l));
  const end = endRel === -1 ? lines.length : start + 1 + endRel;
  const scope = lines.slice(start, end);

  // Collect entries in document order, splitting tab-joined front/back cells.
  const entries: { key: string; name: string }[] = [];
  for (const line of scope) {
    for (const cell of line.split('\t')) {
      const m = SKILL_ENTRY_RE.exec(cell);
      if (!m) continue;
      const key = m[1] ?? 'U';
      const name = m[2].trim();
      if (name) entries.push({ key, name });
    }
  }

  // First occurrence of a slot key → front bar, second → back bar.
  const seen = new Map<string, number>();
  const rows: ParsedSkillRow[] = [];
  for (const { key, name } of entries) {
    const occ = seen.get(key) ?? 0;
    seen.set(key, occ + 1);
    if (occ > 1) continue; // ignore 3rd+ duplicates
    const bar = (occ === 0 ? 0 : 1) as 0 | 1;
    const slotIndex = SKILL_SLOT_INDEX[key];
    const skill = getSkillByName(name);
    rows.push({
      bar,
      slotIndex,
      slotLabel: key === 'U' ? 'Ultimate' : `Slot ${key}`,
      name,
      abilityId: skill?.id ?? null,
    });
  }
  return rows;
}

// ─── Champion Points ─────────────────────────────────────────────────────────

const TREE_KEY: Record<ChampionPointTree, keyof BuildChampionPoints> = {
  [ChampionPointTree.Warfare]: 'warfare',
  [ChampionPointTree.Fitness]: 'fitness',
  [ChampionPointTree.Craft]: 'craft',
};

const CP_BY_NAME = (() => {
  const map = new Map<string, { id: number; tree: keyof BuildChampionPoints; name: string }>();
  for (const [idStr, meta] of Object.entries(CHAMPION_POINT_ABILITIES)) {
    const tree = TREE_KEY[meta.tree];
    if (!tree) continue;
    map.set(normKey(meta.name), { id: Number(idStr), tree, name: meta.name });
  }
  return map;
})();

function parseChampionPoints(lines: string[]): ParsedCP[] {
  const startIdx = lines.findIndex((l) => /champion\s*points/i.test(l));
  if (startIdx === -1) return [];
  const endRel = lines.slice(startIdx + 1).findIndex((l) => /^\s*(RACE|MUNDUS|FOOD)\s*$/i.test(l));
  const end = endRel === -1 ? lines.length : startIdx + 1 + endRel;

  const picks: ParsedCP[] = [];
  const perTree: Record<string, number> = { warfare: 0, fitness: 0, craft: 0 };
  const usedIds = new Set<number>();

  for (let i = startIdx; i < end; i++) {
    const hit = CP_BY_NAME.get(normKey(lines[i]));
    if (!hit || usedIds.has(hit.id)) continue;
    if (perTree[hit.tree] >= 4) continue;
    usedIds.add(hit.id);
    perTree[hit.tree] += 1;
    picks.push({ tree: hit.tree, id: hit.id, name: hit.name });
  }
  return picks;
}

// ─── Top-level parse ─────────────────────────────────────────────────────────

export function parseBuildText(raw: string): ParsedBuildResult {
  const text = raw.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const warnings: string[] = [];

  const gear = parseGear(lines, warnings);
  const skills = parseSkills(lines);
  const cp = parseChampionPoints(lines);
  const classInfo = parseClassLines(text);
  const race = parseRace(text);
  const mundus = parseMundus(text);
  const attributes = parseAttributes(text);
  const food = parseFood(lines);

  if (gear.length === 0) warnings.push('No gear table found.');
  if (skills.length === 0) warnings.push('No skill bars found.');
  if (food.foodName && food.foodId === undefined)
    warnings.push(`Couldn't match food “${food.foodName}”`);

  return {
    ...classInfo,
    ...race,
    ...mundus,
    attributes,
    foodName: food.foodName,
    foodId: food.foodId,
    gear,
    skills,
    cp,
    warnings,
  };
}

// ─── Payload assembly (parsed → applyImportedBuild) ──────────────────────────

export interface ImportSections {
  gear: boolean;
  skills: boolean;
  champion: boolean;
  character: boolean; // attributes + mundus
  identity: boolean; // class + race
}

export interface ImportPayload {
  setup: {
    gear?: GearConfig;
    skills?: SkillsConfig;
    cp?: BuildChampionPoints;
    attributes?: BuildAttributes;
    mundusStone?: string;
    consumables?: { potions: never[]; food: { id?: number; name?: string } };
  };
  /** Gear slots the guide listed but we couldn't resolve — cleared on apply so
   *  an active import doesn't leave the previous build's item in that slot. */
  clearGearSlots?: number[];
  /** Skill slots the guide named but we couldn't resolve. */
  clearSkillSlots?: Array<{ bar: 0 | 1; slotIndex: number }>;
  buildFields?: {
    esoClass?: ESOClass;
    classSkillLines?: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
    races?: string[];
  };
}

const emptyChampionPoints = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

/** Assemble an applyImportedBuild payload from the parsed result + section toggles. */
export function buildImportPayload(
  result: ParsedBuildResult,
  include: ImportSections,
): ImportPayload {
  const setup: ImportPayload['setup'] = {};
  const clearGearSlots: number[] = [];
  const clearSkillSlots: Array<{ bar: 0 | 1; slotIndex: number }> = [];

  if (include.gear) {
    const gear: GearConfig = {};
    for (const row of result.gear) {
      if (row.itemId == null) {
        clearGearSlots.push(row.slot); // listed but unresolved → clear stale item
        continue;
      }
      gear[row.slot] = {
        id: row.itemId,
        ...(row.trait ? { trait: row.trait } : {}),
        ...(row.enchant ? { enchant: row.enchant } : {}),
        ...(row.weight ? { weight: row.weight } : {}),
      };
    }
    if (Object.keys(gear).length > 0) setup.gear = gear;
  }

  if (include.skills) {
    const skills: SkillsConfig = { 0: {}, 1: {} };
    let any = false;
    for (const row of result.skills) {
      if (row.abilityId == null) {
        clearSkillSlots.push({ bar: row.bar, slotIndex: row.slotIndex });
        continue;
      }
      skills[row.bar][row.slotIndex] = row.abilityId;
      any = true;
    }
    if (any) setup.skills = skills;
  }

  if (include.champion && result.cp.length > 0) {
    const cp = emptyChampionPoints();
    const cursor: Record<string, number> = { warfare: 0, fitness: 0, craft: 0 };
    for (const pick of result.cp) {
      const tree = cp[pick.tree];
      if (cursor[pick.tree] < 4) {
        tree.slots[cursor[pick.tree]] = pick.id;
        cursor[pick.tree] += 1;
      }
    }
    setup.cp = cp;
  }

  if (include.character) {
    if (result.attributes) setup.attributes = result.attributes;
    if (result.mundusId) setup.mundusStone = result.mundusId;
    // Only import food we resolved to a real id — the consumables UI renders
    // food by id, so a name-only entry would be invisible (and the parser
    // already warns when the name didn't match).
    if (result.foodId !== undefined) {
      setup.consumables = { potions: [], food: { id: result.foodId, name: result.foodName } };
    }
  }

  const buildFields: NonNullable<ImportPayload['buildFields']> = {};
  if (include.identity) {
    if (result.esoClass) buildFields.esoClass = result.esoClass;
    if (result.classSkillLines) buildFields.classSkillLines = result.classSkillLines;
    if (result.raceId) buildFields.races = [result.raceId];
  }

  return {
    setup,
    ...(clearGearSlots.length > 0 ? { clearGearSlots } : {}),
    ...(clearSkillSlots.length > 0 ? { clearSkillSlots } : {}),
    ...(Object.keys(buildFields).length > 0 ? { buildFields } : {}),
  };
}
