import { getSkillByName, searchSkills, preloadSkillData } from '../../loadout-manager/data/skillLineSkills';
import type { SkillBarSlot } from '../../build-viewer/components/SkillBarDisplay';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ParsedSkillBar {
  kind: 'skillbar';
  label: string;
  weapon?: string;
  skills: SkillBarSlot[];
}

export interface ParsedGearRow {
  slot: string;
  set: string;
  trait: string;
  enchant: string;
  quality?: string;
}

export interface ParsedGearTable {
  kind: 'gear';
  rows: ParsedGearRow[];
}

export interface ParsedCpEntry {
  name: string;
  color: 'red' | 'blue' | 'green';
}

export interface ParsedChampionPoints {
  kind: 'cp';
  entries: ParsedCpEntry[];
}

export type RichBlock = ParsedSkillBar | ParsedGearTable | ParsedChampionPoints;

export interface RichBlockParseResult {
  segments: (string | { blockIndex: number })[];
  blocks: RichBlock[];
}

// ─── Regex (factory to avoid shared lastIndex state) ─────────────────────────

const RICH_BLOCK_RE = () => /:::(\w+)[^\n]*\n([\s\S]*?):::/g;

// ─── Skill bar parser ────────────────────────────────────────────────────────

const SLOT_LINE_RE = /^\s*(?:(\d|R))[.)]\s*(.+)$/i;

function resolveSkillId(name: string): number {
  preloadSkillData();
  const trimmed = name.trim();
  const exact = getSkillByName(trimmed);
  if (exact) return exact.id;
  const results = searchSkills(trimmed, 1);
  if (results.length > 0 && results[0].name.toLowerCase() === trimmed.toLowerCase()) {
    return results[0].id;
  }
  return 0;
}

function parseBarHeader(header: string): { label: string; weapon?: string } {
  const parenMatch = header.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) return { label: parenMatch[1].trim(), weapon: parenMatch[2].trim() };
  return { label: header.trim() };
}

function parseSlotNumber(raw: string): number {
  if (raw.toUpperCase() === 'R') return 5;
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 5 ? n - 1 : n;
}

function parseSkillBar(header: string, body: string): ParsedSkillBar {
  const { label, weapon } = parseBarHeader(header);
  const skills: SkillBarSlot[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(SLOT_LINE_RE);
    if (!match) continue;
    const slot = parseSlotNumber(match[1]);
    const skillName = match[2].replace(/\s*\(.*?\)\s*$/, '').replace(/\s*[-—–].*$/, '').trim();
    const abilityId = resolveSkillId(skillName);
    skills.push({ slot, abilityId });
  }
  return { kind: 'skillbar', label, weapon, skills };
}

// ─── Gear table parser ───────────────────────────────────────────────────────

const GEAR_ROW_RE = /^\s*\|?\s*([^|]+?)\s*\|?\s*([^|]+?)\s*\|?\s*([^|]*?)\s*\|?\s*([^|]*?)\s*\|?(?:\s*([^|]*?)\s*\|?)?\s*$/;

