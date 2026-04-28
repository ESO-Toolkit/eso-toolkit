import { getSkillByName, searchSkills, preloadSkillData } from '../../loadout-manager/data/skillLineSkills';
import type { SkillBarSlot } from '../../build-viewer/components/SkillBarDisplay';

export interface ParsedSkillBar {
  label: string;
  weapon?: string;
  skills: SkillBarSlot[];
}

interface SkillBarParseResult {
  /** Markdown segments interleaved with skill bar indices */
  segments: (string | { barIndex: number })[];
  skillBars: ParsedSkillBar[];
}

const SKILLBAR_BLOCK_RE = () => /:::skillbar\s+(.+?)\n([\s\S]*?):::/g;
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
  if (parenMatch) {
    return { label: parenMatch[1].trim(), weapon: parenMatch[2].trim() };
  }
  return { label: header.trim() };
}

function parseSlotNumber(raw: string): number {
  if (raw.toUpperCase() === 'R') return 5;
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 5 ? n - 1 : n;
}

function parseBarBody(body: string): SkillBarSlot[] {
  const slots: SkillBarSlot[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(SLOT_LINE_RE);
    if (!match) continue;
    const slot = parseSlotNumber(match[1]);
    const skillName = match[2].replace(/\s*\(.*?\)\s*$/, '').replace(/\s*[-—–].*$/, '').trim();
    const abilityId = resolveSkillId(skillName);
    slots.push({ slot, abilityId });
  }
  return slots;
}

/**
 * Strip skillbar fenced blocks from streaming content so raw `:::skillbar`
 * text doesn't flash while tokens arrive. Handles both complete and
 * in-progress (unclosed) blocks.
 */
export function stripSkillBarBlocks(content: string): string {
  return content
    .replace(SKILLBAR_BLOCK_RE(), '')
    .replace(/:::skillbar[^\n]*(?:\n(?!:::).*)*\n?$/s, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

export function extractSkillBars(content: string): SkillBarParseResult {
  const skillBars: ParsedSkillBar[] = [];
  const segments: (string | { barIndex: number })[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = SKILLBAR_BLOCK_RE();
  while ((match = re.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) segments.push(before);

    const { label, weapon } = parseBarHeader(match[1]);
    const skills = parseBarBody(match[2]);
    const barIndex = skillBars.length;
    skillBars.push({ label, weapon, skills });
    segments.push({ barIndex });

    lastIndex = match.index + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after) segments.push(after);

  return { segments, skillBars };
}
