/**
 * ESO Logs API client for the leaderboard sync cron job.
 *
 * Uses client credentials OAuth (not user authorization) to access public data
 * on the /api/v2/client endpoint.
 */

import type { Env } from '../types';

const ESOLOGS_TOKEN_URL = 'https://www.esologs.com/oauth/token';
const ESOLOGS_CLIENT_API = 'https://www.esologs.com/api/v2/client';

// ─── OAuth ───────────────────────────────────────────────────────────────────

export async function getClientToken(env: Env): Promise<string> {
  const res = await fetch(ESOLOGS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.ESOLOGS_CLIENT_ID,
      client_secret: env.ESOLOGS_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ESO Logs OAuth failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token: string };
  if (!json.access_token) throw new Error('ESO Logs OAuth: no access_token in response');
  return json.access_token;
}

// ─── GraphQL helper ──────────────────────────────────────────────────────────

async function gql<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ESOLOGS_CLIENT_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ESO Logs GraphQL error (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`ESO Logs GraphQL: ${json.errors.map((e) => e.message).join(', ')}`);
  }
  if (!json.data) throw new Error('ESO Logs GraphQL: no data in response');
  return json.data;
}

// ─── Zone/Encounter Queries ──────────────────────────────────────────────────

export interface ZoneEncounter {
  id: number;
  name: string;
}

export interface ZoneDifficulty {
  id: number;
  name: string;
  sizes: number[];
}

export interface ZonePartition {
  id: number;
  name: string;
}

export interface ZoneData {
  id: number;
  name: string;
  encounters: ZoneEncounter[];
  /** Present for the DPS-parse pipeline; the roster sync ignores these. */
  difficulties?: ZoneDifficulty[];
  partitions?: ZonePartition[];
}

interface TrialZonesResponse {
  worldData: {
    zones: ZoneData[];
  };
}

// `difficulties` and `partitions` are for the DPS-parse target list. They are
// cheap scalar fields on a query the cron already makes, so fetching them here
// avoids a second round trip; the roster sync simply doesn't read them.
const GET_TRIAL_ZONES = `{
  worldData {
    zones {
      id
      name
      encounters { id name }
      difficulties { id name sizes }
      partitions { id name }
    }
  }
}`;

export async function fetchTrialZones(token: string): Promise<ZoneData[]> {
  const data = await gql<TrialZonesResponse>(token, GET_TRIAL_ZONES);
  return data.worldData?.zones ?? [];
}

// ─── Fight Ranking Query ─────────────────────────────────────────────────────

export interface RankingEntry {
  score: number;
  guild?: { id?: number; name?: string; faction?: number };
  server?: { id?: number; name?: string; region?: string };
  report?: { code?: string; fightID?: number | null; startTime?: number | null };
  duration: number;
}

interface FightRankingsResponse {
  worldData: {
    encounter: {
      id: number;
      name: string;
      fightRankings: string | ParsedRankings;
    };
  };
}

interface ParsedRankings {
  rankings: RankingEntry[];
  page: number;
  hasMorePages: boolean;
  count: number;
}

const GET_FIGHT_RANKINGS = `
query ($encounterId: Int!) {
  worldData {
    encounter(id: $encounterId) {
      id
      name
      fightRankings(page: 1)
    }
  }
}`;

/**
 * Fetch the #1 ranked fight for an encounter.
 * Returns the highest-scored entry that has a valid report code.
 */
export async function fetchTopRanking(
  token: string,
  encounterId: number,
): Promise<RankingEntry | null> {
  const data = await gql<FightRankingsResponse>(token, GET_FIGHT_RANKINGS, {
    encounterId,
  });

  const raw = data.worldData?.encounter?.fightRankings;
  if (!raw) return null;

  let parsed: ParsedRankings;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as ParsedRankings);
  } catch {
    return null;
  }

  // Find the first ranking with a valid report (some are private/unuploaded)
  return parsed.rankings?.find((r) => r.report?.code && r.report.fightID != null) ?? null;
}

// ─── Player Details Query ────────────────────────────────────────────────────

export interface GearItem {
  setID: number;
  setName?: string;
  slot: number;
  quality: number;
  name?: string;
  icon?: string;
  type: number;
}

export interface TalentItem {
  guid: number;
  name?: string;
  type: number;
  abilityIcon?: string;
}

