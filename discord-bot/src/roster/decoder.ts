/**
 * Decodes roster_data (deflate-raw + base64url) into a DecodedRoster
 * with all fields needed for Discord text formatting.
 *
 * This runs server-side in a Cloudflare Worker. DecompressionStream
 * is available natively in the Workers runtime.
 */

import { getSetName } from './set-names.js';
import type { DecodedRoster, DecodedRosterSlot, DecodedSkillLines } from './types.js';

// ── Lookup tables (mirror the frontend's encoding tables) ───────────────────

const CLASS_SKILL_LINES = [
  'Ardent Flame', 'Draconic Power', 'Earthen Heart',
  'Dark Magic', 'Daedric Summoning', 'Storm Calling',
  'Assassination', 'Shadow', 'Siphoning',
  'Aedric Spear', "Dawn's Wrath", 'Restoring Light',
  'Animal Companions', 'Green Balance', "Winter's Embrace",
  'Grave Lord', 'Bone Tyrant', 'Living Death',
  'Herald of the Tome', 'Apocryphal Soldier', 'Curative Runeforms',
] as const;

const ULTIMATE_LIST = [
  'Aggressive Warhorn',
  'Glacial Colossus',
  'Barrier',
  'Greater Storm Atronach',
] as const;

const HEALER_BUFF_LIST = ['Enlivening Overflow', 'From the Brink'] as const;
const CHAMPION_POINT_LIST = ['Enlivening Overflow', 'From the Brink'] as const;

const JAIL_DD_TYPE_LIST = ['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'] as const;
const JAIL_DD_LABELS: Record<string, string> = {
  banner: 'Banner',
  zenkosh: 'ZenKosh',
  wm: 'WM',
  'wm-mk': 'WM/MK',
  mk: 'MK',
  custom: 'Custom',
};

// ── Base64url → bytes ───────────────────────────────────────────────────────

const MAX_BASE64_INPUT = 700_000; // ~500KB decoded — matches publish-direct limit

