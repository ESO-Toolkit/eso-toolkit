/**
 * Report build-evidence sidecars.
 *
 * Kalpa's native uploader can recover exact raw PLAYER_INFO facts that the public
 * ESO Logs API may omit. Store only the compact, normalized evidence needed by
 * ESOTK and keep the blob compressed in R2.
 */

import type { Context } from 'hono';

import { validateToken } from './auth';
import type { AuthUser, Env } from './types';

const SOURCE = 'kalpa-native-player-info';
const SCHEMA_VERSION = 1;
const REPORT_CODE_RE = /^[A-Za-z0-9]{8,32}$/;
const OBJECT_PREFIX = 'report-build-evidence/v1';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_PLAYERS = 100;
const MAX_SCRIBED_SKILLS = 12;
const MAX_CLASS_MASTERY_PICKS = 2;
const MAX_CHAMPION_POINT_PASSIVES = 12;
const MAX_ABILITY_ID = 1_000_000;

type ReportEvidenceContext = Context<{ Bindings: Env }>;

interface KalpaPlayerBuildEvidence {
  unitId: string;
  characterName?: string | null;
  accountName?: string | null;
  characterId?: string | null;
  classId?: number | null;
  raceId?: number | null;
  level?: number | null;
  championPoints?: number | null;
  className?: string | null;
  classMasteryPassives: number[];
  championPointPassives?: number[];
  food?: KalpaAbilityEvidence;
  scribedSkills?: KalpaScribedSkillEvidence[];
  evidence: string;
  confidence: string;
}

interface KalpaAbilityEvidence {
  abilityId: number;
  name?: string | null;
  icon?: string | null;
}

type KalpaScribedSkillEvidence = KalpaAbilityEvidence;

interface KalpaBuildEvidence {
  schemaVersion: number;
  source: string;
  reportCode: string;
  players: KalpaPlayerBuildEvidence[];
}

interface ReportOwnerResponse {
  data?: {
    reportData?: {
      report?: {
        code?: string;
        owner?: {
          name?: string | null;
        } | null;
      } | null;
    } | null;
  };
}

const REPORT_OWNER_QUERY = `query KalpaReportOwner($code: String!) {
  reportData {
    report(code: $code) {
      code
      owner {
        name
      }
    }
  }
}`;

function objectKey(reportCode: string): string {
  return `${OBJECT_PREFIX}/${reportCode}.json.gz`;
}

function isValidReportCode(reportCode: string): boolean {
  return REPORT_CODE_RE.test(reportCode);
}

function normalizeName(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

function boundedInteger(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  return value >= min && value <= max ? value : undefined;
}

function sanitizeNumberArray(value: unknown, maxLength: number): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const result: number[] = [];
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isInteger(entry)) continue;
    if (entry <= 0 || entry > MAX_ABILITY_ID) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
    if (result.length >= maxLength) break;
  }
  return result;
}

function sanitizeAbilityEvidence(value: unknown): KalpaAbilityEvidence | undefined {
  if (!isRecord(value)) return undefined;
  const abilityId = boundedInteger(value.abilityId, 1, MAX_ABILITY_ID);
  if (abilityId == null) return undefined;
  return {
    abilityId,
    name: boundedString(value.name, 96),
    icon: boundedString(value.icon, 64),
  };
}