export interface PlayerEntry {
  name: string;
  id: number;
  guid: number;
  type: string;
  server: string;
  icon: string;
  combatantInfo: {
    stats: number[];
    talents: TalentItem[];
    gear: GearItem[];
  };
}

export interface PlayerDetails {
  tanks: PlayerEntry[];
  healers: PlayerEntry[];
  dps: PlayerEntry[];
}

interface PlayerDetailsResponse {
  reportData: {
    report: {
      playerDetails: string; // JSON-encoded
    };
  };
}

const GET_PLAYER_DETAILS = `
query ($code: String!, $fightIDs: [Int]) {
  reportData {
    report(code: $code) {
      playerDetails(includeCombatantInfo: true, fightIDs: $fightIDs)
    }
  }
}`;

export async function fetchPlayerDetails(
  token: string,
  reportCode: string,
  fightId: number,
): Promise<PlayerDetails | null> {
  try {
    const data = await gql<PlayerDetailsResponse>(token, GET_PLAYER_DETAILS, {
      code: reportCode,
      fightIDs: [fightId],
    });

    const raw = data.reportData?.report?.playerDetails;
    if (!raw) return null;

    let parsed: Record<string, unknown>;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
    } catch {
      return null;
    }

    // ESO Logs nests as { data: { playerDetails: { tanks, healers, dps } } }
    const inner = parsed.data as Record<string, unknown> | undefined;
    const details = (inner?.playerDetails ?? inner ?? parsed) as PlayerDetails;
    return {
      tanks: details.tanks ?? [],
      healers: details.healers ?? [],
      dps: details.dps ?? [],
    };
  } catch {
    // Report might be private or deleted
    return null;
  }
}

// ─── Character Rankings (top DPS parses) ─────────────────────────────────────

export interface CharacterRankingsParams {
  encounterId: number;
  /** Omit for the API default. */
  difficulty?: number;
  /** Omit for the latest partition, which is what "current meta" means. */
  partition?: number;
  page?: number;
  /**
   * Always pass 'dps' explicitly. The probe found that `default` returned entries
   * with combat info stripped on an encounter where `dps` returned it in full.
   */
  metric?: 'dps' | 'bossdps' | 'default';
  className?: string;
  size?: number;
}

interface CharacterRankingsResponse {
  worldData: {
    encounter: {
      id: number;
      name: string;
      characterRankings: unknown;
    } | null;
  };
}

const GET_CHARACTER_RANKINGS = `
query (
  $encounterId: Int!
  $difficulty: Int
  $partition: Int
  $page: Int
  $metric: CharacterRankingMetricType
  $className: String
  $size: Int
) {
  worldData {
    encounter(id: $encounterId) {
      id
      name
      characterRankings(
        difficulty: $difficulty
        partition: $partition
        page: $page
        metric: $metric
        className: $className
        size: $size
        includeCombatantInfo: true
      )
    }
  }
}`;

/**
 * Fetch one page of top individual parses, gear and skill bars included.
 *
 * Returns the RAW `characterRankings` value — it is an untyped JSON scalar, so all
 * interpretation lives in character-rankings-parser.ts.
 */
export async function fetchCharacterRankings(
  token: string,
  params: CharacterRankingsParams,
): Promise<unknown> {
  const data = await gql<CharacterRankingsResponse>(token, GET_CHARACTER_RANKINGS, {
    encounterId: params.encounterId,
    difficulty: params.difficulty,
    partition: params.partition,
    page: params.page ?? 1,
    metric: params.metric ?? 'dps',
    className: params.className,
    size: params.size,
  });

  return data.worldData?.encounter?.characterRankings ?? null;
}

// ─── Rate limit ──────────────────────────────────────────────────────────────

export interface RateLimitSnapshot {
  limitPerHour: number;
  pointsSpentThisHour: number;
  pointsResetIn: number;
}

const GET_RATE_LIMIT = `{ rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }`;

/**
 * Current API point budget, or null if unavailable.
 *
 * Measured cost is ~1.1 points per characterRankings page against a 9000/hour
 * limit, so this is a guard rail rather than a real constraint — callers should
 * degrade to plain 429 backoff when it returns null rather than refusing to run.
 */
export async function fetchRateLimitData(token: string): Promise<RateLimitSnapshot | null> {
  try {
    const data = await gql<{ rateLimitData?: RateLimitSnapshot }>(token, GET_RATE_LIMIT);
    return data.rateLimitData ?? null;
  } catch {
    return null;
  }
}
