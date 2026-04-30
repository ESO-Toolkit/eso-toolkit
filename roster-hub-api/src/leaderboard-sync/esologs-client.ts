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

interface ZoneEncounter {
  id: number;
  name: string;
}

interface ZoneData {
  id: number;
  name: string;
  encounters: ZoneEncounter[];
}

interface TrialZonesResponse {
  worldData: {
    zones: ZoneData[];
  };
}

const GET_TRIAL_ZONES = `{
  worldData {
    zones {
      id
      name
      encounters { id name }
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