function sanitizeScribedSkills(value: unknown): KalpaScribedSkillEvidence[] {
  if (!Array.isArray(value)) return [];
  const result: KalpaScribedSkillEvidence[] = [];
  for (const entry of value) {
    const skill = sanitizeAbilityEvidence(entry);
    if (!skill) continue;
    result.push(skill);
    if (result.length >= MAX_SCRIBED_SKILLS) break;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validatePlayerEvidence(value: unknown): KalpaPlayerBuildEvidence | null {
  if (!isRecord(value)) return null;
  const unitId = boundedString(value.unitId, 32);
  if (!unitId) return null;

  const scribedSkills = sanitizeScribedSkills(value.scribedSkills);
  const championPointPassives = sanitizeNumberArray(
    value.championPointPassives,
    MAX_CHAMPION_POINT_PASSIVES,
  );
  const food = sanitizeAbilityEvidence(value.food);
  const player: KalpaPlayerBuildEvidence = {
    unitId,
    characterName: boundedString(value.characterName, 96),
    accountName: boundedString(value.accountName, 96),
    characterId: boundedString(value.characterId, 32),
    classId: boundedInteger(value.classId, 1, 1_000),
    raceId: boundedInteger(value.raceId, 1, 1_000),
    level: boundedInteger(value.level, 1, 100),
    championPoints: boundedInteger(value.championPoints, 0, 10_000),
    className: boundedString(value.className, 32),
    classMasteryPassives: sanitizeNumberArray(value.classMasteryPassives, MAX_CLASS_MASTERY_PICKS),
    evidence: boundedString(value.evidence, 48) ?? '',
    confidence: boundedString(value.confidence, 32) ?? '',
  };
  if (championPointPassives.length > 0) player.championPointPassives = championPointPassives;
  if (food) player.food = food;
  if (scribedSkills.length > 0) player.scribedSkills = scribedSkills;
  return player;
}

function validateEvidence(value: unknown, reportCode: string): KalpaBuildEvidence | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== SCHEMA_VERSION || value.source !== SOURCE) return null;
  if (
    typeof value.reportCode === 'string' &&
    value.reportCode.trim() &&
    value.reportCode !== reportCode
  ) {
    return null;
  }
  if (!Array.isArray(value.players)) return null;

  const players = value.players
    .slice(0, MAX_PLAYERS)
    .map(validatePlayerEvidence)
    .filter((player): player is KalpaPlayerBuildEvidence => player !== null);

  if (players.length === 0) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    source: SOURCE,
    reportCode,
    players,
  };
}

async function gzipText(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

async function verifyReportOwner(
  authHeader: string,
  reportCode: string,
  user: AuthUser,
): Promise<boolean> {
  const token = authHeader.slice('Bearer '.length);
  const res = await fetch('https://www.esologs.com/api/v2/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      operationName: 'KalpaReportOwner',
      query: REPORT_OWNER_QUERY,
      variables: { code: reportCode },
    }),
  });
  if (!res.ok) return false;

  const body = (await res.json()) as ReportOwnerResponse;
  const report = body.data?.reportData?.report;
  if (report?.code !== reportCode) return false;

  return normalizeName(report.owner?.name) === normalizeName(user.name);
}

function ensureBucket(c: ReportEvidenceContext): R2Bucket | null {
  return c.env.REPORT_BUILD_EVIDENCE ?? null;
}

export async function getReportBuildEvidence(c: ReportEvidenceContext): Promise<Response> {
  const reportCode = c.req.param('reportCode') ?? '';
  if (!isValidReportCode(reportCode)) return c.json({ error: 'Invalid report code' }, 400);

  const bucket = ensureBucket(c);
  if (!bucket) return c.json({ error: 'Build evidence storage is not configured' }, 503);

  const object = await bucket.get(objectKey(reportCode));
  if (!object?.body) return c.json({ error: 'Not found' }, 404);

  const body = object.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      Vary: 'Origin',
    },
  });
}

export async function putReportBuildEvidence(c: ReportEvidenceContext): Promise<Response> {
  const reportCode = c.req.param('reportCode') ?? '';
  if (!isValidReportCode(reportCode)) return c.json({ error: 'Invalid report code' }, 400);

  const bucket = ensureBucket(c);
  if (!bucket) return c.json({ error: 'Build evidence storage is not configured' }, 503);

  const user = await validateToken(c.req.header('Authorization'), c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const ownerVerified = await verifyReportOwner(
    c.req.header('Authorization') ?? '',
    reportCode,
    user,
  );
  if (!ownerVerified) {
    return c.json({ error: 'Only the report owner can publish build evidence' }, 403);
  }

  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return c.json({ error: 'Request body too large' }, 413);

  let raw: string;
  let body: unknown;
  try {
    raw = await c.req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return c.json({ error: 'Request body too large' }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const evidence = validateEvidence(body, reportCode);
  if (!evidence) return c.json({ error: 'Invalid build evidence payload' }, 400);

  const json = JSON.stringify(evidence);
  const compressed = await gzipText(json);
  await bucket.put(objectKey(reportCode), compressed, {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      contentEncoding: 'gzip',
      cacheControl: 'public, max-age=300',
    },
    customMetadata: {
      schemaVersion: String(SCHEMA_VERSION),
      source: SOURCE,
      ownerUserId: user.id,
      ownerName: user.name,
      playerCount: String(evidence.players.length),
      uncompressedBytes: String(new TextEncoder().encode(json).byteLength),
      compressedBytes: String(compressed.byteLength),
      updatedAt: new Date().toISOString(),
    },
  });

  return c.json({
    ok: true,
    reportCode,
    playerCount: evidence.players.length,
    uncompressedBytes: new TextEncoder().encode(json).byteLength,
    compressedBytes: compressed.byteLength,
  });
}
