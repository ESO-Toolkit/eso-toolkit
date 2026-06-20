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

import { CHAMPION_POINT_ABILITIES, ChampionPointTree } from '@/types/champion-points';

import { getAllSetNames, getSetItemsBySlot } from '../../loadout-manager/data/itemIdMap';
import { getSkillByName, preloadSkillData } from '../../loadout-manager/data/skillLineSkills';
import type {
  ArmorWeight,
  GearConfig,
  SkillsConfig,
} from '../../loadout-manager/types/loadout.types';
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
  gear: ParsedGearRow[];
  skills: ParsedSkillRow[];
  cp: ParsedCP[];
  warnings: string[];
}

// ─── Small helpers ─────────────────────────────────────────────────────────

/** Lowercase + strip all non-alphanumerics — robust fuzzy key for name matching. */
const normKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const SLOT_TYPE_PARAM = (
  slotType: EquipSlotDef['slotType'],
): Parameters<typeof getSetItemsBySlot>[1] => slotType as Parameters<typeof getSetItemsBySlot>[1];

// Lazy normalized index of canonical set names — lets us recover from
// punctuation variants (curly vs straight apostrophes, en-dashes) that web
// pastes routinely introduce, since getSetItemsBySlot matches names exactly.
let setNameIndex: Map<string, string> | null = null;
function canonicalSetName(setName: string): string | null {
  if (!setNameIndex) {
    setNameIndex = new Map();
    for (const n of getAllSetNames()) setNameIndex.set(normKey(n), n);
  }
  return setNameIndex.get(normKey(setName)) ?? null;
}

/** First item id of a set for a given equipment slot type, or null. */
function resolveSetItem(setName: string, slotType: EquipSlotDef['slotType']): number | null {
  if (!setName) return null;
  const param = SLOT_TYPE_PARAM(slotType);
  let ids = getSetItemsBySlot(setName.trim(), param);
  if (ids.length === 0) {
    // Retry against the canonical name (punctuation-insensitive).
    const canon = canonicalSetName(setName);
    if (canon) ids = getSetItemsBySlot(canon, param);
  }
  return ids.length > 0 ? ids[0] : null;
}

// ─── Gear ──────────────────────────────────────────────────────────────────

const SLOT_BY_NAME = new Map(EQUIP_SLOTS.map((s) => [s.slot, s]));

/** Map a guide's gear-slot label to an EQUIP_SLOTS index (ring uses a counter). */
function resolveSlotIndex(rawLabel: string, ringSeen: { count: number }): number | null {
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
  // Numbered rings ("Ring 1" / "Ring 2", "Ring One" / "Ring Two") map directly,
  // and advance the counter so a later bare "Ring" still resolves correctly.
  if (k === 'ring1' || k === 'ringone') {
    ringSeen.count = Math.max(ringSeen.count, 1);
    return 11;
  }
  if (k === 'ring2' || k === 'ringtwo') {
    ringSeen.count = Math.max(ringSeen.count, 2);
    return 12;
  }
  // A bare "Ring" relies on document order: first → Ring 1, second → Ring 2.
  if (k === 'ring') {
    const slot = ringSeen.count === 0 ? 11 : 12;
    ringSeen.count += 1;
    return slot;
  }
  // Weapons — match front/back + main/off.
  const isBack = k.includes('back');
  const isOff = k.includes('off');
  if (
    k.includes('mainhand') ||
    k.includes('offhand') ||
    k.includes('weapon') ||
    k.includes('bar')
  ) {
    if (isBack) return isOff ? 21 : 20;
    return isOff ? 5 : 4;
  }
  return null;
}

const WEIGHT_KEYS: Record<string, ArmorWeight> = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
};

function resolveTrait(
  value: string,
  category: EquipSlotDef['category'],
): { id: string; label: string } | null {
  const k = normKey(value);
  for (const t of getTraitsForSlot(category)) {
    if (normKey(t.name) === k) return { id: t.id, label: t.name };
  }
  return null;
}

function resolveEnchant(
  value: string,
  category: EquipSlotDef['category'],
): { id: string; label: string } | null {
  const k = normKey(value);
  for (const e of getEnchantsForSlot(category)) {
    const short = getEnchantShortName(e.id, category) ?? e.name;
    if (normKey(short) === k || normKey(e.name) === k) return { id: e.id, label: short };
  }
  return null;
}