function fromBase64Url(str: string): Uint8Array {
  if (str.length > MAX_BASE64_INPUT) {
    throw new Error(`Base64 input exceeds ${MAX_BASE64_INPUT} character limit`);
  }
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const MAX_DECOMPRESSED_SIZE = 1024 * 1024;

async function readAllChunks(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECOMPRESSED_SIZE) {
      await reader.cancel();
      throw new Error(`Decompressed roster data exceeds ${MAX_DECOMPRESSED_SIZE} byte limit`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// ── Compact types (matching CompactRosterV3 shape) ──────────────────────────

interface CompactBuildRef { bi?: string; bn?: string; }
interface CompactGear { s1?: number; s2?: number; ms?: number; a?: number[]; }
interface CompactSkills { l1?: number | string; l2?: number | string; l3?: number | string; fl?: 1; }
interface CompactGroup { g?: string; }

interface CompactTank {
  pn?: string; rl?: string; pt?: string; pi?: string;
  lb?: string[]; rn?: string; gs?: CompactGear; sl?: CompactSkills;
  ul?: number | string; grs?: string[]; gr?: CompactGroup;
  no?: string; br?: CompactBuildRef;
}

interface CompactHealer {
  pn?: string; rl?: string; pt?: string; pi?: string;
  lb?: string[]; rn?: string;
  s1?: number; s2?: number; ms?: number; a?: number[];
  sl?: CompactSkills; hb?: number; cp?: number;
  ul?: number | string; grs?: string[]; gr?: CompactGroup;
  no?: string; br?: CompactBuildRef;
}

interface CompactDPS {
  sn: number; pn?: string; rl?: string; pt?: string; pi?: string;
  lb?: string[]; rn?: string;
  s1?: number; s2?: number; ms?: number; as?: number[]; gs?: number[];
  sl?: CompactSkills;
  ul?: number | string; grs?: string[]; gr?: CompactGroup;
  no?: string; jt?: number; cd?: string; br?: CompactBuildRef;
}

interface CompactTrialOverrides { ti: string; }

interface CompactRoster {
  v: number; n?: string; no?: string;
  ts?: CompactTank[]; hs?: CompactHealer[]; dp?: CompactDPS[];
  to?: CompactTrialOverrides;
  t1?: CompactTank; t2?: CompactTank; h1?: CompactHealer; h2?: CompactHealer;
}

// ── Decode helpers ──────────────────────────────────────────────────────────

function decodeUltimate(ul?: number | string): string | undefined {
  if (ul === undefined || ul === null) return undefined;
  if (typeof ul === 'string') return ul;
  return ULTIMATE_LIST[ul] ?? undefined;
}

function decodeSkillLines(sl?: CompactSkills): DecodedSkillLines | undefined {
  if (!sl) return undefined;
  const result: DecodedSkillLines = {};
  if (sl.fl) result.isFlex = true;
  if (sl.l1 !== undefined) result.line1 = typeof sl.l1 === 'number' ? CLASS_SKILL_LINES[sl.l1] : sl.l1;
  if (sl.l2 !== undefined) result.line2 = typeof sl.l2 === 'number' ? CLASS_SKILL_LINES[sl.l2] : sl.l2;
  if (sl.l3 !== undefined) result.line3 = typeof sl.l3 === 'number' ? CLASS_SKILL_LINES[sl.l3] : sl.l3;
  return (result.isFlex || result.line1 || result.line2 || result.line3) ? result : undefined;
}

function decodeGroupName(grs?: string[], gr?: CompactGroup): { groups?: string[]; groupName?: string } {
  if (grs?.length) return { groups: grs };
  if (gr?.g) return { groupName: gr.g };
  return {};
}

function collectSets(ids: (number | undefined)[], additional?: number[]): string[] | undefined {
  const sets: string[] = [];
  for (const id of ids) {
    if (id != null) sets.push(getSetName(id));
  }
  if (additional) {
    for (const id of additional) sets.push(getSetName(id));
  }
  return sets.length > 0 ? sets : undefined;
}

function decodeTank(t: CompactTank): DecodedRosterSlot {
  const grp = decodeGroupName(t.grs, t.gr);
  return {
    playerName: t.pn,
    roleLabel: t.rl,
    sets: collectSets([t.gs?.s1, t.gs?.s2, t.gs?.ms], t.gs?.a),
    buildRefName: t.br?.bn,
    buildRefId: t.br?.bi,
    positionTag: t.pt,
    playerNumber: t.pi,
    labels: t.lb,
    roleNotes: t.rn,
    ultimate: decodeUltimate(t.ul),
    skillLines: decodeSkillLines(t.sl),
    notes: t.no,
    ...grp,
  };
}

function decodeHealer(h: CompactHealer): DecodedRosterSlot {
  const grp = decodeGroupName(h.grs, h.gr);
  return {
    playerName: h.pn,
    roleLabel: h.rl,
    sets: collectSets([h.s1, h.s2, h.ms], h.a),
    buildRefName: h.br?.bn,
    buildRefId: h.br?.bi,
    positionTag: h.pt,
    playerNumber: h.pi,
    labels: h.lb,
    roleNotes: h.rn,
    ultimate: decodeUltimate(h.ul),
    skillLines: decodeSkillLines(h.sl),
    healerBuff: h.hb !== undefined ? HEALER_BUFF_LIST[h.hb] : undefined,
    championPoint: h.cp !== undefined ? CHAMPION_POINT_LIST[h.cp] : undefined,
    notes: h.no,
    ...grp,
  };
}

function decodeDPS(d: CompactDPS): DecodedRosterSlot {
  const grp = decodeGroupName(d.grs, d.gr);
  // Prefer structured set fields; fall back to legacy gs array
  let sets: string[];
  if (d.s1 != null || d.s2 != null || d.ms != null) {
    sets = collectSets([d.s1, d.s2, d.ms], d.as);
  } else if (d.gs?.length) {
    sets = d.gs.map((id) => getSetName(id)).filter(Boolean);
  } else {
    sets = [];
  }

  const jailType = d.jt !== undefined ? JAIL_DD_TYPE_LIST[d.jt] : undefined;

  return {
    playerName: d.pn,
    roleLabel: d.rl,
    slotNumber: d.sn,
    sets: sets.length > 0 ? sets : undefined,
    buildRefName: d.br?.bn,
    buildRefId: d.br?.bi,
    positionTag: d.pt,
    playerNumber: d.pi,
    labels: d.lb,
    roleNotes: d.rn,
    ultimate: decodeUltimate(d.ul),
    skillLines: decodeSkillLines(d.sl),
    jailDDType: jailType ? (JAIL_DD_LABELS[jailType] ?? jailType) : undefined,
    customDescription: d.cd,
    notes: d.no,
    ...grp,
  };
}

// ── Main decode function ────────────────────────────────────────────────────

export async function decodeRosterData(rosterData: string): Promise<DecodedRoster> {
  const bytes = fromBase64Url(rosterData);

  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const writeAndClose = writer
    .write(bytes as unknown as Uint8Array<ArrayBuffer>)
    .then(() => writer.close());
  const [, readResult] = await Promise.allSettled([writeAndClose, readAllChunks(ds.readable)]);

  if (readResult.status === 'rejected') {
    throw new Error(`Failed to decompress roster data: ${readResult.reason}`);
  }

  const json = new TextDecoder().decode(readResult.value);

  let compact: CompactRoster;
  try {
    compact = JSON.parse(json) as CompactRoster;
  } catch {
    throw new Error('Failed to parse decompressed roster data as JSON');
  }

  if (compact.v !== 2 && compact.v !== 3) {
    throw new Error(`Unsupported roster version: ${compact.v}`);
  }

  const tanks: DecodedRosterSlot[] = [];
  const healers: DecodedRosterSlot[] = [];
  const dps: DecodedRosterSlot[] = [];

  if (compact.v === 3) {
    if (compact.ts) tanks.push(...compact.ts.map(decodeTank));
    if (compact.hs) healers.push(...compact.hs.map(decodeHealer));
    if (compact.dp) dps.push(...compact.dp.map(decodeDPS));
  } else {
    if (compact.t1) tanks.push(decodeTank(compact.t1));
    if (compact.t2) tanks.push(decodeTank(compact.t2));
    if (compact.h1) healers.push(decodeHealer(compact.h1));
    if (compact.h2) healers.push(decodeHealer(compact.h2));
    if (compact.dp) dps.push(...compact.dp.map(decodeDPS));
  }

  return {
    name: compact.n,
    trialId: compact.to?.ti || undefined,
    notes: compact.no,
    tanks,
    healers,
    dps,
  };
}