function parseGearTable(body: string): ParsedGearTable {
  const rows: ParsedGearRow[] = [];
  const lines = body.split('\n');

  let headerParsed = false;
  let slotCol = 0, setCol = 1, traitCol = 2, enchantCol = 3, qualityCol = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---' || /^[\s|:-]+$/.test(trimmed)) continue;

    // If line looks like a pipe-delimited row
    if (trimmed.includes('|')) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;

      if (!headerParsed) {
        // Detect column order from header row
        cells.forEach((c, i) => {
          const lc = c.toLowerCase();
          if (lc.includes('slot')) slotCol = i;
          else if (lc.includes('set') || lc.includes('name') || lc.includes('item')) setCol = i;
          else if (lc.includes('trait')) traitCol = i;
          else if (lc.includes('enchant')) enchantCol = i;
          else if (lc.includes('quality') || lc.includes('qual')) qualityCol = i;
        });
        headerParsed = true;
        continue;
      }

      const get = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx] : '');
      const slot = get(slotCol);
      const set = get(setCol);
      if (!slot && !set) continue;

      rows.push({
        slot,
        set,
        trait: get(traitCol),
        enchant: get(enchantCol),
        quality: qualityCol >= 0 ? get(qualityCol) : undefined,
      });
      continue;
    }

    // Non-pipe format: "Slot: Set — Trait / Enchant"
    const dashes = trimmed.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    if (dashes) {
      const left = dashes[1].trim();
      const right = dashes[2].trim();
      const colonIdx = left.indexOf(':');
      if (colonIdx > 0) {
        const slot = left.slice(0, colonIdx).trim();
        const set = left.slice(colonIdx + 1).trim();
        const traitEnchant = right.split('/').map((s) => s.trim());
        rows.push({ slot, set, trait: traitEnchant[0] ?? '', enchant: traitEnchant[1] ?? '' });
      } else {
        // "Set Name — Trait / Enchant"
        const match2 = line.match(GEAR_ROW_RE);
        if (match2) {
          rows.push({
            slot: match2[1]?.trim() ?? '',
            set: match2[2]?.trim() ?? '',
            trait: match2[3]?.trim() ?? '',
            enchant: match2[4]?.trim() ?? '',
            quality: match2[5]?.trim(),
          });
        }
      }
    }
  }
  return { kind: 'gear', rows };
}

// ─── Champion points parser ───────────────────────────────────────────────────

const CP_LINE_RE = /^\s*[-*•]?\s*(?:(red|blue|green):)?\s*(.+)$/i;

function parseChampionPoints(body: string): ParsedChampionPoints {
  const entries: ParsedCpEntry[] = [];
  let currentColor: 'red' | 'blue' | 'green' = 'blue';

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section header: "### Red" or "Red:" on its own line
    const sectionHeader = trimmed.match(/^#+\s*(red|blue|green)\b/i) ?? trimmed.match(/^(red|blue|green):?\s*$/i);
    if (sectionHeader) {
      currentColor = sectionHeader[1].toLowerCase() as 'red' | 'blue' | 'green';
      continue;
    }

    const match = trimmed.match(CP_LINE_RE);
    if (!match) continue;

    const colorPrefix = match[1]?.toLowerCase() as 'red' | 'blue' | 'green' | undefined;
    const name = match[2].trim().replace(/\s*[-—–].*$/, '').replace(/\s*\(.*?\)\s*$/, '').trim();
    if (!name || name.length < 2) continue;
    entries.push({ name, color: colorPrefix ?? currentColor });
  }
  return { kind: 'cp', entries };
}

// ─── Main extraction ─────────────────────────────────────────────────────────

export function extractRichBlocks(content: string): RichBlockParseResult {
  const blocks: RichBlock[] = [];
  const segments: (string | { blockIndex: number })[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = RICH_BLOCK_RE();

  while ((match = re.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) segments.push(before);

    const blockType = match[1].toLowerCase();
    const header = match[0].split('\n')[0].replace(/^:::(\w+)\s*/, '').trim();
    const body = match[2];

    let block: RichBlock | null = null;
    if (blockType === 'skillbar') block = parseSkillBar(header, body);
    else if (blockType === 'gear') block = parseGearTable(body);
    else if (blockType === 'cp' || blockType === 'championpoints') block = parseChampionPoints(body);

    if (block) {
      segments.push({ blockIndex: blocks.length });
      blocks.push(block);
    } else {
      // Unknown block type — pass through as text
      segments.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after) segments.push(after);

  return { segments, blocks };
}

/**
 * Strip all :::xxx fenced blocks from streaming content so raw syntax
 * doesn't flash during token delivery. Handles both complete and unclosed blocks.
 */
export function stripRichBlocks(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (!inBlock && /^\s*:::(\w+)/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (line.trimStart() === ':::') inBlock = false;
      continue;
    }
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