const GEAR_HEADER_RE = /gear\s*slot/i;

/** Parse the first tab-separated gear table found in the text. */
function parseGear(lines: string[], warnings: string[]): ParsedGearRow[] {
  const headerIdx = lines.findIndex((l) => GEAR_HEADER_RE.test(l) && /\bset\b/i.test(l));
  if (headerIdx === -1) return [];

  const rows: ParsedGearRow[] = [];
  const ringSeen = { count: 0 };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t').map((c) => c.trim());
    // End of table: a blank line or a row without a recognisable slot label.
    if (cells.length < 2 || cells[0] === '') break;

    const slot = resolveSlotIndex(cells[0], ringSeen);
    if (slot == null) break;

    const def = SLOT_BY_NAME.get(slot);
    if (!def) continue;

    const setName = cells[1] ?? '';
    const weightOrType = cells[2] ?? '';
    const traitRaw = cells[3] ?? '';
    const enchantRaw = cells[4] ?? '';

    const itemId = resolveSetItem(setName, def.slotType);
    const weight = def.category === 'apparel' ? WEIGHT_KEYS[weightOrType.toLowerCase()] : undefined;
    const trait = traitRaw ? resolveTrait(traitRaw, def.category) : null;
    const enchant = enchantRaw ? resolveEnchant(enchantRaw, def.category) : null;

    let status: ImportConfidence = 'ok';
    if (itemId == null) status = 'unresolved';
    else if ((traitRaw && !trait) || (enchantRaw && !enchant)) status = 'partial';

    if (itemId == null) warnings.push(`Couldn't match set “${setName}” for ${def.name}`);

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
  const haystack = ` ${text.toLowerCase()} `;
  for (const line of byLen) {
    if (found.includes(line.id)) continue;
    if (haystack.includes(line.label.toLowerCase())) {
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
  // Fallback: the first race label that appears in the text.
  const byLen = [...ESO_RACES].sort((a, b) => b.label.length - a.label.length);
  const hay = text.toLowerCase();
  for (const r of byLen) {
    if (hay.includes(r.label.toLowerCase())) return { raceId: r.id, raceLabel: r.label };
  }
  return {};
}

function parseMundus(text: string): { mundusId?: string; mundusLabel?: string } {
  // Anchor on a MUNDUS heading if present so we grab the recommended stone.
  const idx = text.toUpperCase().indexOf('MUNDUS');
  const scope = idx === -1 ? text : text.slice(idx);
  const byLen = [...ESO_MUNDUS_STONES].sort((a, b) => b.label.length - a.label.length);
  const hay = scope.toLowerCase();
  for (const m of byLen) {
    if (hay.includes(m.label.toLowerCase())) return { mundusId: m.id, mundusLabel: m.label };
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

function parseFood(lines: string[]): string | undefined {
  const idx = lines.findIndex((l) => l.trim().toUpperCase() === 'FOOD');
  if (idx === -1) return undefined;
  // The default food name is the first non-label line after FOOD / DEFAULT.
  for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
    const t = lines[i].trim();
    if (!t || t.toUpperCase() === 'DEFAULT') continue;
    if (t.length > 2) return t;
  }
  return undefined;
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
  const foodName = parseFood(lines);

  if (gear.length === 0) warnings.push('No gear table found.');
  if (skills.length === 0) warnings.push('No skill bars found.');

  return {
    ...classInfo,
    ...race,
    ...mundus,
    attributes,
    foodName,
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
    consumables?: { potions: never[]; food: { name?: string } };
  };
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

  if (include.gear) {
    const gear: GearConfig = {};
    for (const row of result.gear) {
      if (row.itemId == null) continue;
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
      if (row.abilityId == null) continue;
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
    if (result.foodName) setup.consumables = { potions: [], food: { name: result.foodName } };
  }

  const buildFields: NonNullable<ImportPayload['buildFields']> = {};
  if (include.identity) {
    if (result.esoClass) buildFields.esoClass = result.esoClass;
    if (result.classSkillLines) buildFields.classSkillLines = result.classSkillLines;
    if (result.raceId) buildFields.races = [result.raceId];
  }

  return {
    setup,
    ...(Object.keys(buildFields).length > 0 ? { buildFields } : {}),
  };
}
