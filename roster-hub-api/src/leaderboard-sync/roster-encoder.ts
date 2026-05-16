/**
 * Builds CompactRosterV3 JSON and encodes it to the same format
 * used by the `roster_data` column (deflate-raw + base64url).
 *
 * This runs server-side in a Cloudflare Worker. CompressionStream
 * is available natively in the Workers runtime.
 */

import type { PlayerDetails, PlayerEntry, RankingEntry } from './esologs-client';
import { categorizeGear } from './gear-categorizer';

import { detectTalentInfo, type CompactSkills } from './talent-mapper';

// ─── Compact Types ───────────────────────────────────────────────────────────
// Mirrors the CompactRosterV3 types from src/utils/rosterEncoding.ts.
// Only includes the fields we populate (simple mode, no full-mode data).

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
  aw?: string;
  sl?: CompactSkills;
  ul?: number | string;
}

interface CompactHealer {
  pn?: string;
  rl?: string;
  s1?: number;
  s2?: number;
  ms?: number;
  aw?: string;
  a?: number[];
  sl?: CompactSkills;
  ul?: number | string;
}

interface CompactDPS {
  sn: number;
  pn?: string;
  s1?: number;
  s2?: number;
  ms?: number;
  aw?: string;
  as?: number[];
  sl?: CompactSkills;
  ul?: number | string;
}

interface CompactRosterV3 {
  v: 3;
  n?: string;
  ts?: CompactTank[];
  hs?: CompactHealer[];
  dp?: CompactDPS[];
}

// ─── Roster Builder ──────────────────────────────────────────────────────────

function buildCompactTank(player: PlayerEntry, index: number): CompactTank {
  const gear = categorizeGear(player.combatantInfo?.gear ?? [], false);
  const ct: CompactTank = {};

  if (player.name) ct.pn = player.name;
  ct.rl = `T${index + 1}`;

  const gs: CompactGear = {};
  if (gear.set1) gs.s1 = gear.set1;
  if (gear.set2) gs.s2 = gear.set2;
  if (gear.monsterSet) gs.ms = gear.monsterSet;
  if (gear.additionalSets.length) gs.a = gear.additionalSets;
  if (Object.keys(gs).length > 0) ct.gs = gs;

  if (gear.arenaWeapon) ct.aw = gear.arenaWeapon;

  const talentInfo = detectTalentInfo(player.combatantInfo?.talents ?? []);
  if (talentInfo.sl) ct.sl = talentInfo.sl;
  if (talentInfo.ul) ct.ul = talentInfo.ul;

  return ct;
}

function buildCompactHealer(player: PlayerEntry, index: number): CompactHealer {
  const gear = categorizeGear(player.combatantInfo?.gear ?? [], false);
  const ch: CompactHealer = {};

  if (player.name) ch.pn = player.name;
  ch.rl = `H${index + 1}`;

  if (gear.set1) ch.s1 = gear.set1;
  if (gear.set2) ch.s2 = gear.set2;
  if (gear.monsterSet) ch.ms = gear.monsterSet;
  if (gear.arenaWeapon) ch.aw = gear.arenaWeapon;
  if (gear.additionalSets.length) ch.a = gear.additionalSets;

  const talentInfo = detectTalentInfo(player.combatantInfo?.talents ?? []);
  if (talentInfo.sl) ch.sl = talentInfo.sl;
  if (talentInfo.ul) ch.ul = talentInfo.ul;

  return ch;
}

function buildCompactDPS(player: PlayerEntry, index: number): CompactDPS {
  const gear = categorizeGear(player.combatantInfo?.gear ?? [], true);
  const cd: CompactDPS = { sn: index + 1 };

  if (player.name) cd.pn = player.name;

  if (gear.set1) cd.s1 = gear.set1;
  if (gear.set2) cd.s2 = gear.set2;
  if (gear.monsterSet) cd.ms = gear.monsterSet;
  if (gear.arenaWeapon) cd.aw = gear.arenaWeapon;
  if (gear.additionalSets.length) cd.as = gear.additionalSets;

  const talentInfo = detectTalentInfo(player.combatantInfo?.talents ?? []);
  if (talentInfo.sl) cd.sl = talentInfo.sl;
  if (talentInfo.ul) cd.ul = talentInfo.ul;

  return cd;
}

/**
 * Build a CompactRosterV3 from ESO Logs player details and ranking context.
 */
export function buildCompactRoster(players: PlayerDetails, rosterName: string): CompactRosterV3 {
  const roster: CompactRosterV3 = { v: 3 };
  if (rosterName) roster.n = rosterName;

  const tanks = players.tanks.slice(0, 2);
  const healers = players.healers.slice(0, 2);
  const dps = players.dps.slice(0, 8);

  if (tanks.length) roster.ts = tanks.map(buildCompactTank);
  if (healers.length) roster.hs = healers.map(buildCompactHealer);
  if (dps.length) roster.dp = dps.map(buildCompactDPS);

  return roster;
}

// ─── Encoding ────────────────────────────────────────────────────────────────

/** Base64url encode (URL-safe, no padding) */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Read all chunks from a ReadableStream */
async function readAllChunks(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
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

/**
 * Encode a CompactRosterV3 to the `roster_data` format:
 *   JSON → deflate-raw → base64url
 *
 * Compatible with the client-side `decodeRosterFromURL()`.
 */
export async function encodeRoster(roster: CompactRosterV3): Promise<string> {
  const json = JSON.stringify(roster);
  const input = new TextEncoder().encode(json);

  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  const writeAndClose = writer.write(input).then(() => writer.close());
  const [, readResult] = await Promise.allSettled([writeAndClose, readAllChunks(cs.readable)]);

  if (readResult.status === 'rejected') {
    throw readResult.reason instanceof Error
      ? readResult.reason
      : new Error(String(readResult.reason));
  }

  return toBase64Url(readResult.value);
}

/**
 * Build a display title for a #1 roster.
 */
export function buildRosterTitle(ranking: RankingEntry, trialName: string): string {
  const teamName = ranking.guild?.name ?? 'Unknown';
  return `${teamName} — ${trialName} #1`;
}

/**
 * Build a description for a #1 roster.
 */
export function buildRosterDescription(ranking: RankingEntry, trialName: string): string {
  const teamName = ranking.guild?.name ?? 'Unknown';
  const server = ranking.server?.region?.toUpperCase() ?? '';
  const score = ranking.score ? ` • Score: ${ranking.score.toLocaleString()}` : '';
  return `Auto-imported #1 ${trialName} roster from ${teamName}${server ? ` (${server})` : ''}${score}`;
}
