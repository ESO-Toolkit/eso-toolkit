/**
 * Decodes roster_data (deflate-raw + base64url) into a simplified
 * DecodedRoster for embed rendering.
 *
 * This runs server-side in a Cloudflare Worker. DecompressionStream
 * is available natively in the Workers runtime.
 */

import { getSetName } from './set-names.js';
import type { DecodedRoster, DecodedRosterSlot } from './types.js';

// ── Base64url → bytes ───────────────────────────────────────────────────────

function fromBase64Url(str: string): Uint8Array {
  // Restore standard base64
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Maximum decompressed roster payload size (1 MB). Prevents OOM from crafted payloads. */
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

// ── Compact types (minimal, matching CompactRosterV3 shape) ─────────────────

interface CompactBuildRef {
  bi?: string;
  bn?: string;
}

interface CompactGear {
  s1?: number;
  s2?: number;
  ms?: number;
  a?: number[];
}

interface CompactTank {
  pn?: string;
  rl?: string;
  gs?: CompactGear;
  br?: CompactBuildRef;
}

interface CompactHealer {
  pn?: string;
  rl?: string;
  s1?: number;
  s2?: number;
  ms?: number;
  a?: number[];
  br?: CompactBuildRef;
}

interface CompactDPS {
  sn: number;
  pn?: string;
  rl?: string;
  s1?: number;
  s2?: number;
  ms?: number;
  as?: number[];
  br?: CompactBuildRef;
}

interface CompactRoster {
  v: number;
  n?: string;
  ts?: CompactTank[];
  hs?: CompactHealer[];
  dp?: CompactDPS[];
  // v2 legacy fields
  t1?: CompactTank;
  t2?: CompactTank;
  h1?: CompactHealer;
  h2?: CompactHealer;
}

// ── Decode slot helpers ─────────────────────────────────────────────────────

function decodeTank(t: CompactTank): DecodedRosterSlot {
  const sets: string[] = [];
  if (t.gs?.s1) sets.push(getSetName(t.gs.s1));
  if (t.gs?.s2) sets.push(getSetName(t.gs.s2));
  if (t.gs?.ms) sets.push(getSetName(t.gs.ms));
  return {
    playerName: t.pn,
    roleLabel: t.rl,
    sets: sets.length > 0 ? sets : undefined,
    buildRefName: t.br?.bn,
    buildRefId: t.br?.bi,
  };
}

function decodeHealer(h: CompactHealer): DecodedRosterSlot {
  const sets: string[] = [];
  if (h.s1) sets.push(getSetName(h.s1));
  if (h.s2) sets.push(getSetName(h.s2));
  if (h.ms) sets.push(getSetName(h.ms));
  return {
    playerName: h.pn,
    roleLabel: h.rl,
    sets: sets.length > 0 ? sets : undefined,
    buildRefName: h.br?.bn,
    buildRefId: h.br?.bi,
  };
}

function decodeDPS(d: CompactDPS): DecodedRosterSlot {
  const sets: string[] = [];
  if (d.s1) sets.push(getSetName(d.s1));
  if (d.s2) sets.push(getSetName(d.s2));
  if (d.ms) sets.push(getSetName(d.ms));
  return {
    playerName: d.pn,
    roleLabel: d.rl || `DD${d.sn}`,
    sets: sets.length > 0 ? sets : undefined,
    buildRefName: d.br?.bn,
    buildRefId: d.br?.bi,
  };
}

// ── Main decode function ────────────────────────────────────────────────────

export async function decodeRosterData(rosterData: string): Promise<DecodedRoster> {
  const bytes = fromBase64Url(rosterData);

  // Decompress deflate-raw
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const writeAndClose = writer.write(bytes as unknown as Uint8Array<ArrayBuffer>).then(() => writer.close());
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
    // V3: arrays
    if (compact.ts) tanks.push(...compact.ts.map(decodeTank));
    if (compact.hs) healers.push(...compact.hs.map(decodeHealer));
    if (compact.dp) dps.push(...compact.dp.map(decodeDPS));
  } else {
    // V2: named fields
    if (compact.t1) tanks.push(decodeTank(compact.t1));
    if (compact.t2) tanks.push(decodeTank(compact.t2));
    if (compact.h1) healers.push(decodeHealer(compact.h1));
    if (compact.h2) healers.push(decodeHealer(compact.h2));
    if (compact.dp) dps.push(...compact.dp.map(decodeDPS));
  }

  return {
    name: compact.n,
    tanks,
    healers,
    dps,
  };
}
